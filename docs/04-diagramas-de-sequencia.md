# Diagramas de Sequência — BuildPoint ID

Mínimo exigido pela Etapa 3: **2 diagramas**. Incluímos 3 fluxos críticos do MVP.

---

## SQ01 — Registrar Ponto Eletrônico (Peão)

**Caso de uso:** UC06 · **Requisitos:** RF07, RF08, RNF02, RNF03, RNF04, RS03

```mermaid
sequenceDiagram
  autonumber
  actor Peao as Peão
  participant App as App Móvel
  participant GPS as Sistema GPS
  participant Face as API Face ID
  participant API as Backend Node.js
  participant DB as Firebase

  Peao->>App: Clica "Bater Ponto"
  App->>GPS: Solicita localização atual
  GPS-->>App: lat, lng, precisão

  alt Fora do raio de 5 m ou GPS impreciso
    App-->>Peao: Bloqueia — fora do perímetro
  else Dentro do raio
    App->>App: Abre câmera frontal
    Peao->>App: Posiciona o rosto
    App->>Face: Envia frame / vetor facial
    Face-->>App: confianca + identidade

    alt Confiança insuficiente (até 2 retentativas)
      App-->>Peao: Tentar novamente / procurar Gerente
    else Identidade confirmada (≤ 3 s)
      alt Sem internet
        App->>App: Grava ponto criptografado offline
        App-->>Peao: Ponto offline — sync pendente
      else Com internet
        App->>API: POST /marcacoes {peaoId, obraId, gps, face}
        API->>API: Gera NSR + hashIntegridade
        API->>DB: Persiste MarcacaoPonto + LogAuditoria
        DB-->>API: OK
        API-->>App: 201 Created + horário
        App-->>Peao: Tela verde de sucesso
      end
    end
  end
```

---

## SQ02 — Cadastrar Peão com Biometria (Gerente)

**Caso de uso:** UC05 · **Requisitos:** RF05, RS02, RNF02

```mermaid
sequenceDiagram
  autonumber
  actor Gerente as Gerente
  participant App as App Móvel
  participant Face as API Face ID
  participant API as Backend Node.js
  participant DB as Firebase

  Gerente->>App: Trabalhadores → Cadastrar Peão
  Gerente->>App: Informa Nome, CPF, Cargo
  Gerente->>App: Clica "Capturar Biometria Facial"
  App->>App: Abre câmera
  Gerente->>App: Enquadra e captura rosto
  App->>Face: Extrair vetores + validar qualidade
  Face-->>App: vetor + qualidade

  alt Qualidade insuficiente (luz/EPI)
    App-->>Gerente: Aviso — ajustar iluminação/EPI
  else Qualidade OK
    Gerente->>App: Concluir Cadastro
    App->>API: POST /peoes {dados, vetorCriptografado}
    API->>API: Aplica criptografia / hash (LGPD)
    API->>DB: Salva Peao + BiometriaFacial
    DB-->>API: OK
    API-->>App: 201 Created
    App-->>Gerente: Cadastro concluído
  end
```

---

## SQ03 — Configurar Raio de Ponto / Geofencing (Gerente)

**Caso de uso:** UC04 · **Requisitos:** RF04, RNF03

```mermaid
sequenceDiagram
  autonumber
  actor Gerente as Gerente
  participant App as App Móvel
  participant GPS as Sistema GPS
  participant API as Backend Node.js
  participant DB as Firebase

  Gerente->>App: Configurações → Registrar Raio de Ponto
  App->>GPS: Capturar coordenadas do dispositivo
  GPS-->>App: lat, lng, precisão

  alt Precisão > 10 m ou GPS off
    App-->>Gerente: Ative GPS alta precisão / céu aberto
  else Precisão aceitável
    Gerente->>App: Confirma centro + raio (padrão 5 m)
    App->>API: PUT /obras/{id}/geofence
    API->>DB: Atualiza latitudeCentro, longitudeCentro, raioMetros
    DB-->>API: OK
    API-->>App: Perímetro atualizado
    App-->>Gerente: Alerta de sucesso
  end
```

---

## Objetos e mensagens (resumo)

| Diagrama | Objetos | Mensagens-chave |
| :--- | :--- | :--- |
| SQ01 | Peão, App, GPS, Face ID, API, Firebase | validar raio → reconhecer face → persistir log imutável |
| SQ02 | Gerente, App, Face ID, API, Firebase | capturar → extrair vetor → persistir sem imagem pura |
| SQ03 | Gerente, App, GPS, API, Firebase | capturar GPS → definir raio → atualizar obra |
