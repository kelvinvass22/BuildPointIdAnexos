# Diagrama de Atividades / BPMN — BuildPoint ID

**Versão:** 1.1 (pós-Etapa 3 — stack real e ramo offline detalhado)

Processo modelado: **Registro de ponto eletrônico no canteiro** (fluxo ponta a ponta do MVP). Esta revisão corrige a terminologia ("Peão" → "Operário") e substitui o backend Node.js/Firebase por Django/PostgreSQL (RF07, RF08, RNF04). O ramo offline deixa de ser um único passo genérico "gravar criptografado" e passa a refletir o que foi de fato implementado: o app **valida a identidade localmente antes de decidir se enfileira algo** (RF21) — uma pessoa não cadastrada é recusada na hora, mesmo sem internet, em vez de ficar pendente até a sincronização.

---

## AT01 — Fluxo de registro de ponto (UML Activity)

```mermaid
flowchart TD
  Start([Inicio]) --> AbrirApp[Operario abre o aplicativo]
  AbrirApp --> ClicarPonto[Toca em Registrar Ponto]
  ClicarPonto --> CapturarGPS[Capturar GPS do dispositivo]
  CapturarGPS --> GpsOk{GPS ativo e precisao aceitavel?}

  GpsOk -->|Nao| AvisoGps[Exibir aviso de GPS]
  AvisoGps --> CapturarGPS

  GpsOk -->|Sim| DentroRaio{Dentro do raio configurado da obra?}
  DentroRaio -->|Nao| Bloqueio([Bloqueia marcacao - fora do perimetro])
  DentroRaio -->|Sim| AbrirCamera[Abrir camera frontal]
  AbrirCamera --> ExtrairEmbedding[Extrair embedding facial no dispositivo - MobileFaceNet/TFLite]
  ExtrairEmbedding --> TemNet{Ha conexao com internet?}

  TemNet -->|Sim| EnviarBackend[Enviar embedding ao backend Django]
  EnviarBackend --> FaceOkOnline{Backend confirma identidade?}
  FaceOkOnline -->|Nao| Recusa([Orientar procurar o Gerente - contingencia])
  FaceOkOnline -->|Sim| Persistir[Backend gera NSR, hash e LogAuditoria]
  Persistir --> Sucesso([Exibir sucesso com horario e recibo em PDF])

  TemNet -->|Nao| TemCache{Existe embedding autorizado cacheado no aparelho?}
  TemCache -->|Nao| SemCache([Orientar conectar a internet ao menos uma vez antes de bater ponto offline])
  TemCache -->|Sim| CompararLocal[Comparar embedding capturado com o cache local]
  CompararLocal --> SimilaridadeOk{Similaridade acima do limiar?}
  SimilaridadeOk -->|Nao| RecusaOffline([Recusar identidade na hora - nada e enfileirado])
  SimilaridadeOk -->|Sim| Enfileirar[Enfileirar marcacao com hora do aparelho]
  Enfileirar --> AvisoOffline([Informar operario: confirmado offline, sync pendente])
  AvisoOffline --> Sincroniza[Ao reconectar, reenviar para o backend]
  Sincroniza --> Revalidar[Backend REVALIDA identidade e geofence]
  Revalidar --> Persistir
```

---

## BPMN01 — Processo "Registrar Ponto" (visão de negócio)

```mermaid
flowchart LR
  subgraph OperarioLane[Piscina Operario]
    A([Inicio]) --> B[Solicitar registro de ponto]
    B --> C{Validacoes de GPS OK?}
    C -->|Nao| D[Receber recusa]
    D --> Z1([Fim sem registro])
    C -->|Sim| E[Posicionar rosto na camera]
    E --> F{Online?}
    F -->|Sim| H[Receber recibo em PDF]
    F -->|Nao| G{Identidade confirmada localmente?}
    G -->|Nao| D2[Receber recusa imediata - sem enfileirar]
    D2 --> Z1
    G -->|Sim| I[Receber confirmacao offline]
    H --> Z3([Fim ponto OK])
    I --> Z2([Fim sync depois])
  end

  subgraph SistemaLane[Piscina Sistema BuildPoint]
    S0[Extrair embedding no dispositivo - MobileFaceNet/TFLite]
    S1[Validar geofence]
    S2[Comparar embedding - online no backend ou offline no cache local]
    S3[Persistir log imutavel Portaria 671]
    S4[Fila de sincronizacao + revalidacao no backend]
  end

  B -.-> S1
  S1 -.-> C
  E -.-> S0
  S0 -.-> S2
  S2 -.-> F
  H -.-> S3
  I -.-> S4
```

---

## Descrição do processo

| Etapa | Responsável | Decisão / resultado |
| :--- | :--- | :--- |
| 1. Solicitar registro | Operário | Inicia o processo (≤ 2 cliques — RNF05) |
| 2. Validar GPS | Sistema | Bloqueia se fora do raio configurado ou GPS ruim |
| 3. Extrair embedding | App (on-device) | Roda localmente em qualquer cenário, online ou offline (RNF16) |
| 4a. Online | Backend | Compara o embedding, gera NSR + log imutável, emite recibo em PDF |
| 4b. Offline — sem correspondência | App | Recusa a identidade **na hora**, sem enfileirar nada (RF21) |
| 4c. Offline — identidade confirmada | App + Backend | Enfileira com a hora do aparelho; backend revalida ao sincronizar e é quem decide de verdade |
| 4d. Falha online | Gerente | Contingência presencial (confirmação imediata) ou, se o Operário nem tinha o app disponível, contingência em papel (lançamento retroativo) |
| 5. Comprovante | Operário | Recibo em PDF, baixado de forma autenticada |

## Lanes (BPMN)

1. **Operário** — inicia e recebe feedback, inclusive offline;
2. **Sistema BuildPoint** — extração de embedding on-device, geofence, comparação (online ou local) e persistência/sync;
3. **Gerente** (extensão, fora deste diagrama) — contingência presencial ou em papel quando a validação automática não é possível.
