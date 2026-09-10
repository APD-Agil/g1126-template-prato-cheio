import { query } from './db.js';

// Insere a doação e devolve a linha criada.
export async function inserir({ tipo, quantidade, validade }) {
  const { rows } = await query(
    `INSERT INTO doacoes (tipo, quantidade, validade)
     VALUES (?, ?, ?)
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
  const { rows } = await query(`SELECT * FROM doacoes WHERE id = ?`, [id]);
  return rows[0];
}

export async function aceitar(id, ong) {
  const { rows } = await query(
    `UPDATE doacoes SET status = 'aceita', ong = ?
     WHERE id = ? AND status = 'disponivel'
     RETURNING *`,
    [ong, id]
  );
  return rows[0];
}
