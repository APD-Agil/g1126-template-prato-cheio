# Validação — Prato Cheio

*Atividade da Aula 13 · confronto do produto com os critérios de aceite de `docs/analise.md`*

Os textos da tabela reproduzem os oito critérios da seção **Critérios de aceite** e da tabela **Fatias da História 8** de `docs/analise.md`. Todos foram cobertos por testes executados localmente contra PostgreSQL 16.

| # | Critério de aceite (texto de `docs/analise.md`) | Status | Evidência observada |
|:--:|---|:--:|---|
| 1 | Dado que um lote de alimento está publicado e consta com o status DISPONÍVEL; Quando o coordenador da ONG clica no botão "Aceitar Doação"; Então o lote é removido da listagem pública e o sistema exibe a confirmação de reserva exclusiva para essa ONG. | atende | `tests/doacoes.test.js`: `marca a doação como aceita pela ONG` e `remove a doação da lista de disponíveis depois de aceita`; `tests/interface.test.js`: `mostra confirmação de reserva exclusiva após aceitar`. Os testes passaram no `npm test` local (17/17). |
| 2 | Dado que um lote está DISPONÍVEL e dois coordenadores de ONGs diferentes estão com a tela de aceite aberta; Quando ambos clicam em "Aceitar Doação" exatamente ao mesmo tempo; Então o sistema exibe a confirmação de sucesso para apenas um deles e a mensagem de erro "Este lote já foi reservado por outra ONG" para o outro. | atende | `tests/doacoes.test.js`: `permite apenas um aceite quando duas ONGs disputam o lote simultaneamente`; `tests/interface.test.js`: `mostra à ONG perdedora o erro de disputa retornado pela API`. Ambos passaram no `npm test` local (17/17). |
| 3 | Dado que o formulário de doação está vazio e pronto para preenchimento; Quando o doador preenche os campos obrigatórios com uma validade de 3 horas à frente e envia; Então o sistema salva a doação e ela aparece imediatamente na lista de lotes DISPONÍVEIS para as ONGs. | atende | `tests/doacoes.test.js`: `mostra a doação publicada na lista de disponíveis`; passou no `npm test` local (17/17). A execução HTTP local também publicou uma doação com `status=disponivel`. |
| 4 | Dado que o formulário está preenchido; Quando o doador informa uma validade de apenas 1 hora à frente do horário atual e tenta enviar; Então o sistema não salva a doação e exibe o erro "O prazo de validade deve ser de no mínimo 2 horas a partir de agora". | atende | `tests/doacoes.test.js`: `recusa publicação sem campos obrigatórios ou com validade curta`; `tests/interface.test.js`: `mostra o erro retornado pela API ao recusar validade curta`. Ambos passaram no `npm test` local (17/17); a execução HTTP local respondeu 400 com a mensagem exata. |
| 5 | Dado que existe uma doação com o status RESERVADA vinculada à ONG atual; Quando o coordenador clica no botão "Confirmar Retirada"; Então a doação é movida para o histórico com o status CONCLUÍDO e desaparece da tela de pendências ativas. | atende | `tests/doacoes.test.js`: `conclui uma doação aceita, registra o encerramento e remove a pendência`; `tests/interface.test.js`: `mostra confirmação após concluir a retirada`. O smoke HTTP local observou `concluida`, timestamp, 0 pendências e 1 item no histórico. |
| 6 | Dado uma doação aceita por uma ONG, quando a ONG confirma a retirada, então a doação fica `concluida` com o momento do encerramento registrado; uma doação que não está aceita é recusada com "Só é possível confirmar a retirada de uma doação aceita". | atende | `tests/doacoes.test.js`: `recusa confirmar uma doação que ainda não foi aceita` valida HTTP 400, a mensagem exata e a permanência da doação disponível; passou no `npm test` local (17/17). |
| 7 | Dado uma doação aceita pela ONG A, quando a ONG B tenta confirmar a retirada, então o sistema recusa e a doação continua aceita pela ONG A. | atende | `tests/doacoes.test.js`: `recusa a confirmação por uma ONG diferente e preserva a ONG aceita`; passou no `npm test` local (17/17). |
| 8 | Dado que a ONG aceitou dois lotes e confirmou a retirada de um, quando ela abre suas pendências, então vê só o lote ainda não retirado. | atende | `tests/doacoes.test.js`: `lista somente as doações aceitas ainda pendentes para a ONG informada`; passou no `npm test` local (17/17), verificando ONG, status e exclusão da concluída. |

## Resultados dos testes executados

`npm ci` concluiu (`added 150 packages`) e reportou 11 vulnerabilidades de dependências (4 moderadas, 4 altas e 3 críticas); nenhuma correção de dependência foi tentada nesta entrega. Com `DATABASE_URL=postgres://pratocheio:pratocheio@localhost:5432/pratocheio`, `npm run db:migrar` imprimiu `schema criado` e `npm test` terminou com **3 arquivos aprovados e 17 testes aprovados**.

Com `npm start` ativo, `GET /api/saude` respondeu `{"ok":true}`. A execução HTTP local completou publicação (`disponivel`), aceite (`aceita`), listagem de pendências, confirmação (`concluida` com `concluida_em`), remoção das pendências, inclusão no histórico e recusa de validade de uma hora com HTTP 400 e a mensagem especificada.

No CI do commit `a31a2ec`, o job [build-e-testes, run 32](https://github.com/APD-Agil/g1126-template-prato-cheio/actions/runs/44838464014/job/136640661192) concluiu com sucesso. As etapas `Rodar os testes` e `Verificar se a aplicação sobe` passaram contra PostgreSQL 16.

## Critérios que não atendem — por quê

Nenhum critério ficou parcial ou sem atender após a implementação e a execução local dos testes. A autenticação da ONG não faz parte dos critérios deste incremento: as rotas usam o nome de ONG enviado pelo cliente.

## Mudanças de critério

- **Nomenclatura de estados:** `docs/analise.md` registra que `RESERVADA`/`CONCLUÍDO` correspondem no código a `aceita`/`concluida`. Mantive os critérios com o texto original; não tratei a diferença de nome como mudança da regra.

## Uso de IA

A IA implementou confirmação, pendências e histórico, atualizou o feedback da interface, escreveu testes e atualizou a documentação do modelo e da validação. A primeira execução da suíte com os testes de interface identificou dois mocks com URLs incorretas; corrigi os mocks e a repetição passou. Uma primeira tentativa de smoke com `curl.exe` enviou JSON malformado; a repetição com `fetch` validou HTTP 400 e a mensagem correta. `npm test` passou localmente contra PostgreSQL. Os testes de interface usam DOM simulado, não navegador real; outro integrante ainda precisa executar `docs/demo.md` no navegador e revisar a limitação de identidade da ONG.
