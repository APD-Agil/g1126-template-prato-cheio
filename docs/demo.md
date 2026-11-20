# Roteiro da demo — Prato Cheio

*Atividade da Aula 13 · 3 minutos*

## Antes de começar

Requisitos: Node.js 22.13+ e PostgreSQL 16 acessível. O app não carrega `.env` automaticamente; defina o mesmo `DATABASE_URL` documentado no README e em `.env.example`.

No PowerShell, em um clone limpo:

```powershell
docker run --name prato-cheio-postgres -e POSTGRES_USER=pratocheio -e POSTGRES_PASSWORD=pratocheio -e POSTGRES_DB=pratocheio -p 5432:5432 -d postgres:16-alpine
docker exec prato-cheio-postgres pg_isready -U pratocheio
$env:DATABASE_URL = 'postgres://pratocheio:pratocheio@localhost:5432/pratocheio'
npm ci
npm run db:migrar
npm start
```

O comando `docker run` cria o banco na primeira execução; se o contêiner já existir, inicie-o com `docker start prato-cheio-postgres`. Repita `docker exec ... pg_isready` até informar que o servidor está aceitando conexões. Deixe `npm start` rodando e use outro terminal para os passos abaixo. Esses comandos correspondem ao README.

### Execução observada nesta iteração

- `npm ci` no clone limpo terminou com sucesso (`added 150 packages`).
- O valor definido para `DATABASE_URL` foi `postgres://pratocheio:pratocheio@localhost:5432/pratocheio`.
- Não havia PostgreSQL escutando em `localhost:5432`; `docker info` também falhou porque o daemon Docker não estava rodando. Portanto, `npm test`, `npm run db:migrar` e `npm start` não chegaram a executar fluxos da aplicação: a conexão terminou em `ECONNREFUSED`.
- No CI do PR #11, o job `build-e-testes` passou com 8 testes e a verificação de saúde da API. Isso valida os testes automatizados, mas não substitui a execução manual deste roteiro ou a conferência da interface no navegador.
- O roteiro abaixo ainda precisa ser executado por um integrante com PostgreSQL disponível. Não considere as respostas esperadas como uma execução manual concluída.

## Roteiro (3 minutos)

| Tempo | O que mostrar | O que se prova |
|---|---|---|
| 0:00–0:20 | “O Prato Cheio conecta estabelecimentos com excedentes de alimentos a ONGs antes que a comida se perca.” | Problema central de [docs/analise.md](analise.md). |
| 0:20–1:50 | Publicar uma doação válida, consultá-la e reservá-la por uma ONG usando os passos 1–3. | Caminho de publicação e aceite exclusivo coberto pelos testes de [tests/doacoes.test.js](../tests/doacoes.test.js). |
| 1:50–2:30 | Tentar publicar com validade de uma hora usando o passo 4. | A API trata o erro com HTTP 400 e a mensagem da Regra 1; a interface HTML atual não exibe essa resposta ao clicar em “Publicar”. |
| 2:30–3:00 | Mostrar o que falta: confirmação da retirada e tela/rota de pendências ainda não existem em `main`. | Limites observados em `src/app.js`, `src/doacoes.js` e nos testes presentes. |

## Passo a passo reproduzível

Execute os comandos abaixo no PowerShell, com `npm start` ativo. Os testes correspondentes passaram no CI contra PostgreSQL 16; o integrante que fizer a demo ainda deve confirmar as respostas neste ambiente e verificar a apresentação na interface.

1. Crie uma doação com validade de três horas:

   ```powershell
   $validade = (Get-Date).AddHours(3).ToString('yyyy-MM-ddTHH:mm:ss')
   $corpo = @{ tipo = 'Sopa'; quantidade = '10 porções'; validade = $validade } | ConvertTo-Json
   $doacao = Invoke-RestMethod -Method Post -Uri 'http://localhost:3000/api/doacoes' -ContentType 'application/json' -Body $corpo
   $doacao
   ```

   Resultado a conferir: resposta com a doação criada e `status` igual a `disponivel`.

2. Consulte a lista pública:

   ```powershell
   Invoke-RestMethod -Method Get -Uri 'http://localhost:3000/api/doacoes'
   ```

   Resultado a conferir: a lista contém a doação “Sopa”. O teste relacionado é `mostra a doação publicada na lista de disponíveis`.

3. Reserve a doação e consulte a lista novamente:

   ```powershell
   $id = $doacao.id
   $reserva = Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/doacoes/$id/aceitar" -ContentType 'application/json' -Body (@{ ong = 'ONG Esperança' } | ConvertTo-Json)
   $reserva
   Invoke-RestMethod -Method Get -Uri 'http://localhost:3000/api/doacoes'
   ```

   Resultado a conferir: a resposta tem `status` igual a `aceita` e `ong` igual a `ONG Esperança`; a lista de disponíveis fica vazia. Testes relacionados: `marca a doação como aceita pela ONG` e `remove a doação da lista de disponíveis depois de aceita`.

4. Tente publicar validade de uma hora:

   ```powershell
   $validadeCurta = (Get-Date).AddHours(1).ToString('yyyy-MM-ddTHH:mm:ss')
   $corpoCurto = @{ tipo = 'Arroz'; quantidade = '3 kg'; validade = $validadeCurta } | ConvertTo-Json
   curl.exe -i -X POST 'http://localhost:3000/api/doacoes' -H 'Content-Type: application/json' --data-raw $corpoCurto
   ```

   Resultado a conferir: HTTP 400 e JSON com `erro` igual a `O prazo de validade deve ser de no mínimo 2 horas a partir de agora`. O teste relacionado é `recusa doação sem os campos obrigatórios`.

## Testado por

PENDENTE_HUMANO
