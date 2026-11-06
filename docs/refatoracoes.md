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
  - link da execução do CI verde: **[PREENCHER após abrir o PR e o CI rodar]**

## Refatoração 2 — Extrair o tratamento de erro repetido das rotas (`src/app.js`)

- **Cheiro de código atacado:** duplicação. As 4 rotas de `src/app.js` (`GET /api/doacoes`, `POST /api/doacoes`, `POST /api/doacoes/:id/aceitar`, `GET /api/relatorios/doacoes-aceitas`) repetem o mesmo bloco `try { ... } catch (erro) { res.status(400).json({ erro: erro.message }) }`.
- **Qual dor concreta isso resolvia:** toda rota nova precisa copiar esse bloco de novo; esquecer o `try/catch` em uma rota futura faz o erro vazar sem resposta tratada, e mudar a forma da resposta de erro (por exemplo, para incluir um código de erro) exige editar em 4 lugares iguais, não em 1.
- **O que mudou:** ainda não aplicada.
- **Evidência (testes verdes antes e depois):** N/A — ver limitações.

---

**Limitações e o que ficou de fora:**

- A Refatoração 2 está escolhida e registrada nesta data, mas ainda não aplicada — entra em um PR separado, com os testes verdes antes e depois, até o Trabalho 3 (conforme o enunciado da Aula 12 permite).
- A trava `NODE_ENV=test` em `limparBanco()` (caminho PostgreSQL) foi implementada e verificada manualmente, mas ainda não tem teste automatizado próprio — diferente da trava do SQLite (`tests/protecao-banco.test.js`), que já tinha. Não escrevemos esse teste agora por risco de instabilidade: ele precisaria alternar `NODE_ENV` global enquanto outros arquivos de teste rodam em paralelo contra o mesmo banco, e isso poderia interferir nos demais testes. Fica registrado como próximo passo.
