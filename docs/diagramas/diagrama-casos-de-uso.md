# Diagrama de Casos de Uso — BuildPoint ID

**Versão:** 1.1 — mantido idêntico ao diagrama do §4 de [`../01-documento-de-requisitos.md`](../01-documento-de-requisitos.md), para não existirem duas versões divergentes do mesmo caso de uso. Qualquer alteração de caso de uso deve ser feita nos dois lugares na mesma revisão.

Revisão desta versão: terminologia "Peão" → **Operário**; ator **Admin** adicionado (papel de suporte técnico, sem tela no app); oito casos de uso novos (UC14–UC18, além de UC07/UC08 redefinidos) cobrindo edição de operário/obra, validação de ponto offline, contingência em papel e acesso administrativo — ver histórico de mudanças no documento de requisitos, §1.4.

## Versão Mermaid (GitHub / Markdown)

```mermaid
flowchart TB
  subgraph Sistema[BuildPoint ID]
    UC01([UC01 Cadastrar Obra por ART])
    UC02([UC02 Cadastrar ou Selecionar Gerente])
    UC03([UC03 Visualizar Dashboard])
    UC04([UC04 Configurar Raio de Ponto])
    UC05([UC05 Cadastrar Operario com Biometria])
    UC06([UC06 Registrar Ponto Eletronico])
    UC07([UC07 Confirmar Contingencia Presencial])
    UC08([UC08 Consultar Historico Agrupado por Dia])
    UC09([UC09 Validar Identidade Facial])
    UC10([UC10 Validar Perimetro GPS])
    UC11([UC11 Emitir e Baixar Recibo em PDF])
    UC12([UC12 Auditar Registro por Hash])
    UC13([UC13 Recuperar Senha])
    UC14([UC14 Editar Operario])
    UC15([UC15 Editar ou Excluir Obra])
    UC16([UC16 Registrar Ponto Offline com Validacao Local])
    UC17([UC17 Lancar Contingencia em Papel])
    UC18([UC18 Acessar Painel Administrativo])
  end

  Dono((Dono))
  Gerente((Gerente))
  Operario((Operario))
  Admin((Admin))
  FaceID[[Motor de reconhecimento facial no dispositivo]]
  GPS[[Sistema GPS]]

  Dono --> UC01
  Dono --> UC02
  Dono --> UC03
  Dono --> UC12
  Dono --> UC13
  Dono --> UC15

  Gerente --> UC04
  Gerente --> UC05
  Gerente --> UC07
  Gerente --> UC12
  Gerente --> UC13
  Gerente --> UC14
  Gerente --> UC17
  Gerente -.-> UC06

  Operario --> UC06
  Operario --> UC08
  Operario --> UC11
  Operario --> UC13
  Operario --> UC16

  Admin --> UC18

  UC06 -.->|include| UC09
  UC06 -.->|include| UC10
  UC06 -.->|include| UC11
  UC05 -.->|include| UC09
  UC07 -.->|include| UC10
  UC16 -.->|extend| UC06

  UC09 --> FaceID
  UC10 --> GPS
```

## Lista de casos de uso

| ID | Nome | Ator principal |
| :--- | :--- | :--- |
| UC01 | Cadastrar Obra por ART | Dono |
| UC02 | Cadastrar / Selecionar Gerente | Dono |
| UC03 | Visualizar Dashboard | Dono |
| UC04 | Configurar Raio de Ponto | Gerente |
| UC05 | Cadastrar Operário com Biometria | Gerente |
| UC06 | Registrar Ponto Eletrônico | Operário |
| UC07 | Confirmar Contingência Presencial | Gerente |
| UC08 | Consultar Histórico Agrupado por Dia | Operário |
| UC09 | Validar Identidade Facial | Motor de reconhecimento facial |
| UC10 | Validar Perímetro GPS | Sistema GPS |
| UC11 | Emitir e Baixar Recibo em PDF | Operário |
| UC12 | Auditar Registro por Hash | Dono, Gerente |
| UC13 | Recuperar Senha | Dono, Gerente, Operário |
| UC14 | Editar Operário | Gerente |
| UC15 | Editar ou Excluir Obra | Dono |
| UC16 | Registrar Ponto Offline com Validação Local | Operário |
| UC17 | Lançar Contingência em Papel | Gerente |
| UC18 | Acessar Painel Administrativo | Admin |

As especificações textuais completas (pré/pós-condições, fluxo principal e alternativos) de cada caso de uso estão em [`../01-documento-de-requisitos.md`](../01-documento-de-requisitos.md), §8.
