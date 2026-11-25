# Roteiro da demo — Prato Cheio

*Trabalho 3 · 3 minutos · no navegador do celular*

## Antes de começar (fora do cronômetro)

Siga `## Como rodar` do README: PostgreSQL 16 no Docker, `DATABASE_URL`, `npm ci`, `npm run db:migrar`, `npm start`. No celular, na mesma rede Wi-Fi, abra `http://<ip-do-computador>:3000`. O IP aparece em `ipconfig` no Windows ou `ipconfig getifaddr en0` no macOS. Sem celular, use o modo responsivo do navegador com largura de **360 px**.

Para começar com o banco vazio: `docker exec prato-cheio-postgres psql -U pratocheio -c "TRUNCATE doacoes CASCADE"`.

## Roteiro (3 minutos)

| Tempo | O que mostrar | Passos |
|---|---|---|
| 0:00–0:15 | **O problema em uma frase:** "Comida sobra no comércio e falta nas ONGs. O Prato Cheio liga as duas pontas antes que a comida estrague, e mede quanto tempo isso leva." | — |
| 0:15–2:00 | **A vida de uma doação:** publicada → aceita → coletada, e uma devolvida | 1 a 4 |
| 2:00–2:30 | **Um caso de erro** | 5 |
| 2:30–2:50 | **O resultado da Marta** | 6 |
| 2:50–3:00 | **O que falta:** login de doador e ONG, aviso de vencimento, horário de Brasília no relatório (`docs/validacao.md` → Limitações) | — |

## Passo a passo

**1. Publicar (H1, Histórias 6/7).**
- **Ação:** em **Doador**, digite `Padaria Pão Bom`. Publique `Pão` / `20 unidades` e `Bolo` / `2 unidades`, ambos com **Validade** de 3 horas à frente.
- **Resultado esperado:** `Doação #<id> publicada com sucesso.` (em verde). As duas aparecem em **Doações disponíveis** e em **Minhas doações** como `Pão — 20 unidades: disponível` e `Bolo — 2 unidades: disponível`.

**2. Aceitar (História 7, H1-CA1).**
- **Ação:** em **ONG atual**, troque para `Casa Esperança` e toque fora do campo. Clique **Aceitar** no “Bolo” e depois no “Pão”.
- **Resultado esperado:** `Reserva exclusiva confirmada para Casa Esperança.` Os dois saem de **Doações disponíveis** e vão para **Pendências de coleta da ONG**. Em **Minhas doações**: `Bolo — 2 unidades: aceita por Casa Esperança`.

**3. Confirmar a coleta (H2).**
- **Ação:** em **Voluntário que buscou**, digite `Rui` e clique **Confirmar Coleta** no “Bolo”.
- **Resultado esperado:** `Coleta confirmada por Rui para Casa Esperança.` O “Bolo” vai para **Histórico de coletas** (`coletada por Rui em <horário>`). Em **Minhas doações**: `Bolo — 2 unidades: coletada por Rui em <horário>`.

**4. Devolver (H3).**
- **Ação:** em **Motivo**, digite `sem voluntário hoje` e clique **Devolver** no “Pão”.
- **Resultado esperado:** `Doação #<id> devolvida para a lista de disponíveis (motivo: sem voluntário hoje).` O “Pão” volta para **Doações disponíveis** com **Aceitar**, e em **Minhas doações** aparece como `disponível`, sem o nome da ONG.

**5. Caso de erro (Regra 1 e H1-CA3).**
- **Ação:** publique `Arroz` / `3 kg` com validade de **1 hora** à frente. Depois apague o **Doador** e publique de novo com validade de 3 horas.
- **Resultado esperado:** em vermelho, `O prazo de validade deve ser de no mínimo 2 horas a partir de agora`, e na segunda tentativa `Informe o nome do doador`. Nenhum “Arroz” aparece na lista.

**6. Resultado do mês (H4).**
- **Ação:** em **Resultado do mês (coordenação)**, escolha o mês atual e clique **Ver resultado**. Depois escolha um mês sem doações.
- **Resultado esperado:** `<AAAA-MM>: 2 publicadas · 1 aceitas · 1 coletadas · 1 devoluções · tempo médio até a coleta: <X> h`. O “Bolo” é a coletada; o “Pão” devolvido conta como publicado e como devolução, mas não como aceito. No mês vazio: `tempo médio até a coleta: sem coletas no mês`.

## Testado por

_A preencher por um integrante que **não** escreveu este roteiro, depois de executá-lo sozinho, sem ajuda._

- **Quem:**
- **Quando:**
- **Aparelho e navegador:**
- **O que mudou no roteiro depois da execução:**
