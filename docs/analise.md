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

## Critérios de aceite
**História X** — Dado … Quando … Então …

## Riscos
| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|

## Hipótese e experimento

## Decisão de análise
- **Problema:**
- **Alternativas:**
- **Decisão e justificativa:**
- **Riscos e limitações:**

## Uso de IA
O que geramos com IA, o que verificamos e o que alteramos.
