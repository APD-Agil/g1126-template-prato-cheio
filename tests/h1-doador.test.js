import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { criarApp } from '../src/app.js';
import { migrar, limparBanco, encerrar, query } from '../src/db.js';

// H1 · O doador acompanha as suas doações (Trabalho 3, Iteração 1).
const app = criarApp();
const daquiA = (horas) => new Date(Date.now() + horas * 60 * 60 * 1000).toISOString();

function publicar(doador, tipo = 'Pão') {
  return request(app)
    .post('/api/doacoes')
    .send({ tipo, quantidade: '20 unidades', validade: daquiA(4), doador });
}

function minhas(doador) {
  return request(app).get('/api/doacoes/minhas').query({ doador });
}

beforeEach(async () => {
  await migrar();
  await limparBanco();
});

afterAll(async () => {
  await encerrar();
});

describe('H1 · o doador acompanha as suas doações', () => {
  // CA1 — Dado que a "Padaria Pão Bom" publicou duas doações e a "Casa Esperança" aceitou uma delas,
  // quando a padaria consulta as suas doações, então vê as duas: uma disponível e outra aceita por Casa Esperança.
  it('CA1: o doador vê as próprias doações com a situação de cada uma', async () => {
    const pao = await publicar('Padaria Pão Bom', 'Pão');
    const bolo = await publicar('Padaria Pão Bom', 'Bolo');
    await request(app).post(`/api/doacoes/${bolo.body.id}/aceitar`).send({ ong: 'Casa Esperança' });

    const res = await minhas('Padaria Pão Bom');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    const porId = Object.fromEntries(res.body.map((d) => [d.id, d]));
    expect(porId[pao.body.id]).toMatchObject({ status: 'disponivel', situacao: 'disponível' });
    expect(porId[bolo.body.id]).toMatchObject({
      status: 'aceita',
      ong: 'Casa Esperança',
      situacao: 'aceita por Casa Esperança'
    });
  });

  // CA2 — Dado que outro doador publicou uma doação, quando a "Padaria Pão Bom" consulta as suas,
  // então essa doação não aparece.
  it('CA2: a doação de outro doador não aparece na consulta da padaria', async () => {
    await publicar('Padaria Pão Bom', 'Pão');
    const outra = await publicar('Mercado Bom Preço', 'Frutas');

    const res = await minhas('Padaria Pão Bom');

    expect(res.status).toBe(200);
    expect(res.body.map(({ id }) => id)).not.toContain(outra.body.id);
    expect(res.body.every(({ doador }) => doador === 'Padaria Pão Bom')).toBe(true);
  });

  // CA3 — Dado que o doador não é informado na publicação, quando a doação é enviada,
  // então ela é recusada com uma mensagem clara e nada é gravado.
  it('CA3: recusa a publicação sem doador e não grava nada', async () => {
    const res = await request(app)
      .post('/api/doacoes')
      .send({ tipo: 'Sopa', quantidade: '10 porções', validade: daquiA(3) });

    expect(res.status).toBe(400);
    expect(res.body.erro).toBe('Informe o nome do doador');
    const { rows } = await query('SELECT COUNT(*)::int AS total FROM doacoes');
    expect(rows[0].total).toBe(0);
  });

  // Limite — doador só com espaços conta como não informado, na publicação e na consulta.
  it('limite: doador só com espaços é recusado na publicação e na consulta', async () => {
    const publicacao = await publicar('   ');
    expect(publicacao.status).toBe(400);
    expect(publicacao.body.erro).toBe('Informe o nome do doador');

    const consulta = await minhas('   ');
    expect(consulta.status).toBe(400);
    expect(consulta.body.erro).toBe('Informe o nome do doador');
  });

  // Decisão do grupo (docs/projeto.md, linha 5): doações publicadas antes de H1 não têm doador;
  // migrar() atribui a elas um doador padrão explícito, em vez de escondê-las.
  it('decisão: doações antigas sem doador recebem o doador padrão na migração', async () => {
    await query(
      `INSERT INTO doacoes (tipo, quantidade, validade) VALUES ($1, $2, $3)`,
      ['Arroz', '5 kg', daquiA(5)]
    );

    await migrar();

    const res = await minhas('Doador não identificado (antes da H1)');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].tipo).toBe('Arroz');
  });
});
