# Documento de Análise — Prato Cheio

*Trabalho 1 · máximo 4 páginas · entrega na Aula 5*

## Problema central

O projeto busca diminuir o desperdício de alimentos que ainda estão próprios para consumo, conectando estabelecimentos que possuem excedentes a ONGs que podem recebê-los rapidamente. 

O principal desafio é garantir que essa conexão aconteça antes que os alimentos percam a validade, de forma simples, confiável e eficiente.

## Incertezas

- Como garantir que as ONGs consigam visualizar e aceitar as doações antes que os alimentos percam a validade?
- Quais informações são realmente necessárias para que doadores e ONGs consigam utilizar o sistema sem dificuldades?
- Como validar que a plataforma realmente contribuiu para reduzir o desperdício de alimentos durante o projeto piloto?
- O sistema continuará apresentando um bom desempenho conforme aumenta a quantidade de usuários e doações cadastradas?

## Stakeholders

| Stakeholder | Interesse | Influência | O que espera | Consequência na iteração 1 |
|---|---|---|---|---|
| **Marta (Coordenadora / Patrocinadora)** | Alto | Alta | Escalar o projeto, conectar mais doadores e reduzir o tempo logístico. | Entrevistar primeiro para definir a métrica principal de sucesso e o fluxo crítico. |
| **Vigilância Sanitária (Regulador)** | Baixo | Alta | Garantia de que as regras de segurança alimentar e validade sejam seguidas. | Requisito não negociável. Levantamos as restrições sanitárias agora (campos obrigatórios de cadastro) para manter o órgão satisfeito, pois ele pode vetar o app. |
| **Doadores (Restaurantes/Mercados)** | Alto | Alta | Descartar o alimento excedente de forma ética, com o menor tempo possível. | Entrevistar para mapear o fluxo de cadastro. A interface deles deve ser simples para garantir engajamento. |
| **ONGs e Cozinhas Comunitárias** | Alto | Alta | Receber doações com previsibilidade e qualidade, sabendo o que e quando vai chegar. | Aceitar requisitos sobre a regra de reserva e disputa de doações na fila (sofre e não decide). |
| **Voluntários Entregadores** | Alto | Baixa | Um aplicativo que funcione rápido na rua, com localização em tempo real. | Ficam apenas sendo monitorados neste primeiro momento; refinamentos de uso offline ficam para depois. |
| **Família Atendida (Beneficiário final)** | Alto | Baixa | Refeições prontas, seguras e nutritivas. | Fica para depois. O valor entregue a eles depende primeiro da conexão técnica entre doador e ONG. |

## Objetivos de Impacto

| Objetivo | Métrica | Linha de base | Direção |
|----------|---------|---------------|----------|
| **Reduzir o tempo** médio de coleta de alimentos perecíveis | **Tempo médio** entre a publicação da doação e o aceite pela ONG | **Média** obtida nos primeiros 30 dias do projeto piloto | **Reduzir em 30%** após seis meses de operação |
| **Aumentar o volume** de alimentos aproveitados | **Quilogramas** de alimentos recebidos pelas ONGs por mês | **Média mensal** registrada nos primeiros 30 dias do projeto piloto | **Aumentar em 40%** após seis meses de operação |
| **Aumentar a taxa** de sucesso das doações publicadas | **Percentual** de doações aceitas antes do horário limite para retirada | **Taxa média** registrada nos primeiros 30 dias do projeto piloto | **Alcançar 90%** de doações aceitas antes do vencimento |

## Regras de negócio

### Regra 1: Validação do Prazo Mínimo de Validade
- **Origem:** Derivada (das diretrizes gerais de segurança alimentar).
- **Enunciado explícito e verificável:** Se um doador cadastrar um lote de alimento cuja data/hora limite de consumo seja inferior a 2 horas em relação ao horário atual da publicação, então o sistema deve rejeitar a publicação e exibir a mensagem "O prazo de validade deve ser de no mínimo 2 horas a partir de agora".
- **Como se verifica:** Tentar publicar uma doação com o campo de validade ajustado para 1 hora e 59 minutos à frente e verificar se o sistema bloqueia a criação e exibe a mensagem especificada.

### Regra 2: Exclusividade de Aceite por Lote
- **Origem:** Praticada.
- **Enunciado explícito e verificável:** Se uma ONG autenticada clicar em "Aceitar Doação" em um lote com status DISPONIVEL, então o sistema deve alterar o status do lote para RESERVADO, vincular o ID da ONG ao lote e remover a doação da listagem pública de itens disponíveis.
- **Como se verifica:** Executar duas requisições simultâneas de aceite para o mesmo lote por ONGs diferentes; apenas uma deve receber confirmação HTTP 200 e o lote não deve mais aparecer na busca de doações abertas.

### Regra 3: Confirmação de Retirada e Baixa do Lote
- **Origem:** Ausente (não descrita explicitamente no caso; alguém precisa decidir o momento em que a doação deixa de ser uma pendência).
- **Quem decide:** O grupo de desenvolvimento junto à Marta (Decisão: Inventada pelo grupo para fechar o ciclo do Walking Skeleton).
- **Enunciado explícito e verificável:** Se a ONG informante confirmar o recebimento do lote no sistema, então o status da doação deve transitar de RESERVADO para CONCLUIDO, registrando o timestamp final do encerramento.
- **Como se verifica:** Enviar uma requisição de confirmação de entrega para um lote RESERVADO e checar no banco de dados se o campo status passou para CONCLUIDO com o timestamp preenchido.


## Conflitos de prioridade

### Conflito 1: Fricção de Acesso vs. Rastreabilidade de Identidade
- **As duas falas em conflito:**
   - Fala 1 (Dono do Restaurante): "Eu preciso acessar o sistema e cadastrar doações sem passar por telas de login complexas, senão continuo usando os grupos de WhatsApp, que são mais rápidos e não tomam meu tempo."
   - Fala 2 (Vigilância Sanitária): "Eu exijo que o sistema mantenha um registro exato e seguro de quem publicou a doação para garantir a rastreabilidade e o cumprimento das normas legais."
- **O eixo do trade-off:** Adoção rápida (sem login) versus Segurança e rastreabilidade. Ganhar agilidade sacrifica a garantia de identidade; garantir segurança cria barreiras de uso.
- **O que cada lado perde:** O Restaurante perde praticidade (podendo gerar desperdício); a Vigilância perde poder de auditoria e conformidade legal.
- **Critério que decide:** Na iteração 1, usaremos um token enviado aos contatos do restaurante, garantindo rastreabilidade básica sem a necessidade de senhas.
- **Saída adotada:** Adiar com data. A criação de um sistema de login completo ficou para o fim do piloto. O desempenho e a conformidade do link mágico serão medidos até lá.

### Conflito 2: Liberação Rápida de Espaço vs. Viabilidade Logística da Retirada

- **As duas visões em conflito:**
   - Fala 1 (Dono do Restaurante): "Eu preciso que a ONG retire a doação imediatamente após aceitar no aplicativo, pois não tenho espaço físico na minha cozinha para guardar potes de comida esperando a boa vontade de alguém buscar."
   - Fala 2 (Coordenador da ONG): "Eu preciso de uma janela de tempo de pelo menos duas horas após o aceite para ir buscar a comida, pois dependo da disponibilidade de motoristas voluntários e do trânsito."
- **O eixo do trade-off:** Espaço livre na cozinha versus Tempo de transporte. Priorizar o restaurante afeta a logística da ONG, e vice-versa.
- **O que cada lado perde:** O Restaurante perde espaço físico de trabalho; a ONG perde doações por não conseguir cumprir prazos irreais.
- **O critério que decide:** Devido à curta distância do piloto (um bairro), o prazo de retirada na iteração 1 será de 1 hora. Sem confirmação, a doação volta à lista.
- **A saída escolhida:** Decidir. A equipe estipulou uma regra fixa baseada na restrição geográfica para equilibrar a pressa do restaurante e a logística da ONG.


## Histórias de usuário

| # | História (Como… quero… para…) | INVEST: o que falha |
|---|---|---|
| 1 | Como dono de restaurante (Doador), quero publicar uma doação com tipo, quantidade e validade mínima de 2h, para não perder tempo negociando por telefone e reduzir o risco de o alimento vencer parado na cozinha. | **falha** em Pequena → publicar dados básicos e anexar foto/geolocalização numa história só é grande demais; separada da história #6, que fica só com os 3 campos obrigatórios. |
| 2 | Como coordenador de ONG, quero ver a lista de doações disponíveis ordenada pelo prazo de validade, para priorizar a retirada dos lotes que vencem primeiro e não perder alimento por atraso. | falha em Testável → falta definir o que é "próximo do vencimento" (ex.: menos de 1h) para o teste automatizado poder verificar a ordenação. |
| 3 | Como coordenador de ONG, quero aceitar um lote com exclusividade garantida pelo sistema, para não chegar ao restaurante e descobrir que outra ONG já retirou a doação. | falha em Independente → depende da doação já estar publicada (história #1); sem dado semeado no banco não há lote para demonstrar a exclusividade isoladamente. |
| 4 | Como voluntário entregador, quero ver o endereço do restaurante já formatado no card da doação aceita, para chegar ao local sem copiar o endereço para outro aplicativo de mapas. | falha em Estimável → spike de 2h para descobrir se existe endereço estruturado (rua/número/bairro) no cadastro do restaurante ou se é campo livre de texto. |
| 5 | Como Marta (Coordenadora/Patrocinadora), quero ver o tempo médio entre publicação e aceite no painel, para decidir se o piloto está reduzindo o desperdício antes de escalar para outros bairros. | falha em Valiosa isoladamente → o painel só entrega decisão depois de ~30 dias de volume mínimo (linha de base do Objetivo de Impacto 1); antes disso é tela vazia. |
| 6 | Como dono de restaurante (Doador), quero publicar uma doação apenas com tipo, quantidade e validade mínima de 2h, para que ela apareça imediatamente na lista de disponíveis das ONGs. | falha em Pequena → fatia 1 da história gigante; separada da foto/geolocalização, cobre só os campos testados em "recusa doação sem os campos obrigatórios". |
| 7 | ★ Como coordenador de ONG, quero aceitar um lote disponível com exclusividade garantida pelo sistema, para não perder a doação numa disputa com outra ONG nem chegar ao restaurante para uma doação que já foi retirada. | falha em Testável → "exclusividade" só é verificável simulando duas requisições simultâneas para o mesmo lote; sem esse critério de concorrência explícito o teste não sabe o que afirmar. |
| 8 | Como coordenador de ONG, quero confirmar o recebimento do lote retirado, para encerrar a pendência no sistema e permitir que a Marta meça quantas doações realmente chegaram ao destino. | falha em Negociável → a regra de quando o lote muda para CONCLUIDO foi inventada pelo grupo (Regra 3, origem Ausente); Marta ainda precisa ratificar se a confirmação é manual pela ONG ou automática por tempo. |

**Por que ela (história #7):** é a única regra "Praticada" (não inventada) do caso — a exclusividade de aceite é o que diferencia a plataforma dos grupos de WhatsApp e evita o problema central do caso: duas ONGs disputando o mesmo lote.

**O que ficou fora da fatia:**
- Confirmação de retirada e baixa do lote (fatia #8).
- Geolocalização em tempo real dos voluntários entregadores.
- Login completo (mantido o token/link mágico do Conflito 1).
- Foto e endereço estruturado na publicação (história #1/#4).

**Por quê:**
- Confirmação de retirada fora: a Regra 3 tem origem "Ausente" — foi inventada pelo grupo, e Marta ainda não ratificou se o encerramento é manual ou automático; implementar antes da ratificação é risco de retrabalho.
- Geolocalização fora: o Objetivo de Impacto 1 (tempo médio de coleta) ainda não tem linha de base medida nos primeiros 30 dias; otimizar sem medir é risco de esforço jogado fora.
- Login completo fora: decisão já registrada no Conflito 1 ("adiar com data") — o link mágico é suficiente para o piloto; login completo só se a taxa de erro do link se mostrar um problema.
- Foto/endereço estruturado fora: ainda não sabemos (spike da história #4) se o campo de endereço do restaurante é estruturado — é medição, não preguiça.

## Critérios de aceite

**História 7 ★ (Zero) — Como coordenador de ONG, quero aceitar um lote disponível com exclusividade garantida pelo sistema...**
* **Cenário 1: Aceite bem-sucedido**
  * **Dado** que um lote de alimento está publicado e consta com o status DISPONÍVEL;
  * **Quando** o coordenador da ONG clica no botão "Aceitar Doação";
  * **Então** o lote é removido da listagem pública e o sistema exibe a confirmação de reserva exclusiva para essa ONG.
* **Cenário 2: Disputa de concorrência (Caminho proibido)**
  * **Dado** que um lote está DISPONÍVEL e dois coordenadores de ONGs diferentes estão com a tela de aceite aberta;
  * **Quando** ambos clicam em "Aceitar Doação" exatamente ao mesmo tempo;
  * **Então** o sistema exibe a confirmação de sucesso para apenas um deles e a mensagem de erro "Este lote já foi reservado por outra ONG" para o outro.

**História 6 — Como dono de restaurante (Doador), quero publicar uma doação apenas com tipo, quantidade e validade mínima de 2h...**
* **Cenário 1: Publicação válida**
  * **Dado** que o formulário de doação está vazio e pronto para preenchimento;
  * **Quando** o doador preenche os campos obrigatórios com uma validade de 3 horas à frente e envia;
  * **Então** o sistema salva a doação e ela aparece imediatamente na lista de lotes DISPONÍVEIS para as ONGs.
* **Cenário 2: Validade inferior à permitida (Caminho proibido)**
  * **Dado** que o formulário de doação está preenchido;
  * **Quando** o doador informa uma validade de apenas 1 hora à frente do horário atual e tenta enviar;
  * **Então** o sistema não salva a doação e exibe o erro "O prazo de validade deve ser de no mínimo 2 horas a partir de agora".

**História 8 — Como coordenador de ONG, quero confirmar o recebimento do lote retirado...**
* **Cenário 1: Encerramento de pendência**
  * **Dado** que existe uma doação com o status RESERVADA vinculada à ONG atual;
  * **Quando** o coordenador clica no botão "Confirmar Retirada";
  * **Então** a doação é movida para o histórico com o status CONCLUÍDO e desaparece da tela de pendências ativas.

## Riscos

Escala de probabilidade e impacto utilizada: Alta / Média / Baixa.

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| A janela de apenas 1 hora para retirada da doação ser impraticável no trânsito para os voluntários das ONGs. | Alta | Alta | Até 01/09, o Pedro entrevista os coordenadores de duas ONGs para validar o tempo real de deslocamento e documenta no repositório. |
| O uso do link mágico (sem senha) gerar cadastros inválidos ou dificultar a auditoria exigida pela Vigilância Sanitária. | Média | Alta | Até 02/09, o Otávio implementa a geração do token atrelado estritamente ao telefone e testa se o fluxo bloqueia acessos anônimos no ambiente de homologação. |

## Hipótese e experimento

Acreditamos que os donos de restaurantes estão dispostos a cadastrar as doações ativamente por conta própria, desde que não precisem criar senhas complexas e o formulário exija apenas três campos básicos.
Saberemos que estávamos errados se a média de doações publicadas por restaurante ativo for menor do que 2 vezes por semana até o dia 30/09.
Como medimos: Contagem direta no banco de dados de doações criadas e vinculadas aos IDs de doadores cadastrados.

## Decisão de análise

* **Problema:** Definir a fronteira da "Fatia 1" (Walking Skeleton) limitando o escopo de publicação para conseguir entregar e testar o fluxo crítico de aceite exclusivo a tempo.
* **Alternativas:**
  * *Alternativa A:* Manter o upload de foto do alimento e a integração com API de geolocalização. Ganha-se mais segurança e previsibilidade para a ONG; perde-se uma semana de desenvolvimento lidando com armazenamento de imagens e mapas.
  * *Alternativa B:* Cortar fotos e mapas da primeira entrega, publicando estritamente tipo, quantidade e validade. Ganha-se velocidade para testar o gargalo da exclusividade do aceite (História 7) logo na iteração 1; perde-se a verificação visual prévia da comida.
* **Decisão e justificativa:** Escolhemos a *Alternativa B*. O objetivo de impacto central para validar o piloto é "reduzir o tempo médio de coleta". A mecânica de aceite exclusivo é o que diferencia o sistema do WhatsApp. Validar esse núcleo rápido é mais importante do que refinar o card com fotos.
* **Riscos e limitações:** O custo dessa decisão é que os voluntários dependerão de endereços preenchidos em texto livre pelos doadores (já que a História 4 ficou de fora). Isso aumenta o risco de atrasos na primeira semana por dificuldades logísticas de navegação.

## Uso de IA
- **História #3 (aceitar com exclusividade):** a IA gerou primeiro "Como usuário, quero aceitar a doação para ajudar as pessoas" — papel genérico (não é stakeholder do mapa da Aula 2) e "para" que só repete o "quero". O grupo trocou o papel por "coordenador de ONG" e o "para" pela perda concreta de chegar ao local com a doação já levada. Regra que a IA inventou: sugeriu uma "trava de 5 minutos" antes de permitir reaceite — esse prazo não existe no caso; a decisão foi manter a exclusividade imediata da Regra 2, e quem ratifica qualquer trava adicional é o grupo com a Marta, não a IA.
- **História #4 (endereço para o voluntário):** a IA sugeriu integrar direto com a API do Google Maps. O grupo trocou por um spike de 2h para primeiro checar se o cadastro do restaurante já guarda endereço estruturado, porque o caso não descreve esse campo. Regra inventada pela IA: assumiu que o endereço já vem estruturado; quem decide, após o spike, é o grupo.
- **História #8 (confirmar retirada):** a IA sugeriu automatizar a confirmação via geolocalização do voluntário entregador. Isso ignora que o caso adia explicitamente o refinamento de geolocalização dos voluntários ("ficam apenas sendo monitorados neste primeiro momento"). O grupo manteve a confirmação manual pela ONG; quem decide sobre acrescentar geolocalização depois é a Marta, dona da métrica de tempo de coleta.
- **Restrição que sumiu (erro mais caro):** na primeira versão da história #1, a IA não mencionou a validade mínima de 2h (Regra 1) nem o recorte de "um bairro" do piloto (Conflito 2) — as duas são regras de negócio centrais do caso e tiveram que ser reincorporadas manualmente.
