import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const diretorio = mkdtempSync(join(tmpdir(), 'prato-cheio-protecao-'));
const arquivo = join(diretorio, 'dados.sqlite');
const databaseFileOriginal = process.env.DATABASE_FILE;

process.env.DATABASE_FILE = arquivo;
const db = await import('../src/db.js');

beforeAll(async () => {
  await db.migrar();
  await db.query(
    `INSERT INTO doacoes (tipo, quantidade, validade) VALUES (?, ?, ?)`,
    ['Sopa', '10 porções', '2099-01-01T00:00:00.000Z']
  );
});

afterAll(async () => {
  await db.encerrar();
  if (databaseFileOriginal === undefined) {
    delete process.env.DATABASE_FILE;
  } else {
    process.env.DATABASE_FILE = databaseFileOriginal;
  }
  rmSync(diretorio, { recursive: true, force: true });
});

describe('proteção da limpeza do banco', () => {
  // Dado que o banco em uso não é o banco de teste em memória
  // Quando a limpeza é chamada
  // Então a operação falha e nenhuma doação é apagada
  it('recusa limpar e preserva as doações do banco que não é de teste', async () => {
    await expect(db.limparBanco()).rejects.toThrow(/Limpeza recusada/);

    const { rows } = await db.query('SELECT tipo FROM doacoes');
    expect(rows).toEqual([{ tipo: 'Sopa' }]);
  });
});
