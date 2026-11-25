# Refatorações — Prato Cheio

*Trabalho 3 · uma seção por refatoração · o que importa é o motivo e a evidência*

## Refatoração 1 — Migração de SQLite para PostgreSQL

- **Motivo:** [ADR 0001](adr/0001-migracao-banco.md) previa a migração para a Unidade 3, mantendo o comportamento das rotas e das regras de negócio e com a troca do driver encapsulada em `src/db.js` (seção "Critério de validação" do próprio ADR).
- **O que mudou:**
  - `src/db.js`: passa a usar `pg` (PostgreSQL) via `DATABASE_URL` como caminho principal. `query()` continua devolvendo `{ rows }`. O caminho com `node:sqlite` foi mantido só para `tests/protecao-banco.test.js`, que fala com este arquivo diretamente (sem passar por `src/repositorio.js`) e não podia mudar; ele é escolhido só quando `DATABASE_FILE` está definida, e nenhum outro lugar do projeto define essa variável.
  - `src/repositorio.js`: todas as consultas trocaram `?` por `$1, $2, …` (dialeto do PostgreSQL); `datetime('now')` virou `to_char(now(), 'YYYY-MM-DD HH24:MI:SS')`; `contarAceitasNoMes` converte o `COUNT(*)` para `Number(...)`, porque o driver `pg` devolve contagens como string — sem essa conversão aqui, o relatório mensal voltaria `"1"` em vez de `1` para quem chama.
  - `limparBanco()` ganhou uma trava equivalente à do SQLite para o caminho PostgreSQL: só limpa quando `NODE_ENV=test`, valor definido unicamente em `vitest.config.js`.
  - `.github/workflows/ci.yml`: bloco `services: postgres` e `DATABASE_URL` descomentados — o CI passa a rodar os testes contra PostgreSQL de verdade, não mais SQLite em memória.
  - `vitest.config.js`: troca `DATABASE_FILE: ':memory:'` (global) por `DATABASE_URL` (com padrão local igual ao do CI) e `NODE_ENV: 'test'`.
  - `.env.example` e `package.json`/`package-lock.json` (dependência `pg`) atualizados.
- **O que NÃO mudou:** `src/app.js`, `src/doacoes.js`, `public/` e toda a pasta `tests/` — confirmado por `git diff --exit-code -- tests/ src/app.js src/doacoes.js public/`, que não aponta nenhuma diferença. As regras de negócio (validade mínima de 2h, exclusividade do aceite, contagem mensal) e os testes que já existiam continuam exatamente iguais.
- **Evidência de que o comportamento se manteve:**
  - testes antes da mudança: 8 passando (SQLite em memória)
  - testes depois da mudança: 8 passando (PostgreSQL real, incluindo o teste de concorrência do aceite exclusivo rodando sobre um banco com bloqueio de linha de verdade)
  - link da execução do CI verde: [build-e-testes do PR #10](https://github.com/APD-Agil/g1126-template-prato-cheio/actions/runs/42316466591/job/128230159557) (PostgreSQL 16 no serviço do workflow)
  - PR da migração: [#10](https://github.com/APD-Agil/g1126-template-prato-cheio/pull/10) — `src/doacoes.js` fora do diff

## Refatoração 2 — Extrair a checagem de transição de estado (`src/doacoes.js`)

- **Cheiro de código atacado:** duplicação (regra de três). Com a fatia 1 da H3, três operações (`aceitar`, `confirmarColeta`, `devolver`) começavam do mesmo jeito: buscar a doação, recusar se ela não existe, conferir se a transição é permitida (estado de origem e, em duas delas, a ONG dona) e recusar de novo se o `UPDATE` condicional não afetasse nenhuma linha. Eram três cópias de ~15 linhas, cada uma com as suas mensagens.
- **Qual dor concreta isso resolvia:** a próxima transição (ou a mudança de uma regra, como a H3 fatia 3) teria de ser escrita, ou consertada, em três lugares. Na H2, a inversão de regra já mostrou o custo: a regra do CA2 morava em dois lugares e foi preciso mexer nos dois. E o contrato de estados (`docs/projeto.md`, decisão 4) não aparecia em lugar nenhum do código.
- **Por que esta e não a do `try/catch` das rotas** (registrada na Aula 12 e não aplicada): a duplicação das rotas não doeu em nenhuma história; a das transições doeu na H2 (inversão) e ia doer na H3 fatia 3. O critério foi a dor na próxima mudança.
- **O que mudou:** `src/doacoes.js` ganhou a tabela `TRANSICOES` (de que estado cada operação parte e com que mensagens recusa) e a função `transicionar(id, operacao, { ong, atualizar })`, que faz a busca, as recusas e a chamada ao `UPDATE` condicional. `aceitar`, `confirmarColeta` e `devolver` passaram a ter só a validação da entrada e uma chamada a `transicionar`. As mensagens, os códigos HTTP e as consultas SQL não mudaram; `tests/` não mudou.
- **Evidência (testes verdes antes e depois):**
  - antes: **32 passando** (`npm test` no branch `historia/h3-devolver`; CI do PR #15: [build-e-testes](https://github.com/APD-Agil/g1126-template-prato-cheio/pull/15/checks))
  - depois: **32 passando**, com o mesmo conjunto de testes (o diff do PR só toca `src/doacoes.js` e este documento); CI do PR #16: [build-e-testes](https://github.com/APD-Agil/g1126-template-prato-cheio/pull/16/checks)
  - o teste de concorrência do aceite (`permite apenas um aceite quando duas ONGs disputam o lote simultaneamente`) continua verde: a exclusividade segue no `UPDATE ... WHERE status = 'disponivel'`, e quem perde a corrida cai no `if (!atualizada)` de `transicionar`.
- Revisão: https://github.com/APD-Agil/g1126-template-prato-cheio/pull/16

---

**Limitações e o que ficou de fora:**

- A trava `NODE_ENV=test` em `limparBanco()` (caminho PostgreSQL) foi implementada e verificada manualmente, mas ainda não tem teste automatizado próprio — diferente da trava do SQLite (`tests/protecao-banco.test.js`), que já tinha. Não escrevemos esse teste agora por risco de instabilidade: ele precisaria alternar `NODE_ENV` global enquanto outros arquivos de teste rodam em paralelo contra o mesmo banco, e isso poderia interferir nos demais testes. Fica registrado como próximo passo.
