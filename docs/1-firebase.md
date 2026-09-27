# Passo 1 — Firebase (onde seus dados ficam guardados)

O app guarda **tudo** no Firestore (o banco do Google). Você não precisa saber
programar para isso: são 6 cliques no site do Firebase e 1 colagem de texto na
Vercel. O plano gratuito (Spark) é de sobra para uso pessoal — dá 1 GB de dados
e cerca de 20 mil gravações por dia.

> Tempo estimado: **10 minutos**.
> No fim, `/api/health` deve responder `{"ok":true,"database":"firestore",...}`.

---

## Atalho: já tenho o projeto criado

Se você já criou o projeto no console, pule direto para estes 4 passos:

1. **Firestore Database** → se aparecer "Criar banco de dados", crie (modo
   produção, localização `southamerica-east1`). Se já existe, siga.
2. Aba **Regras** → cole `allow read, write: if false;` (veja o passo 3 abaixo)
   → **Publicar**.
3. ⚙ **Configurações do projeto** → **Contas de serviço** → **Gerar nova chave**
   → baixa o `.json`.
4. Na Vercel: **Settings → Environment Variables** →
   `FIREBASE_SERVICE_ACCOUNT` = conteúdo do `.json` · `APP_PASSWORD` = sua senha
   → **Save** → **Deployments → Redeploy**.

Depois abra `/api/health`: tem que aparecer `"database":"firestore"`.

> Os nomes dos menus do console mudam de tempo em tempo (em inglês podem
> aparecer como *Firestore Database*, *Rules*, *Service accounts*, *Generate new
> private key*). O que importa é a ordem: criar o banco → fechar as regras →
> baixar a chave → colar na Vercel.

---

## 1. Criar o projeto

1. Abra <https://console.firebase.google.com> e entre com a conta Google.
2. Clique em **Criar projeto** (ou *Add project*).
3. Nome: `gbr-solucoes` (qualquer nome serve).
4. O Google Analytics pode ficar **desligado** — não usamos.
5. **Criar projeto** e aguarde alguns segundos.

## 2. Criar o banco (Firestore)

1. No menu lateral, em **Criação**, clique em **Firestore Database**.
2. Clique em **Criar banco de dados**.
3. Escolha **Modo de produção** (*production mode*).
4. Localização: **southamerica-east1 (São Paulo)** — mais rápido e mais barato para você.
5. **Ativar**.

## 3. Fechar a porta para o mundo (regras)

O painel conversa com o Firestore pelo **servidor** (com a conta de serviço),
nunca direto do navegador. Então a regra certa é bloquear todo acesso público:

1. Ainda no Firestore, aba **Regras** (*Rules*).
2. Apague o conteúdo e cole exatamente isto:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

3. Clique em **Publicar**.

> Sem isso, qualquer pessoa com o endereço do seu projeto poderia ler o banco.
> Com isso, só o seu app (com a chave da conta de serviço) consegue acessar.

## 4. Gerar a chave da conta de serviço

1. Clique na engrenagem ⚙ (canto superior esquerdo) → **Configurações do projeto**.
2. Aba **Contas de serviço** (*Service accounts*).
3. Botão **Gerar nova chave privada** → **Gerar chave**.
4. Um arquivo `.json` é baixado (ex.: `gbr-solucoes-firebase-adminsdk-xxxx.json`).

⚠️ **Esse arquivo é a senha do seu banco.** Não suba no GitHub, não mande por
WhatsApp, não cole em conversa. Se vazar, gere outra chave e apague a antiga.

O conteúdo dele é parecido com isto (a sua chave será diferente):

```json
{
  "type": "service_account",
  "project_id": "gbr-solucoes",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADAN...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-7k2ab@gbr-solucoes.iam.gserviceaccount.com",
  "client_id": "102938475610293847"
}
```

## 5. Colocar a chave nas variáveis de ambiente

Você vai usar **uma** destas formas (a primeira é a mais simples).

### Forma A — JSON inteiro em uma variável (recomendada)

| Nome da variável | Valor |
| --- | --- |
| `FIREBASE_SERVICE_ACCOUNT` | o conteúdo **inteiro** do arquivo `.json` baixado |

Na Vercel (Settings → Environment Variables) basta selecionar todo o conteúdo do
arquivo, copiar (`Cmd/Ctrl + C`) e colar no campo *Value* — a Vercel aceita
valores de várias linhas.

### Forma B — três variáveis separadas

| Nome da variável | Valor (pegue no arquivo `.json`) |
| --- | --- |
| `FIREBASE_PROJECT_ID` | `"project_id"` |
| `FIREBASE_CLIENT_EMAIL` | `"client_email"` |
| `FIREBASE_PRIVATE_KEY` | `"private_key"` (com os `\n` que já vêm no arquivo) |

### Forma C — em Base64 (útil quando o campo só aceita uma linha)

No Mac/Linux, dentro da pasta onde está o arquivo:

```bash
base64 -w0 gbr-solucoes-firebase-adminsdk-xxxx.json   # macOS: base64 -i arquivo.json
```

Cole o resultado em `FIREBASE_SERVICE_ACCOUNT` — o app detecta que é Base64.

> O arquivo `serviceAccount*.json` e `.env.local` já estão no `.gitignore`:
> o Git **não** vai subir suas chaves.

## 6. Testar no seu computador (opcional)

Na raiz do projeto, crie um arquivo chamado `.env.local` (esse arquivo não vai
para o GitHub) com:

```bash
FIREBASE_SERVICE_ACCOUNT={"type":"service_account", ... cole tudo em uma linha ...}
```

Depois:

```bash
npm install
npm run dev
```

Abra <http://localhost:3000/api/health>. Deve aparecer:

```json
{ "ok": true, "database": "firestore", "label": "Firestore · gbr-solucoes", "auth": false }
```

Se aparecer erro, a mensagem já diz o que fazer (credencial inválida, Firestore
não criado, etc.). O detalhe técnico completo fica no terminal.

## 7. Confirmar que está tudo certo

```bash
npm run doctor
```

Ele testa a credencial de verdade (grava e lê um documento de teste) e, se algo
estiver errado, diz exatamente o que fazer — sem mostrar sua chave.

Também vale abrir <http://localhost:3000/api/health>: com o Firebase ligado a
resposta é `{"ok":true,"database":"firestore","label":"Firestore · <projeto>"}`.
Enquanto aparecer `"database":"demo"`, o painel está salvando **só na memória**
(veja o selo laranja “demo” no topo do painel).

## 8. Dados de exemplo

Na primeira vez que o app abre, ele cria automaticamente uma base de
demonstração (categorias, 16 serviços, clientes, orçamentos, OS, estoque,
agenda, financeiro e notas) para você ver tudo funcionando. Depois é só ir
apagando o que não serve — ou começar do zero apagando os registros de exemplo
nas telas correspondentes.

---

## Como os dados ficam organizados

Cada módulo do app é uma coleção no Firestore:

| Tela do app | Coleção no Firestore |
| --- | --- |
| Serviços / Categorias | `services`, `categories` |
| Clientes | `clients` |
| Orçamentos | `quotes` |
| Ordens de serviço / Conversas | `orders`, `orderMessages` |
| Estoque / Movimentações | `stock`, `stockMoves` |
| Agenda | `events` |
| Financeiro | `finance` |
| Notas | `notes` |
| Ajustes | `settings` |

Coleções internas (não apague): `_meta` (contadores de numeração) e `_blobs`
(fotos e assinaturas grandes, que não cabem em um documento comum).

### Limites que o app já contorna

- O Firestore aceita **1 MB por documento**. Fotos e assinaturas são reduzidas
  no celular antes de subir e, se ainda forem grandes, vão automaticamente
  para a coleção `_blobs`. Você não precisa fazer nada.
- As consultas usadas são simples (busca por token do portal e por OS), então
  **nenhum índice extra** é necessário.

## Usar o emulador local (opcional, para testes)

Se você quiser brincar sem mexer nos dados reais:

```bash
npm install -g firebase-tools     # uma vez
firebase init emulators           # escolha Firestore, projeto gbr-solucoes
firebase emulators:start --only firestore
```

Em outro terminal:

```bash
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm run dev
```

O app detecta o emulador e usa um banco vazio local (precisa de Java instalado).
