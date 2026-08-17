# BuildPoint ID — Backend (Django + DRF)

Backend do BuildPoint ID reescrito em Django, implementando o que foi
modelado na Etapa 3 (classes, casos de uso, sequência). Deploy pensado
para o **Render**; integrações externas (Face ID, geolocalização,
assinatura digital) entram por variável de ambiente.

## Estrutura

Um app Django por área do Diagrama de Classes — é a forma mais direta de
manter rastreabilidade entre a modelagem da Etapa 3 e o código:

```
buildpoint-backend/
├── manage.py
├── requirements.txt
├── .env.example              # todas as variáveis de ambiente esperadas
├── .gitignore
├── render.yaml                # blueprint de deploy do Render
├── README.md
│
├── core/                    # projeto Django (settings, urls raiz)
│   ├── settings.py
│   ├── urls.py
│   ├── wsgi.py
│   └── asgi.py
│
├── usuarios/                  # Usuario, PerfilDono, PerfilGerente, PerfilOperario
│   ├── models.py               # RBAC (RS01) + polimorfismo (get_perfil/tela_inicial)
│   ├── serializers.py          # login por CPF/CNPJ, cadastro de operário/gerente
│   ├── permissions.py          # EhDono / EhGerente / EhOperario
│   ├── views.py
│   ├── urls.py
│   └── admin.py
│
├── obras/                     # Obra
│   ├── models.py                # calcularDistancia() / estaDentroDoRaio() (Haversine)
│   ├── serializers.py
│   ├── views.py                 # UC01 Cadastrar Obra, UC04 Configurar Geofence
│   ├── urls.py
│   └── admin.py
│
├── biometria/                 # BiometriaFacial
│   ├── models.py                 # RS02: só vetor criptografado, nunca imagem
│   ├── services.py               # interface ServicoReconhecimentoFacial (Adapter)
│   ├── serializers.py
│   ├── views.py                  # UC05 (parte de biometria)
│   ├── urls.py
│   └── admin.py
│
├── ponto/                     # MarcacaoPonto, LogAuditoria, SessaoOffline
│   ├── models.py                 # LogAuditoria com save()/delete() bloqueados (RS03)
│   ├── services.py               # orquestra o fluxo do SQ01 (geofence -> face -> NSR -> hash)
│   ├── serializers.py
│   ├── views.py                  # UC06 Registrar Ponto, UC08 Histórico
│   ├── urls.py
│   └── admin.py
│
└── relatorios/                 # RelatorioFrequencia
    ├── models.py                  # RF03: dashboard de frequência
    ├── serializers.py
    ├── views.py                   # UC03 Visualizar Dashboard
    ├── urls.py
    └── admin.py
```

Cada app segue sempre o mesmo miolo: `models.py` (dados + regra de
negócio que pertence ao próprio objeto, ex. `Obra.esta_dentro_do_raio()`),
`serializers.py` (validação de entrada/saída da API), `views.py`
(orquestração + permissões), `urls.py`, `admin.py`. `services.py`
aparece só em `biometria` e `ponto`, onde a lógica atravessa mais de um
model e não faz sentido morar dentro de uma única classe.

## Rodando localmente

```bash
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env        # edite os valores conforme necessário

python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

> Este pacote não inclui migrations prontas — como não deu pra rodar o
> Django neste ambiente pra gerar/testar elas (rede bloqueada pro PyPI),
> `makemigrations` é o primeiro comando que vocês devem rodar. Depois
> disso, commitem a pasta `*/migrations/0001_initial.py` gerada.

## Autenticação

Login por **CPF/CNPJ** (não usuário/e-mail), como na tela de Login do
Figma:

```
POST /api/auth/login/
{"cpf": "00000000000", "password": "..."}
→ {"access": "...", "refresh": "...", "papel": "OPERARIO", "tela_inicial": "home_operario"}
```

## Principais endpoints (rastreáveis aos casos de uso da Etapa 3)

| Rota | Caso de uso |
|---|---|
| `POST /api/auth/login/` | login |
| `POST /api/obras/` | UC01 — Cadastrar Obra |
| `POST /api/obras/{id}/configurar_geofence/` | UC04 — Configurar Raio |
| `POST /api/usuarios/operarios/cadastrar/` | UC05 — Cadastrar Operário |
| `POST /api/biometria/cadastrar/` | UC05 — Cadastro de biometria |
| `POST /api/marcacoes/` | UC06 — Registrar Ponto |
| `GET /api/marcacoes/historico/` | UC08 — Consultar Histórico |
| `POST /api/relatorios/gerar/` | UC03 — Dashboard |

## O que ainda depende de decisão/credencial de vocês

- **Face ID**: `biometria/services.py` tem a interface pronta e uma
  implementação fake pra dev (`FACE_SERVICE_PROVIDER=falso`). Faltam as
  chamadas reais de rede pro provedor escolhido (`AWS_ACCESS_KEY_ID` etc.).
- **Assinatura digital ICP-Brasil** (Portaria 671/MTE): as variáveis
  `BIRDID_API_URL`/`BIRDID_API_TOKEN` já estão em `settings.py`, mas a
  geração do comprovante em PDF assinado (PAdES) ainda não tem código —
  entra como o próximo `services.py`, provavelmente dentro de `ponto/`.
- **Geocoding**: `GOOGLE_MAPS_API_KEY` já está configurada; falta o
  serviço que converte o endereço digitado no cadastro de obra em
  lat/long.
- **Migrations**: gerar com `makemigrations` (ver acima).

## Arquitetura de vocês (CREDIFLOW/GRANJA)

Não consegui acessar os repositórios `Plataforma-Back-CREDIFLOW` e
`Plataforma-Back-GRANJA` (ambos retornaram 404 — provavelmente privados),
então este projeto segue convenções padrão de mercado Django/DRF, não o
padrão exato de vocês. Se colarem um `models.py` ou `settings.py` de
referência, dá pra ajustar a estrutura pra bater certinho.
