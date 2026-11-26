import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { criarApp } from '../src/app.js';
import { migrar, limparBanco, encerrar, query } from '../src/db.js';

// H2 · O voluntário confirma a coleta (Trabalho 3, Iteração 2).
const app = criarApp();
const daquiA = (horas) => new Date(Date.now() + horas * 60 * 60 * 1000).toISOString();
const HORARIO = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

async function publicar() {
  const res = await request(app)
    .post('/api/doacoes')
    .send({ tipo: 'Pão', quantidade: '20 unidades', validade: daquiA(4), doador: 'Padaria Pão Bom' });
  return res.body.id;
}

async function publicarAceita(ong = 'Casa Esperança') {
  const id = await publicar();
  await request(app).post(`/api/doacoes/${id}/aceitar`).send({ ong });
  return id;
}

function confirmarColeta(id, corpo = { ong: 'Casa Esperança', voluntario: 'Rui' }) {
  return request(app).post(`/api/doacoes/${id}/confirmar-coleta`).send(corpo);
}

async function doPadaria(id) {
  const res = await request(app).get('/api/doacoes/minhas').query({ doador: 'Padaria Pão Bom' });
  return res.body.find((doacao) => doacao.id === id);
}

beforeEach(async () => {
  await migrar();
  await limparBanco();
});

afterAll(async () => {
  await encerrar();
});

describe('H2 · o voluntário confirma a coleta', () => {
  // CA1 — Dado que a "Casa Esperança" aceitou uma doação, quando o voluntário "Rui" confirma a coleta,
  // então ela passa a coletada, com o nome do voluntário e o horário da coleta.
  it('CA1: a coleta confirmada grava coletada, o voluntário e o horário', async () => {
    const id = await publicarAceita();

    const res = await confirmarColeta(id);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id, status: 'coletada', voluntario: 'Rui', ong: 'Casa Esperança' });
    expect(res.body.coletada_em).toMatch(HORARIO);
  });

  // CA2 — Dado que a doação ainda está disponível, quando alguém tenta confirmar a coleta,
  // então a confirmação é recusada com mensagem e a doação não muda.
  it('CA2: recusa confirmar a coleta de uma doação disponível e não a altera', async () => {
    const id = await publicar();

    const res = await confirmarColeta(id);

    expect(res.status).toBe(400);
    expect(res.body.erro).toBe('Só é possível confirmar a retirada de uma doação aceita');
    const doacao = await doPadaria(id);
    expect(doacao).toMatchObject({ status: 'disponivel', voluntario: null, coletada_em: null });
  });

  // CA3 — Dado que a doação foi coletada, quando o doador consulta as suas doações (H1),
  // então ela aparece como coletada.
  it('CA3: a doação coletada aparece como coletada para o doador', async () => {
    const id = await publicarAceita();
    const coleta = await confirmarColeta(id);

    const doacao = await doPadaria(id);

    expect(doacao.status).toBe('coletada');
    expect(doacao.situacao).toBe(`coletada por Rui em ${coleta.body.coletada_em}`);
  });

  // Decisão do grupo: confirmar duas vezes a mesma coleta é RECUSADO (não ignorado em silêncio),
  // e o primeiro registro (voluntário e horário) é preservado.
  it('limite: recusa confirmar duas vezes e preserva o primeiro registro', async () => {
    const id = await publicarAceita();
    const primeira = await confirmarColeta(id);

    const segunda = await confirmarColeta(id, { ong: 'Casa Esperança', voluntario: 'Ana' });

    expect(segunda.status).toBe(400);
    expect(segunda.body.erro).toBe('Só é possível confirmar a retirada de uma doação aceita');
    const doacao = await doPadaria(id);
    expect(doacao).toMatchObject({ voluntario: 'Rui', coletada_em: primeira.body.coletada_em });
  });

  // Decisão do grupo: o nome do voluntário é obrigatório (é o que diz à ONG e ao doador quem buscou).
  it('limite: recusa a confirmação sem nome do voluntário e a doação continua aceita', async () => {
    const id = await publicarAceita();

    const res = await confirmarColeta(id, { ong: 'Casa Esperança', voluntario: '  ' });

    expect(res.status).toBe(400);
    expect(res.body.erro).toBe('Informe o nome do voluntário');
    expect((await doPadaria(id)).status).toBe('aceita');
  });

  // Decisão (docs/projeto.md, linha 4): o antigo estado `concluida` passa a ser `coletada`.
  it('decisão: migrar() converte doações concluidas em coletadas, mantendo o horário', async () => {
    await query(
      `INSERT INTO doacoes (tipo, quantidade, validade, doador, status, ong, concluida_em)
       VALUES ('Sopa', '10 porções', $1, 'Padaria Pão Bom', 'concluida', 'Casa Esperança', '2026-11-20 20:00:00')`,
      [daquiA(5)]
    );

    await migrar();

    const { rows } = await query(`SELECT status, coletada_em FROM doacoes`);
    expect(rows).toEqual([{ status: 'coletada', coletada_em: '2026-11-20 20:00:00' }]);
  });
});
