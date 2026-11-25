import { query } from './db.js';

// H4: os horários (publicação, aceite, coleta, devolução) são gerados aqui, em JS,
// e não pelo now() do banco — assim os testes controlam o relógio (vi.setSystemTime)
// e o resultado do mês não depende do dia em que o teste roda. Formato e fuso iguais
// aos que o banco já gravava: 'AAAA-MM-DD HH:MM:SS' em UTC.
function agora() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

// Insere a doação e devolve a linha criada.
export async function inserir({ tipo, quantidade, validade, doador }) {
  const { rows } = await query(
    `INSERT INTO doacoes (tipo, quantidade, validade, doador, criada_em)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [tipo, quantidade, validade, doador, agora()]
  );
  return rows[0];
}

// H1: todas as doações de um doador, em qualquer estado, das mais novas para as mais antigas.
export async function listarPorDoador(doador) {
  const { rows } = await query(
    `SELECT * FROM doacoes WHERE doador = $1 ORDER BY criada_em DESC, id DESC`,
    [doador]
  );
  return rows;
}

export async function listarDisponiveis() {
  const { rows } = await query(
    `SELECT * FROM doacoes WHERE status = 'disponivel' ORDER BY validade ASC`
  );
  return rows;
}

// Busca uma doação pelo id. Devolve undefined se não existir.
export async function buscarPorId(id) {
  const { rows } = await query(`SELECT * FROM doacoes WHERE id = $1`, [id]);
  return rows[0];
}

export async function aceitar(id, ong) {
  const { rows } = await query(
    `UPDATE doacoes SET status = 'aceita', ong = $1, aceita_em = $3
     WHERE id = $2 AND status = 'disponivel'
     RETURNING *`,
    [ong, id, agora()]
  );
  return rows[0];
}

// H2: só sai de `aceita` para `coletada` (a condição no WHERE impede a confirmação dupla).
export async function confirmarColeta(id, ong, voluntario) {
  const { rows } = await query(
    `UPDATE doacoes
       SET status = 'coletada', voluntario = $3, coletada_em = $4
     WHERE id = $1 AND ong = $2 AND status = 'aceita'
     RETURNING *`,
    [id, ong, voluntario, agora()]
  );
  return rows[0];
}

// H3: devolver e registrar o motivo numa única instrução (atômica). A doação
// volta para `disponivel` sem ONG nem aceite; o registro guarda quem devolveu.
export async function devolver(id, ong, motivo) {
  const { rows } = await query(
    `WITH devolvida AS (
       UPDATE doacoes SET status = 'disponivel', ong = NULL, aceita_em = NULL
       WHERE id = $1 AND ong = $2 AND status = 'aceita'
       RETURNING *
     ), registro AS (
       INSERT INTO devolucoes (doacao_id, ong, motivo, devolvida_em)
       SELECT id, $2, $3, $4 FROM devolvida
       RETURNING motivo, devolvida_em
     )
     SELECT devolvida.*, registro.motivo, registro.devolvida_em FROM devolvida, registro`,
    [id, ong, motivo, agora()]
  );
  return rows[0];
}

export async function listarPendencias(ong) {
  const { rows } = await query(
    `SELECT * FROM doacoes
     WHERE ong = $1 AND status = 'aceita'
     ORDER BY validade ASC`,
    [ong]
  );
  return rows;
}

export async function listarHistorico(ong) {
  const { rows } = await query(
    `SELECT * FROM doacoes
     WHERE ong = $1 AND status = 'coletada'
     ORDER BY coletada_em DESC`,
    [ong]
  );
  return rows;
}

export async function contarAceitasNoMes(mes) {
  const { rows } = await query(
    `SELECT COUNT(*) AS total FROM doacoes
       WHERE status IN ('aceita', 'coletada') AND substr(aceita_em, 1, 7) = $1`,
    [mes]
  );
  return Number(rows[0].total);
}

// H4 — resultado do mês, contado pelo mês da PUBLICAÇÃO (docs/projeto.md, decisão 8).
// aceitas = aceitas ou já coletadas (o funil: quem foi coletada também foi aceita).
//
// Tipos do banco: o driver `pg` devolve COUNT(*) (bigint) e ROUND/AVG (numeric) como
// TEXTO ("3", "5.0"). O conserto fica aqui, abaixo do contrato: ::int e ::float8 no SQL
// fazem o JavaScript receber números (3, 5) — nunca em src/doacoes.js nem no teste.
export async function resultadoDoMes(mes) {
  const { rows } = await query(
    `SELECT
       COUNT(*)::int AS publicadas,
       (COUNT(*) FILTER (WHERE status IN ('aceita', 'coletada')))::int AS aceitas,
       (COUNT(*) FILTER (WHERE status = 'coletada'))::int AS coletadas,
       (SELECT COUNT(*) FROM devolucoes dv JOIN doacoes d ON d.id = dv.doacao_id
         WHERE substr(d.criada_em, 1, 7) = $1)::int AS devolucoes,
       ROUND(AVG(EXTRACT(EPOCH FROM (coletada_em::timestamp - criada_em::timestamp)))
         FILTER (WHERE status = 'coletada') / 3600, 1)::float8 AS tempo_medio_horas
     FROM doacoes
     WHERE substr(criada_em, 1, 7) = $1`,
    [mes]
  );
  return rows[0];
}
