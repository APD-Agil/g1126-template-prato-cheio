import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { criarApp } from '../src/app.js';
import { migrar, limparBanco, encerrar } from '../src/db.js';

const app = criarApp();

// Doações com validade sempre no futuro (>= 2h à frente), para não depender
// da data em que os testes rodam nem violar a Regra 1 do docs/analise.md.
const daquiA = (horas) => new Date(Date.now() + horas * 60 * 60 * 1000).toISOString();

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

  // Dado que um lote já foi aceito por uma ONG
  // Quando outra ONG tenta aceitar o mesmo lote
  // Então o sistema recusa com a mensagem de disputa (Regra 2 / Cenário 2 da História 7)
  it('recusa aceitar uma doação que já foi aceita por outra ONG', async () => {
    const id = await publicarDoacao();
    await request(app).post(`/api/doacoes/${id}/aceitar`).send({ ong: 'ONG Esperança' });

    const segundaTentativa = await request(app)
      .post(`/api/doacoes/${id}/aceitar`)
      .send({ ong: 'ONG Mãos Solidárias' });

    expect(segundaTentativa.status).toBe(400);
    expect(segundaTentativa.body.erro).toMatch(/já foi reservado por outra ONG/);
  });
});
