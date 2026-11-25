# Validação — Prato Cheio

*Atividade da Aula 13 · confronto do produto com os critérios de aceite de `docs/analise.md`*

Os textos da tabela reproduzem os oito critérios da seção **Critérios de aceite** e da tabela **Fatias da História 8** de `docs/analise.md`. Os testes foram executados contra PostgreSQL 16, no ambiente local de desenvolvimento e no CI.

| # | Critério de aceite (texto de `docs/analise.md`) | Status | Evidência observada |
|:--:|---|:--:|---|
| 1 | Dado que um lote de alimento está publicado e consta com o status DISPONÍVEL; Quando o coordenador da ONG clica no botão "Aceitar Doação"; Então o lote é removido da listagem pública e o sistema exibe a confirmação de reserva exclusiva para essa ONG. | atende | `tests/doacoes.test.js`: `marca a doação como aceita pela ONG` e `remove a doação da lista de disponíveis depois de aceita`; `tests/interface.test.js`: `mostra confirmação de reserva exclusiva após aceitar`. Os testes passaram no `npm test` local (17/17). |
| 2 | Dado que um lote está DISPONÍVEL e dois coordenadores de ONGs diferentes estão com a tela de aceite aberta; Quando ambos clicam em "Aceitar Doação" exatamente ao mesmo tempo; Então o sistema exibe a confirmação de sucesso para apenas um deles e a mensagem de erro "Este lote já foi reservado por outra ONG" para o outro. | parcial | `tests/doacoes.test.js`: `permite apenas um aceite quando duas ONGs disputam o lote simultaneamente`; `tests/interface.test.js`: `mostra à ONG perdedora o erro de disputa retornado pela API`. A exclusividade do aceite é verificada, mas a identidade da ONG não é autenticada (ver abaixo). |
| 3 | Dado que o formulário de doação está vazio e pronto para preenchimento; Quando o doador preenche os campos obrigatórios com uma validade de 3 horas à frente e envia; Então o sistema salva a doação e ela aparece imediatamente na lista de lotes DISPONÍVEIS para as ONGs. | atende | `tests/doacoes.test.js`: `mostra a doação publicada na lista de disponíveis`; passou no `npm test` local (17/17). A execução HTTP local também publicou uma doação com `status=disponivel`. |
| 4 | Dado que o formulário está preenchido; Quando o doador informa uma validade de apenas 1 hora à frente do horário atual e tenta enviar; Então o sistema não salva a doação e exibe o erro "O prazo de validade deve ser de no mínimo 2 horas a partir de agora". | atende | `tests/doacoes.test.js`: `recusa publicação sem campos obrigatórios ou com validade curta`; `tests/interface.test.js`: `mostra o erro retornado pela API ao recusar validade curta`. Ambos passaram no `npm test` local (17/17); a execução HTTP local respondeu 400 com a mensagem exata. |
| 5 | Dado que existe uma doação com o status RESERVADA vinculada à ONG atual; Quando o coordenador clica no botão "Confirmar Retirada"; Então a doação é movida para o histórico com o status CONCLUÍDO e desaparece da tela de pendências ativas. | atende | `tests/doacoes.test.js`: `conclui uma doação aceita, registra o encerramento e remove a pendência`; `tests/interface.test.js`: `H2: mostra confirmação após o voluntário confirmar a coleta`. Desde a H2, CONCLUÍDO é o estado `coletada` (ver Mudanças de critério). |
| 6 | Dado uma doação aceita por uma ONG, quando a ONG confirma a retirada, então a doação fica `concluida` com o momento do encerramento registrado; uma doação que não está aceita é recusada com "Só é possível confirmar a retirada de uma doação aceita". | atende | `tests/doacoes.test.js`: `recusa confirmar uma doação que ainda não foi aceita` valida HTTP 400, a mensagem exata e a permanência da doação disponível; passou no `npm test` local (17/17). |
| 7 | Dado uma doação aceita pela ONG A, quando a ONG B tenta confirmar a retirada, então o sistema recusa e a doação continua aceita pela ONG A. | atende | `tests/doacoes.test.js`: `recusa a confirmação por uma ONG diferente e preserva a ONG aceita`; passou no `npm test` local (17/17). |
| 8 | Dado que a ONG aceitou dois lotes e confirmou a retirada de um, quando ela abre suas pendências, então vê só o lote ainda não retirado. | atende | `tests/doacoes.test.js`: `lista somente as doações aceitas ainda pendentes para a ONG informada`; passou no `npm test` local (17/17), verificando ONG, status e exclusão da concluída. |

### Critérios das histórias do Trabalho 3

| # | Critério de aceite (enunciado do Trabalho 3) | Status | Evidência |
|:--:|---|:--:|---|
| H1-CA1 | Dado que a "Padaria Pão Bom" publicou duas doações e a "Casa Esperança" aceitou uma delas, quando a padaria consulta as suas doações, então vê as duas: uma disponível e outra aceita por Casa Esperança. | atende | `tests/h1-doador.test.js`: `CA1: o doador vê as próprias doações com a situação de cada uma`; `tests/interface.test.js`: `H1: mostra as doações do doador com a situação de cada uma`; `docs/demo.md`, passo H1. |
| H1-CA2 | Dado que outro doador publicou uma doação, quando a "Padaria Pão Bom" consulta as suas, então essa doação não aparece. | atende | `tests/h1-doador.test.js`: `CA2: a doação de outro doador não aparece na consulta da padaria`. |
| H1-CA3 | Dado que o doador não é informado na publicação, quando a doação é enviada, então ela é recusada com uma mensagem clara e nada é gravado. | atende | `tests/h1-doador.test.js`: `CA3: recusa a publicação sem doador e não grava nada` (400, `Informe o nome do doador`, 0 linhas no banco). |
| H2-CA1 | Dado que a "Casa Esperança" aceitou uma doação, quando o voluntário "Rui" confirma a coleta, então ela passa a *coletada*, com o nome do voluntário e o horário da coleta. | atende | `tests/h2-coleta.test.js`: `CA1: a coleta confirmada grava coletada, o voluntário e o horário`; `tests/interface.test.js`: `H2: mostra confirmação após o voluntário confirmar a coleta`; `docs/demo.md`, passo H2. |
| H2-CA2 | Dado que a doação ainda está *disponível*, quando alguém tenta confirmar a coleta, então a confirmação é recusada com mensagem e a doação não muda. | atende | `tests/h2-coleta.test.js`: `CA2: recusa confirmar a coleta de uma doação disponível e não a altera`; inversão de regra no PR da H2: 2 testes vermelhos. |
| H2-CA3 | Dado que a doação foi coletada, quando o doador consulta as suas doações (H1), então ela aparece como *coletada*. | atende | `tests/h2-coleta.test.js`: `CA3: a doação coletada aparece como coletada para o doador`. |
| H3-CA1 | Dado que a "Casa Esperança" aceitou uma doação, quando ela a devolve com o motivo "sem voluntário hoje", então a doação volta para a lista de disponíveis, sem ONG, e o motivo fica registrado. | atende | `tests/h3-devolucao.test.js`: `CA1: a doação devolvida volta inteira para a lista, sem ONG, e o motivo fica registrado`; `tests/interface.test.js`: `H3: devolve uma pendência com o motivo e mostra a confirmação`; `docs/demo.md`, passo H3. |
| H3-CA2 | Dado que a doação já foi *coletada*, quando a ONG tenta devolvê-la, então a devolução é recusada com mensagem. | atende | `tests/h3-devolucao.test.js`: `CA2: recusa devolver uma doação já coletada e ela continua coletada` (400, `Só é possível devolver uma doação aceita`, nenhuma devolução registrada). |
| H3-CA3 | Dado que a "Casa Esperança" aceitou a doação, quando **outra** ONG tenta devolvê-la, então a devolução é recusada e a doação continua aceita pela Casa Esperança. | atende | `tests/h3-devolucao.test.js`: `CA3: recusa a devolução por outra ONG e a doação continua aceita pela Casa Esperança`; sem a checagem de ONG em `TRANSICOES.devolver`, o teste fica vermelho (conferido no PR da fatia 3). |
| H4-CA1 | Dado que, em novembro, 3 doações foram publicadas, 2 aceitas e 1 coletada 5 horas depois de publicada, quando a Marta consulta o resultado de novembro, então vê *3 publicadas*, *2 aceitas*, *1 coletada* e *tempo médio até a coleta: 5 h*. | atende | `tests/h4-resultado-mes.test.js`: `CA1: mostra publicadas, aceitas, coletadas e o tempo médio até a coleta` (relógio fixado em 2025 com `vi.setSystemTime`; `toEqual` com números); `tests/interface.test.js`: `H4: mostra o resultado do mês escolhido pela Marta`. Passou também com `TZ=America/Sao_Paulo` e `TZ=Asia/Tokyo`. |
| H4-CA2 | Dado um mês sem nenhuma coleta, quando a Marta consulta o resultado, então o tempo médio aparece como *sem coletas no mês* — não como zero, nem como erro. | atende | `tests/h4-resultado-mes.test.js`: `CA2: num mês sem coletas o tempo médio aparece como "sem coletas no mês"` (mês com publicações e mês vazio, ambos 200). |
| H4-CA3 | Dado uma doação publicada em 31/10 e coletada em 01/11, quando a Marta consulta novembro, então o grupo decide em que mês ela conta — e o teste diz qual. | atende | Decisão 8 de `docs/projeto.md`: mês da **publicação**. `tests/h4-resultado-mes.test.js`: `CA3: a doação publicada em 31/10 e coletada em 01/11 conta em outubro, não em novembro`. |

## Resultados dos testes executados

`npm ci` concluiu (`added 150 packages`) e reportou 11 vulnerabilidades de dependências (4 moderadas, 4 altas e 3 críticas); nenhuma correção de dependência foi tentada nesta entrega. Com `DATABASE_URL=postgres://pratocheio:pratocheio@localhost:5432/pratocheio`, `npm run db:migrar` imprimiu `schema criado` e `npm test` terminou com **3 arquivos aprovados e 17 testes aprovados**.

Com `npm start` ativo, `GET /api/saude` respondeu `{"ok":true}`. A execução HTTP local completou publicação (`disponivel`), aceite (`aceita`), listagem de pendências, confirmação (`concluida` com `concluida_em`), remoção das pendências, inclusão no histórico e recusa de validade de uma hora com HTTP 400 e a mensagem especificada.

No CI do commit `a31a2ec`, o job [build-e-testes, run 32](https://github.com/APD-Agil/g1126-template-prato-cheio/actions/runs/44838464014/job/136640661192) concluiu com sucesso. As etapas `Rodar os testes` e `Verificar se a aplicação sobe` passaram contra PostgreSQL 16.

## Critérios que não atendem — por quê

### Critério 2: autenticação da ONG
- **O que funciona:** a exclusividade do aceite, verificada por teste de concorrência (`permite apenas um aceite quando duas ONGs disputam o lote simultaneamente`).
- **O que falta:** autenticação da ONG. As rotas usam o nome de ONG enviado pelo cliente, e a Regra 2 de `docs/analise.md` pede "ONG autenticada".
- **Por que ficou de fora:** o login completo foi adiado para o fim do piloto (Conflito 1 de `docs/analise.md`). A correção deve ser ratificada pela Marta antes de ser tratada como mudança de critério.

## Mudanças de critério

- **Nomenclatura de estados:** `RESERVADA`/`CONCLUÍDO` de `docs/analise.md` correspondem no código a `aceita`/`coletada` (o antigo `concluida` foi renomeado na H2 e `migrar()` converte as linhas existentes). Os critérios ficam com o texto original; a regra não mudou, só o nome.
- **Critério 6 (`concluida`):** o texto da fatia 1 da História 8 diz `concluida`; desde a H2 o estado é `coletada` e a confirmação exige também o nome do voluntário. A mensagem de recusa continua idêntica.

## Uso de IA

A IA implementou confirmação, pendências e histórico, atualizou o feedback da interface, escreveu testes e atualizou a documentação do modelo e da validação. A primeira execução da suíte com os testes de interface identificou dois mocks com URLs incorretas; os mocks foram corrigidos e a repetição passou. Uma primeira tentativa de smoke com `curl.exe` enviou JSON malformado; a repetição com `fetch` validou HTTP 400 e a mensagem correta. `npm test` passou localmente contra PostgreSQL. Os testes de interface usam DOM simulado, não navegador real. Ainda faltam: um integrante executar `docs/demo.md` no navegador e a revisão humana sobre a limitação de identidade da ONG, que afeta o critério 2.

## Limitações do produto

- **Identidade sem login:** o doador é identificado pelo nome digitado (guardado no navegador) e a ONG pelo nome enviado pelo cliente; quem digitar o mesmo nome vê as mesmas doações. O login foi adiado pelo Conflito 1 de `docs/analise.md`.
- **Mês em UTC:** os horários são gravados em UTC; uma doação publicada às 22h de 31/10 em Brasília (01h de 01/11 em UTC) conta em novembro. Converter para o fuso de Brasília fica para depois do piloto.
- **Voluntário em texto livre:** o nome do voluntário é o que a pessoa digita na tela da ONG; o sistema não confere se ele existe nem se foi mesmo ele quem buscou.
