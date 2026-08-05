# Diagrama de Classes — BuildPoint ID

Modelo de domínio do MVP com entidades, atributos, relacionamentos e multiplicidades.

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
  }

  class Dono {
    +consultarDashboard()
    +gerenciarObras()
  }

  class Gerente {
    +String telefone
    +configurarGeofence()
    +cadastrarPeao()
    +registrarPontoContingencia()
  }

  class Peao {
    +String cargo
    +String vetorFacialHash
    +DateTime biometriaCadastradaEm
    +baterPonto()
    +consultarHistorico()
  }

  class Obra {
    +String id
    +String nome
    +String endereco
    +Float latitudeCentro
    +Float longitudeCentro
    +Float raioMetros
    +StatusObra status
    +DateTime criadaEm
    +definirPerimetro()
    +calcularDistancia() Float
    +estaDentroDoRaio() Boolean
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
    +String peaoId
    +String vetorCriptografado
    +String algoritmo
    +Float qualidadeAmostra
    +DateTime capturadoEm
    +validarQualidade() Boolean
  }

  class SessaoOffline {
    +String id
    +String dispositivoId
    +DateTime criadaEm
    +DateTime sincronizadaEm
    +StatusSync status
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
  Usuario <|-- Peao

  Dono "1" --> "0..*" Obra : administra
  Obra "1" --> "1" Gerente : possui
  Obra "1" --> "0..*" Peao : aloca
  Peao "1" --> "1" BiometriaFacial : possui
  Peao "1" --> "0..*" MarcacaoPonto : registra
  Obra "1" --> "0..*" MarcacaoPonto : recebe
  Gerente "1" --> "0..*" MarcacaoPonto : validaContingencia
  MarcacaoPonto "1" --> "1" LogAuditoria : gera
  MarcacaoPonto "0..*" --> "0..1" SessaoOffline : pendenteEm
  Obra "1" --> "0..*" RelatorioFrequencia : consolida
```

## Multiplicidades e regras

| Relacionamento | Multiplicidade | Regra de negócio |
| :--- | :--- | :--- |
| Dono → Obra | 1 : 0..\* | Um dono administra várias obras |
| Obra → Gerente | 1 : 1 | Cada obra tem um gerente responsável no MVP |
| Obra → Peão | 1 : 0..\* | Obra possui vários peões alocados |
| Peão → BiometriaFacial | 1 : 1 | Um vetor facial ativo por peão (LGPD: sem foto pura) |
| Peão → MarcacaoPonto | 1 : 0..\* | Histórico de batidas do trabalhador |
| Obra → MarcacaoPonto | 1 : 0..\* | Todas as batidas pertencem a uma obra |
| MarcacaoPonto → LogAuditoria | 1 : 1 | Toda batida gera log imutável (Portaria 671) |
| MarcacaoPonto → SessaoOffline | 0..\* : 0..1 | Batidas offline ficam pendentes até sync |

## Enumerações

| Enum | Valores |
| :--- | :--- |
| `Papel` | DONO, GERENTE, PEAO |
| `StatusObra` | ATIVA, PAUSADA, ENCERRADA |
| `TipoMarcacao` | ENTRADA, SAIDA, INTERVALO_INICIO, INTERVALO_FIM |
| `OrigemMarcacao` | APP_PEAO, CONTINGENCIA_GERENTE, SYNC_OFFLINE |
| `StatusSync` | PENDENTE, SINCRONIZADO, FALHA |

## Observações de modelagem

- `vetorFacialHash` / `vetorCriptografado`: atende **RS02** (não armazenar imagem pura).
- `nsr` + `hashIntegridade`: suportam rastreabilidade estilo REP-P / **RNF01**.
- `raioMetros` padrão **5.0** (**RNF03**).
- Herança `Usuario` → papéis implementa **RS01** (RBAC).
