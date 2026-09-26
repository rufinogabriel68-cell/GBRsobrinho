# GBR Soluções — seu sobrinho de aluguel

Painel pessoal (single-user, **sem tela de login**) para gestão de prestador de serviços:
dashboard com widgets, tabela de serviços, calculadora de orçamentos, orçamentos com PDF,
ordens de serviço com portal do cliente, CRM, estoque, agenda, financeiro, anotações,
documentos e configurações. PWA instalável com funcionamento offline básico.

## Stack

| Camada | Tecnologia |
| --- | --- |
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS v4 |
| Tipografia | SF Pro (stack do sistema) + Inter como fallback |
| Ícones | lucide-react (estilo SF Symbols) |
| Animações | CSS (microinterações) + `prefers-reduced-motion` |
| Banco | PostgreSQL + Drizzle ORM (`src/db/schema.ts`) |
| API | Route handlers: `/api/bootstrap`, `/api/data`, `/api/portal/[token]` |
| PWA | `public/manifest.webmanifest` + `public/sw.js` |

## Rodando localmente

```bash
npm install
npx drizzle-kit push        # cria as tabelas no Postgres do .env
npm run dev
```

O banco é **semear automaticamente** na primeira chamada de `/api/bootstrap`
(categorias, 16 serviços, clientes, orçamentos, OS, estoque, agenda, financeiro e notas de exemplo).

## Estrutura

```
src/
  app/
    (app)/            → módulos protegidos pelo Shell (rail lateral + ⌘K)
      page.tsx        → Painel (dashboard em mosaico de widgets)
      servicos/ calculadora/ orcamentos/ os/ clientes/ estoque/
      agenda/ financeiro/ anotacoes/ documentos/ config/
    portal/[token]/   → portal público do cliente (sem login)
    api/
      bootstrap/      → devolve todas as tabelas (e semeia se vazio)
      data/           → create/update/delete genérico por tabela
      portal/[token]/ → leitura/envio de mensagens do cliente
  components/         → shell, ui (design system), charts, doc (PDF), pwa
  lib/
    store.tsx         → estado global offline-first + fila de sincronização
    tables.ts         → registro de tabelas usado pela API
    format.ts         → moeda, datas, status, links de WhatsApp/e-mail
    seed.ts           → dados iniciais
  db/schema.ts        → schema Drizzle
```

## Como funciona o offline

1. Toda a base é carregada uma vez por `/api/bootstrap` e gravada em `localStorage`
   (`gbr.cache.v1`) — painel, agenda, serviços e notas abrem sem conexão.
2. Cada alteração é aplicada **otimista** na interface e enfileirada (`gbr.queue.v1`).
3. A fila é enviada ao `/api/data` em ordem; se a rede cair, reenvia no evento `online`.
4. O service worker guarda o shell (HTML/CSS/JS/imagens) em cache-first, então o app
   abre offline; a API nunca é cacheada.
5. O indicador do topo mostra: *Sincronizado · Enviando · Offline · Sem conexão*.

---

# Deploy na Vercel

1. **Repositório** — suba o projeto para GitHub/GitLab/Bitbucket.
2. **Vercel** — em *Add New → Project*, importe o repositório. O framework é detectado
   automaticamente (Next.js).
3. **Domínio** — em *Settings → Domains*, aponte o domínio da GBR (ex.: `app.gbrsolucoes.com.br`).
   É ali que você pode aplicar a **proteção por domínio** que substitui o login:
   *Settings → Domains → Protection* (Vercel Authentication / Visitor Access Control)
   restrito ao seu e-mail, ou proteção básica com senha (Disallowed/Password Protection).
4. **Banco de produção** — crie um Postgres (Neon, Supabase, Railway ou Vercel Postgres)
   e copie a `DATABASE_URL` para *Settings → Environment Variables* (`production`, `preview` e `development`).
5. **Build & Deploy** — *Deploy*. Comandos padrão:
   - Build Command: `npm run build`
   - Output: `.next` (detectado automaticamente)
6. **Primeira subida** — acesse `https://seu-dominio/api/bootstrap` uma vez para criar as
   tabelas (`npx drizzle-kit push` local já serve em dev; em produção o ideal é versionar
   migrations: `npx drizzle-kit generate` e aplicar no CI).

### Variáveis de ambiente

```bash
DATABASE_URL=postgresql://usuario:senha@host:5432/banco
# abaixo, apenas se você ativar as integrações opcionais:
Z-API_INSTANCE_ID=
Z-API_INSTANCE_TOKEN=
NEXT_PUBLIC_SITE_URL=https://app.gbrsolucoes.com.br
```

---

# Configuração do Firebase (opcional, camada futura)

O app hoje persiste em Postgres/Drizzle. Se você quiser migrar para Firebase
(Firestore + Storage + Functions) mantendo a mesma interface, a troca é **localizada**:

1. **Criar o projeto** — [console.firebase.google.com](https://console.firebase.google.com) →
   *Add project* → ativar **Authentication (Email/Link ou anônimo)**, **Firestore**, **Storage**.
2. **Instalar os SDKs**
   ```bash
   npm install firebase firebase-admin
   ```
3. **Config do cliente** (`src/lib/firebase.ts`, só com `NEXT_PUBLIC_*`):
   ```ts
   import { initializeApp, getApps } from "firebase/app";
   import { getFirestore } from "firebase/firestore";
   const cfg = {
     apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
     authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
     projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
     storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
     messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
     appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
   };
   export const app = getApps()[0] ?? initializeApp(cfg);
   export const db = getFirestore(app);
   ```
4. **Trocar a persistência** — toda a gravação passa por `mutate()` em
   `src/lib/store.tsx` e por `/api/data`. Basta reescrever essas duas funções para
   `addDoc/updateDoc/deleteDoc` (coleções `services`, `clients`, `quotes`, `orders`,
   `stock`, `events`, `finance`, `notes`) — **nenhum componente precisa mudar**.
5. **Storage (fotos)** — substitua o upload em `dataURL` por `uploadBytesResilient`
   no Storage e guarde apenas a URL em `photos`/`signature`.
6. **Cloud Functions (notificações)** — função `onDocumentCreated("orderMessages/{id}")`
   que dispara push via FCM para o seu dispositivo e, se quiser, envia WhatsApp pela
   Z-API. Instale a regra de segurança para que o portal (coleção `orders`) seja
   legível apenas pelo `token` — valide o token dentro da Function.
7. **Firestore Rules** (portal público com token):
   ```
   match /orders/{id} {
     allow read: if request.query.token == resource.data.token;
     allow write: if false;
   }
   ```

### Integração WhatsApp (Z-API ou similar)

Crie uma rota proxy em `src/app/api/whatsapp/route.ts` que lê
`process.env.ZAPI_INSTANCE_ID` / `ZAPI_INSTANCE_TOKEN` e chama a API no servidor
(nunca exponha o token no browser). Em seguida troque `window.open(waLink(...))`
por `fetch("/api/whatsapp", { method: "POST", body: JSON.stringify({ phone, text }) })`
nos botões de envio de orçamento e de pesquisa de satisfação.

### PWA + push

- `public/manifest.webmanifest` já define nome, ícones, tema e atalhos.
- Para push nativo, gere as chaves em *Project Settings → Cloud Messaging* e registre
  o `serviceWorker` com `self.registration.showNotification` dentro de `public/sw.js`.
