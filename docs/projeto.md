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
(contexto + dados ou componentes — em `docs/` ou como imagem)

## ADRs
Ver `docs/adr/`.

## Requisitos não-funcionais
| Requisito | Como afeta o design |
|---|---|

## Critérios de validação do projeto

## Uso de IA
