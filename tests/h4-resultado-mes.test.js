import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest';
import request from 'supertest';
import { criarApp } from '../src/app.js';
import { migrar, limparBanco, encerrar } from '../src/db.js';

// H4 · A Marta vê o resultado do mês (Trabalho 3, Iteração 4).
//
// Datas controladas: o relógio do teste é fixado com vi.setSystemTime (só o `Date`
// é falsificado; timers e o driver do banco seguem reais). Os horários de publicação,
// aceite e coleta são gerados em JS (src/repositorio.js → agora()), então o teste
// passa hoje e daqui a um ano. Os meses usados (2025) nunca são o mês corrente.
const app = criarApp();
const daquiA = (horas) => new Date(Date.now() + horas * 60 * 60 * 1000).toISOString();

function noRelogio(instante) {
  vi.setSystemTime(new Date(instante));
}

async function publicar(tipo = 'Pão') {
  const res = await request(app)
    .post('/api/doacoes')
    .send({ tipo, quantidade: '1 lote', validade: daquiA(12), doador: 'Padaria Pão Bom' });
  return res.body.id;
}

const aceitar = (id, ong = 'Casa Esperança') =>
  request(app).post(`/api/doacoes/${id}/aceitar`).send({ ong });
const coletar = (id, ong = 'Casa Esperança') =>
  request(app).post(`/api/doacoes/${id}/confirmar-coleta`).send({ ong, voluntario: 'Rui' });
const resultado = (mes) => request(app).get('/api/relatorios/mes').query({ mes });

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  await migrar();
  await limparBanco();
});

afterEach(() => {
  vi.useRealTimers();
});

afterAll(async () => {
  await encerrar();
});

describe('H4 · a Marta vê o resultado do mês', () => {
  // CA1 — Dado que, em novembro, 3 doações foram publicadas, 2 aceitas e 1 coletada 5 horas depois
  // de publicada, quando a Marta consulta o resultado de novembro, então vê 3 publicadas, 2 aceitas,
  // 1 coletada e tempo médio até a coleta: 5 h.
  it('CA1: mostra publicadas, aceitas, coletadas e o tempo médio até a coleta', async () => {
    noRelogio('2025-11-10T08:00:00Z');
    const pao = await publicar('Pão');
    const bolo = await publicar('Bolo');
    await publicar('Frutas');
    noRelogio('2025-11-10T09:00:00Z');
    await aceitar(pao);
    await aceitar(bolo);
    noRelogio('2025-11-10T13:00:00Z');
    await coletar(pao);

    const res = await resultado('2025-11');

    expect(res.status).toBe(200);
    // toEqual com números: se o banco devolvesse COUNT(*) ou a média como texto, este teste quebraria.
    expect(res.body).toEqual({
      mes: '2025-11',
      publicadas: 3,
      aceitas: 2,
      coletadas: 1,
      devolucoes: 0,
      tempoMedioAteColetaHoras: 5,
      tempoMedioAteColeta: '5 h'
    });
  });

  // CA2 — Dado um mês sem nenhuma coleta, quando a Marta consulta o resultado,
  // então o tempo médio aparece como "sem coletas no mês" — não como zero, nem como erro.
  it('CA2: num mês sem coletas o tempo médio aparece como "sem coletas no mês"', async () => {
    noRelogio('2025-09-15T10:00:00Z');
    const id = await publicar();
    await aceitar(id);

    const comPublicacoes = await resultado('2025-09');
    const vazio = await resultado('2025-08');

    expect(comPublicacoes.status).toBe(200);
    expect(comPublicacoes.body).toMatchObject({
      publicadas: 1, aceitas: 1, coletadas: 0,
      tempoMedioAteColetaHoras: null,
      tempoMedioAteColeta: 'sem coletas no mês'
    });
    expect(vazio.status).toBe(200);
    expect(vazio.body).toMatchObject({ publicadas: 0, tempoMedioAteColeta: 'sem coletas no mês' });
  });

  // CA3 — Dado uma doação publicada em 31/10 e coletada em 01/11, quando a Marta consulta novembro,
  // então o grupo decide em que mês ela conta. Decisão (docs/projeto.md, linha 8): no mês da PUBLICAÇÃO.
  it('CA3: a doação publicada em 31/10 e coletada em 01/11 conta em outubro, não em novembro', async () => {
    noRelogio('2025-10-31T22:00:00Z');
    const id = await publicar();
    await aceitar(id);
    noRelogio('2025-11-01T03:00:00Z');
    await coletar(id);

    const novembro = await resultado('2025-11');
    const outubro = await resultado('2025-10');

    expect(novembro.body).toMatchObject({ publicadas: 0, coletadas: 0, tempoMedioAteColeta: 'sem coletas no mês' });
    expect(outubro.body).toMatchObject({ publicadas: 1, coletadas: 1, tempoMedioAteColetaHoras: 5 });
  });

  // Decisão: devolvidas (H3) contam como publicadas; contam como aceitas só se foram aceitas de novo;
  // o número de devoluções aparece à parte. O tempo médio vem em horas, com 1 casa decimal.
  it('decisão: devoluções aparecem à parte e o tempo médio é arredondado a 1 casa', async () => {
    noRelogio('2025-07-01T10:00:00Z');
    const devolvida = await publicar('Sopa');
    const rapida = await publicar('Pão');
    const lenta = await publicar('Bolo');
    await aceitar(devolvida);
    await request(app).post(`/api/doacoes/${devolvida}/devolver`)
      .send({ ong: 'Casa Esperança', motivo: 'sem voluntário hoje' });
    await aceitar(rapida);
    await aceitar(lenta);
    noRelogio('2025-07-01T12:00:00Z');
    await coletar(rapida); // 2 h
    noRelogio('2025-07-01T13:30:00Z');
    await coletar(lenta); // 3,5 h → média 2,75 h

    const res = await resultado('2025-07');

    expect(res.body).toEqual({
      mes: '2025-07',
      publicadas: 3,
      aceitas: 2,
      coletadas: 2,
      devolucoes: 1,
      tempoMedioAteColetaHoras: 2.8,
      tempoMedioAteColeta: '2,8 h'
    });
  });

  it('limite: recusa mês em formato inválido', async () => {
    const res = await resultado('2025-13');

    expect(res.status).toBe(400);
    expect(res.body.erro).toBe('Informe o mês no formato AAAA-MM');
  });
});
