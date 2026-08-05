# Passo a passo — Criação dos repositórios Backend e Frontend

**Projeto:** BuildPoint ID  
**Objetivo:** Separar o código em dois repositórios GitHub (`backend` e `frontend`), com branch `etapa-3` e Pull Request para a documentação/modelagem da Etapa 3.

> Critério de avaliação (10%): *Documentação no GitHub (branch `etapa-3` + PR)*.

---

## Visão da arquitetura em repositórios

```
BuildPoint ID
├── buildpoint-backend     → API Node.js + Firebase (auth, obras, ponto, logs)
└── buildpoint-frontend    → Painel Web (Dono) + estrutura do app (ou monorepo web)
```

| Repositório | Stack sugerida | Responsável no produto |
| :--- | :--- | :--- |
| `buildpoint-backend` | Node.js, Express/Fastify, Firebase Admin | RF01–RF09 (regras, persistência, Face ID bridge, geofence) |
| `buildpoint-frontend` | React/Next.js (Web); depois React Native/Flutter (mobile) | RI01–RI03, telas Dono/Gerente/Peão |

> **Dica:** se o app móvel for outro time/tecnologia, criem um terceiro repo depois (`buildpoint-mobile`). Para a Etapa 3, dois repos (back + front web) já atendem o fluxo de documentação + PR.

---

## Pré-requisitos

1. Conta no [GitHub](https://github.com) (todos da equipe).
2. Git instalado (`git --version`).
3. Node.js LTS instalado (`node -v`, `npm -v`).
4. (Opcional) [GitHub CLI](https://cli.github.com/) — `gh`.
5. Definir **organização ou dono** dos repos (ex.: usuário do Kelvin ou org do grupo).

---

## Parte A — Criar o repositório Backend

### A1. Criar o repositório no GitHub

**Pelo site:**

1. GitHub → **New repository**
2. Nome: `buildpoint-backend`
3. Visibilidade: **Private** (recomendado na faculdade) ou Public
4. Marcar **Add a README file**
5. License: MIT (opcional)
6. **Create repository**

**Pela CLI (alternativa):**

```bash
gh repo create buildpoint-backend --private --description "API BuildPoint ID — Node.js + Firebase" --add-readme
```

### A2. Clonar e estruturar o projeto

```bash
git clone https://github.com/<SEU_USUARIO>/buildpoint-backend.git
cd buildpoint-backend

# Branch de trabalho da Etapa 3
git checkout -b etapa-3

# Inicializar Node
npm init -y
npm install express cors dotenv firebase-admin
npm install -D nodemon

mkdir -p src/{routes,controllers,services,middlewares,config} docs
```

Estrutura inicial sugerida:

```
buildpoint-backend/
├── docs/                    # Documentação Etapa 3 (requisitos, diagramas)
├── src/
│   ├── config/
│   ├── controllers/
│   ├── middlewares/
│   ├── routes/
│   ├── services/
│   └── index.js
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

### A3. Arquivos mínimos

**`.gitignore`**

```gitignore
node_modules/
.env
.env.local
*.log
.DS_Store
coverage/
dist/
serviceAccountKey.json
```

**`.env.example`**

```env
PORT=3000
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
# FIREBASE_PRIVATE_KEY=  → usar arquivo de service account, não commitá-lo
```

**`src/index.js` (esqueleto)**

```js
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'buildpoint-backend' });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`API em http://localhost:${port}`));
```

**`package.json` — scripts**

```json
{
  "scripts": {
    "dev": "nodemon src/index.js",
    "start": "node src/index.js"
  }
}
```

### A4. Documentação na branch `etapa-3`

Copiar para `docs/` deste repo:

- Documento de requisitos (RF/RNF + diagrama de casos de uso);
- (Depois) diagramas de classes, sequência e atividades.

Atualizar o `README.md` do backend com:

- Objetivo da API;
- Como rodar local (`npm install` → `npm run dev`);
- Link do frontend;
- Link do PR da Etapa 3.

### A5. Commit, push e Pull Request

```bash
git add .
git commit -m "docs: requisitos e esqueleto da API — etapa 3"
git push -u origin etapa-3
```

**Abrir PR** (`etapa-3` → `main`):

```bash
gh pr create --base main --head etapa-3 \
  --title "Etapa 3 — Documentação e estrutura do backend" \
  --body "$(cat <<'EOF'
## Summary
- Documentação de requisitos funcionais e não funcionais
- Diagrama de casos de uso coerente com a Etapa 2
- Esqueleto inicial da API Node.js

## Test plan
- [ ] `npm install` e `npm run dev` sobem `/health`
- [ ] Docs em `docs/` abrem corretamente no GitHub
EOF
)"
```

Ou pelo site: **Pull requests → New pull request** → base `main` ← compare `etapa-3`.

---

## Parte B — Criar o repositório Frontend

### B1. Criar o repositório no GitHub

**Pelo site:**

1. **New repository** → nome `buildpoint-frontend`
2. README inicial → **Create repository**

**Pela CLI:**

```bash
gh repo create buildpoint-frontend --private --description "Painel Web BuildPoint ID" --add-readme
```

### B2. Clonar e criar o app Web

Exemplo com **Vite + React**:

```bash
git clone https://github.com/<SEU_USUARIO>/buildpoint-frontend.git
cd buildpoint-frontend
git checkout -b etapa-3

npm create vite@latest . -- --template react
npm install
npm install react-router-dom

mkdir -p docs src/{pages,components,services,hooks,styles}
```

Ou com **Next.js**:

```bash
npx create-next-app@latest . --typescript --eslint --app --src-dir --import-alias "@/*"
git checkout -b etapa-3
mkdir -p docs
```

### B3. Estrutura sugerida (Vite/React)

```
buildpoint-frontend/
├── docs/                    # Mesma documentação da Etapa 3 (ou link para o backend)
├── public/
├── src/
│   ├── components/
│   ├── pages/
│   │   ├── Login.jsx
│   │   ├── Dashboard.jsx      # Dono — RF03
│   │   ├── Obras.jsx          # Dono — RF01/RF02
│   │   └── ...
│   ├── services/              # chamadas à API
│   ├── styles/
│   ├── App.jsx
│   └── main.jsx
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

**`.env.example`**

```env
VITE_API_URL=http://localhost:3000
```

**`.gitignore`** (garantir)

```gitignore
node_modules/
dist/
.env
.env.local
.DS_Store
```

### B4. Telas mínimas alinhadas aos requisitos

| Rota | Perfil | RF |
| :--- | :--- | :--- |
| `/login` | Todos | Auth / RS01 |
| `/dashboard` | Dono | RF03, RI03 |
| `/obras` | Dono | RF01, RF02 |
| `/obras/:id` | Dono | RF01 |

> Telas de Gerente/Peão podem ficar no app móvel; no front Web foquem no Dono nesta etapa.

### B5. Commit, push e PR

```bash
git add .
git commit -m "docs: requisitos e esqueleto do painel web — etapa 3"
git push -u origin etapa-3

gh pr create --base main --head etapa-3 \
  --title "Etapa 3 — Documentação e estrutura do frontend" \
  --body "$(cat <<'EOF'
## Summary
- Documentação de requisitos e diagrama de casos de uso
- Esqueleto do painel Web (Vite/React)
- Variáveis de ambiente apontando para a API

## Test plan
- [ ] `npm install` e `npm run dev` abrem o app
- [ ] Docs em `docs/` visíveis no GitHub
EOF
)"
```

---

## Parte C — Organização da equipe no GitHub

1. Em cada repo: **Settings → Collaborators** → adicionar Emyliano, João Gabriel, Kelvin e Lucas.
2. Padronizar branches:
   - `main` — estável;
   - `etapa-3` — entrega da modelagem/docs;
   - `feature/...` — desenvolvimento futuro.
3. Proteger `main` (opcional): exigir PR + 1 review.
4. Cross-link nos READMEs:

```markdown
## Repositórios do projeto
- Backend: https://github.com/<USER>/buildpoint-backend
- Frontend: https://github.com/<USER>/buildpoint-frontend
- Anexos Etapa 2: https://github.com/kelvinvass22/BuildPointIdAnexos
- Design: https://www.figma.com/design/qdE18x1pR8N0mLXbiiba1i/BuildPoint
```

---

## Parte D — Onde colocar a documentação da Etapa 3

Duas opções válidas (escolham **uma** e mantenham igual nos dois repos):

| Opção | Como fazer | Prós |
| :--- | :--- | :--- |
| **A — Docs nos dois repos** | Copiar `docs/` para back e front na branch `etapa-3` | Cada PR mostra a documentação |
| **B — Docs só no backend + README no front** | Front só linka para o back | Evita duplicar |

Para a rubrica (*branch etapa-3 + PR*), a opção **A** é a mais segura: o professor encontra a documentação em qualquer um dos PRs.

Arquivos a versionar em `docs/`:

```
docs/
├── 01-documento-de-requisitos.md      # RF, RNF, diagrama CDU, specs textuais
├── 02-passo-a-passo-repositorios.md   # este guia
├── 03-diagrama-de-classes.md          # (próximo)
├── 04-diagramas-de-sequencia.md       # (próximo, mín. 2)
└── 05-diagrama-de-atividades.md       # (próximo / BPMN)
```

---

## Parte E — Checklist final da Etapa 3 nos repos

- [ ] Repo `buildpoint-backend` criado e com colaboradores
- [ ] Repo `buildpoint-frontend` criado e com colaboradores
- [ ] Branch `etapa-3` em **ambos**
- [ ] Documento de requisitos + diagrama de casos de uso em `docs/`
- [ ] Especificações textuais de no mínimo 3 CDUs
- [ ] (Completar) Diagrama de classes
- [ ] (Completar) ≥ 2 diagramas de sequência
- [ ] (Completar) Diagrama de atividades / BPMN
- [ ] Pull Request `etapa-3` → `main` aberto em cada repo
- [ ] README com como rodar e links cruzados

---

## Comandos rápidos (resumo)

```bash
# Backend
gh repo create buildpoint-backend --private --add-readme
git clone https://github.com/<USER>/buildpoint-backend.git && cd buildpoint-backend
git checkout -b etapa-3
# ... criar estrutura, docs ...
git add . && git commit -m "docs: etapa 3 — requisitos e esqueleto backend"
git push -u origin etapa-3
gh pr create --base main --head etapa-3 --title "Etapa 3 — Backend"

# Frontend
gh repo create buildpoint-frontend --private --add-readme
git clone https://github.com/<USER>/buildpoint-frontend.git && cd buildpoint-frontend
git checkout -b etapa-3
npm create vite@latest . -- --template react && npm install
# ... docs ...
git add . && git commit -m "docs: etapa 3 — requisitos e esqueleto frontend"
git push -u origin etapa-3
gh pr create --base main --head etapa-3 --title "Etapa 3 — Frontend"
```

---

## Próximos passos sugeridos

1. Publicar os dois repos e abrir os PRs da `etapa-3`.
2. Completar diagramas de **classes**, **sequência** (≥ 2) e **atividades/BPMN** no mesmo `docs/`.
3. Conectar Firebase e implementar auth + RBAC (RS01).
4. Prototipar tela de “Bater Ponto” conforme Figma (RI01/RI02).
