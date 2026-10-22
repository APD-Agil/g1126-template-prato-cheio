import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { criarApp } from '../src/app.js';
import { migrar, limparBanco, encerrar } from '../src/db.js';

const app = criarApp();

// Doações com validade sempre no futuro (>= 2h à frente), para não depender
// da data em que os testes rodam nem violar a Regra 1 do docs/analise.md.
const daquiA = (horas) => new Date(Date.now() + horas * 60 * 60 * 1000).toISOString();
const daquiAEmDatetimeLocal = (horas) => {
  const data = new Date(Date.now() + horas * 60 * 60 * 1000);
  const pad = (n) => String(n).padStart(2, '0');
  return `${data.getFullYear()}-${pad(data.getMonth() + 1)}-${pad(data.getDate())}T${pad(data.getHours())}:${pad(data.getMinutes())}`;
};

// Este teste já passa e não depende do banco:
// prova que a aplicação sobe e que o CI está funcionando.
describe('a aplicação sobe', () => {
  it('responde na verificação de saúde', async () => {
    const res = await request(app).get('/api/saude');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Testes do walking skeleton — cobrem os critérios de aceite (Dado/Quando/Então)
// das Histórias 6 e 7 em docs/analise.md.
//
// Os testes abaixo usam o banco — que na Unidade 1 é SQLite em memória:
// nada a instalar, nada a subir.
// ---------------------------------------------------------------------------

beforeEach(async () => {
  await migrar();
  await limparBanco();
});

afterAll(async () => {
  await encerrar();
});

describe('publicar e listar doações', () => {
  // Dado que o formulário está pronto para preenchimento
  // Quando o doador envia tipo, quantidade e validade (>= 2h à frente)
  // Então a doação aparece imediatamente na lista de disponíveis
  it('mostra a doação publicada na lista de disponíveis', async () => {
    await request(app)
      .post('/api/doacoes')
      .send({ tipo: 'Sopa', quantidade: '10 porções', validade: daquiA(3) });

    const res = await request(app).get('/api/doacoes');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].tipo).toBe('Sopa');
    expect(res.body[0].status).toBe('disponivel');
  });

  it('aceita validade no mesmo formato datetime-local enviado pela tela', async () => {
    const validadeLocal = daquiAEmDatetimeLocal(3);

    const post = await request(app)
      .post('/api/doacoes')
      .send({ tipo: 'Sopa', quantidade: '12 porções', validade: validadeLocal });

    expect(post.status).toBe(201);
    expect(post.body.validade).toBe(validadeLocal);
  });

  // Dado que o formulário está preenchido
  // Quando o doador informa validade menor que 2h à frente (ou omite um campo)
  // Então o sistema não salva a doação e devolve o erro da Regra 1
  it('recusa doação sem os campos obrigatórios', async () => {
    const semCampos = await request(app)
      .post('/api/doacoes')
      .send({ tipo: 'Sopa' });
    expect(semCampos.status).toBe(400);

    const validadePerto = await request(app)
      .post('/api/doacoes')
      .send({ tipo: 'Sopa', quantidade: '10 porções', validade: daquiA(1) });
    expect(validadePerto.status).toBe(400);
    expect(validadePerto.body.erro).toMatch(/no mínimo 2 horas/);

    const res = await request(app).get('/api/doacoes');
    expect(res.body).toHaveLength(0);
  });
});

describe('aceitar uma doação', () => {
  async function publicarDoacao() {
    const res = await request(app)
      .post('/api/doacoes')
      .send({ tipo: 'Pão', quantidade: '20 unidades', validade: daquiA(4) });
    return res.body.id;
  }

  // Dado que um lote está publicado com status DISPONÍVEL
  // Quando a ONG clica em "Aceitar Doação"
  // Então o sistema confirma a reserva exclusiva para essa ONG
  it('marca a doação como aceita pela ONG', async () => {
    const id = await publicarDoacao();

    const res = await request(app)
      .post(`/api/doacoes/${id}/aceitar`)
      .send({ ong: 'ONG Esperança' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('aceita');
    expect(res.body.ong).toBe('ONG Esperança');
  });

  // Dado que uma doação foi aceita por uma ONG
  // Quando outra ONG consulta a lista de disponíveis
  // Então essa doação não aparece mais
  it('remove a doação da lista de disponíveis depois de aceita', async () => {
    const id = await publicarDoacao();
    await request(app).post(`/api/doacoes/${id}/aceitar`).send({ ong: 'ONG Esperança' });

    const res = await request(app).get('/api/doacoes');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });

  // Dado que um lote está disponível
  // Quando duas ONGs tentam aceitar o mesmo lote simultaneamente
  // Então exatamente uma consegue reservar e a outra recebe conflito
  it('permite apenas um aceite quando duas ONGs disputam o lote simultaneamente', async () => {
    const id = await publicarDoacao();

    const respostas = await Promise.all([
      request(app).post(`/api/doacoes/${id}/aceitar`).send({ ong: 'ONG Esperança' }),
      request(app).post(`/api/doacoes/${id}/aceitar`).send({ ong: 'ONG Mãos Solidárias' })
    ]);

    expect(respostas.map(({ status }) => status).sort()).toEqual([200, 400]);
    expect(respostas.find(({ status }) => status === 400).body.erro)
      .toMatch(/já foi reservado por outra ONG/);
  });
});

describe('contar doações aceitas no mês', () => {
  // Dado que há uma doação aceita neste mês e outra ainda disponível
  // Quando Marta consulta o total de doações aceitas no mês
  // Então o sistema informa somente a doação que foi aceita
  it('retorna o total de doações aceitas no mês consultado', async () => {
    const id = await request(app)
      .post('/api/doacoes')
      .send({ tipo: 'Arroz', quantidade: '5 kg', validade: daquiA(5) })
      .then((res) => res.body.id);
    await request(app).post(`/api/doacoes/${id}/aceitar`).send({ ong: 'ONG Esperança' });
    await request(app)
      .post('/api/doacoes')
      .send({ tipo: 'Feijão', quantidade: '3 kg', validade: daquiA(5) });

    const mesAtual = new Date().toISOString().slice(0, 7);
    const res = await request(app)
      .get(`/api/relatorios/doacoes-aceitas?mes=${mesAtual}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ mes: mesAtual, total: 1 });
  });
});
