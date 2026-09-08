# Diagramas de Sequência — BuildPoint ID

**Versão:** 1.1 (pós-Etapa 3 — stack real e dois fluxos novos)

Mínimo exigido pela Etapa 3: 2 diagramas. Esta revisão troca **Node.js/Firebase** por **Django REST Framework/PostgreSQL** (a stack de fato implementada desde a v1.2 do documento de requisitos) em todos os diagramas já existentes, corrige a terminologia ("Peão" → "Operário"), detalha a validação offline real (que a v1.0 tratava de forma genérica como "grava criptografado") e acrescenta **dois diagramas novos** (SQ04 e SQ05), cobrindo os requisitos RF14/RF15 que não existiam na primeira versão. Total: **5 fluxos**.

---

## SQ01 — Registrar Ponto Eletrônico (Operário)

**Caso de uso:** UC06, UC16 · **Requisitos:** RF07, RF08, RF17, RF21, RNF02, RNF03, RNF04, RNF16

```mermaid
sequenceDiagram
  autonumber
  actor Operario as Operário
  participant App as App Móvel (Expo)
  participant GPS as Sistema GPS
  participant TFLite as MobileFaceNet (TFLite, on-device)
  participant API as Backend Django/DRF
  participant DB as PostgreSQL

  Operario->>App: Toca "Registrar Ponto"
  App->>GPS: Solicita localização atual
  GPS-->>App: lat, lng, precisão

  alt Fora do raio da obra ou GPS impreciso
    App-->>Operario: Bloqueia — fora do perímetro
  else Dentro do raio
    App->>App: Abre câmera frontal
    Operario->>App: Posiciona o rosto
    App->>TFLite: Extrai embedding facial (192-d) localmente
    TFLite-->>App: embedding

    alt Com internet
      App->>API: POST /api/marcacoes/ {obraId, gps, embedding, dispositivoId, sistemaOperacional}
      API->>API: Compara embedding com o cadastrado (similaridade de cosseno)
      alt Identidade não confirmada
        API-->>App: 401 IDENTIDADE_NAO_CONFIRMADA
        App-->>Operario: Orienta tentar de novo / procurar Gerente
      else Identidade confirmada
        API->>API: Gera NSR + hashIntegridade + registra dispositivo/SO
        API->>DB: Persiste MarcacaoPonto + LogAuditoria
        DB-->>API: OK
        API-->>App: 201 Created + horário
        App-->>Operario: Sucesso — recibo em PDF disponível (RF10)
      end
    else Sem internet (UC16)
      App->>App: Compara embedding com o cache local cifrado do próprio Operário
      alt Similaridade abaixo do limiar OU sem cache local
        App-->>Operario: Recusa a identidade na hora — nada é enfileirado
      else Identidade confirmada localmente
        App->>App: Enfileira marcação (hora do aparelho) para sincronizar depois
        App-->>Operario: "Identidade confirmada offline — será sincronizado"
        Note over App,API: Ao reconectar, o app reenvia a marcação enfileirada
        App->>API: POST /api/marcacoes/ {..., offline: true, dataHora}
        API->>API: REVALIDA identidade e geofence (fonte de verdade final)
        API->>DB: Persiste MarcacaoPonto + LogAuditoria
        DB-->>API: OK
        API-->>App: 201 Created
      end
    end
  end
```

---

## SQ02 — Cadastrar Operário com Biometria (Gerente)

**Caso de uso:** UC05 · **Requisitos:** RF05, RF14, RNF09, RNF15, RNF16

```mermaid
sequenceDiagram
  autonumber
  actor Gerente as Gerente
  participant App as App Móvel (Expo)
  participant TFLite as MobileFaceNet (TFLite, on-device)
  participant API as Backend Django/DRF
  participant DB as PostgreSQL

  Gerente->>App: Trabalhadores → Cadastrar Operário
  Gerente->>App: Informa Nome, CPF, Cargo, vínculo
  App->>API: POST /api/usuarios/operarios/cadastrar/
  API->>DB: Cria Usuario + PerfilOperario
  DB-->>API: OK
  API-->>App: 201 Created (cadastro cadastral concluído, biometria pendente)

  Gerente->>App: Capturar Biometria Facial
  App->>App: Abre câmera
  Gerente->>App: Enquadra e captura rosto
  App->>TFLite: Extrai embedding + valida qualidade da amostra

  alt Qualidade insuficiente (luz/EPI)
    TFLite-->>App: score baixo
    App-->>Gerente: Aviso — ajustar iluminação/EPI, tentar de novo
  else Qualidade OK
    TFLite-->>App: embedding (192-d)
    App->>API: POST /api/biometria/cadastrar/ {operarioId, embedding, qualidade}
    API->>API: Cifra o embedding (Fernet) — nunca recebe imagem
    API->>DB: Salva BiometriaFacial
    DB-->>API: OK
    API-->>App: 201 Created
    App-->>Gerente: Cadastro concluído (dados + biometria)
  end

  Note over App,Gerente: Se o Gerente sair antes de concluir a biometria, o app avisa que o cadastro ficará incompleto (RF14) — o Operário aparece sinalizado na lista até a biometria ser retomada.
```

---

## SQ03 — Configurar Raio de Ponto / Geofencing (Gerente)

**Caso de uso:** UC04 · **Requisitos:** RF04, RNF03

```mermaid
sequenceDiagram
  autonumber
  actor Gerente as Gerente
  participant App as App Móvel (Expo)
  participant GPS as Sistema GPS
  participant API as Backend Django/DRF
  participant DB as PostgreSQL

  Gerente->>App: Configurações → Registrar Raio de Ponto
  App->>GPS: Capturar coordenadas do dispositivo
  GPS-->>App: lat, lng, precisão

  alt Precisão > 10 m ou GPS off
    App-->>Gerente: Ative GPS alta precisão / céu aberto
  else Precisão aceitável
    Gerente->>App: Confirma centro + raio (entre 5 e 300 m)
    App->>API: POST /api/obras/{id}/configurar_geofence/
    API->>API: Valida faixa do raio (RNF03)
    API->>DB: Atualiza latitudeCentro, longitudeCentro, raioMetros
    DB-->>API: OK
    API-->>App: Perímetro atualizado
    App-->>Gerente: Alerta de sucesso
  end
```

---

## SQ04 — Editar Operário (Gerente) — *novo nesta revisão*

**Caso de uso:** UC14 · **Requisitos:** RF14

```mermaid
sequenceDiagram
  autonumber
  actor Gerente as Gerente
  participant App as App Móvel (Expo)
  participant API as Backend Django/DRF
  participant DB as PostgreSQL

  Gerente->>App: Abre a lista de operários da obra
  App-->>Gerente: Lista com destaque "Biometria pendente" quando aplicável (RF14)
  Gerente->>App: Seleciona um Operário → Editar
  Gerente->>App: Altera cargo / vínculo / empresa / endereço / admissão / e-mail
  Gerente->>App: Salva
  App->>API: PATCH /api/usuarios/operarios/{id}/atualizar/
  API->>API: Verifica que o Gerente gerencia a obra desse Operário
  alt Sem autorização (obra de outro Gerente)
    API-->>App: 403 Forbidden
    App-->>Gerente: "Você não gerencia este operário."
  else Autorizado
    API->>DB: Atualiza PerfilOperario (nunca CPF/senha)
    API->>DB: Grava LogAdministrativo (ação = ATUALIZAR_OPERARIO)
    DB-->>API: OK
    API-->>App: 200 OK
    App-->>Gerente: Cadastro atualizado
  end
```

---

## SQ05 — Editar ou Excluir Obra (Dono) — *novo nesta revisão*

**Caso de uso:** UC15 · **Requisitos:** RF15

```mermaid
sequenceDiagram
  autonumber
  actor Dono as Dono
  participant App as App Móvel (Expo)
  participant API as Backend Django/DRF
  participant DB as PostgreSQL

  Dono->>App: Abre o detalhe de uma obra
  alt Editar
    Dono->>App: Altera nome / ART / endereço / status
    App->>API: PATCH /api/obras/{id}/
    API->>DB: Atualiza Obra
    API->>DB: Grava LogAdministrativo (ação = ATUALIZAR_OBRA)
    DB-->>API: OK
    API-->>App: 200 OK
    App-->>Dono: Obra atualizada
  else Apagar
    Dono->>App: Toca "Apagar obra" e confirma
    App->>API: DELETE /api/obras/{id}/
    API->>DB: Verifica se existem MarcacaoPonto vinculadas (on_delete=PROTECT)
    alt Existem marcações registradas
      DB-->>API: ProtectedError
      API-->>App: 409 Conflict — "encerre a obra em vez de apagar"
      App-->>Dono: Explica o motivo e sugere mudar o status para Encerrada
    else Nenhuma marcação registrada
      API->>DB: Remove Obra (e seus VinculoGerente/Equipe em cascata)
      API->>DB: Grava LogAdministrativo (ação = APAGAR_OBRA)
      DB-->>API: OK
      API-->>App: 204 No Content
      App-->>Dono: Obra removida
    end
  end
```

---

## Objetos e mensagens (resumo)

| Diagrama | Objetos | Mensagens-chave |
| :--- | :--- | :--- |
| SQ01 | Operário, App, GPS, MobileFaceNet (TFLite), API, PostgreSQL | validar raio → extrair embedding on-device → validar (online ou localmente offline) → persistir log imutável |
| SQ02 | Gerente, App, MobileFaceNet (TFLite), API, PostgreSQL | cadastrar dados → capturar → extrair embedding → cifrar → persistir sem imagem |
| SQ03 | Gerente, App, GPS, API, PostgreSQL | capturar GPS → definir raio (5–300 m) → atualizar obra |
| SQ04 | Gerente, App, API, PostgreSQL | selecionar operário → editar dados protegendo CPF/senha → log administrativo |
| SQ05 | Dono, App, API, PostgreSQL | editar obra **ou** tentar apagar → bloqueio se já houver marcações → log administrativo |
