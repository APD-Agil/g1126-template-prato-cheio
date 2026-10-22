# ADR 0002 — Manter a stack nativa e leve no piloto

- **Data:** 22/10/2026
- **Status:** aceito

## Contexto

O Prato Cheio precisa oferecer a doadores e ONGs um fluxo simples para publicar, consultar e aceitar doações. O piloto tem orçamento próximo de zero e o uso precisa ser viável pelo navegador, inclusive em celular. A equipe já trabalha com Node.js 22+, Express e SQLite nativo; a migração para PostgreSQL está planejada para a Unidade 3.

É necessário decidir se o piloto adota ferramentas adicionais para acesso a dados e frontend ou se mantém uma stack pequena, com menor custo de configuração e operação.

## Alternativas

1. **Node.js com SQLite nativo e SQL direto; Express servindo HTML, CSS e JavaScript.** Poucas dependências e implantação simples; exige que a equipe mantenha SQL e a interface sem abstrações de ORM ou framework frontend.
2. **Node.js com ORM, como Prisma, e frontend React separado.** Oferece abstrações para consultas e componentes de interface; exige dependências, configuração, compilação e aprendizado adicionais.

## Decisão

Manter Node.js 22+, SQLite nativo (`node:sqlite`), Express e a interface HTML/CSS/JavaScript servida pelo Express, sem ORM ou framework frontend no piloto. As consultas permanecem no repositório (`src/repositorio.js`) e a conexão fica concentrada em `src/db.js`. A decisão será reavaliada na Unidade 3, quando PostgreSQL for introduzido.

## Consequências

- **Positivas:**
  - O piloto não precisa de um serviço de banco separado nem de um processo de build frontend.
  - A equipe mantém as consultas explícitas e o fluxo de acesso ao banco concentrado em módulos conhecidos.
  - A página pode ser acessada pelo navegador do celular sem instalar um aplicativo.
- **Negativas (quem paga):**
  - Quem implementar novas consultas paga o custo de escrever SQL e manter a compatibilidade durante a migração para PostgreSQL.
  - A equipe paga o custo de manter a adaptação visual e os comportamentos da página sem componentes de um framework frontend.
- **Riscos:**
  - A interface simples pode não atender a necessidades de interação que apareçam durante o piloto. Se os usuários não conseguirem concluir o fluxo com facilidade, a equipe deve reavaliar a adoção de um frontend dedicado.
  - O SQL específico do SQLite pode exigir ajustes na Unidade 3. A camada de repositório e os testes devem ser mantidos para verificar o comportamento durante a troca.

## Rastreabilidade

- **Stakeholder Doadores:** a interface deve ser simples para garantir engajamento (`docs/analise.md`, Stakeholders).
- **Stakeholder Voluntários Entregadores:** o sistema precisa ser prático para uso na rua (`docs/analise.md`, Stakeholders).
- **Incerteza 4:** o desempenho conforme aumenta a quantidade de usuários e doações ainda precisa ser observado (`docs/analise.md`, Incertezas); por isso a stack do piloto é mantida pequena e sua adequação será reavaliada ao escalar.
- **Evolução do banco:** a migração para PostgreSQL na Unidade 3 é registrada no [ADR 0001](0001-migracao-banco.md).

## Critério de Validação

Durante o piloto, verificar que:

| O que validar | Evidência |
|---|---|
| O backend usa a stack declarada, sem ORM ou frontend separado | Conferir `package.json`, `src/server.js`, `src/db.js` e `public/index.html` |
| A página pode ser aberta em viewport móvel de 360 px | Abrir a aplicação em navegador com viewport de 360 px e conferir os campos e controles |
| Os fluxos de publicação, listagem, aceite e relatório continuam operacionais | Executar `npm test` |

Se algum fluxo de usuário não puder ser concluído ou a experiência móvel for inadequada, registrar a evidência e reavaliar esta decisão antes de ampliar o piloto.
