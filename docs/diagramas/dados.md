# Diagrama de dados — Prato Cheio
*Pergunta que este diagrama responde:* o que o banco guarda sobre cada doação e como cada
operação muda o estado do lote?
A versão original (Aula 7) está em `docs/aulas/Análise e Modelação de SistemaProjeto_
Prato Cheio.pdf`, seção 2. Este diagrama acompanha o schema que `migrar()` (`src/db.js`)
cria no PostgreSQL ao fim do Trabalho 3.
## Hoje (o que o `src/db.js` cria no PostgreSQL)
```mermaid
erDiagram
DOACOES ||--o{ DEVOLUCOES : "pode ser devolvida"
DOACOES {
INTEGER id PK "SERIAL"
TEXT tipo "NOT NULL"
TEXT quantidade "NOT NULL"
TEXT validade "NOT NULL"
TEXT status "disponivel, aceita ou coletada"
TEXT doador "H1: quem publicou; padrao nas doacoes antigas"
TEXT ong "NULL quando disponivel"
TEXT aceita_em "NULL quando disponivel"
TEXT voluntario "H2: quem buscou"
TEXT coletada_em "H2: horario da coleta"
TEXT concluida_em "legado da Historia 8; copiado para coletada_em"
TEXT criada_em "horario da publicacao (gerado em JS)"
}
DEVOLUCOES {
INTEGER id PK "SERIAL"
INTEGER doacao_id FK "ON DELETE CASCADE"
TEXT ong "quem devolveu"
TEXT motivo "NOT NULL"
TEXT devolvida_em "NOT NULL"
}
```
Transições de estado (decisão 4 de `docs/projeto.md`; no código, a tabela `TRANSICOES` em
`src/doacoes.js`):
```mermaid
stateDiagram-v2
[*] --> disponivel: publicar (POST /api/doacoes)
disponivel --> aceita: aceitar (UPDATE ... WHERE status = 'disponivel')
aceita --> coletada: confirmar coleta (POST /api/doacoes/:id/confirmar-coleta)
aceita --> disponivel: devolver (POST /api/doacoes/:id/devolver)
```
Qualquer outra transição é recusada com HTTP 400 e a doação não muda. A devolução limpa
`ong` e `aceita_em` da doação e grava uma linha em `DEVOLUCOES`, na mesma instrução SQL.
Os horários são `TEXT` no formato `AAAA-MM-DD HH:MM:SS` (UTC), gerados em
`src/repositorio.js` para que os testes controlem o relógio (H4).
## Divergências declaradas
| # | Onde diverge | Diagrama ou documento | Código (`src/`) | O que fazemos |
|---|---|---|---|---|
| 1 | Nome do estado após o aceite | Análise (Regra 2): `RESERVADO` | `aceita` | Mantido
`aceita`; a correspondência está em `docs/validacao.md` → Mudanças de critério |
| 2 | Nome do estado final | Regra 3: `CONCLUIDO` | `coletada` (era `concluida` até a H2)
| `migrar()` converte as linhas antigas; `concluida_em` fica só como legado |
| 3 | Coluna de versão do lock otimista | Decisão de projeto #1 | não existe: o `UPDATE`
usa `WHERE status = ...` | A condição no estado já garante a exclusividade (teste de
concorrência do aceite) |
| 4 | Identidade de doador e ONG | Conflito 1: token/link mágico | `doador` e `ong` são
nomes digitados, sem autenticação | Limitação registrada em `docs/validacao.md` |
| 5 | Tipo das datas | Planejado: `TIMESTAMPTZ` | `TEXT` em UTC | A conversão segue
pendente; o relatório usa `::timestamp` no SQL |
