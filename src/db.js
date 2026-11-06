// Conexão com o banco.
//
// UNIDADE 3: PostgreSQL é o banco do piloto e da produção, escolhido por
// DATABASE_URL (veja .env.example). `query()` continua devolvendo { rows },
// então quem consome este módulo (src/repositorio.js) não precisa saber
// qual driver está por trás.
//
// O caminho com `node:sqlite` abaixo não foi removido: ele existe só para
// tests/protecao-banco.test.js, que fala com este arquivo diretamente (sem
// passar por src/repositorio.js) para provar que limparBanco() recusa
// limpar um arquivo real. Esse teste é de antes da migração e não muda
// nesta PR (docs/adr/0001-migracao-banco.md, Critério de validação) — por
// isso o modo SQLite continua aqui, do jeito que já funcionava.
import { createRequire } from 'node:module';
import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;
// Só tests/protecao-banco.test.js define DATABASE_FILE. Se estiver definida,
// usamos o caminho legado; senão, PostgreSQL é o único banco válido.
const DATABASE_FILE = process.env.DATABASE_FILE;
const MODO = DATABASE_FILE ? 'sqlite' : 'postgres';

let pool;
let sqliteDb;

function conexaoPostgres() {
  if (!pool) {
    if (!DATABASE_URL) {
      throw new Error('Defina DATABASE_URL para conectar ao PostgreSQL (veja .env.example)');
    }
    pool = new Pool({ connectionString: DATABASE_URL });
  }
  return pool;
}

function conexaoSqlite() {
  if (!sqliteDb) {
    const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite');
    sqliteDb = new DatabaseSync(DATABASE_FILE);
  }
  return sqliteDb;
}

/**
 * Executa uma consulta e devolve { rows }.
 * PostgreSQL (modo atual): use $1, $2, ... como marcador de parâmetro.
 *   query('SELECT * FROM doacoes WHERE id = $1', [id])
 */
export async function query(sql, valores = []) {
  if (MODO === 'postgres') {
    const resultado = await conexaoPostgres().query(sql, valores);
    return { rows: resultado.rows, alteradas: resultado.rowCount };
  }

  // Caminho legado (SQLite) — usado apenas por tests/protecao-banco.test.js.
  const stmt = conexaoSqlite().prepare(sql);
  const ehLeitura = /^\s*(select|with)/i.test(sql) || /returning/i.test(sql);
  if (ehLeitura) return { rows: stmt.all(...valores) };
  const info = stmt.run(...valores);
  return { rows: [], alteradas: info.changes };
}

/** Cria o schema, se ainda não existir. Rodado por `npm run db:migrar` e ao subir o servidor. */
export async function migrar() {
  if (MODO === 'postgres') {
    await conexaoPostgres().query(`
      CREATE TABLE IF NOT EXISTS doacoes (
        id          SERIAL PRIMARY KEY,
        tipo        TEXT NOT NULL,
        quantidade  TEXT NOT NULL,
        validade    TEXT NOT NULL,
        status      TEXT NOT NULL DEFAULT 'disponivel',
        ong         TEXT,
        aceita_em   TEXT,
        criada_em   TEXT NOT NULL DEFAULT to_char(now(), 'YYYY-MM-DD HH24:MI:SS')
      )
    `);
    // Equivalente ao PRAGMA table_info usado no SQLite: garante a coluna em
    // bancos criados antes dela existir, sem precisar de uma migração separada.
    await conexaoPostgres().query(`ALTER TABLE doacoes ADD COLUMN IF NOT EXISTS aceita_em TEXT`);
    return;
  }

  // Caminho legado (SQLite) — inalterado, usado só pelo teste de proteção.
  conexaoSqlite().exec(`
    CREATE TABLE IF NOT EXISTS doacoes (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      tipo        TEXT NOT NULL,
      quantidade  TEXT NOT NULL,
      validade    TEXT NOT NULL,
      status      TEXT NOT NULL DEFAULT 'disponivel',
      ong         TEXT,
      aceita_em   TEXT,
      criada_em   TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  const colunas = conexaoSqlite().prepare('PRAGMA table_info(doacoes)').all();
  if (!colunas.some((coluna) => coluna.name === 'aceita_em')) {
    conexaoSqlite().exec('ALTER TABLE doacoes ADD COLUMN aceita_em TEXT');
  }
}

/**
 * Apaga todos os dados. Usado pelos testes.
 *
 * PostgreSQL: só roda com NODE_ENV=test (definido só em vitest.config.js),
 * para não repetir o incidente do piloto (ADR 0001) com o novo banco.
 * SQLite (legado): só roda com DATABASE_FILE=':memory:', como antes.
 */
export async function limparBanco() {
  if (MODO === 'postgres') {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('Limpeza recusada: limparBanco só pode ser usado com NODE_ENV=test');
    }
    await conexaoPostgres().query('DELETE FROM doacoes');
    return;
  }

  if (DATABASE_FILE !== ':memory:') {
    throw new Error('Limpeza recusada: limparBanco só pode ser usado com SQLite em memória');
  }
  conexaoSqlite().exec('DELETE FROM doacoes');
}

export async function encerrar() {
  if (pool) { await pool.end(); pool = undefined; }
  if (sqliteDb) { sqliteDb.close(); sqliteDb = undefined; }
}
