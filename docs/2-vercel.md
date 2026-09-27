# Passo 2 — Vercel (onde o painel fica no ar)

A Vercel publica o painel na internet, de graça, com HTTPS e domínio próprio.
Ela já entende que o projeto é Next.js — você não precisa configurar build.

> Tempo estimado: **8 minutos**.

---

## 1. Subir o código para o GitHub

Se as alterações ainda estão só no seu computador:

```bash
git add .
git commit -m "Ajustes do painel"
git push
```

O repositório precisa estar no GitHub (pode ser privado — a Vercel acessa com
a sua permissão).

## 2. Importar na Vercel

1. Abra <https://vercel.com> e entre com a conta do GitHub.
2. **Add New… → Project**.
3. Em *Import Git Repository*, escolha o repositório `GBRsobrinho`.
   - Se ele não aparecer, clique em **Adjust GitHub App Permissions** e libere acesso.
4. **Não mexa** em Framework Preset (vai detectar *Next.js* sozinho),
   Build Command (`npm run build`) nem Output Directory.
5. Antes de clicar em Deploy, abra **Environment Variables** e cadastre as
   variáveis da próxima seção.

## 3. Variáveis de ambiente (o coração do deploy)

| Variável | Obrigatória? | Para que serve |
| --- | --- | --- |
| `FIREBASE_SERVICE_ACCOUNT` | ✅ | a chave do Firebase (Passo 1) — é o seu banco |
| `APP_PASSWORD` | recomendada | senha única do painel (protege seus dados) |
| `NEXT_PUBLIC_SITE_URL` | opcional | domínio final, usado nos links do portal do cliente |
| `DATABASE_URL` | só se usar Postgres | alternativa ao Firebase |
| `Z-API_INSTANCE_ID` / `Z-API_INSTANCE_TOKEN` | opcional | envio automático de WhatsApp (ainda não ligado no app) |

Para cada uma: escreva o **Name**, cole o **Value** e marque os três ambientes
(**Production**, **Preview** e **Development**). Depois **Save**.

> ⚠️ `APP_PASSWORD` é a única proteção do painel hoje. Use uma senha boa
> (não use "123456"). Quem souber a senha vê e altera tudo. O link do portal do
> cliente **não** pede senha — ele é identificado por um token próprio.

## 4. Deploy

1. Clique em **Deploy** e aguarde ~1 minuto.
2. Abra o endereço gerado (ex.: `https://gbr-sobrinho.vercel.app`).
3. Faça o teste de saúde: **`https://SEU-ENDEREÇO/api/health`**.
   - `{"ok":true,"database":"firestore", ...}` → tudo certo. 🎉
   - `{"ok":false, ...}` → o próprio JSON diz o que está faltando; ajuste a
     variável, salve e clique em **Redeploy** (mudar variável **não** republica
     sozinho).
4. Abra o painel: ele pede a senha (`APP_PASSWORD`) e, na primeira vez, cria os
   dados de exemplo.

## 5. Domínio próprio (opcional)

1. No projeto da Vercel: **Settings → Domains → Add**.
2. Digite seu domínio (ex.: `painel.gbrsolucoes.com.br`).
3. A Vercel mostra os registros de DNS — cadastre-os no seu provedor
   (Registro.br, Cloudflare, GoDaddy…). Em alguns minutos funciona.
4. Depois de apontar o domínio, atualize `NEXT_PUBLIC_SITE_URL` com ele e faça
   **Redeploy** — assim os links enviados ao cliente saem com o endereço bonito.

## 6. Instalar no celular (vira “app”)

- **iPhone**: abra o site no Safari → botão **Compartilhar** → **Adicionar à
  Tela de Início**.
- **Android**: abra no Chrome → menu **⋮** → **Instalar aplicativo**.

Depois de instalado, abre em tela cheia, funciona offline e sincroniza quando
a internet volta.

## 7. Atualizações

Todo `git push` no repositório dispara um novo deploy automaticamente. Se algo
der errado, em **Deployments** você pode voltar para uma versão anterior
(**Promote to Production**).

## 8. Problemas comuns

| Sintoma no app | Causa provável | O que fazer |
| --- | --- | --- |
| “Sem conexão com o banco” | variável do Firebase ausente/errada | confira `/api/health`, ajuste e faça **Redeploy** |
| Pede senha em looping | cookie bloqueado pelo navegador | aceite cookies de primeira parte / teste sem modo anônimo agressivo |
| Portal do cliente com “Link inválido” | token diferente do banco atual | confira se está no mesmo projeto Firebase |
| Alterações somem | mutação falhou e ficou na fila | o selo do topo mostra “N alterações pendentes”; clique nele para reenviar |
| Erro de banco nas telas | chave da conta de serviço trocada | gere nova no Firebase e atualize `FIREBASE_SERVICE_ACCOUNT` |

Relatório técnico: **Vercel → seu projeto → Deployments → (o deploy) → Functions → Logs**.

## 9. Sobre planos e custo

- **Vercel Hobby** (grátis) atende bem um usuário; as condições de uso da Vercel
  pedem plano **Pro** para projetos comerciais.
- **Firebase Spark** (grátis): 1 GB de dados, ~20 mil gravações/dia — sobra para
  o uso diário. Se um dia estourar, o plano Blaze é pago por uso e continua
  barato nesse volume.

## 10. Alternativa: Postgres em vez do Firestore

O app também funciona com Postgres (Neon, Supabase, Railway). Nesse caso:

1. Crie o banco e copie a *connection string* (com `?sslmode=require`).
2. Na Vercel, cadastre `DATABASE_URL`. Se as duas opções existirem, o app usa o
   **Firestore** — para forçar o Postgres, defina `DB_DRIVER=postgres`.
3. Rode as migrações uma vez, no seu computador, com a URL de produção:

```bash
DATABASE_URL="postgresql://..." npx drizzle-kit push
```

4. Faça o deploy. `/api/health` deve mostrar `"database":"postgres"`.
