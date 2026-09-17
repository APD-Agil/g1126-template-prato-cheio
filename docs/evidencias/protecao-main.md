# Evidência — Proteção da branch `main`

*Entregue no primeiro Pull Request do grupo, a partir do qual nada mais entra na `main` sem PR revisado por outro integrante e com CI verde.*

## O que foi ativado

- Repositório: `APD-Agil/g1126-template-prato-cheio`
- Branch protegida: `main`
- Ativado por: **[nome de quem tem admin]**
- Data: **[dd/mm/aaaa]**

Regras habilitadas em *Settings → Branches → Branch protection rules*:

- [ ] Require a pull request before merging
- [ ] Require approvals — mínimo de **1** aprovação
- [ ] Require status checks to pass before merging — check obrigatório: `build-e-testes` (workflow `.github/workflows/ci.yml`)
- [ ] Do not allow bypassing the above settings (aplica a regra também para admins, se marcado)

## Print da configuração

*(inserir aqui o screenshot da tela de Branch protection rules já salva, mostrando as opções marcadas acima)*

## Como isso passa a valer

A partir desta entrega, todo merge na `main` exige:
1. Pull Request aberto (sem push direto na `main`);
2. Revisão de pelo menos um outro integrante do grupo;
3. CI (`build-e-testes`) verde.

Essa regra vale até o fim do semestre e é critério de aceite do Trabalho 2.
