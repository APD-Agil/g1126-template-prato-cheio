# ADR 0001 — Migrar o banco de SQLite para PostgreSQL 16, em contêiner no desenvolvimento e no CI

- **Data:** 08/10/2026
- **Status:** aceito
- **Executada em:** Unidade 3 (refatoração registrada em `docs/refatoracoes.md`, Refatoração 1)

## Contexto

Hoje o Prato Cheio guarda tudo numa única tabela `doacoes`, em SQLite embutido no Node (`node:sqlite`, em `src/db.js`). Nas Unidades 1 e 2 isso foi a escolha certa: ninguém instala nada, os testes rodam em SQLite em memória (`vitest.config.js`) e o grupo pôde se concentrar no fluxo crítico, publicar → listar → aceitar com exclusividade.

O que força a decidir agora:

1. **A exclusividade do aceite (Regra 2, História 7 ★, Cenário 2) precisa valer no piloto, não só no teste.** O `repositorio.aceitar` usa um `UPDATE … WHERE id = ? AND status = 'disponivel' RETURNING *` (Decisão de projeto #1). Num único processo Node com SQLite isso já é atômico. O SQLite, porém, trava o arquivo inteiro a cada escrita e só funciona com o arquivo no mesmo disco do processo. Ele não aguenta duas instâncias da aplicação nem um banco separado do servidor. É o que a Incerteza 4 da Análise antecipa: o desempenho conforme crescem usuários e doações.
2. **O dado precisa sobreviver ao servidor.** O orçamento é próximo de zero, então o piloto rodará em hospedagem gratuita. Nela o disco da aplicação costuma ser apagado a cada novo deploy, e um arquivo `dados.sqlite` iria junto. A Vigilância Sanitária tem influência alta e pode vetar o app (mapa de stakeholders). Ela exige registro de quem publicou cada doação (Conflito 1), e perder o banco é perder esse registro. O README ainda lembra que o SQLite falha com `disk I/O error` em pasta sincronizada ou disco de rede.
3. **A disciplina exige PostgreSQL na Unidade 3**, alcançável por `DATABASE_URL` e com o CI verde (README, "O banco: SQLite agora, PostgreSQL depois").

**Por que só na Unidade 3:** a Unidade 2 é de projeto e não tem código novo. A troca é uma refatoração: o comportamento não muda, e os 6 testes de `tests/doacoes.test.js` provam isso. O custo de esperar é pequeno porque o `src/db.js` foi desenhado para conter a troca. Ele é o único arquivo que importa o driver do banco e expõe `query()` devolvendo `{ rows }`. O que for escrito até lá sobre `query()` continua valendo.

**Restrições que pesam:** orçamento próximo de zero; 5 integrantes com máquinas diferentes; `main` protegida, com PR, 1 aprovação e o check `build-e-testes` verde (`docs/evidencias/protecao-main.md`); Node 22.13 ou superior.

## Alternativas consideradas

1. **Ficar em SQLite**
   - Prós: nada para instalar nem operar; os 6 testes já passam; nenhum risco de dialeto; copiar o banco é copiar um arquivo.
   - Contras: o arquivo fica preso ao disco do servidor, que se perde em hospedagem com disco efêmero; uma escrita por vez no arquivo inteiro; não atende à exigência da disciplina para a Unidade 3.

2. **PostgreSQL instalado diretamente em cada máquina**
   - Prós: sem camada extra; desempenho nativo.
   - Contras: cada integrante instala e configura sozinho (versão, usuário, senha, porta). As versões divergem entre as 5 máquinas e o CI. Quem usa Windows gasta mais tempo, e o suporte recai sobre quem souber configurar.

3. **PostgreSQL 16 em contêiner: `docker-compose.yml` local e *service container* no GitHub Actions** *(escolhida)*
   - Prós: a mesma imagem (`postgres:16-alpine`) e as mesmas credenciais em todas as máquinas e no CI, com um `docker compose up -d`. O bloco `services: postgres` já está pronto, comentado, em `.github/workflows/ci.yml`, e a `DATABASE_URL` já está em `.env.example`. O banco é descartável: apagar o volume zera tudo.
   - Contras: cada integrante precisa de Docker (no Windows, Docker Desktop com WSL2 e memória extra); o job do CI sobe um serviço a mais; é mais uma ferramenta para aprender.

4. **PostgreSQL em serviço gerenciado gratuito (Neon, Supabase ou Render) também para desenvolvimento e CI**
   - Prós: nada para instalar localmente; é o mesmo tipo de banco que o piloto pode usar.
   - Contras: testes de 5 pessoas e do CI no mesmo banco remoto interferem entre si. O `limparBanco()` dos testes apaga os dados de quem estiver usando ao mesmo tempo. Depende de internet e das regras de um plano gratuito que podem mudar.

## Decisão

Migrar para **PostgreSQL 16 em contêiner no desenvolvimento e no CI** (alternativa 3). O `src/db.js` passa a ler a conexão de `DATABASE_URL`.

- **Por que não ficar em SQLite (1):** os problemas do dado preso ao disco do servidor e da escrita única continuam. Ficar só adia a mesma decisão, com mais dados para migrar e sem atender à Unidade 3.
- **Por que não instalar em cada máquina (2):** com 5 máquinas e o CI, a versão diverge e o "na minha máquina funciona" volta. O contêiner resolve isso com um arquivo versionado no repositório.
- **Por que não serviço gerenciado para dev e CI (4):** o `limparBanco()` torna inviável compartilhar um banco entre os testes de várias pessoas.

**Fora deste ADR:** onde o banco do piloto vai morar. O código só conhece `DATABASE_URL`, então o piloto pode usar o mesmo contêiner num servidor ou um serviço gerenciado sem mudar uma linha de `src/`.

## Consequências

- **Positivas:**
  - Dev, CI e piloto passam a rodar o mesmo banco, na mesma versão.
  - O dado deixa de depender do disco do servidor da aplicação.
  - O custo da troca fica contido em `src/db.js`, ajustes de dialeto em `src/repositorio.js`, `vitest.config.js`, `.github/workflows/ci.yml`, `package.json` (driver `pg`), `README.md` e um novo `docker-compose.yml`. Rotas (`src/app.js`), regras (`src/doacoes.js`), tela (`public/index.html`) e testes (`tests/`) não mudam.

- **Negativas / o que abrimos mão:**
  - **`npm test` deixa de funcionar sem um PostgreSQL rodando.** Hoje basta o Node. Quem paga é cada integrante, que passa a precisar do Docker aberto só para rodar os testes, e quem não tem Docker funcionando fica sem rodar testes localmente até resolver.
  - **O dialeto muda, e alguém revisa tudo à mão.** O marcador `?` vira `$1, $2…` nas 4 consultas do `repositorio.js` e no comentário de `query()`. `INTEGER PRIMARY KEY AUTOINCREMENT` vira `GENERATED ALWAYS AS IDENTITY`. `datetime('now')` vira `now()`, e `criada_em` e `validade` deixam de ser `TEXT`. O retorno de escrita (`alteradas`) passa a vir de `rowCount`. Quem paga é quem executar a refatoração na Unidade 3.
  - **O CI fica mais lento**, porque o job espera o `pg_isready` do serviço antes dos testes. Quem paga é todo PR, na espera pelo check verde.
  - Abrimos mão de "copiar o banco = copiar um arquivo".

- **Riscos e o que fazer se der errado:**
  - Um integrante não consegue rodar Docker: ele aponta `DATABASE_URL` para um banco gerenciado gratuito só dele. Não muda código, é só outra variável.
  - A migração quebra algo que os testes não cobrem: reverter o PR da migração. Como só os arquivos da lista acima mudam, o `git revert` do merge devolve o SQLite inteiro.

## Rastreabilidade

- **Regra 2 (Exclusividade de Aceite por Lote) e História 7 ★, Cenário 2** (`docs/analise.md`): a exclusividade precisa valer no banco do piloto, sob concorrência real.
- **Conflito 1 e Risco 2** ("link mágico … dificultar a auditoria exigida pela Vigilância Sanitária", `docs/analise.md`): o registro de quem publicou só existe se o banco sobreviver ao servidor.
- **Incerteza 4** (desempenho conforme aumenta a quantidade de usuários e doações, `docs/analise.md`).
- **Decisão de projeto #1** (`docs/projeto.md`): o `UPDATE` condicional do lock otimista funciona igual em SQLite e PostgreSQL, por isso a troca não muda a regra.

## Critério de validação

O que precisa continuar igual depois da migração, e o que mostra isso. Tudo é conferido no PR da migração, na Unidade 3, por quem não o escreveu:

| O que continua igual | Comando ou teste que mostra |
|---|---|
| Os 6 testes de aceite passam sem que nenhum teste seja alterado | No CI, com o serviço `postgres` e a `DATABASE_URL` ativos: `npm test` → **6 passed (6)**. Hoje, em SQLite, também dá 6 passed. E `git diff --stat main...HEAD -- tests/` sem nenhuma linha |
| Rotas, regras de negócio e tela não mudam | `git diff --stat main...HEAD -- src/app.js src/doacoes.js public/` sem nenhuma linha |
| Só o `src/db.js` conhece o driver do banco | `grep -rn "from 'pg'\|require('pg')" src/` encontra apenas `src/db.js` |
| A aplicação sobe com o banco novo | O passo "Verificar se a aplicação sobe" do CI (`curl --fail http://localhost:3000/api/saude`) verde |
| Doações existentes não se perdem (se houver dados reais quando a migração for feita) | `SELECT status, count(*) FROM doacoes GROUP BY status;` antes (SQLite) e depois (PostgreSQL), com o mesmo resultado |

