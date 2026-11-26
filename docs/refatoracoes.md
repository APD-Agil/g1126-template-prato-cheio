# Refatorações — Prato Cheio

*Trabalho 3 · uma seção por refatoração · o motivo e a evidência*

## Refatoração 1 — Migração de SQLite para PostgreSQL

- **Motivo:** o [ADR 0001](adr/0001-migracao-banco.md) previa a migração na Unidade 3, sem mudar o comportamento das rotas e regras, com a troca do driver contida em `src/db.js`.
- **O que mudou:**
  - `src/db.js` usa `pg` via `DATABASE_URL`, e `query()` segue devolvendo `{ rows }`. O caminho `node:sqlite` ficou só para `tests/protecao-banco.test.js`. `limparBanco()` passou a exigir `NODE_ENV=test`.
  - `src/repositorio.js`: `?` → `$1, $2…`; `datetime('now')` → `to_char(now(), …)`.
  - CI com `services: postgres`, além de `vitest.config.js`, `.env.example` e `pg`.
- **O que NÃO mudou:** `src/app.js`, `src/doacoes.js`, `public/` e `tests/` (`git diff --exit-code` vazio para esses caminhos).
- **Evidência:** 8 testes verdes antes (SQLite) e 8 depois (PostgreSQL real, incluindo a concorrência do aceite). [CI verde do PR #10](https://github.com/APD-Agil/g1126-template-prato-cheio/actions/runs/42316466591/job/128230159557); [PR #10](https://github.com/APD-Agil/g1126-template-prato-cheio/pull/10), sem `src/doacoes.js` no diff.

## Refatoração 2 — Extrair a checagem de transição de estado (`src/doacoes.js`)

- **Cheiro:** duplicação (regra de três). Com a fatia 1 da H3, `aceitar`, `confirmarColeta` e `devolver` começavam igual: buscar a doação, recusar se não existe, conferir a transição (estado de origem e, em duas, a ONG dona) e recusar se o `UPDATE` condicional não afetasse linha. Eram três cópias de cerca de 15 linhas.
- **Dor na próxima mudança:** cada transição nova, ou cada mudança de regra (a fatia 3 da H3), seria escrita em três lugares. Na H2, a inversão já precisou mexer em dois. O contrato de estados (decisão 4 de `docs/projeto.md`) não existia no código. Escolhemos esta em vez do `try/catch` das rotas (registrado na Aula 12) porque foi esta que doeu.
- **O que mudou:** a tabela `TRANSICOES` (estado de origem e mensagens de cada operação) e `transicionar(id, operacao, { ong, atualizar })`, com a busca, as recusas e o `UPDATE`. As três operações ficaram só com a validação da entrada e uma chamada. Mensagens, HTTP, SQL e `tests/` não mudaram.
- **Evidência:** **32 verdes antes** (base `historia/h3-devolver`, [CI do PR #15](https://github.com/APD-Agil/g1126-template-prato-cheio/pull/15/checks)) e **32 verdes depois**, os mesmos testes ([CI do PR #16](https://github.com/APD-Agil/g1126-template-prato-cheio/pull/16/checks)). A concorrência do aceite segue verde: quem perde a corrida cai no `if (!atualizada)`.
- Revisão: https://github.com/APD-Agil/g1126-template-prato-cheio/pull/16

**Próximo passo:** o teste da trava `NODE_ENV=test` de `limparBanco()`. Ficou viável desde que os arquivos de teste rodam em sequência (`fileParallelism: false`).
