# GBR Sobrinho — Painel de Gestão

Painel de gestão para a **GBR Sobrinho**: clientes, produtos, pedidos e faturamento em um só lugar — feito para ser usado **no celular** e no computador, com **modo escuro por padrão**.

![Stack](https://img.shields.io/badge/Next.js-16-black) ![Firebase](https://img.shields.io/badge/Firebase-12-orange) ![Vercel](https://img.shields.io/badge/deploy-Vercel-black) ![Tailwind](https://img.shields.io/badge/Tailwind_CSS-4-38bdf8)

---

## ✨ Funcionalidades

| Módulo | O que faz |
| --- | --- |
| **Visão geral** | Faturamento do mês (com comparação ao mês anterior), pedidos do mês, clientes, ticket médio, gráfico de faturamento dos últimos 6 meses, pedidos por status, pedidos recentes e itens mais vendidos |
| **Pedidos** | Cadastro com múltiplos itens, status (pendente → em andamento → concluído/cancelado), botão rápido “Concluir”, busca e filtro por status |
| **Clientes** | Cadastro com telefone (máscara automática), e-mail, cidade e observações |
| **Produtos** | Serviços/produtos/pacotes com preço, estoque, categoria e ativo/inativo |
| **Configurações** | Perfil, tema (claro/escuro/sistema), status da integração Firebase e gestão dos dados de demonstração |

- 🔐 **Login** com Firebase Authentication (e-mail/senha e Google)
- ⏱️ **Dados em tempo real** com Firestore (atualiza na hora em todos os dispositivos)
- 🌙 **Modo escuro por padrão**, com alternância para claro/sistema
- 📱 **Mobile-first**: menu inferior fixo, diálogos em folha inferior (bottom sheet), botões com alvo de toque ≥ 44px, campos com fonte 16px (evita zoom no iOS), área segura para o notch/barra gestual, e é **instalável como app** (PWA)
- 🧪 **Modo demonstração**: sem Firebase configurado, o painel roda com dados fictícios salvos no navegador — perfeito para testar antes de configurar

## 🧱 Stack

- [Next.js 16](https://nextjs.org) (App Router) + TypeScript
- [Tailwind CSS 4](https://tailwindcss.com) + design system próprio com tokens de tema
- [Firebase 12](https://firebase.google.com) — Authentication + Firestore
- [Recharts](https://recharts.org) para gráficos · [next-themes](https://github.com/pacocoursey/next-themes) para o modo escuro
- Deploy na [Vercel](https://vercel.com) com zero configuração

## 📁 Estrutura

```
src/
├── app/
│   ├── layout.tsx              # raiz: tema, fontes, metadados, AuthProvider
│   ├── page.tsx                # redireciona para /dashboard
│   ├── login/                  # tela de login
│   └── (app)/                  # área autenticada (protegida)
│       └── dashboard/          # visão geral, pedidos, clientes, produtos, config.
├── components/
│   ├── ui/                     # botões, inputs, cards, diálogos, badges…
│   ├── charts/                 # gráficos (cores acompanham o tema)
│   ├── views/                  # telas (clients, products, orders, settings)
│   └── layout/                 # sidebar (desktop) + menu inferior (celular)
└── lib/
    ├── firebase.ts             # inicialização condicional do Firebase
    ├── auth-context.tsx        # sessão (Firebase Auth ou demo)
    ├── db.ts                   # camada de dados (Firestore ou demo)
    ├── mock-db.ts              # dados fictícios do modo demonstração
    └── hooks.ts                # hooks de assinatura em tempo real
```

---

## 🚀 Rodando localmente

**Pré-requisitos:** Node.js 20+ e npm.

```bash
npm install
npm run dev
```

Abra http://localhost:3000. Sem o `.env.local` configurado, o painel entra em **modo demonstração**: entre com qualquer e-mail/senha para explorar.

Para usar dados reais, crie um `.env.local` (copie de `.env.example`) com as chaves do Firebase — o passo a passo está logo abaixo — e reinicie o servidor.

### Scripts

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção (checa também os tipos TypeScript) |
| `npm run start` | Serve o build de produção |
| `npm run typecheck` | Verificação de tipos sem build |

---

## 🔥 Configurando o Firebase (passo a passo)

> **Importante:** as chaves `NEXT_PUBLIC_FIREBASE_*` **não são secretas** — são identificadores do app (regra oficial do Firebase). A segurança real fica nas **regras do Firestore** e nas configurações do Authentication. Ainda assim, nunca versione o `.env.local` (já está no `.gitignore`).

1. **Crie o projeto**
   - Acesse https://console.firebase.google.com → **Adicionar projeto** → dê um nome (ex.: `gbrsobrinho`) → continue com o Analytics desativado (opcional).

2. **Ative o login**
   - No menu: **Build → Authentication → Começar**.
   - Na aba **Sign-in method**, ative **E-mail/senha** e (opcional) **Google**.

3. **Crie o banco de dados**
   - No menu: **Build → Firestore Database → Criar banco de dados**.
   - Escolha o local **southamerica-east1 (São Paulo)** e inicie no **modo de produção** (as regras seguras já vêm no projeto).

4. **Registre o app Web**
   - ⚙️ **Configurações do projeto → Seus apps → ícone `</>` (Web)**.
   - Apelido: `painel` → **Registrar app**.
   - Copie o objeto `firebaseConfig` exibido.

5. **Preencha as variáveis de ambiente**
   Crie um arquivo `.env.local` na raiz do projeto:

   ```bash
   NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=gbrsobrinho.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=gbrsobrinho
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=gbrsobrinho.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
   NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
   ```

   Reinicie o servidor (`npm run dev`) — o selo “Modo demonstração” some e o login passa a usar o Firebase.

6. **Publique as regras de segurança**
   O arquivo [`firestore.rules`](./firestore.rules) permite que **apenas usuários autenticados** acesm os dados. Publique de um jeito:

   ```bash
   # Opção A — CLI (npm i -g firebase-tools && firebase login)
   firebase deploy --only firestore:rules
   ```

   ```text
   # Opção B — Console: Firestore Database → Regras → cole o conteúdo
   # do arquivo firestore.rules → Publicar
   ```

7. **Crie seu usuário**
   Na tela de login, use **“Criar conta”** com seu e-mail e senha. Pronto: seus dados agora sincronizam entre celular e computador.

### Erros comuns

| Mensagem | Causa / solução |
| --- | --- |
| `auth/operation-not-allowed` | E-mail/senha não ativado em Authentication → Sign-in method |
| `auth/unauthorized-domain` | Adicione o domínio em Authentication → Settings → Authorized domains |
| `Missing or insufficient permissions` | Publique as `firestore.rules` (passo 6) |
| Dados não salvam / badge “Modo demonstração” continua | Faltam variáveis `NEXT_PUBLIC_FIREBASE_*` ou o servidor não foi reiniciado |

---

## ▲ Deploy na Vercel

1. **Envie o código para o GitHub** (este repositório).
2. Acesse https://vercel.com → **Add New → Project** → importe o repositório `GBRsobrinho`.
3. A Vercel detecta o Next.js automaticamente — nenhuma configuração extra é necessária.
4. **Antes do primeiro deploy**, abra **Settings → Environment Variables** e adicione as 6 variáveis `NEXT_PUBLIC_FIREBASE_*` (mesmos valores do `.env.local`).
5. Clique em **Deploy**.
6. **Autorize o domínio da Vercel** no Firebase: Authentication → Settings → Authorized domains → **Add domain** (ex.: `gbrsobrinho.vercel.app`).

Pronto! A partir daí, todo `git push` para a `main` gera um novo deploy automaticamente.

### CLI (alternativa ao site)

```bash
npm i -g vercel
vercel login
vercel          # preview
vercel --prod   # produção
```

---

## 📱 Uso no celular

O painel foi projetado **mobile-first**:

- **Menu inferior fixo** (Início, Pedidos, Clientes, Produtos, Ajustes) — alcançável com o polegar;
- Formulários abrem como **folha inferior**, com teclado numérico em campos de preço/quantidade e fonte 16px (o iPhone não dá zoom ao focar);
- Tabelas viram **cards** em telas pequenas;
- Respeita a **área segura** (notch/barra de gestão) e tem `theme-color` para a barra do navegador acompanhar o tema;
- **Instalável como app**: no Chrome do Android, menu → “Instalar aplicativo”; no Safari do iPhone, Compartilhar → “Adicionar à Tela de Início”.

## 🌙 Modo escuro

O tema escuro é o **padrão**. Alterne em:
- botão ☀️/🌙 no topo do painel;
- **Configurações → Aparência** (claro, escuro ou seguir o sistema). A preferência fica salva no navegador.

---

## ❓ Dúvidas frequentes

**Onde ficam os dados do modo demonstração?**
No `localStorage` do navegador — nada sai do aparelho. Ao configurar o Firebase, o painel passa a usar o Firestore automaticamente (o código das telas é o mesmo).

**Como volto aos dados de exemplo?**
Configurações → “Restaurar dados de exemplo” (só existe em modo demonstração).

**Mais de uma pessoa vai usar?**
As regras atuais permitem que qualquer usuário autenticado veja tudo. Para isolar dados por usuário ou criar papéis (admin/funcionário), ajuste as `firestore.rules` e a estrutura das coleções.
