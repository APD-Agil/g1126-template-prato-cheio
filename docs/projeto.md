# Documento de Projeto — Prato Cheio

*Trabalho 2 · Projeto + Incremento · SANADECOPPER*

## Decisões de projeto
| # | Decisão | Alternativas viáveis | Escolha e justificativa | Requisito/risco da Análise |
|---|---|---|---|---|
| 1 | Acesso ao banco no backend | (A) SQL direto com `node:sqlite`; (B) ORM, como Prisma, sobre SQLite | **A.** O projeto usa o SQLite embutido no Node.js 22+, sem dependência adicional. O módulo `src/db.js` concentra a conexão e `src/repositorio.js` mantém as consultas fora das rotas e das regras de negócio. | Incerteza sobre desempenho conforme cresce o volume de usuários e doações (`docs/analise.md`, Incertezas); a Regra 2 exige exclusividade no aceite (`docs/analise.md`, Regra 2). |
| 2 | Interface para doadores e ONGs | (A) HTML, CSS e JavaScript servidos diretamente pelo Express; (B) aplicação React separada consumindo a API | **A.** A interface atual é uma página leve em `public/index.html`, adequada ao escopo do piloto e acessível pelo navegador do celular sem uma etapa de compilação frontend. | A interface dos doadores deve ser simples para garantir engajamento (`docs/analise.md`, Stakeholders — Doadores); voluntários usam o sistema na rua (`docs/analise.md`, Stakeholders — Voluntários Entregadores). |
| 3 | Banco usado pelos testes | (A) SQLite em memória, configurado pelo Vitest; (B) arquivo SQLite temporário isolado para cada execução | **A.** `vitest.config.js` aponta `DATABASE_FILE` para `:memory:`. `limparBanco()` recusa bancos fora dessa configuração, e o teste de proteção usa um arquivo temporário para provar que dados não são apagados. | A exclusividade da doação precisa ser verificável por teste (História 7, `docs/analise.md`); o incidente de perda de dados do piloto motivou a proteção documentada no ADR 0001. |

## Tabela de trade-offs

Comparação da decisão 1 — acesso ao banco:

| Critério | (A) SQL direto com `node:sqlite` — escolhida | (B) ORM, como Prisma | Requisito/Risco da Análise |
|---|---|---|---|
| Instalação e operação no piloto | SQLite é embutido no Node; não requer serviço separado | Exige instalar e configurar dependências e cliente do ORM | Orçamento próximo de zero e piloto de um bairro (`docs/analise.md`, contexto e objetivos). |
| Controle das consultas | SQL explícito no repositório, com parâmetros vinculados | Consultas geradas pela API do ORM, com menos SQL explícito | Regra 2: exclusividade de aceite do lote (`docs/analise.md`, Regras de negócio). |
| Troca planejada para PostgreSQL | A interface `query()` concentra o driver; dialeto e conexão ainda precisarão ser adaptados | O ORM pode abstrair parte do dialeto, mas exige migração do schema e adoção de suas ferramentas | Incerteza 4 sobre desempenho com aumento de usuários e doações (`docs/analise.md`, Incertezas). |
| Custo para a equipe | Menos dependências agora; quem migrar na Unidade 3 adapta e valida SQL e schema | Menos SQL manual em algumas operações, mas a equipe aprende e mantém o ORM desde o piloto | Incerteza 4 e necessidade de medir o crescimento antes de escalar (`docs/analise.md`, Incertezas). |

## Diagramas

- [Diagrama de contexto](diagramas/contexto.md)
- [Diagrama de dados](diagramas/dados.md)

Não há divergências estruturais declaradas entre o diagrama de dados atual e o schema criado por `migrar()` em `src/db.js`: o diagrama inclui `aceita_em`, acrescentado para registrar o instante do aceite. Os tipos e a nulabilidade documentados também correspondem ao SQLite atual.

## ADRs

- **ADR 0000 — Modelo de ADR:** [modelo](adr/0000-modelo-adr.md).
- **ADR 0001 — Banco do piloto e migração:** [decisão vigente](adr/0001-migracao-banco.md). O registro anterior [histórico da decisão de migração](adr/historico-migracao-sqlite-postgresql.md) está substituído por este ADR após a mudança de contexto do piloto.
- **ADR 0002 — Stack do piloto:** [decisão vigente](adr/0002-stack-piloto.md), sobre Node.js, SQLite nativo, Express e interface HTML/CSS/JavaScript sem ORM ou framework frontend.

## Requisitos não-funcionais

Quando duas ONGs tentarem aceitar a mesma doação disponível ao mesmo tempo, o sistema confirmará exatamente um aceite e recusará o outro, medido pelo teste automatizado concorrente em `tests/doacoes.test.js`, com uma resposta HTTP 200 e uma HTTP 400. Isso muda a decisão 1 sobre acesso ao banco a um custo de quem implementar e manter os testes e a persistência.

Quando uma pessoa acessar a interface em um celular com viewport de 360 px, o sistema apresentará os campos e controles sem exigir uma página frontend separada, medido pela observação da página com viewport de 360 px e pela configuração `meta viewport` em `public/index.html`. Isso muda a decisão 2 a um custo da equipe, que mantém o layout responsivo na página estática.

Quando `limparBanco()` for chamado com um banco diferente de SQLite em memória, o sistema recusará a limpeza antes de executar o `DELETE`, medido pelo teste em `tests/protecao-banco.test.js`, que também verifica a permanência da doação. Isso muda a decisão 3 a um custo de quem configura e executa os testes, que deve manter `DATABASE_FILE=:memory:` na configuração de teste.

## Critérios de validação do projeto

| # | Critério verificável (sim/não) | Fonte | Resultado no repositório |
|---|---|---|---|
| 1 | A conexão usa o módulo nativo `node:sqlite` e as consultas são parametrizadas, sem ORM listado como dependência? | `src/db.js`, `src/repositorio.js`, `package.json` | Sim |
| 2 | O Vitest configura o banco de testes como SQLite em memória? | `vitest.config.js` | Sim |
| 3 | Existe teste que comprova que a limpeza de um banco não configurado como memória falha e preserva a doação? | `tests/protecao-banco.test.js` | Sim |
| 4 | O aceite grava `aceita_em` e a API tem teste BDD para contar os aceites do mês? | `src/db.js`, `src/repositorio.js`, `src/app.js`, `tests/doacoes.test.js` | Sim |
| 5 | O ADR descreve a migração SQLite → PostgreSQL na Unidade 3, o que deve permanecer igual e o comando de validação? | `docs/adr/0001-migracao-banco.md` → Critério de validação | Sim |
| 6 | Os links dos diagramas no documento apontam para arquivos existentes e o diagrama de dados reflete o schema atual? | `docs/projeto.md` → Diagramas; `docs/diagramas/contexto.md`; `docs/diagramas/dados.md` | Sim |

## Uso de IA

A IA foi usada para implementar a trava que impede `limparBanco()` de apagar dados quando o banco em uso não é o SQLite de teste em memória e para implementar a rota de relatório mensal de doações aceitas para a Marta. Para sustentar a contagem, a implementação acrescentou `aceita_em` ao schema e uma migração compatível com bancos SQLite existentes: `migrar()` verifica se a coluna já existe e só então executa `ALTER TABLE`.

Um erro da IA nesta entrega foi criar `0001-migracao-banco.md` sem resolver a existência do ADR anterior que também tinha o número 0001. Isso deixou duas decisões com o mesmo identificador e com status conflitantes. A equipe corrigiu a inconsistência mantendo o ADR de migração como 0001 vigente, marcando o documento anterior como substituído por este e criando o ADR 0002 para a decisão da stack do piloto.
