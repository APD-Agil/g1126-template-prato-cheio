# Documento de Projeto — Prato Cheio

*Trabalho 2 · máximo 4 páginas (fora diagramas) · entrega na Aula 10*

## Decisões de projeto
| # | Decisão | Alternativas | Requisito/risco da Análise que a motiva |
|---|---|---|---|
| 1 | Como garantir que apenas uma ONG consiga reservar um lote quando duas tentam aceitar ao mesmo tempo | (A) Lock otimista: coluna de versão no lote, `UPDATE ... WHERE status = 'DISPONIVEL' AND version = X`, e apenas a requisição que atualizar 1 linha vence; (B) Lock pessimista: transação com `SELECT ... FOR UPDATE` no lote antes de checar e alterar o status | Regra 2 (Exclusividade de Aceite por Lote) e a História 7 ★, cujo Cenário 2 exige que, sob concorrência, só uma ONG receba sucesso e a outra receba "Este lote já foi reservado por outra ONG" |
| 2 | Como autenticar doadores sem exigir cadastro de senha, mantendo rastreabilidade exigida pela Vigilância Sanitária | (A) Token opaco de uso único, persistido em tabela própria com expiração e vínculo ao telefone/contato do restaurante; (B) Token assinado sem estado (JWT) com expiração curta, validado apenas pela assinatura, sem registro em banco | Conflito 1 (Fricção de Acesso vs. Rastreabilidade de Identidade) — a saída adotada foi "adiar com data" o login completo, mas o mecanismo do link mágico da iteração 1 ainda precisa ser decidido |
| 3 | Como a lista de doações disponíveis chega atualizada às ONGs, considerando a janela curta de retirada | (A) Polling client-side: a tela da ONG consulta a lista a cada N segundos; (B) Atualização em tempo real via WebSocket/SSE, empurrando mudanças de status assim que ocorrem | Risco "janela de apenas 1 hora para retirada ser impraticável" e Objetivo de Impacto 1 (reduzir o tempo médio entre publicação e aceite) — um atraso na atualização da lista consome parte da janela de retirada |

## Tabela de trade-offs (uma decisão em detalhe)
Decisão detalhada: **#1 — Concorrência no aceite exclusivo do lote**

| Critério | (A) Lock otimista (versão) | (B) Lock pessimista (`SELECT FOR UPDATE`) |
|---|---|---|
| Consistência sob concorrência | Garante exclusividade: só a requisição que casar a versão atualiza; a perdedora recebe 0 linhas afetadas e trata como conflito | Garante exclusividade: a segunda transação bloqueia até a primeira commitar, depois vê o status já alterado e falha a validação |
| Complexidade de implementação | Baixa: uma coluna extra e uma condição no `UPDATE`, sem gerenciar transações longas | Média: exige controlar explicitamente o escopo da transação e o nível de isolamento do banco |
| Desempenho sob carga (poucas ONGs disputando o mesmo lote) | Alto: nenhuma requisição fica bloqueada esperando outra; conflitos são resolvidos no próprio `UPDATE` | Menor: a segunda requisição fica bloqueada (lock) até a primeira liberar, aumentando a latência percebida por quem perde |
| Risco de acoplamento à infraestrutura | Baixo: funciona igual em qualquer banco relacional, sem depender de sintaxe específica de lock | Maior: `SELECT FOR UPDATE` e o comportamento de lock variam entre bancos, dificultando trocar de banco depois |
| **Escolha para a iteração 1** | **Selecionada** — volume baixo de disputa no piloto (um bairro) não justifica pagar o custo de bloqueio, e a Regra 2 só exige que a exclusividade seja garantida, não que a resposta ao perdedor seja instantânea | Descartada por ora — reavaliar se o volume de disputas simultâneas crescer ao escalar para outros bairros |

## Diagramas
- Contexto (C4) e versão original do modelo de dados: `docs/aulas/Análise e Modelação de SistemaProjeto_ Prato Cheio.pdf`
- Modelo de dados atualizado, com as divergências em relação ao `src/db.js`: [docs/diagramas/dados.md](diagramas/dados.md)

## ADRs
| ADR | Decisão | Status |
|---|---|---|
| [ADR 0001 — Migração SQLite → PostgreSQL](adr/0001-migracao-sqlite-postgresql.md) | PostgreSQL 16 em contêiner no desenvolvimento e no CI, conexão por `DATABASE_URL`; executada na Unidade 3 | aceito · 08/10/2026 · revisado em 08/10/2026 (decisão mantida) |

## Requisitos não-funcionais
| Requisito | Como afeta o design |
|---|---|
| **RNF1 — Aceite exclusivo sob concorrência.** **Quando** duas ONGs enviam `POST /api/doacoes/:id/aceitar` para o mesmo lote `disponivel` ao mesmo tempo, **o sistema** confirma uma (HTTP 200, status `aceita`) e recusa a outra (HTTP 400, "Este lote já foi reservado por outra ONG"), e o lote fica vinculado a uma ONG só. **Medido por** um teste automatizado que dispara as duas requisições em paralelo (`Promise.all`) contra o PostgreSQL do CI e repete o disparo 20 vezes. Passa se as 20 rodadas tiverem exatamente um 200 e um 400. | Afeta a **Decisão de projeto #1** (aceite por `UPDATE … WHERE status = 'disponivel'`, sem checar e depois gravar) e o **ADR 0001**: o teste só prova algo se rodar contra o mesmo banco do piloto, por isso o CI passa a subir o serviço `postgres`. **Custo:** `npm test` passa a exigir um PostgreSQL rodando, e quem paga é cada integrante (Docker aberto para testar) e cada PR (CI mais lento). Hoje o teste de disputa (`recusa aceitar uma doação que já foi aceita…`) faz as duas tentativas em sequência, não em paralelo. |
| **RNF2 — Lista atualizada dentro da janela de retirada.** *Nasce da restrição do caso: a retirada tem janela de 1 hora após o aceite (Conflito 2, `docs/analise.md`).* **Quando** um doador publica uma doação e uma ONG já está com a lista aberta no celular, **o sistema** mostra a doação nova nessa lista em até 30 s, sem a ONG recarregar a página. Do mesmo modo, uma doação aceita por outra ONG some em até 30 s. **Medido por** dois navegadores lado a lado: publicar (ou aceitar) no primeiro e cronometrar até mudar no segundo, 5 vezes. Passa se as 5 ficarem em até 30 s. | Fecha a **Decisão de projeto #3**, em favor da alternativa (A), polling: a tela da ONG consulta `GET /api/doacoes` a cada 15 s. WebSocket ou SSE fica de fora, porque 30 s cabem com folga na janela de 1 h. **Custo:** cada tela aberta faz 4 requisições por minuto ao servidor e ao banco, e quem paga é a cota do plano gratuito de hospedagem. A ONG ainda pode ver por até 15 s um lote que já foi aceito, e quem paga é a ONG que clica e recebe a recusa. Hoje `public/index.html` só atualiza a lista depois de uma ação do próprio usuário. |
| **RNF3 — Trocar o banco sem tocar em regra.** **Quando** o banco for trocado de SQLite para PostgreSQL (Unidade 3), **o sistema** mantém as rotas, as regras de negócio, a tela e os testes sem alteração. **Medido por** `git diff --stat main...HEAD -- tests/ src/app.js src/doacoes.js public/` vazio no PR da migração, `npm test` com 6 de 6 passando no CI e `grep -rn "from 'pg'" src/` apontando só `src/db.js`, conferidos por quem não escreveu o PR. | Afeta o **ADR 0001** e a estrutura do código: toda consulta passa pela `query()` única de `src/db.js`, e nenhuma rota fala com o banco. **Custo:** nenhum atalho com SQL solto numa rota ou em `doacoes.js`. Toda consulta nova exige uma função em `repositorio.js`, e quem paga é quem implementar as próximas histórias (por exemplo a #8). |

> Restrições do caso (orçamento próximo de zero, piloto de um bairro, uso no celular) não viram cenário: entram no contexto do ADR 0001.
> **Escalabilidade para outros bairros fica fora do piloto.** O volume real é desconhecido (Incerteza 4), então isto é uma decisão declarada, não uma omissão.

## Critérios de validação do projeto
V = verificar (projeto × especificado) · C = cobrir o caso (validar). Cada linha se responde só com o repositório.

| # | Tipo | Critério (sim/não) | Fonte | Resposta em 08/10/2026 |
|:--:|:--:|---|---|:--:|
| 1 | V | Toda decisão de `## Decisões de projeto` cita uma regra, história, conflito ou risco de `docs/analise.md`? | `docs/projeto.md` → `## Decisões de projeto` × `docs/analise.md` | sim |
| 2 | V | O ADR da migração tem "ficar em SQLite" como alternativa e pelo menos uma consequência negativa que diz quem paga? | `docs/adr/0001-migracao-sqlite-postgresql.md` → Alternativas e Consequências | sim |
| 3 | V | O ADR da migração diz o que deve continuar igual e dá um comando para cada item (`npm test` com 6 de 6, `git diff` vazio em `tests/`, `src/app.js`, `src/doacoes.js` e `public/`)? | `docs/adr/0001-migracao-sqlite-postgresql.md` → Critério de validação | sim |
| 4 | V | Só o `src/db.js` importa o driver do banco? (`grep -rn "node:sqlite\|DatabaseSync" src/` encontra apenas `src/db.js`) | `src/` | sim |
| 5 | V | Toda diferença entre o diagrama de dados e o schema de `migrar()` em `src/db.js` aparece na tabela de divergências? | `docs/diagramas/dados.md` → Divergências declaradas × `src/db.js` | sim |
| 6 | V | Cada requisito não-funcional tem condição, resposta, medida com o jeito de medir e a decisão que ele afeta? | `docs/projeto.md` → `## Requisitos não-funcionais` | sim |
| 7 | C | Cada critério de aceite das Histórias 6 e 7 ★ tem um teste correspondente, inclusive a disputa "exatamente ao mesmo tempo" do Cenário 2 da História 7? | `docs/analise.md` → Critérios de aceite × `tests/doacoes.test.js` | não: a disputa é testada em sequência, não em paralelo (ver RNF1) |
| 8 | C | Cada estado das Regras 2 e 3 (`DISPONIVEL`, `RESERVADO`, `CONCLUIDO`) tem um valor de `status` correspondente no diagrama de dados? | `docs/analise.md` → Regras de negócio × `docs/diagramas/dados.md` | sim, com a divergência de nome 1 declarada |
| 9 | C | A exigência da Vigilância de saber quem publicou cada doação (Conflito 1) tem uma coluna no modelo de dados? | `docs/analise.md` → Conflito 1 × `docs/diagramas/dados.md` | só no modelo planejado (`doador`); no `src/db.js` atual, não |

### Revisão interna (fragilidades)
Revisor: **Pedro Henrique Coppola (@pedrohenriquecoppola)**, em comentário no [PR #5](https://github.com/APD-Agil/g1126-template-prato-cheio/pull/5).

| # | Fragilidade apontada pelo revisor (copiada do PR) | Resposta da equipe |
|:--:|---|---|
| 1 | **Regra sem teste.** O Cenário 2 da História 7 ★ (duas ONGs aceitando o mesmo lote ao mesmo tempo) não tem teste: o teste de disputa em `tests/doacoes.test.js` faz as duas tentativas uma depois da outra. Se a migração trocar o `UPDATE` condicional por "ler e depois gravar", os 6 testes continuam verdes e o critério de validação do ADR 0001 aprova uma migração que quebrou a exclusividade. | **Aceita como limitação.** O revisor tem razão, e por isso o critério 7 já está como "não". Não corrigimos agora porque este PR só mexe em documentação e a troca de banco é na Unidade 3. **Plano:** antes de trocar o banco, escrever o teste que manda os dois aceites ao mesmo tempo (RNF1). A troca de banco só é aprovada se esse teste passar (`docs/retrospectivas/2.md`, Próximos passos). |
| 2 | **Decisão sem dono.** A Revisão do ADR 0001 cria uma tarefa mensal (gerar e enviar a cópia do banco à Vigilância) sem responsável definido e sem dizer onde o banco do piloto vai ficar. A Vigilância pode vetar o app (`docs/analise.md`), e as colunas que a cópia precisa mostrar (`doador`, `aceita_em`) ainda não existem no `src/db.js` (`docs/diagramas/dados.md`, divergência 4). | **Aceita como limitação.** O revisor tem razão. Por enquanto não há cópia a mandar, porque o piloto ainda não começou. **Plano:** antes do início do piloto, escolher quem é o responsável pela cópia mensal e onde o banco vai ficar (persistente e acessível para `pg_dump`). As colunas entram no banco junto com a migração da Unidade 3 (`docs/retrospectivas/2.md`, Próximos passos). |

## Uso de IA
