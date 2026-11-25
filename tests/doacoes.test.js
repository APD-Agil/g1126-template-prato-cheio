import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { criarApp } from '../src/app.js';
import { migrar, limparBanco, encerrar } from '../src/db.js';

const app = criarApp();

// Doações com validade sempre no futuro (>= 2h à frente), para não depender
// da data em que os testes rodam nem violar a Regra 1 do docs/analise.md.
const daquiA = (horas) => new Date(Date.now() + horas * 60 * 60 * 1000).toISOString();

// Verifica a rota de saúde; a preparação compartilhada do arquivo também
// migra e limpa o PostgreSQL de teste antes de cada teste.
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
// Os testes de regras usam o PostgreSQL definido em vitest.config.js.
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
      .send({ tipo: 'Sopa', quantidade: '10 porções', validade: daquiA(3), doador: 'Padaria Teste' });

    const res = await request(app).get('/api/doacoes');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].tipo).toBe('Sopa');
    expect(res.body[0].status).toBe('disponivel');
  });

  // Dado que o formulário está preenchido
  // Quando o doador informa validade menor que 2h à frente (ou omite um campo)
  // Então o sistema não salva a doação e devolve o erro da Regra 1
  it('recusa publicação sem campos obrigatórios ou com validade curta', async () => {
    const semCampos = await request(app)
      .post('/api/doacoes')
      .send({ tipo: 'Sopa' });
    expect(semCampos.status).toBe(400);

    const validadePerto = await request(app)
      .post('/api/doacoes')
      .send({ tipo: 'Sopa', quantidade: '10 porções', validade: daquiA(1), doador: 'Padaria Teste' });
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
      .send({ tipo: 'Pão', quantidade: '20 unidades', validade: daquiA(4), doador: 'Padaria Teste' });
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
      .toBe('Este lote já foi reservado por outra ONG');
  });
});

describe('confirmar retirada e consultar pendências', () => {
  async function criarDoacaoAceita(ong = 'ONG Esperança') {
    const criada = await request(app)
      .post('/api/doacoes')
      .send({ tipo: 'Sopa', quantidade: '10 porções', validade: daquiA(4), doador: 'Padaria Teste' });
    await request(app).post(`/api/doacoes/${criada.body.id}/aceitar`).send({ ong });
    return criada.body.id;
  }

  it('conclui uma doação aceita, registra o encerramento e remove a pendência', async () => {
    const id = await criarDoacaoAceita();

    const res = await request(app)
      .post(`/api/doacoes/${id}/confirmar-retirada`)
      .send({ ong: 'ONG Esperança' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('concluida');
    expect(res.body.concluida_em).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);

    const pendencias = await request(app)
      .get('/api/doacoes/pendencias')
      .query({ ong: 'ONG Esperança' });
    expect(pendencias.status).toBe(200);
    expect(pendencias.body).toEqual([]);
    const historico = await request(app)
      .get('/api/doacoes/historico')
      .query({ ong: 'ONG Esperança' });
    expect(historico.status).toBe(200);
    expect(historico.body).toMatchObject([
      { id, status: 'concluida', ong: 'ONG Esperança' }
    ]);
    expect(historico.body[0].concluida_em).toBe(res.body.concluida_em);
  });

  it('recusa confirmar uma doação que ainda não foi aceita', async () => {
    const criada = await request(app)
      .post('/api/doacoes')
      .send({ tipo: 'Pão', quantidade: '20 unidades', validade: daquiA(4), doador: 'Padaria Teste' });

    const res = await request(app)
      .post(`/api/doacoes/${criada.body.id}/confirmar-retirada`)
      .send({ ong: 'ONG Esperança' });

    expect(res.status).toBe(400);
    expect(res.body.erro).toBe('Só é possível confirmar a retirada de uma doação aceita');
    const disponiveis = await request(app).get('/api/doacoes');
    expect(disponiveis.body.map(({ id }) => id)).toContain(criada.body.id);
  });

  it('recusa a confirmação por uma ONG diferente e preserva a ONG aceita', async () => {
    const id = await criarDoacaoAceita('ONG Esperança');

    const res = await request(app)
      .post(`/api/doacoes/${id}/confirmar-retirada`)
      .send({ ong: 'ONG Mãos Solidárias' });

    expect(res.status).toBe(400);
    expect(res.body.erro).toBe('Só a ONG que aceitou pode confirmar a retirada');
    const pendencias = await request(app)
      .get('/api/doacoes/pendencias')
      .query({ ong: 'ONG Esperança' });
    expect(pendencias.body).toHaveLength(1);
    expect(pendencias.body[0]).toMatchObject({ id, status: 'aceita', ong: 'ONG Esperança' });
  });

  it('lista somente as doações aceitas ainda pendentes para a ONG informada', async () => {
    const concluidas = await criarDoacaoAceita();
    const pendente = await criarDoacaoAceita();
    await criarDoacaoAceita('Outra ONG');
    await request(app)
      .post(`/api/doacoes/${concluidas}/confirmar-retirada`)
      .send({ ong: 'ONG Esperança' });

    const res = await request(app)
      .get('/api/doacoes/pendencias')
      .query({ ong: 'ONG Esperança' });

    expect(res.status).toBe(200);
    expect(res.body.map(({ id }) => id)).toEqual([pendente]);
    expect(res.body[0].status).toBe('aceita');
  });
});

describe('contar doações aceitas no mês', () => {
  // Dado que há uma doação aceita neste mês e outra ainda disponível
  // Quando Marta consulta o total de doações aceitas no mês
  // Então o sistema informa somente a doação que foi aceita
  it('retorna o total de doações aceitas no mês consultado', async () => {
    const id = await request(app)
      .post('/api/doacoes')
      .send({ tipo: 'Arroz', quantidade: '5 kg', validade: daquiA(5), doador: 'Padaria Teste' })
      .then((res) => res.body.id);
    await request(app).post(`/api/doacoes/${id}/aceitar`).send({ ong: 'ONG Esperança' });
    await request(app)
      .post('/api/doacoes')
      .send({ tipo: 'Feijão', quantidade: '3 kg', validade: daquiA(5), doador: 'Padaria Teste' });

    const mesAtual = new Date().toISOString().slice(0, 7);
    const res = await request(app)
      .get(`/api/relatorios/doacoes-aceitas?mes=${mesAtual}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ mes: mesAtual, total: 1 });
  });
});
