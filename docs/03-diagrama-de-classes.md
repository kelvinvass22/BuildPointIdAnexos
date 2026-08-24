# Diagrama de Classes — BuildPoint ID

**Versão:** 1.1 (Etapa 3 — revisão pós-feedback)

Mudanças desta revisão:
- `Peão` → **`Operario`** em todo o modelo.
- `Obra` × `Gerente` deixou de ser 1:1 e virou **N:N via `AlocacaoGerente`** (uma obra pode ter vários gerentes, cada um responsável por uma especialidade — elétrica, hidráulica, civil etc.).
- Novas classes `Recibo`, `Dispositivo` e `AprovacaoContingencia` para suportar recibo com hash, metadados de auditoria e o fluxo de contingência offline com assinatura.
- Persistência agora é **PostgreSQL** (Render); os tipos permanecem os mesmos, sem acoplamento a um banco específico no modelo.

## Diagrama (Mermaid)

```mermaid
classDiagram
  direction TB

  class Usuario {
    +String id
    +String nome
    +String email
    +String cpf
    +String senhaHash
    +Papel papel
    +Boolean ativo
    +DateTime criadoEm
    +autenticar()
    +alterarSenha()
    +solicitarRecuperacaoSenha()
  }

  class Dono {
    +consultarDashboard()
    +gerenciarObras()
  }

  class Gerente {
    +String telefone
    +String especialidade
    +configurarGeofence()
    +cadastrarOperario()
    +aprovarContingencia()
  }

  class Operario {
    +String cargo
    +String vetorFacialHash
    +DateTime biometriaCadastradaEm
    +registrarPonto()
    +consultarHistorico()
    +baixarRecibo()
  }

  class Obra {
    +String id
    +String nome
    +String enderecoArt
    +Float latitudeCentro
    +Float longitudeCentro
    +Float raioMetros
    +StatusObra status
    +DateTime criadaEm
    +definirPerimetro()
    +calcularDistancia() Float
    +estaDentroDoRaio() Boolean
  }

  class AlocacaoGerente {
    +String id
    +String obraId
    +String gerenteId
    +String especialidade
    +DateTime desde
  }

  class MarcacaoPonto {
    +String id
    +String nsr
    +DateTime dataHora
    +Float latitude
    +Float longitude
    +Float precisaoGpsMetros
    +Float confiancaFace
    +TipoMarcacao tipo
    +OrigemMarcacao origem
    +Boolean sincronizado
    +String hashIntegridade
    +gerarLogImutavel()
  }

  class LogAuditoria {
    +String id
    +String marcacaoId
    +String payloadHash
    +DateTime registradoEm
    +Boolean imutavel
  }

  class BiometriaFacial {
    +String id
    +String operarioId
    +String vetorCriptografado
    +String algoritmo
    +Float qualidadeAmostra
    +DateTime capturadoEm
    +validarQualidade() Boolean
  }

  class Dispositivo {
    +String id
    +String identificador
    +String modelo
    +String sistemaOperacional
    +DateTime primeiroUsoEm
  }

  class Recibo {
    +String id
    +String marcacaoId
    +String hashRecibo
    +DateTime emitidoEm
    +Boolean baixado
    +gerarPdf()
    +compararHash() Boolean
  }

  class SessaoOffline {
    +String id
    +String dispositivoId
    +DateTime criadaEm
    +DateTime sincronizadaEm
    +StatusSync status
  }

  class AprovacaoContingencia {
    +String id
    +String marcacaoId
    +String gerenteId
    +String evidenciaDescricao
    +StatusAprovacao status
    +DateTime avaliadoEm
    +aprovar()
    +recusar()
  }

  class RelatorioFrequencia {
    +String id
    +String obraId
    +Date periodoInicio
    +Date periodoFim
    +Float percentualPresenca
    +Integer totalMarcacoes
    +gerar()
  }

  Usuario <|-- Dono
  Usuario <|-- Gerente
  Usuario <|-- Operario

  Dono "1" --> "0..*" Obra : administra
  Obra "1" --> "0..*" AlocacaoGerente : possui
  Gerente "1" --> "0..*" AlocacaoGerente : atua
  Obra "1" --> "0..*" Operario : aloca
  Operario "1" --> "1" BiometriaFacial : possui
  Operario "1" --> "0..*" MarcacaoPonto : registra
  Obra "1" --> "0..*" MarcacaoPonto : recebe
  MarcacaoPonto "0..*" --> "1" Dispositivo : origemDispositivo
  MarcacaoPonto "1" --> "1" LogAuditoria : gera
  MarcacaoPonto "1" --> "0..1" Recibo : emite
  MarcacaoPonto "0..*" --> "0..1" SessaoOffline : pendenteEm
  MarcacaoPonto "0..1" --> "0..1" AprovacaoContingencia : requer
  Gerente "1" --> "0..*" AprovacaoContingencia : avalia
  Obra "1" --> "0..*" RelatorioFrequencia : consolida
```

## Multiplicidades e regras

| Relacionamento | Multiplicidade | Regra de negócio |
| :--- | :--- | :--- |
| Dono → Obra | 1 : 0..\* | Um dono administra várias obras |
| Obra → AlocacaoGerente | 1 : 0..\* | Uma obra pode ter vários gerentes, um por especialidade |
| Gerente → AlocacaoGerente | 1 : 0..\* | Um gerente pode atuar em mais de uma obra |
| Obra → Operário | 1 : 0..\* | Obra possui vários operários alocados |
| Operário → BiometriaFacial | 1 : 1 | Um vetor facial ativo por operário (LGPD: sem foto pura) |
| Operário → MarcacaoPonto | 1 : 0..\* | Histórico de registros do trabalhador |
| Obra → MarcacaoPonto | 1 : 0..\* | Todas as marcações pertencem a uma obra |
| MarcacaoPonto → LogAuditoria | 1 : 1 | Todo registro gera log imutável |
| MarcacaoPonto → Recibo | 1 : 0..1 | Recibo só existe quando o registro é confirmado |
| MarcacaoPonto → SessaoOffline | 0..\* : 0..1 | Registros offline ficam pendentes até sync |
| MarcacaoPonto → AprovacaoContingencia | 0..1 : 0..1 | Só existe quando o registro nasce em contingência |

## Enumerações

| Enum | Valores |
| :--- | :--- |
| `Papel` | DONO, GERENTE, OPERARIO |
| `StatusObra` | ATIVA, PAUSADA, ENCERRADA |
| `TipoMarcacao` | ENTRADA, SAIDA, INTERVALO_INICIO, INTERVALO_FIM |
| `OrigemMarcacao` | APP_OPERARIO, CONTINGENCIA_GERENTE, SYNC_OFFLINE |
| `StatusSync` | PENDENTE, SINCRONIZADO, FALHA |
| `StatusAprovacao` | PENDENTE, APROVADA, RECUSADA |

## Observações de modelagem

- `vetorFacialHash` / `vetorCriptografado`: só o hash trafega e é persistido — o processamento da imagem acontece no dispositivo (RNF09).
- `nsr` + `hashIntegridade` (em `MarcacaoPonto` e `Recibo`): suportam a comparação de hash exigida pela tela de auditoria (RF11/RF12).
- `raioMetros` é atributo de `Obra`, não uma constante fixa no código — permite raio diferente por canteiro (RNF03).
- `AlocacaoGerente` resolve a relação N:N entre `Obra` e `Gerente` com a especialidade como atributo da associação.
- Herança `Usuario` → papéis implementa o RBAC (RNF08).