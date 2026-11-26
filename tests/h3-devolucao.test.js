import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { criarApp } from '../src/app.js';
import { migrar, limparBanco, encerrar, query } from '../src/db.js';

// H3 · A ONG devolve uma doação aceita (Trabalho 3, Iteração 3).
const app = criarApp();
const daquiA = (horas) => new Date(Date.now() + horas * 60 * 60 * 1000).toISOString();

async function publicarAceita(ong = 'Casa Esperança') {
  const criada = await request(app)
    .post('/api/doacoes')
    .send({ tipo: 'Pão', quantidade: '20 unidades', validade: daquiA(4), doador: 'Padaria Pão Bom' });
  await request(app).post(`/api/doacoes/${criada.body.id}/aceitar`).send({ ong });
  return criada.body.id;
}

function devolver(id, corpo = { ong: 'Casa Esperança', motivo: 'sem voluntário hoje' }) {
  return request(app).post(`/api/doacoes/${id}/devolver`).send(corpo);
}

beforeEach(async () => {
  await migrar();
  await limparBanco();
});

afterAll(async () => {
  await encerrar();
});

describe('H3 · a ONG devolve uma doação aceita', () => {
  // CA1 — Dado que a "Casa Esperança" aceitou uma doação, quando ela a devolve com o motivo
  // "sem voluntário hoje", então a doação volta para a lista de disponíveis, sem ONG, e o motivo fica registrado.
  it('CA1: a doação devolvida volta inteira para a lista, sem ONG, e o motivo fica registrado', async () => {
    const id = await publicarAceita();

    const res = await devolver(id);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id, status: 'disponivel', ong: null, aceita_em: null, motivo: 'sem voluntário hoje' });
    const disponiveis = await request(app).get('/api/doacoes');
    expect(disponiveis.body).toMatchObject([{ id, tipo: 'Pão', status: 'disponivel', ong: null }]);
    const { rows } = await query('SELECT doacao_id, ong, motivo FROM devolucoes');
    expect(rows).toEqual([{ doacao_id: id, ong: 'Casa Esperança', motivo: 'sem voluntário hoje' }]);
  });
});
