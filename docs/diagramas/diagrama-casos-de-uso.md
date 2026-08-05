# Diagrama de Casos de Uso — BuildPoint ID

Coerente com a Etapa 2 (atores Dono, Gerente, Peão + Face ID e GPS).

## Versão Mermaid (GitHub / Markdown)

```mermaid
flowchart TB
  subgraph Sistema[BuildPoint ID]
    UC01([UC01 Cadastrar Obra])
    UC02([UC02 Cadastrar Vincular Gerente])
    UC03([UC03 Visualizar Dashboard])
    UC04([UC04 Configurar Raio de Ponto])
    UC05([UC05 Cadastrar Peao com Biometria])
    UC06([UC06 Registrar Ponto Eletronico])
    UC07([UC07 Validar Ponto em Contingencia])
    UC08([UC08 Consultar Historico])
    UC09([UC09 Validar Identidade Facial])
    UC10([UC10 Validar Perimetro GPS])
  end

  Dono((Dono))
  Gerente((Gerente))
  Peao((Peao))
  FaceID[[API Face ID]]
  GPS[[Sistema GPS]]

  Dono --> UC01
  Dono --> UC02
  Dono --> UC03

  Gerente --> UC04
  Gerente --> UC05
  Gerente --> UC07
  Gerente -.-> UC06

  Peao --> UC06
  Peao --> UC08

  UC06 -.->|include| UC09
  UC06 -.->|include| UC10
  UC05 -.->|include| UC09
  UC07 -.->|include| UC10

  UC09 --> FaceID
  UC10 --> GPS
```

## Lista de casos de uso

| ID | Nome | Ator principal |
| :--- | :--- | :--- |
| UC01 | Cadastrar Obra | Dono |
| UC02 | Cadastrar / Vincular Gerente | Dono |
| UC03 | Visualizar Dashboard | Dono |
| UC04 | Configurar Raio de Ponto | Gerente |
| UC05 | Cadastrar Peão com Biometria | Gerente |
| UC06 | Registrar Ponto Eletrônico | Peão |
| UC07 | Validar Ponto em Contingência | Gerente |
| UC08 | Consultar Histórico de Dias Trabalhados | Peão |
| UC09 | Validar Identidade Facial | API Face ID |
| UC10 | Validar Perímetro GPS | Sistema GPS |
