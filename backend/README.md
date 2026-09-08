# BuildPoint ID — Backend (Django REST Framework)

API central do BuildPoint ID: autenticação, cadastro de obras/operários/gerentes, biometria facial cifrada, registro de ponto (com contingência) e relatórios. Fonte de verdade para tudo — inclusive quando o app registra um ponto offline, é este backend quem revalida a identidade antes de gravar qualquer coisa como definitivo.

> Reescrita deste README nesta revisão: a versão anterior tinha uma seção "Atualização — feedback do professor" descrevendo bugs já corrigidos (Geoapify, Rekognition comentado, migrations pendentes). Esses itens foram resolvidos há tempo; o texto abaixo descreve o estado atual, não o histórico de correções.

## Stack

- Django 5.0 + Django REST Framework + Simple JWT (autenticação por CPF/CNPJ, não por username)
- PostgreSQL (produção e desenvolvimento — sem SQLite, para o comportamento de constraints/transactions ser igual em todo lugar)
- `cryptography` (Fernet) para cifrar o embedding facial em repouso
- `drf-spectacular` para o schema OpenAPI/Swagger
- `reportlab` para gerar o recibo de ponto em PDF
- `gunicorn` + `whitenoise` no deploy

## Apps

| App | Responsabilidade |
| :--- | :--- |
| `usuarios` | `Usuario` (base), `PerfilOperario`, `PerfilGerente` (com `TipoGerente`), login, cadastro/edição/remoção de operário, cadastro de gerente |
| `obras` | `Obra`, geofence (raio/centro), `VinculoGerente`, `Equipe` |
| `biometria` | `BiometriaFacial` — embedding cifrado (Fernet), nunca a imagem |
| `ponto` | `MarcacaoPonto`, `LogAuditoria`, contingência (presencial e em papel), recibo em PDF, verificação de integridade |
| `relatorios` | Geração/listagem de relatórios de ponto por obra/período |

## Como rodar localmente

```bash
python -m venv venv
venv\Scripts\activate          # Windows; source venv/bin/activate no Linux/Mac
pip install -r requirements.txt

cp .env.example .env           # depois edite o .env com valores locais
python manage.py migrate
python manage.py createsuperuser   # opcional, para acessar /admin/
python manage.py runserver
```

### Variáveis de ambiente

Todas as variáveis lidas pelo `core/settings.py` estão documentadas, com valores de exemplo e comentários, em [`.env.example`](.env.example) — copie-o para `.env` antes de rodar. Resumo:

| Variável | Obrigatória em produção | Para quê |
| :--- | :---: | :--- |
| `SECRET_KEY` | Sim | Chave secreta do Django |
| `DEBUG` | Sim (`False`) | Nunca `True` em produção |
| `ALLOWED_HOSTS` | Sim | Domínios autorizados a servir a API |
| `DATABASE_URL` (ou `POSTGRES_*`) | Sim | Conexão com o PostgreSQL |
| `DB_SSL_REQUIRE` | Depende do provedor | Exige SSL na conexão com o banco |
| `CORS_ALLOWED_ORIGINS` | Sim | Origens autorizadas a chamar a API |
| `FACE_LIMIAR_CONFIANCA` | Não (default `0.875`) | Limiar de similaridade de cosseno para aceitar uma identidade |
| `FACE_ALGORITMO_PADRAO` | Não (default `mobilefacenet-tflite-v1`) | Rótulo do modelo que gerou o embedding salvo |
| `BIOMETRIA_ENCRYPTION_KEY` | Sim | Chave Fernet para cifrar/decifrar o embedding facial |
| `BIRDID_API_URL` / `BIRDID_API_TOKEN` | Não (reservado) | Assinatura digital do recibo em PDF (ainda não integrado) |

Não existem mais variáveis de `AWS_*`, `GOOGLE_MAPS_API_KEY` ou `FACE_SERVICE_PROVIDER` no código — eram de uma arquitetura anterior (AWS Rekognition + Geoapify) e foram substituídas pelo reconhecimento facial on-device (MobileFaceNet/TFLite, ver `frontend/README.md`) e pelo GPS nativo do celular.

## Principais endpoints

Todos sob `/api/`. Schema interativo completo em `/api/docs/` (Swagger).

| Método | Rota | Descrição |
| :--- | :--- | :--- |
| POST | `/api/auth/login/` | Login por CPF/CNPJ + senha |
| POST | `/api/auth/refresh/` | Renovar token JWT |
| GET | `/api/usuarios/me/` | Dados do usuário autenticado |
| GET | `/api/usuarios/operarios/` | Listar operários (da obra do Gerente/Dono) |
| POST | `/api/usuarios/operarios/cadastrar/` | Cadastrar operário (dados cadastrais) |
| PATCH | `/api/usuarios/operarios/{id}/atualizar/` | **Novo** — editar operário (nunca CPF/senha) |
| DELETE | `/api/usuarios/operarios/{id}/remover/` | Remover operário |
| POST | `/api/usuarios/gerentes/cadastrar/` | Cadastrar gerente |
| GET/POST | `/api/obras/` | Listar/criar obras (Dono) |
| GET/PATCH/DELETE | `/api/obras/{id}/` | **Novo (PATCH/DELETE)** — editar ou apagar obra; apagar retorna **409** se já houver marcações de ponto registradas nela |
| POST | `/api/obras/{id}/configurar_geofence/` | Definir centro/raio do perímetro (Gerente) |
| POST | `/api/obras/{id}/vincular_gerente/` | Vincular gerente à obra |
| GET/POST | `/api/obras/equipes/` | Equipes dentro de uma obra |
| POST | `/api/biometria/cadastrar/` | Cadastrar embedding facial (cifrado) |
| GET | `/api/biometria/minha/` | Baixar o próprio embedding autorizado (cache offline do app) |
| GET | `/api/ponto/horario/` | Horário do servidor (sincronização de relógio) |
| POST | `/api/marcacoes/` | Registrar ponto (valida geofence + identidade) |
| POST | `/api/marcacoes/contingencia/` | Contingência presencial (Gerente confirma na hora) |
| POST | `/api/marcacoes/contingencia-papel/` | Contingência em papel (lançamento retroativo) |
| GET | `/api/marcacoes/historico/` | Histórico de marcações |
| GET | `/api/marcacoes/{id}/recibo/` | Recibo da marcação em PDF |
| GET | `/api/marcacoes/{id}/verificar-integridade/` | Verifica o hash de integridade da marcação |
| POST/GET | `/api/relatorios/` | Gerar/listar relatórios de ponto |

## Regras de negócio que valem a pena destacar

- **CPF nunca é usado como nome de exibição.** `Usuario.__str__`, o formulário do admin e o gerador de recibo exigem/usam o nome real — não caem mais para `username` (que é o CPF).
- **Editar operário nunca toca CPF ou senha.** O serializer de atualização (`AtualizarOperarioSerializer`) exclui esses campos explicitamente; é o mesmo padrão de autorização de `RemoverOperarioView` (só o Gerente da obra do operário, ou o Dono da obra).
- **Apagar obra é bloqueado se há marcações de ponto.** `MarcacaoPonto.obra` é `on_delete=PROTECT` de propósito — histórico de ponto é dado de auditoria e não pode desaparecer porque alguém apagou a obra. Nesse caso a API responde `409 Conflict` com uma mensagem explicando para o Dono encerrar a obra em vez de apagá-la.
- **O embedding facial nunca sai do banco em texto puro.** `BiometriaFacial` guarda o vetor cifrado com Fernet (`BIOMETRIA_ENCRYPTION_KEY`); o backend também nunca recebe a foto do rosto, só o vetor de 192 dimensões já extraído no celular.
- **Toda ação administrativa relevante grava `LogAuditoria`/`LogAdministrativo`** (editar/apagar obra, editar operário, marcações) — trilha imutável exigida pela Portaria 671/MTP.

## Testes

```bash
python manage.py test
coverage run manage.py test && coverage report
```

## Deploy

**Estado atual:** Render (Blueprint em `render.yaml`), com PostgreSQL gerenciado pelo próprio Render, `gunicorn core.wsgi:application` e `whitenoise` servindo os arquivos estáticos.

**Planejado:** migração do Render para uma **VPS Linux própria** (Nginx como proxy reverso + Gunicorn + PostgreSQL na mesma máquina ou gerenciado). Nenhuma mudança de código é necessária para essa migração — a aplicação já lê toda a configuração de variáveis de ambiente (`DATABASE_URL`, `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, etc.), então trocar de hospedagem é uma questão de infraestrutura (provisionar a VPS, configurar Nginx/Gunicorn/systemd, apontar o DNS), não de alterar `settings.py`. Esta seção será atualizada com os passos exatos quando a migração acontecer.
