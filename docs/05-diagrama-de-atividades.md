# Diagrama de Atividades / BPMN — BuildPoint ID

Processo modelado: **Registro de ponto eletrônico no canteiro** (fluxo ponta a ponta do MVP).

---

## AT01 — Fluxo de registro de ponto (UML Activity)

```mermaid
flowchart TD
  Start([Inicio]) --> AbrirApp[Peao abre o aplicativo]
  AbrirApp --> ClicarPonto[Clica em Bater Ponto]
  ClicarPonto --> CapturarGPS[Capturar GPS do dispositivo]
  CapturarGPS --> GpsOk{GPS ativo e precisao aceitavel?}

  GpsOk -->|Nao| AvisoGps[Exibir aviso de GPS]
  AvisoGps --> CapturarGPS

  GpsOk -->|Sim| DentroRaio{Dentro do raio de 5 metros?}
  DentroRaio -->|Nao| Bloqueio([Bloqueia marcacao - fora do perimetro])
  DentroRaio -->|Sim| AbrirCamera[Abrir camera frontal]
  AbrirCamera --> CapturarFace[Capturar rosto]
  CapturarFace --> FaceOk{Identidade confirmada em ate 3s?}

  FaceOk -->|Nao| Tentativas{Tentativas restantes?}
  Tentativas -->|Sim| CapturarFace
  Tentativas -->|Nao| Contingencia([Orientar procurar Gerente])

  FaceOk -->|Sim| TemNet{Ha conexao com internet?}
  TemNet -->|Nao| Offline[Gravar ponto offline criptografado]
  Offline --> AvisoOffline([Ponto offline - sync pendente])

  TemNet -->|Sim| Persistir[Backend gera NSR e LogAuditoria]
  Persistir --> Sucesso([Exibir sucesso com horario marcado])
```

---

## BPMN01 — Processo “Bater Ponto” (visão de negócio)

```mermaid
flowchart LR
  subgraph PeaoLane[Piscina Peao]
    A([Inicio]) --> B[Solicitar batida de ponto]
    B --> C{Validacoes OK?}
    C -->|Nao| D[Receber recusa]
    D --> Z1([Fim sem registro])
    C -->|Sim| E[Confirmar face na camera]
    E --> F{Online?}
    F -->|Nao| G[Aceitar registro offline]
    F -->|Sim| H[Receber comprovante]
    G --> Z2([Fim sync depois])
    H --> Z3([Fim ponto OK])
  end

  subgraph SistemaLane[Piscina Sistema BuildPoint]
    S1[Validar geofence 5m]
    S2[Validar Face ID]
    S3[Persistir log imutavel Portaria 671]
    S4[Fila de sincronizacao]
  end

  B -.-> S1
  S1 -.-> C
  E -.-> S2
  S2 -.-> F
  H -.-> S3
  G -.-> S4
```

---

## Descrição do processo

| Etapa | Responsável | Decisão / resultado |
| :--- | :--- | :--- |
| 1. Solicitar batida | Peão | Inicia o processo (≤ 2 cliques — RNF05) |
| 2. Validar GPS | Sistema | Bloqueia se fora de 5 m ou GPS ruim |
| 3. Validar Face ID | Sistema + API Face | Até 3 s; até 2 retentativas |
| 4a. Contingência | Gerente | Se face falhar após retentativas |
| 4b. Offline | App | Grava local e sincroniza depois |
| 4c. Online | Backend | NSR + log imutável no Firebase |
| 5. Comprovante | Peão | Feedback visual de sucesso |

## Lanes (BPMN)

1. **Peão** — inicia e recebe feedback;
2. **Sistema BuildPoint** — geofence, Face ID, persistência e sync;
3. **Gerente** (extensão) — contingência quando a face falha.
