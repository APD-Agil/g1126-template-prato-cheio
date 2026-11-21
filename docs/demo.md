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

- `npm ci` terminou com sucesso (`added 150 packages`); o ambiente definiu `DATABASE_URL=postgres://pratocheio:pratocheio@localhost:5432/pratocheio`.
- Docker iniciou PostgreSQL 16; `pg_isready` primeiro informou que ainda não havia resposta e depois `accepting connections`.
- `npm run db:migrar` terminou com `schema criado`.
- `npm test` local, contra esse PostgreSQL, terminou com **3 arquivos e 17 testes aprovados**.
- Com `npm start` ativo, `GET /api/saude` respondeu `{"ok":true}`. Uma sequência HTTP real publicou a doação `id=39` (`disponivel`), aceitou pela ONG de teste (`aceita`), listou 1 pendência, confirmou a retirada (`concluida`, `concluida_em=2026-11-20 23:35:48`), deixou 0 pendências e 1 item no histórico. Uma publicação com validade de 1 hora respondeu HTTP 400 com `O prazo de validade deve ser de no mínimo 2 horas a partir de agora`.
- O fluxo da interface foi exercitado por testes com DOM simulado em `tests/interface.test.js`; a execução manual por outro integrante e a conferência visual no navegador continuam pendentes.

## Roteiro (3 minutos)

| Tempo | O que mostrar | O que se prova |
|---|---|---|
| 0:00–0:20 | “O Prato Cheio conecta estabelecimentos com excedentes de alimentos a ONGs antes que a comida se perca.” | Problema central de [docs/analise.md](analise.md). |
| 0:20–1:50 | Publicar uma doação, aceitá-la e confirmar a retirada; mostrar a pendência e depois o histórico. | Fluxo das Histórias 6, 7 e 8, com confirmação exclusiva, encerramento e timestamp. |
| 1:50–2:30 | Tentar publicar com validade de uma hora usando o passo 6. | A API responde HTTP 400 e a interface exibe a mensagem da Regra 1. |
| 2:30–3:00 | Mostrar o que falta: autenticação da ONG não faz parte deste incremento. | A API usa o nome de ONG enviado pelo cliente; não há autenticação de identidade. |

## Passo a passo reproduzível

Execute os comandos abaixo no PowerShell, com `npm start` ativo. Eles usam o nome de ONG que será informado no campo **ONG atual** da interface.

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

3. Reserve a doação pela interface:

   ```powershell
   $id = $doacao.id
   $ong = 'ONG Esperança'
   $ongUrl = [uri]::EscapeDataString($ong)
   ```

   No navegador, atualize `http://localhost:3000`, digite `ONG Esperança` em **ONG atual** e clique **Aceitar** no card “Sopa”. A interface envia `POST /api/doacoes/$id/aceitar`. Resultado a conferir: mensagem `Reserva exclusiva confirmada para ONG Esperança.`, card removido da lista pública e botão **Confirmar Retirada** na pendência. Testes relacionados: `marca a doação como aceita pela ONG`, `remove a doação da lista de disponíveis depois de aceita` e `mostra confirmação de reserva exclusiva após aceitar`.

4. Consulte as pendências dessa ONG:

   ```powershell
   Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/doacoes/pendencias?ong=$ongUrl"
   ```

   Resultado a conferir: a doação aceita aparece com `status=aceita`.

5. Confirme a retirada e depois consulte as pendências e o histórico:

   ```powershell
   $corpoRetirada = @{ ong = $ong } | ConvertTo-Json
   Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/doacoes/$id/confirmar-retirada" -ContentType 'application/json' -Body $corpoRetirada
   ```

   Ou, na interface, clique **Confirmar Retirada**. Resultado a conferir: mensagem de confirmação, `status=concluida` e `concluida_em` preenchido.

   Agora confirme a remoção das pendências e a presença no histórico:

   ```powershell
   Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/doacoes/pendencias?ong=$ongUrl"
   Invoke-RestMethod -Method Get -Uri "http://localhost:3000/api/doacoes/historico?ong=$ongUrl"
   ```

   Resultado a conferir: lista de pendências vazia e a doação no histórico. Testes relacionados: `conclui uma doação aceita, registra o encerramento e remove a pendência` e `mostra confirmação após concluir a retirada`.

6. Tente publicar validade de uma hora, na interface:

   - Preencha **Tipo de alimento** com `Arroz` e **Quantidade** com `3 kg`.
   - Informe em **Validade / retirar até** um horário de uma hora à frente e clique **Publicar**.
   -    Resultado a conferir: a interface exibe `O prazo de validade deve ser de no mínimo 2 horas a partir de agora`. O teste da API é `recusa publicação sem campos obrigatórios ou com validade curta`; o teste de interface é `mostra o erro retornado pela API ao recusar validade curta`.

## Testado por

Davi