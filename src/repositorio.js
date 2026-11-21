import { query } from './db.js';

// Insere a doação e devolve a linha criada.
export async function inserir({ tipo, quantidade, validade }) {
  const { rows } = await query(
    `INSERT INTO doacoes (tipo, quantidade, validade)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [tipo, quantidade, validade]
  );
  return rows[0];
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
    `UPDATE doacoes SET status = 'aceita', ong = $1, aceita_em = to_char(now(), 'YYYY-MM-DD HH24:MI:SS')
     WHERE id = $2 AND status = 'disponivel'
     RETURNING *`,
    [ong, id]
  );
  return rows[0];
}

export async function confirmarRetirada(id, ong) {
  const { rows } = await query(
    `UPDATE doacoes
       SET status = 'concluida', concluida_em = to_char(now(), 'YYYY-MM-DD HH24:MI:SS')
     WHERE id = $1 AND ong = $2 AND status = 'aceita'
     RETURNING *`,
    [id, ong]
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
     WHERE ong = $1 AND status = 'concluida'
     ORDER BY concluida_em DESC`,
    [ong]
  );
  return rows;
}

export async function contarAceitasNoMes(mes) {
  const { rows } = await query(
    `SELECT COUNT(*) AS total FROM doacoes
       WHERE status IN ('aceita', 'concluida') AND substr(aceita_em, 1, 7) = $1`,
    [mes]
  );
  return Number(rows[0].total);
}
