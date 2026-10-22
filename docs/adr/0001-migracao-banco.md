# ADR 0001 — Manter SQLite no piloto e migrar para PostgreSQL na Unidade 3

- **Data:** 22/10/2026
- **Status:** aceito

## Contexto

O Prato Cheio conecta doadores de alimentos a ONGs. O backend atual usa SQLite nativo do Node.js (`node:sqlite`) e o Vitest configura seu banco em memória. Essa configuração é simples e suficiente para o incremento atual, enquanto a interface e as regras de negócio são validadas no piloto.

O PostgreSQL só entra na Unidade 3, quando a migração do banco fizer parte da construção e refatoração planejadas. Adotá-lo agora acrescentaria configuração e operação de um serviço antes dessa etapa, sem ser necessário para implementar as histórias atuais.

Na Etapa 4, o piloto sofreu perda de dados reais: a configuração do ambiente apontou para o banco de produção e os testes executaram a rotina de limpeza nesse banco. A configuração de teste precisa ser isolada e a rotina de limpeza não pode apagar dados quando o banco em uso não for o banco de teste. A proteção implementada recusa a limpeza fora de `DATABASE_FILE=:memory:`; a configuração do Vitest define esse valor explicitamente.

## Alternativas

1. **Continuar com SQLite e permitir que a limpeza rode em qualquer banco.** Mantém a configuração simples, mas não impede a repetição do incidente.
2. **Continuar com SQLite e proteger a limpeza.** Mantém o banco atual e os testes em memória; a limpeza falha antes do `DELETE` quando o arquivo configurado não é `:memory:`.
3. **Migrar imediatamente para PostgreSQL, por exemplo em Docker.** Aproxima o ambiente do banco planejado para a Unidade 3, mas antecipa a operação e a migração do schema sem resolver, por si só, o risco de testes limparem um banco compartilhado ou de produção.

## Decisão

Manter SQLite no piloto e no incremento atual, com os testes explicitamente configurados para usar SQLite em memória e com `limparBanco()` recusando qualquer outra configuração. Fazer a migração para PostgreSQL na Unidade 3, com validação de compatibilidade do schema e preservação dos comportamentos já testados.

## Consequências

- **Positivas:**
  - Os testes continuam isolados do arquivo SQLite de desenvolvimento e do banco de produção.
  - A rotina de limpeza falha de forma explícita fora do banco em memória, em vez de apagar dados.
  - A equipe evita antecipar a operação de PostgreSQL à etapa de migração prevista.
- **Negativas (quem paga):**
  - O SQLite permanece como banco do piloto até a Unidade 3; quem implementar essa etapa paga o custo de adaptar driver, dialeto SQL e schema.
  - Quem mantém os testes precisa garantir que o Vitest continue configurando `DATABASE_FILE=:memory:`.
  - O teste de proteção cria e remove um arquivo SQLite temporário; a equipe mantém esse cenário automatizado junto com a suíte.
- **Riscos:**
  - Uma configuração incorreta do ambiente de teste pode afetar outros acessos ao banco que não passem por `limparBanco()`. A configuração do Vitest deve permanecer explícita e os ambientes de teste e produção devem ser separados.
  - A proteção depende de o banco de teste ser identificado pelo valor exato `:memory:`. Se a estratégia de testes mudar, a verificação de segurança e seu teste precisam ser atualizados juntos.
  - A migração futura pode revelar diferenças de dialeto ou de tipo de data. O teste da migração deve preservar os critérios de validação e ser executado antes de liberar a mudança.

## Rastreabilidade

- **Risco do piloto:** execução de limpeza de testes contra o banco de produção e perda de dados reais (incidente da Etapa 4).
- **Requisito de isolamento de testes:** `vitest.config.js` define SQLite em memória, e `tests/protecao-banco.test.js` verifica a recusa e a preservação dos dados fora dessa configuração.
- **Requisito de evolução do banco:** a disciplina prevê PostgreSQL na Unidade 3; manter a troca encapsulada em `src/db.js` e o acesso às consultas em `src/repositorio.js` reduz a propagação de mudanças.
- **História do incremento:** o relatório mensal da Marta depende do instante de aceite, registrado em `aceita_em` no schema SQLite atual e preservado como campo a mapear na migração.

## Critério de validação

Na Unidade 3, a migração será validada se o comportamento das rotas e regras continuar igual e se os testes automatizados passarem contra o banco PostgreSQL de teste. O contrato mínimo inclui publicação com validade mínima, listagem, aceite exclusivo, contagem mensal e recusa da limpeza em qualquer banco que não seja o banco de teste autorizado.

Comandos e evidências para o PR da migração:

| O que validar | Comando ou teste |
|---|---|
| A suíte continua aprovando os fluxos e o relatório mensal | `npm test` |
| A limpeza fora do banco de teste falha e mantém a doação | Teste BDD em `tests/protecao-banco.test.js`, executado por `npm test` |
| A interface, as rotas e as regras de negócio mantêm seu comportamento durante a troca do driver | `git diff --exit-code -- tests/ src/app.js src/doacoes.js public/` deve terminar sem diferenças causadas pela migração |
| O driver do PostgreSQL fica encapsulado na camada de banco | Revisar as importações em `src/` e confirmar que apenas `src/db.js` importa o driver |

Os comandos devem ser executados no ambiente de CI com PostgreSQL disponível para a migração. Uma falha em qualquer critério bloqueia a entrega até ser corrigida.
