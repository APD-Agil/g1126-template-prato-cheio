# Diagrama de contexto — Prato Cheio

O sistema aproxima estabelecimentos doadores de ONGs que recebem alimentos excedentes. No piloto, ambos acessam a aplicação pelo navegador; o backend valida as regras e consulta o banco de doações.

```mermaid
flowchart LR
    D[Doador / estabelecimento]
    O[Coordenador de ONG]
    M[Marta / coordenadora]
    PC[Prato Cheio]
    DB[(Banco de doações)]

    D -->|Publica tipo, quantidade e validade| PC
    O -->|Consulta disponíveis e aceita doações| PC
    M -->|Consulta total mensal de doações aceitas| PC
    PC -->|Lê e atualiza doações| DB
```

O sistema não implementa autenticação completa nem integração com sistemas externos neste incremento.
