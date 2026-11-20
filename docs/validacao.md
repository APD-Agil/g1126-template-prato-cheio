# Validação — Prato Cheio

*Atividade da Aula 13 · confronto do produto com os critérios de aceite de `docs/analise.md`*

Os textos da tabela reproduzem os oito critérios da seção **Critérios de aceite** e da tabela **Fatias da História 8** de `docs/analise.md`. Os quatro primeiros não puderam ser validados nesta máquina porque não havia PostgreSQL disponível; os resultados locais estão registrados abaixo. O job do CI deste PR ainda precisa executar para fornecer evidência adicional.

| # | Critério de aceite (texto de `docs/analise.md`) | Status | Evidência observada |
|:--:|---|:--:|---|
| 1 | Dado que um lote de alimento está publicado e consta com o status DISPONÍVEL; Quando o coordenador da ONG clica no botão "Aceitar Doação"; Então o lote é removido da listagem pública e o sistema exibe a confirmação de reserva exclusiva para essa ONG. | não verificável | O teste `marca a doação como aceita pela ONG` e o teste `remove a doação da lista de disponíveis depois de aceita` existem em `tests/doacoes.test.js`, mas não passaram nesta execução: a conexão de teste falhou com `ECONNREFUSED ::1:5432` e `ECONNREFUSED 127.0.0.1:5432`. |
| 2 | Dado que um lote está DISPONÍVEL e dois coordenadores de ONGs diferentes estão com a tela de aceite aberta; Quando ambos clicam em "Aceitar Doação" exatamente ao mesmo tempo; Então o sistema exibe a confirmação de sucesso para apenas um deles e a mensagem de erro "Este lote já foi reservado por outra ONG" para o outro. | não verificável | O teste `permite apenas um aceite quando duas ONGs disputam o lote simultaneamente` existe em `tests/doacoes.test.js`, mas não passou nesta execução por `ECONNREFUSED` ao PostgreSQL local. |
| 3 | Dado que o formulário de doação está vazio e pronto para preenchimento; Quando o doador preenche os campos obrigatórios com uma validade de 3 horas à frente e envia; Então o sistema salva a doação e ela aparece imediatamente na lista de lotes DISPONÍVEIS para as ONGs. | não verificável | O teste `mostra a doação publicada na lista de disponíveis` existe em `tests/doacoes.test.js`, mas não passou nesta execução por `ECONNREFUSED` ao PostgreSQL local. |
| 4 | Dado que o formulário está preenchido; Quando o doador informa uma validade de apenas 1 hora à frente do horário atual e tenta enviar; Então o sistema não salva a doação e exibe o erro "O prazo de validade deve ser de no mínimo 2 horas a partir de agora". | não verificável | O teste `recusa doação sem os campos obrigatórios` existe em `tests/doacoes.test.js`, mas não passou nesta execução por `ECONNREFUSED` ao PostgreSQL local. |
| 5 | Dado que existe uma doação com o status RESERVADA vinculada à ONG atual; Quando o coordenador clica no botão "Confirmar Retirada"; Então a doação é movida para o histórico com o status CONCLUÍDO e desaparece da tela de pendências ativas. | não atende | Em `src/app.js` não há rota para confirmar retirada ou consultar pendências; em `src/doacoes.js` não há função de confirmação; os dois arquivos de teste presentes não cobrem esse fluxo. |
| 6 | Dado uma doação aceita por uma ONG, quando a ONG confirma a retirada, então a doação fica `concluida` com o momento do encerramento registrado; uma doação que não está aceita é recusada com "Só é possível confirmar a retirada de uma doação aceita". | não atende | `src/repositorio.js` registra `aceita_em` no aceite, mas o código em `src/app.js` e `src/doacoes.js` não implementa confirmação nem timestamp de encerramento; não há teste dessa fatia em `tests/`. |
| 7 | Dado uma doação aceita pela ONG A, quando a ONG B tenta confirmar a retirada, então o sistema recusa e a doação continua aceita pela ONG A. | não atende | O aceite guarda a ONG em `src/repositorio.js`, mas não existe operação de confirmação que compare a ONG solicitante; não há teste dessa fatia em `tests/`. |
| 8 | Dado que a ONG aceitou dois lotes e confirmou a retirada de um, quando ela abre suas pendências, então vê só o lote ainda não retirado. | não atende | `src/app.js` expõe a lista pública de disponíveis, mas não uma rota de pendências por ONG; não há teste dessa fatia em `tests/`. |

## Resultados dos testes executados

Na cópia limpa da `main`, `npm ci` concluiu (`added 150 packages`) e reportou 11 vulnerabilidades de dependências (4 moderadas, 4 altas e 3 críticas); nenhuma correção de dependência foi tentada nesta entrega. Com `DATABASE_URL=postgres://pratocheio:pratocheio@localhost:5432/pratocheio`, `npm test` terminou com **1 arquivo aprovado e 1 reprovado; 1 teste aprovado e 7 reprovados**. O erro dos sete testes foi a recusa de conexão ao PostgreSQL em `localhost:5432` (`ECONNREFUSED`). O teste aprovado foi `tests/protecao-banco.test.js`.

Também foram executados `npm run db:migrar` e `npm start`; ambos terminaram com código 1 pela mesma recusa de conexão. Docker está instalado, mas `docker info` falhou porque o daemon não estava rodando. O CI configurado em `.github/workflows/ci.yml` usa PostgreSQL 16, mas o job deste PR ainda não tinha resultado no momento desta edição.

## Critérios que não atendem — por quê

- **Critério 5:** o aceite exclusivo remove a doação da lista pública, mas não há confirmação de retirada, histórico ou lista de pendências. Não encontrei no código ou nos PRs examinados uma justificativa registrada para deixar essa parte de fora. Para atender, é necessário implementar e testar o fluxo de confirmação e a consulta de pendências.
- **Critério 6:** o sistema registra a ONG e a hora do aceite; não registra o encerramento nem recusa confirmação de doação não aceita, pois a operação de confirmação ainda não existe. Não encontrei justificativa documentada para a ausência. É preciso implementar a transição e o timestamp, além dos testes do caminho inválido.
- **Critério 7:** o sistema vincula uma ONG ao aceite; não há operação para uma segunda ONG tentar confirmar, nem regra implementada de autorização da confirmação. Não encontrei justificativa documentada para a ausência. É preciso acrescentar essa autorização e cobri-la com teste.
- **Critério 8:** a lista existente contém doações `disponivel`, não pendências aceitas agrupadas por ONG. Não há endpoint ou teste de pendências. Não encontrei justificativa documentada para a ausência; é preciso implementar a consulta e a filtragem por ONG.

## Mudanças de critério

- **Critério 1:** não verificável nesta máquina porque os testes falharam antes de validar o resultado, por falta de PostgreSQL em `localhost:5432`. Não encontrei registro de mudança no critério.
- **Critério 2:** não verificável nesta máquina pela mesma falha de conexão, antes de observar o resultado da disputa. Não encontrei registro de mudança no critério.
- **Critério 3:** não verificável nesta máquina pela mesma falha de conexão, antes de observar a publicação. Não encontrei registro de mudança no critério.
- **Critério 4:** não verificável nesta máquina pela mesma falha de conexão, antes de observar a resposta de validade curta. Não encontrei registro de mudança no critério.
- **Nomenclatura de estados:** `docs/analise.md` registra que `RESERVADA`/`CONCLUÍDO` correspondem no código a `aceita`/`concluida`. Mantive os critérios com o texto original; não tratei a diferença de nome como mudança da regra.

## Uso de IA

A IA leu os critérios, os modelos, a CI, o código, os testes e o histórico de PRs; preparou este quadro, o roteiro e a retrospectiva; e atualizou no README as instruções de PostgreSQL que ainda descreviam SQLite como banco atual. Não alterou código de produção. Tentou instalar dependências em um clone limpo e executar os testes, a migração e o servidor, mas não conseguiu iniciar PostgreSQL porque o daemon Docker não estava ativo. Por isso, não declarou os fluxos como aprovados. Um integrante precisa iniciar PostgreSQL, executar `npm test` e cada passo de `docs/demo.md`, confirmar o texto/respostas efetivas e revisar os estados atribuídos, especialmente os critérios 5–8 que não têm implementação observada.
