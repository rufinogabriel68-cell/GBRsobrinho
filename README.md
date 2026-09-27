# GBR Soluções — seu sobrinho de aluguel

Painel pessoal (single-user) para prestador de serviços: **painel com widgets,
consulta de serviços, calculadora de orçamento, orçamentos com PDF, ordens de
serviço com portal do cliente, CRM, estoque, agenda, financeiro, anotações,
documentos e configurações**. PWA instalável, com funcionamento offline.

> **Novo por aqui?** Comece pelo guia em 3 passos:
> **[1. Firebase](docs/1-firebase.md)** (o banco) →
> **[2. Vercel](docs/2-vercel.md)** (publicar) →
> **[3. Uso diário](docs/3-uso-diario.md)** (celular, rotina e backup).

## Stack

| Camada | Tecnologia |
| --- | --- |
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS v4 |
| Tipografia | fonte do sistema (SF Pro / Segoe UI / Roboto) — zero download externo |
| Ícones / gráficos | lucide-react + gráficos SVG próprios |
| Banco | **Firebase Firestore** (recomendado) **ou** PostgreSQL + Drizzle |
| API | Route handlers: `/api/bootstrap`, `/api/data`, `/api/portal/[token]`, `/api/health` |
| PWA | `public/manifest.webmanifest` + `public/sw.js` (abre offline) |
| Proteção | senha única (`APP_PASSWORD`) via cookie httpOnly, opcional |

O app **não** guarda o banco no navegador: o client fala só com as rotas do
Next.js, que usam a conta de serviço do Firebase (chave nunca sai do servidor)
ou a `DATABASE_URL` do Postgres. Assim as regras do Firestore ficam **fechadas**
para acesso público.

## Rodando localmente

```bash
npm install
cp .env.example .env.local      # preencha o Firebase (ou a DATABASE_URL)
npm run dev                     # http://localhost:3000
```

Para conferir se o banco respondeu: <http://localhost:3000/api/health>.

Na primeira abertura, o app cria uma **base de demonstração** (categorias,
16 serviços, clientes, orçamentos, OS, estoque, agenda, financeiro e notas) —
apague o que não servir depois.

### Se preferir Postgres

```bash
DATABASE_URL="postgresql://usuario:senha@host:5432/banco" npx drizzle-kit push
DATABASE_URL="..." npm run dev
```

Com as duas opções configuradas, o Firestore tem prioridade; use
`DB_DRIVER=postgres` para forçar o Postgres.

## Scripts

| Comando | O que faz |
| --- | --- |
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` / `npm start` | build e execução em produção |
| `npm run typecheck` | TypeScript sem gerar arquivos |
| `npm run lint` | ESLint (config do Next) |
| `npm run check` | typecheck + lint |
| `npm run db:push` | cria/atualiza as tabelas no Postgres |

## Estrutura

```
src/
  app/
    (app)/               → módulos com Shell (rail lateral + ⌘K)
      page.tsx           → Painel (mosaico de widgets)
      servicos/ calculadora/ orcamentos/ os/ clientes/ estoque/
      agenda/ financeiro/ anotacoes/ documentos/ config/
    login/               → tela de senha (usada só com APP_PASSWORD)
    portal/[token]/      → portal público do cliente (sem login)
    api/
      bootstrap/         → todas as tabelas de uma vez (e semeia se vazio)
      data/              → create/update/delete por tabela
      portal/[token]/    → leitura, chat e assinatura do cliente
      health/            → diagnóstico do deploy (banco + senha)
  components/            → shell (navegação/⌘K), ui (design system), charts, doc (PDF), pwa
  lib/
    db/                  → drivers: firestore.ts, postgres.ts, types.ts
    store.tsx            → estado offline-first + fila de sincronização
    theme.ts             → tema claro/escuro/auto + relógio do componente
    images.ts            → redução de fotos antes de gravar
    seed.ts format.ts http.ts
  db/schema.ts           → schema Drizzle (só Postgres)
  proxy.ts               → proteção por senha (opcional)
```

## Como funciona o offline

1. Toda a base é carregada por `/api/bootstrap` e gravada em `localStorage`
   (`gbr.cache.v1`) — painel, agenda, serviços e notas abrem sem conexão.
2. Cada alteração é aplicada **otimista** na interface e enfileirada (`gbr.queue.v1`).
3. A fila sobe em ordem para `/api/data`; ids temporários são trocados pelos
   ids reais e as referências (OS ↔ mensagens ↔ estoque) são corrigidas.
4. O service worker guarda o shell em cache-first; a API nunca é cacheada.
5. O selo do topo mostra *Sincronizado · Enviando alterações… · Offline ·
   Sem conexão*, com a quantidade de alterações pendentes.

## Variáveis de ambiente

Veja o modelo completo em [`.env.example`](.env.example):

| Variável | Obrigatória | Para que serve |
| --- | --- | --- |
| `FIREBASE_SERVICE_ACCOUNT` | ✅ (Firebase) | JSON da conta de serviço (ou `FIREBASE_PROJECT_ID` + `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY`) |
| `DATABASE_URL` | ✅ (Postgres) | string de conexão |
| `APP_PASSWORD` | recomendada | senha única do painel |
| `NEXT_PUBLIC_SITE_URL` | opcional | domínio usado nos links do portal |
| `Z-API_INSTANCE_ID` / `Z-API_INSTANCE_TOKEN` | opcional | WhatsApp automático (integração futura) |

## Proteção do painel

- Sem `APP_PASSWORD`, o app fica aberto para quem tiver o endereço.
- Com `APP_PASSWORD`, o `proxy.ts` exige senha (cookie httpOnly de 1 ano) e
  libera apenas: portal do cliente, imagens, service worker, `/login` e `/api/health`.
- As regras do Firestore ficam `allow read, write: if false` — só o servidor
  acessa o banco.

## Limites conhecidos / próximos passos

- Notificações de e-mail e WhatsApp ainda são **manuais** (o botão WhatsApp de
  cada orçamento). As preferências em Ajustes já ficam salvas.
- Sem histórico de versões dos registros (edição sobrescreve).
- Sem login multiusuário: é um painel pessoal por design.
- Testes automatizados ainda não existem; as garantias atuais são
  `npm run check` e `npm run build`.

## Deploy

Passo a passo detalhado em **[docs/2-vercel.md](docs/2-vercel.md)**. Resumo:
importe o repositório na Vercel, cadastre `FIREBASE_SERVICE_ACCOUNT` e
`APP_PASSWORD`, clique em **Deploy** e confira `/api/health`.
