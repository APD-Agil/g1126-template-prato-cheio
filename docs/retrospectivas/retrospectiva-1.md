# Retrospectiva da Iteração 1

- **Data:** [PREENCHER — data da Aula 5] · **Grupo:** Prato Cheio

## O que decidimos nesta iteração

1. **Cortar fotos, geolocalização e login completo da fatia 1** (Decisão de análise, `docs/analise.md`): o walking skeleton entrega só o fluxo crítico — publicar → listar → aceitar com exclusividade — porque é o que valida o objetivo de impacto central (reduzir o tempo médio de coleta) e o que diferencia o sistema do WhatsApp (Regra 2).
2. **Adiar login completo por um token/link mágico** (Conflito 1): resolve a fricção do doador sem abrir mão totalmente da rastreabilidade exigida pela Vigilância Sanitária, com data para revisão ao final do piloto.
3. **Garantir a exclusividade do aceite com um UPDATE atômico no banco** (`WHERE status = 'disponivel'`), em vez de checar-e-depois-atualizar em dois passos — evita que duas ONGs aceitem o mesmo lote em uma disputa de concorrência (Regra 2 / Cenário 2 da História 7).

## O que funcionou

- Separar a História 1 (grande, com foto/geolocalização) da História 6 (fatia pequena, só os 3 campos obrigatórios) tornou o escopo do walking skeleton claro e possível de terminar na Aula 4.
- Escrever os critérios de aceite em Dado/Quando/Então antes de implementar tornou a tradução para testes automatizados quase direta — os 5 testes do walking skeleton vieram quase copiados dos cenários do `analise.md`.
- O `node:sqlite` embutido eliminou qualquer etapa de instalação de banco para rodar o projeto localmente.

## O que mudaríamos

- O campo de validade na interface (`public/index.html`) começou como `<input type="date">`, sem horário — incompatível com a Regra 1 (mínimo de 2 horas a partir de agora). Precisamos revisar esse tipo de inconsistência entre regra de negócio e formulário mais cedo, na Aula 2/3, e não só ao implementar.
- A Regra 3 (confirmação de retirada) ficou com origem "Ausente" — inventada pelo grupo — e ainda não foi ratificada pela Marta. Isso significa que a próxima iteração pode exigir retrabalho nessa história (#8) se a decisão dela for diferente da nossa suposição.

## Próximos passos (para a próxima iteração)

- Validar com a Marta o momento exato em que o lote deve virar `CONCLUIDO` (Regra 3), antes de implementar a História 8.
- Entrevistar coordenadores de ONGs sobre a janela de retirada de 1h (risco já registrado em `docs/analise.md`).
- Avaliar, com dados reais do piloto, se o link mágico do Conflito 1 está gerando erros de acesso que justifiquem antecipar o login completo.
- Decidir, com a Marta, os campos estruturados de endereço (spike da História #4) antes de priorizar geolocalização dos voluntários.

## Autoavaliação de contribuição

Distribuam 100 pontos entre os integrantes conforme a contribuição desta iteração
(inclui código, análise, documentação, revisão de PR). Cada integrante assina.

| Integrante | Pontos | O que fez de mais relevante |
|---|:--:|---|
| Henrique Osmar Adelino (@hosmaradelino) | 20 | Estrutura geral do projeto na fase inicial (repositório, CI, fluxo de PR) e cobriu a parte do Pedro em um dia que ele faltou |
| Pedro Henrique Coppola (@pedrohenriquecoppola) | 20 | Aulas 2 e 3: histórias de usuário, escolha da história zero e apoio no mapa de stakeholders/regras de negócio |
| Willian Vinicius Ramalho (@willianramalho) | 20 | Ajudou fortemente na Aula 2: mapa de stakeholders, objetivos de impacto, regras de negócio e conflitos de prioridade |
| Davi Rudinei Peres (@daavizeira) | 20 | Entrega da Aula 4: critérios de aceite, riscos e hipótese |
| Otavio Santana Possenti (@otaviosantanna) | 20 | Implementação do walking skeleton (código: regras de negócio, acesso a dados, testes) |

**Total: 100**

> Assinaturas: cada integrante deve confirmar/ajustar os pontos acima antes da entrega
> (Teams, Aula 5) — a autoavaliação orienta as perguntas da defesa individual.
