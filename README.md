# BuildPoint ID

Plataforma de gestão de jornada de trabalho para canteiros de obras da construção civil: registro de ponto por reconhecimento facial (processado no próprio celular, funcionando mesmo sem internet) e geofencing, com painel para Dono e Gerente e um backend com trilha de auditoria imutável.

**Equipe:** Emyliano, João Gabriel, Kelvin e Lucas Galindo

> Este README foi simplificado para não duplicar conteúdo — a versão anterior tinha o documento de requisitos inteiro colado aqui. Ele agora vive só em [`docs/01-documento-de-requisitos.md`](docs/01-documento-de-requisitos.md).

## Stack

| Camada | Tecnologia |
| :--- | :--- |
| App móvel | React Native + Expo (Development Build via EAS — não roda no Expo Go) |
| Reconhecimento facial | MobileFaceNet (rede neural, ArcFace loss) via TensorFlow Lite, executado no próprio aparelho |
| Backend / API | Django REST Framework + Simple JWT + drf-spectacular (Swagger) |
| Banco de dados | PostgreSQL |
| Hospedagem | Em transição de uma plataforma gerenciada (Render) para uma VPS Linux própria |

## Estrutura do repositório

```
BuildPointIdAnexos/
├── backend/     # Django + DRF — ver backend/README.md
├── frontend/    # React Native + Expo — ver frontend/README.md
├── docs/        # Requisitos, casos de uso, diagramas de classes/sequência/atividades
├── figma/       # Referências de design
└── entregaveis/ # PDFs/entregas formais da disciplina
```

## Documentação

- [`docs/01-documento-de-requisitos.md`](docs/01-documento-de-requisitos.md) — requisitos funcionais/não funcionais e casos de uso (documento vivo, atualizado conforme o sistema evolui).
- [`docs/03-diagrama-de-classes.md`](docs/03-diagrama-de-classes.md), [`docs/04-diagramas-de-sequencia.md`](docs/04-diagramas-de-sequencia.md), [`docs/05-diagrama-de-atividades.md`](docs/05-diagrama-de-atividades.md) — modelagem UML.
- [`docs/02-passo-a-passo-repositorios.md`](docs/02-passo-a-passo-repositorios.md) — histórico de como os repositórios foram criados (documento de referência da fase inicial do projeto).
- [`backend/README.md`](backend/README.md) — como rodar o backend, endpoints, variáveis de ambiente.
- [`frontend/README.md`](frontend/README.md) — como rodar o app, estrutura de telas, build (EAS).

## Como rodar (visão rápida)

```bash
# Backend
cd backend
python -m venv venv && venv\Scripts\activate   # Windows; source venv/bin/activate no Linux/Mac
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver

# Frontend (em outro terminal)
cd frontend
npm install
eas build --profile development --platform android   # 1ª vez / após mudar módulo nativo
npx expo start --dev-client
```

Detalhes completos (variáveis de ambiente, endpoints, estrutura de telas) estão nos READMEs de cada pasta.

## Referências de produto

[Figma — BuildPoint](https://www.figma.com/design/qdE18x1pR8N0mLXbiiba1i/BuildPoint) · [Gamma — BuildPoint ID](https://gamma.app/docs/BuildPoint-ID-tlfdcysve8uy1ji)
