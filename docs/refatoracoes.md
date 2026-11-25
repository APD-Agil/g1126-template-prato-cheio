# Refatorações — Prato Cheio

*Trabalho 3 · uma seção por refatoração · o que importa é o motivo e a evidência*

## Refatoração 1 — Migração de SQLite para PostgreSQL

- **Motivo:** [ADR 0001](adr/0001-migracao-banco.md) previa a migração para a Unidade 3, mantendo o comportamento das rotas e das regras de negócio e com a troca do driver encapsulada em `src/db.js` (seção "Critério de validação" do próprio ADR).
- **O que mudou:**
  - `src/db.js`: usa `pg` via `DATABASE_URL`, e `query()` continua devolvendo `{ rows }`. O caminho `node:sqlite` ficou só para `tests/protecao-banco.test.js` (ativado por `DATABASE_FILE`, que nenhum outro lugar define). `limparBanco()` ganhou a trava `NODE_ENV=test`.
  - `src/repositorio.js`: `?` → `$1, $2…`; `datetime('now')` → `to_char(now(), …)`; `COUNT(*)` convertido para `Number(...)`, porque o `pg` devolve contagem como texto.
  - `.github/workflows/ci.yml` (`services: postgres` + `DATABASE_URL`), `vitest.config.js`, `.env.example` e a dependência `pg`.
- **O que NÃO mudou:** `src/app.js`, `src/doacoes.js`, `public/` e `tests/` (`git diff --exit-code` vazio para esses caminhos). As regras e os testes continuaram iguais.
- **Evidência de que o comportamento se manteve:**
  - testes antes da mudança: 8 passando (SQLite em memória)
  - testes depois da mudança: 8 passando (PostgreSQL real, incluindo o teste de concorrência do aceite)
  - link da execução do CI verde: [build-e-testes do PR #10](https://github.com/APD-Agil/g1126-template-prato-cheio/actions/runs/42316466591/job/128230159557) (PostgreSQL 16 no serviço do workflow)
  - PR da migração: [#10](https://github.com/APD-Agil/g1126-template-prato-cheio/pull/10) — `src/doacoes.js` fora do diff

## Refatoração 2 — Extrair a checagem de transição de estado (`src/doacoes.js`)

- **Cheiro de código atacado:** duplicação (regra de três). Com a fatia 1 da H3, `aceitar`, `confirmarColeta` e `devolver` começavam igual: buscar a doação, recusar se não existe, conferir a transição (estado de origem e, em duas, a ONG dona) e recusar se o `UPDATE` condicional não afetasse linha. Eram três cópias de cerca de 15 linhas.
- **Qual dor concreta isso resolvia:** cada nova transição, ou cada mudança de regra (a fatia 3 da H3), seria escrita em três lugares. Na H2, a inversão já mostrou o custo: a regra do CA2 morava em dois lugares. E o contrato de estados (decisão 4 de `docs/projeto.md`) não existia no código.
- **Por que esta e não a do `try/catch` das rotas** (registrada na Aula 12): a das rotas não doeu em nenhuma história, e a das transições doeu na H2 e ia doer na H3.
- **O que mudou:** `src/doacoes.js` ganhou a tabela `TRANSICOES` (estado de origem e mensagens de cada operação) e `transicionar(id, operacao, { ong, atualizar })`, com a busca, as recusas e o `UPDATE` condicional. As três operações ficaram só com a validação da entrada e uma chamada. Mensagens, HTTP, SQL e `tests/` não mudaram.
- **Evidência (testes verdes antes e depois):**
  - antes: **32 passando** (base `historia/h3-devolver`; [CI do PR #15](https://github.com/APD-Agil/g1126-template-prato-cheio/pull/15/checks))
  - depois: **32 passando**, os mesmos testes (o diff só toca `src/doacoes.js` e este documento; [CI do PR #16](https://github.com/APD-Agil/g1126-template-prato-cheio/pull/16/checks))
  - o teste de concorrência do aceite segue verde: quem perde a corrida cai no `if (!atualizada)` de `transicionar`.
- Revisão: https://github.com/APD-Agil/g1126-template-prato-cheio/pull/16

---

**Limitações e o que ficou de fora:**

- A trava `NODE_ENV=test` de `limparBanco()` (caminho PostgreSQL) ainda não tem teste automatizado próprio, ao contrário da trava do SQLite. O motivo do adiamento era a execução paralela dos arquivos de teste; como desde a H1 eles rodam em sequência (`fileParallelism: false`), esse teste ficou viável e é o próximo passo.
