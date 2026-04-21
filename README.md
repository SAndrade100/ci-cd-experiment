# ci-cd-experiment

API Node.js + Express usada como laboratório para aprender **CI/CD com GitHub Actions e Vercel**.

---

## Sumário

- [Visão geral do projeto](#visão-geral-do-projeto)
- [Rodando localmente](#rodando-localmente)
- [Pipeline de CI (Integração Contínua)](#pipeline-de-ci-integração-contínua)
- [Deploy com CD na Vercel (Entrega Contínua)](#deploy-com-cd-na-vercel-entrega-contínua)
  - [1. Preparar o projeto para a Vercel](#1-preparar-o-projeto-para-a-vercel)
  - [2. Criar conta e importar o repositório](#2-criar-conta-e-importar-o-repositório)
  - [3. Configurar as credenciais da Vercel no GitHub](#3-configurar-as-credenciais-da-vercel-no-github)
  - [4. Criar o workflow de CD](#4-criar-o-workflow-de-cd)
  - [5. Fluxo completo](#5-fluxo-completo)
- [Endpoints da API](#endpoints-da-api)

---

## Visão geral do projeto

```
src/
├── app.js       # Rotas e lógica da aplicação (Express)
├── app.test.js  # Testes automatizados (Jest + Supertest)
└── server.js    # Ponto de entrada — sobe o servidor HTTP
```

**Stack:** Node.js · Express 5 · Jest · ESLint · GitHub Actions · Vercel

---

## Rodando localmente

```bash
# Instalar dependências
npm install

# Iniciar em modo desenvolvimento (hot-reload)
npm run dev

# Rodar os testes
npm test

# Verificar o estilo do código
npm run lint
```

A API ficará disponível em `http://localhost:3000`.

---

## Pipeline de CI (Integração Contínua)

O arquivo [`.github/workflows/ci.yml`](.github/workflows/ci.yml) define três jobs que rodam automaticamente a cada `push` ou `pull request` para as branches `main` e `develop`:

| Job | O que faz |
|---|---|
| `lint` | Verifica o estilo do código com ESLint |
| `build-and-test` | Instala as dependências e roda os testes |
| `test` (matrix) | Roda os testes nas versões 18, 20 e 22 do Node.js e publica o relatório de cobertura como artefato |

```
push / pull_request
        │
        ▼
    [lint] ──────────────────────────────────────► falha → bloqueia merge
        │
        ▼
[test (Node 18)]  [test (Node 20)]  [test (Node 22)]
        │
        ▼
  artifact: coverage-report
```

---

## Deploy com CD na Vercel (Entrega Contínua)

### 1. Preparar o projeto para a Vercel

A Vercel executa aplicações Express via **Serverless Functions**. Para isso, crie um arquivo `vercel.json` na raiz do projeto:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "src/server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "src/server.js"
    }
  ]
}
```

> **Por que isso é necessário?** A Vercel precisa saber qual arquivo é o ponto de entrada da aplicação e como rotear as requisições para ele.

Faça o commit desse arquivo:

```bash
git add vercel.json
git commit -m "chore: adicionar configuração da Vercel"
git push
```

---

### 2. Criar conta e importar o repositório

1. Acesse [vercel.com](https://vercel.com) e crie uma conta (pode usar o login do GitHub).
2. No dashboard, clique em **"Add New Project"**.
3. Selecione o repositório `ci-cd-experiment` e clique em **"Import"**.
4. Na tela de configuração, mantenha as opções padrão — a Vercel detecta o `vercel.json` automaticamente.
5. Clique em **"Deploy"**.

Após o primeiro deploy, a Vercel gera uma URL de produção no formato:
```
https://ci-cd-experiment-<hash>.vercel.app
```

A partir desse momento, todo `push` para `main` já dispara um deploy automático direto pela Vercel (sem GitHub Actions). A seção abaixo mostra como **condicionar o deploy ao sucesso dos testes** via Actions.

---

### 3. Configurar as credenciais da Vercel no GitHub

Para que o GitHub Actions possa fazer o deploy, precisamos de três tokens da Vercel:

#### Passo 1 — Obter o token de acesso

1. No dashboard da Vercel, clique no seu avatar → **Settings** → **Tokens**.
2. Clique em **"Create"**, dê um nome (ex.: `github-actions`) e copie o token gerado.

#### Passo 2 — Obter o ID do projeto e da organização

Instale a CLI da Vercel e faça o link do projeto:

```bash
npm install -g vercel
vercel login
vercel link
```

Após o `vercel link`, um arquivo `.vercel/project.json` será criado localmente:

```json
{
  "orgId": "team_XXXXXXXXXXXXXXXX",
  "projectId": "prj_XXXXXXXXXXXXXXXX"
}
```

> Não commite esse arquivo. Adicione `.vercel` ao `.gitignore`.

#### Passo 3 — Adicionar os secrets no GitHub

No repositório do GitHub, vá em **Settings → Secrets and variables → Actions → New repository secret** e adicione:

| Nome do Secret | Valor |
|---|---|
| `VERCEL_TOKEN` | Token gerado no Passo 1 |
| `VERCEL_ORG_ID` | Valor de `orgId` do `project.json` |
| `VERCEL_PROJECT_ID` | Valor de `projectId` do `project.json` |

---

### 4. Criar o workflow de CD

Crie o arquivo `.github/workflows/cd.yml`:

```yaml
name: CD — Deploy na Vercel

on:
  push:
    branches: [main]

jobs:
  deploy:
    name: Deploy para produção
    runs-on: ubuntu-latest

    steps:
      - name: Checkout do código
        uses: actions/checkout@v4

      - name: Configurar Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Instalar dependências
        run: npm ci

      - name: Rodar testes antes do deploy
        run: npm test

      - name: Instalar CLI da Vercel
        run: npm install -g vercel

      - name: Fazer deploy na Vercel
        run: vercel --prod --token=${{ secrets.VERCEL_TOKEN }} --yes
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
```

Faça o commit e o push desse arquivo. O deploy só acontecerá se os testes passarem.

---

### 5. Fluxo completo

```
git push origin main
        │
        ▼
  GitHub Actions (cd.yml)
        │
        ├─ npm ci
        ├─ npm test  ──► falhou? Deploy cancelado. ✗
        │
        └─ vercel --prod ──► Deploy realizado. ✓
                                │
                                ▼
                    https://ci-cd-experiment.vercel.app
```

#### Resumo das branches

| Branch | CI roda? | CD (deploy) roda? |
|---|---|---|
| `main` | Sim | Sim (após CI passar) |
| `develop` | Sim | Não |
| Pull Request → `main` | Sim | Não |

---

## Endpoints da API

### `GET /health`

Retorna o status da aplicação.

```bash
curl https://ci-cd-experiment.vercel.app/health
```

```json
{ "status": "ok", "version": "1.0.0" }
```

---

### `POST /soma`

Soma dois números.

```bash
curl -X POST https://ci-cd-experiment.vercel.app/soma \
  -H "Content-Type: application/json" \
  -d '{ "a": 5, "b": 3 }'
```

```json
{ "resultado": 8 }
```

**Erro (400)** — quando `a` ou `b` não são números:

```json
{ "error": "a e b devem ser números" }
```
