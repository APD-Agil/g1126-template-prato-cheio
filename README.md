# Prato Cheio — SANADECOPPER

Projeto da disciplina **Análise, Projeto e Desenvolvimento Ágil**.
Conecta doadores de alimentos excedentes a ONGs, antes que a comida se perca.

> Este repositório é a base do produto que evolui nas três unidades:
> walking skeleton (U1) → incremento guiado pelo projeto (U2) → produto refatorado (U3).

## Integrantes
- Davi Rudinei Peres — @daavizeira
- Henrique Osmar Adelino — @hosmaradelino
- Otavio Santana Possenti — @otaviosantanna
- Pedro Henrique Coppola — @pedrohenriquecoppola
- Willian Vinicius Ramalho - @willianramalho

## Donos e revisores (Trabalho 3)

Cada história tem um dono e um revisor diferentes. Em grupo de 5, a quinta pessoa é dona do fechamento.

| Item | Dono | Revisor |
|---|---|---|
| Iteração 0 — estados da doação e base | Willian Vinicius Ramalho | Pedro Henrique Coppola |
| H1 · O doador acompanha as suas doações | Willian Vinicius Ramalho | Davi Rudinei Peres |
| H2 · O voluntário confirma a coleta | Otavio Santana Possenti | Henrique Osmar Adelino |
| H3 · A ONG devolve uma doação aceita + Refatoração 2 | Davi Rudinei Peres | Pedro Henrique Coppola |
| H4 · A Marta vê o resultado do mês | Pedro Henrique Coppola | Otavio Santana Possenti |
| Fechamento (validação, demo, retrospectiva, `entrega-3`) | Henrique Osmar Adelino | Willian Vinicius Ramalho |

## Como rodar

Requisitos: **Node.js 22.13 ou superior** e PostgreSQL 16 acessível. A aplicação lê `DATABASE_URL` do ambiente; ela não carrega automaticamente um arquivo `.env`. O valor local usado pelo CI está em `.env.example`.

Para criar um PostgreSQL local com Docker (primeira execução):

```bash
docker run --name prato-cheio-postgres -e POSTGRES_USER=pratocheio -e POSTGRES_PASSWORD=pratocheio -e POSTGRES_DB=pratocheio -p 5432:5432 -d postgres:16-alpine
```

Esse comando cria o contêiner uma vez. Em execuções seguintes, use `docker start prato-cheio-postgres`. Antes de migrar o schema, aguarde `docker exec prato-cheio-postgres pg_isready -U pratocheio` informar que o servidor está aceitando conexões.

No PowerShell, defina a conexão e execute:

```powershell
$env:DATABASE_URL = 'postgres://pratocheio:pratocheio@localhost:5432/pratocheio'
npm ci             # instala as dependências do clone limpo
npm run db:migrar  # cria/atualiza o schema no PostgreSQL
npm start          # sobe em http://localhost:3000
```

No macOS/Linux (bash/zsh), troque a primeira linha por `export DATABASE_URL=postgres://pratocheio:pratocheio@localhost:5432/pratocheio` e rode os mesmos três comandos.

Em outro terminal, com o mesmo `DATABASE_URL`, rode `npm test`. Para desenvolvimento com recarga automática, use `npm run dev`. A aplicação também migra o schema ao iniciar.

Os testes usam o PostgreSQL configurado pelo Vitest; no CI, o workflow sobe um serviço PostgreSQL 16 isolado.

## O banco: PostgreSQL

| Unidade | Banco | O que precisa instalar |
|---|---|---|
| 1 — Análise | SQLite (`node:sqlite`, embutido) | nada além do Node |
| 2 — Projeto | SQLite | nada |
| 3 — Construção | **PostgreSQL 16** | um PostgreSQL acessível por `DATABASE_URL` |

A migração para PostgreSQL foi registrada no **ADR 0001** e executada na Unidade 3. O CI também roda os testes contra PostgreSQL 16.

`src/db.js` concentra a conexão e expõe `query()` devolvendo `{ rows }`; `DATABASE_URL` seleciona o PostgreSQL usado pela aplicação.

## Estrutura

```
src/server.js        entrypoint (npm start)
src/db.js            conexão e schema do banco (pronto)
src/app.js           rotas da API
src/doacoes.js       regras de negócio
src/repositorio.js   acesso ao banco (SQL)
public/index.html    interface (funciona no celular)
tests/               testes automatizados
docs/analise.md      documento de análise   (Trabalho 1)
docs/projeto.md      documento de projeto   (Trabalho 2)
docs/adr/            decisões arquiteturais (Trabalho 2)
docs/validacao.md    validação e testes     (Trabalho 3)
docs/refatoracoes.md refatorações feitas    (Trabalho 3)
docs/demo.md         roteiro da demo        (Trabalho 3)
docs/retrospectivas/ retrospectiva de cada iteração
.github/workflows/   pipeline de CI
```

## Como trabalhar (fluxo de Pull Request)

A partir da Unidade 2, **nada entra direto na `main`**:

```bash
git checkout -b historia/ong-aceita-doacao
# ... implementa, escreve o teste, roda npm test ...
git commit -m "ONG aceita uma doação e ela sai da lista"
git push -u origin historia/ong-aceita-doacao
```

Abra o Pull Request no GitHub, preencha o template, espere o **CI ficar verde** e
peça a revisão de **outro integrante**. Só então faça o merge.

  ## Definição de pronto

  Pronto, no nosso grupo, é:

  - [ ] CI verde no PR — onde se confere: aba **Checks** do PR
  - [ ] Aprovado por um integrante que não é o autor — onde se confere: aba **Reviews** do PR
  - [ ] Pelo menos um teste novo com o nome do critério da fatia (um `it`, não `it.todo`) — onde se confere: aba **Files changed** do PR, em `tests/`
  - [ ] Critério da fatia escrito em Dado / Quando / Então — onde se confere: seção **História / decisão relacionada** da descrição do PR
  - [ ] Passos de verificação que o revisor consegue repetir — onde se confere: seção **Como verificar** da descrição do PR
  - [ ] Uso de IA declarado (o que gerou, o que ficou, o que mudou e por quê, ou "não usamos") — onde se confere: seção **Uso de IA** da descrição do PR

## O que já está pronto e o que falta

Pronto (Trabalho 3): a vida inteira de uma doação. O doador publica e acompanha as suas doações (H1). A ONG aceita com exclusividade. O voluntário confirma a coleta com nome e horário (H2). A ONG pode devolver uma doação aceita, com motivo (H3). A Marta vê o resultado do mês: publicadas, aceitas, coletadas, devoluções e tempo médio até a coleta (H4). Os estados e as transições estão na decisão 4 de `docs/projeto.md`. A validação está em `docs/validacao.md` e a demo em `docs/demo.md`.

Falta (ver `docs/validacao.md` → Limitações do produto): login de doador e ONG (hoje vale o nome digitado), baixa automática de doações vencidas e relatório no horário de Brasília.

## Uso de IA

A IA pode participar da produção, mas o grupo é responsável por verificar, testar,
corrigir e **defender** o resultado. Registre em cada Pull Request o que foi gerado
com IA e o que vocês alteraram.
