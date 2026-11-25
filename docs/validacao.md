# Validação — Prato Cheio

*Trabalho 3 · o produto contra os critérios de `docs/analise.md` (copiados como estão) e os de H1–H4*

Testes em `tests/` (citados sem o prefixo), contra PostgreSQL 16: `npm test` → 42 verdes em 7 arquivos; mesmo resultado no CI do PR #18 ([CI](https://github.com/APD-Agil/g1126-template-prato-cheio/actions/runs/45700398752/job/139508671152)) roda a mesma suíte. O link do CI do branch `entrega-3` é o da entrega no Teams. "Demo, passo N" se refere a `docs/demo.md`.

## Critérios de `docs/analise.md`

| # | Critério de aceite (texto de `docs/analise.md`) | Status | Evidência |
|:--:|---|:--:|---|
| 1 | Dado que um lote de alimento está publicado e consta com o status DISPONÍVEL; Quando o coordenador da ONG clica no botão "Aceitar Doação"; Então o lote é removido da listagem pública e o sistema exibe a confirmação de reserva exclusiva para essa ONG. | atende | `doacoes.test.js`: `marca a doação como aceita pela ONG`, `remove a doação da lista de disponíveis depois de aceita`; `interface.test.js`: `mostra confirmação de reserva exclusiva após aceitar`; demo, passo 2. |
| 2 | Dado que um lote está DISPONÍVEL e dois coordenadores de ONGs diferentes estão com a tela de aceite aberta; Quando ambos clicam em "Aceitar Doação" exatamente ao mesmo tempo; Então o sistema exibe a confirmação de sucesso para apenas um deles e a mensagem de erro "Este lote já foi reservado por outra ONG" para o outro. | parcial | `doacoes.test.js`: `permite apenas um aceite quando duas ONGs disputam o lote simultaneamente`; `interface.test.js`: `mostra à ONG perdedora o erro de disputa retornado pela API`. A ONG não é autenticada. |
| 3 | Dado que o formulário de doação está vazio e pronto para preenchimento; Quando o doador preenche os campos obrigatórios com uma validade de 3 horas à frente e envia; Então o sistema salva a doação e ela aparece imediatamente na lista de lotes DISPONÍVEIS para as ONGs. | atende | `doacoes.test.js`: `mostra a doação publicada na lista de disponíveis`; demo, passo 1. |
| 4 | Dado que o formulário está preenchido; Quando o doador informa uma validade de apenas 1 hora à frente do horário atual e tenta enviar; Então o sistema não salva a doação e exibe o erro "O prazo de validade deve ser de no mínimo 2 horas a partir de agora". | atende | `doacoes.test.js`: `recusa publicação sem campos obrigatórios ou com validade curta`; `interface.test.js`: `mostra o erro retornado pela API ao recusar validade curta`; demo, passo 5. |
| 5 | Dado que existe uma doação com o status RESERVADA vinculada à ONG atual; Quando o coordenador clica no botão "Confirmar Retirada"; Então a doação é movida para o histórico com o status CONCLUÍDO e desaparece da tela de pendências ativas. | atende | `doacoes.test.js`: `conclui uma doação aceita, registra o encerramento e remove a pendência`; `interface.test.js`: `H2: mostra confirmação após o voluntário confirmar a coleta`; demo, passo 3. CONCLUÍDO = `coletada`. |
| 6 | Dado uma doação aceita por uma ONG, quando a ONG confirma a retirada, então a doação fica `concluida` com o momento do encerramento registrado; uma doação que não está aceita é recusada com "Só é possível confirmar a retirada de uma doação aceita". | atende | `doacoes.test.js`: `recusa confirmar uma doação que ainda não foi aceita` (mensagem exata). O estado final agora é `coletada` (ver Mudanças de critério). |
| 7 | Dado uma doação aceita pela ONG A, quando a ONG B tenta confirmar a retirada, então o sistema recusa e a doação continua aceita pela ONG A. | atende | `doacoes.test.js`: `recusa a confirmação por uma ONG diferente e preserva a ONG aceita`. |
| 8 | Dado que a ONG aceitou dois lotes e confirmou a retirada de um, quando ela abre suas pendências, então vê só o lote ainda não retirado. | atende | `doacoes.test.js`: `lista somente as doações aceitas ainda pendentes para a ONG informada`. |

## Critérios das histórias do Trabalho 3

| # | Critério de aceite (enunciado do Trabalho 3) | Status | Evidência |
|:--:|---|:--:|---|
| H1-CA1 | Dado que a "Padaria Pão Bom" publicou duas doações e a "Casa Esperança" aceitou uma delas, quando a padaria consulta as suas doações, então vê as duas: uma disponível e outra aceita por Casa Esperança. | atende | `h1-doador.test.js`: `CA1: o doador vê as próprias doações com a situação de cada uma`; `interface.test.js`: `H1: mostra as doações do doador com a situação de cada uma`; demo, passo 1. |
| H1-CA2 | Dado que outro doador publicou uma doação, quando a "Padaria Pão Bom" consulta as suas, então essa doação não aparece. | atende | `h1-doador.test.js`: `CA2: a doação de outro doador não aparece na consulta da padaria`. |
| H1-CA3 | Dado que o doador não é informado na publicação, quando a doação é enviada, então ela é recusada com uma mensagem clara e nada é gravado. | atende | `h1-doador.test.js`: `CA3: recusa a publicação sem doador e não grava nada` (0 linhas no banco); demo, passo 5. |
| H2-CA1 | Dado que a "Casa Esperança" aceitou uma doação, quando o voluntário "Rui" confirma a coleta, então ela passa a *coletada*, com o nome do voluntário e o horário da coleta. | atende | `h2-coleta.test.js`: `CA1: a coleta confirmada grava coletada, o voluntário e o horário`; `interface.test.js`: `H2: mostra confirmação após o voluntário confirmar a coleta`; demo, passo 3. |
| H2-CA2 | Dado que a doação ainda está *disponível*, quando alguém tenta confirmar a coleta, então a confirmação é recusada com mensagem e a doação não muda. | atende | `h2-coleta.test.js`: `CA2: recusa confirmar a coleta de uma doação disponível e não a altera`; `## Inversão de regra` do PR #14 (2 vermelhos). |
| H2-CA3 | Dado que a doação foi coletada, quando o doador consulta as suas doações (H1), então ela aparece como *coletada*. | atende | `h2-coleta.test.js`: `CA3: a doação coletada aparece como coletada para o doador`; demo, passo 3. |
| H3-CA1 | Dado que a "Casa Esperança" aceitou uma doação, quando ela a devolve com o motivo "sem voluntário hoje", então a doação volta para a lista de disponíveis, sem ONG, e o motivo fica registrado. | atende | `h3-devolucao.test.js`: `CA1: a doação devolvida volta inteira para a lista, sem ONG, e o motivo fica registrado`; `interface.test.js`: `H3: devolve uma pendência com o motivo e mostra a confirmação`; demo, passo 4. |
| H3-CA2 | Dado que a doação já foi *coletada*, quando a ONG tenta devolvê-la, então a devolução é recusada com mensagem. | atende | `h3-devolucao.test.js`: `CA2: recusa devolver uma doação já coletada e ela continua coletada`. |
| H3-CA3 | Dado que a "Casa Esperança" aceitou a doação, quando **outra** ONG tenta devolvê-la, então a devolução é recusada e a doação continua aceita pela Casa Esperança. | atende | `h3-devolucao.test.js`: `CA3: recusa a devolução por outra ONG e a doação continua aceita pela Casa Esperança` (fica vermelho sem a checagem de ONG, PR #17). |
| H4-CA1 | Dado que, em novembro, 3 doações foram publicadas, 2 aceitas e 1 coletada 5 horas depois de publicada, quando a Marta consulta o resultado de novembro, então vê *3 publicadas*, *2 aceitas*, *1 coletada* e *tempo médio até a coleta: 5 h*. | atende | `h4-resultado-mes.test.js`: `CA1: mostra publicadas, aceitas, coletadas e o tempo médio até a coleta` (relógio fixo em 2025; passa com qualquer `TZ`); `interface.test.js`: `H4: mostra o resultado do mês escolhido pela Marta`; demo, passo 6. |
| H4-CA2 | Dado um mês sem nenhuma coleta, quando a Marta consulta o resultado, então o tempo médio aparece como *sem coletas no mês* — não como zero, nem como erro. | atende | `h4-resultado-mes.test.js`: `CA2: num mês sem coletas o tempo médio aparece como "sem coletas no mês"`. |
| H4-CA3 | Dado uma doação publicada em 31/10 e coletada em 01/11, quando a Marta consulta novembro, então o grupo decide em que mês ela conta — e o teste diz qual. | atende | Decisão 8 de `docs/projeto.md` (mês da publicação); `h4-resultado-mes.test.js`: `CA3: a doação publicada em 31/10 e coletada em 01/11 conta em outubro, não em novembro`. |

## Critérios que não atendem — por quê

**Critério 2 — parcial.** A exclusividade do aceite está provada pelo teste concorrente. O critério, porém, fala em coordenadores de ONGs diferentes, e a Regra 2 pede "ONG autenticada". O sistema usa o nome de ONG que o cliente envia, então outra pessoa pode se passar por uma ONG. O login foi adiado pelo Conflito 1 de `docs/analise.md`, e a Marta ainda precisa ratificar o adiamento.

## Mudanças de critério

- **Nomes dos estados:** RESERVADA/CONCLUÍDO (análise) = `aceita`/`coletada` (código). A H2 renomeou `concluida` → `coletada`, e `migrar()` converte as linhas antigas. A regra não mudou, só o nome.
- **Critério 6:** o texto diz `concluida`; hoje o estado é `coletada` e a confirmação também exige o voluntário. A mensagem de recusa é a mesma.

## Limitações do produto

- **Identidade sem login:** o doador é o nome digitado (guardado no navegador) e a ONG é o nome enviado pelo cliente; quem digitar o mesmo nome vê e age como ela (Conflito 1).
- **Voluntário em texto livre:** o sistema não confere quem é o voluntário nem se ele buscou de fato; vale o que a ONG digita.
- **Mês em UTC:** os horários são gravados em UTC, então uma doação publicada às 22h de 31/10 em Brasília conta em novembro.
- **Validade não expira sozinha:** uma doação vencida (ou devolvida já perto do vencimento) continua na lista até alguém agir; não há aviso nem baixa automática.
- **Interface testada com DOM simulado:** os testes de tela não usam navegador real; a conferência visual no celular é feita pelo roteiro da demo.

## Uso de IA

Usamos o Claude (Claude Code) como colaborador em todas as histórias. As decisões de cada história são do grupo, registradas em `docs/projeto.md`, decisões 4 a 8.

- **H1:** a IA escreveu os testes, a coluna `doador`, a migração, a rota e a tela. Conferimos que os 5 testes rodaram vermelhos antes do código e que o CA3 olha o banco.
- **H2:** a IA fez o estado `coletada`, a migração e a tela, e executou a inversão (2 vermelhos). **Erro dela que corrigimos:** o teste de tela atribuía o campo do voluntário antes de o elemento existir no DOM falso (`TypeError`).
- **H3 + R2:** a IA fez a fatia 1 como 3ª cópia, a extração e a fatia 3, sem criar uma 4ª cópia. Conferimos `tests/` intacto na R2 (32 → 32) e provamos o CA3 por mutação, porque ele passou de primeira.
- **H4:** a IA fez o SQL, o relógio em JS e os testes com `vi.setSystemTime`. **Erro dela que corrigimos:** o SQL sem cast devolvia `"3"` e `"5.0"`. O conserto foi no SQL (`::int`, `::float8`), não na regra nem no teste.
- Os status deste quadro, o "parcial" do critério 2 e todas as decisões de `docs/projeto.md` são do grupo.
