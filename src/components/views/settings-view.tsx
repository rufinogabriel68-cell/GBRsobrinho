"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Check,
  ClipboardCopy,
  Database,
  Loader2,
  LogOut,
  Monitor,
  Moon,
  RotateCcw,
  Sun,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { firebaseProjectId, isFirebaseConfigured } from "@/lib/firebase";
import { clearDemoData, resetDemoData } from "@/lib/db";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const ENV_TEMPLATE = `NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=SEU_PROJETO.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=SEU_PROJETO.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=`;

const THEME_OPTIONS = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Escuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
] as const;

export function SettingsView() {
  const { user, mode, signOutUser, updateDisplayName } = useAuth();
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState("");
  const [nameSaving, setNameSaving] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmAction, setConfirmAction] = useState<
    "reset" | "clear" | null
  >(null);
  const [dataBusy, setDataBusy] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    setName(user?.displayName ?? "");
  }, [user?.displayName]);

  async function handleSaveName(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim() || nameSaving) return;
    setNameSaving(true);
    try {
      await updateDisplayName(name);
      setNameSaved(true);
      window.setTimeout(() => setNameSaved(false), 2000);
    } catch (error) {
      console.error("[config] erro ao salvar nome:", error);
    } finally {
      setNameSaving(false);
    }
  }

  async function handleCopyEnv() {
    try {
      await navigator.clipboard.writeText(ENV_TEMPLATE);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt(
        "Não foi possível copiar automaticamente. Copie manualmente:",
        ENV_TEMPLATE
      );
    }
  }

  async function handleConfirmData() {
    setDataBusy(true);
    try {
      if (confirmAction === "reset") resetDemoData();
      if (confirmAction === "clear") clearDemoData();
      setConfirmAction(null);
    } finally {
      setDataBusy(false);
    }
  }

  const initials =
    (user?.displayName || user?.email || "?")
      .split(/\s+/)
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";

  const currentTheme = mounted ? (theme ?? "dark") : "dark";

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Perfil, aparência e integrações do painel.
        </p>
      </header>

      {/* ===== Perfil ===== */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Perfil</CardTitle>
            <CardDescription>Como você aparece no painel.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/15 text-lg font-semibold text-primary">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate font-medium">
                {user?.displayName || "Usuário"}
              </p>
              <p className="truncate text-sm text-muted-foreground">
                {user?.email || "—"}
              </p>
            </div>
          </div>

          <form
            onSubmit={handleSaveName}
            className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end"
          >
            <Field
              label="Nome de exibição"
              htmlFor="display-name"
              className="flex-1"
            >
              <Input
                id="display-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome"
              />
            </Field>
            <Button type="submit" disabled={!name.trim() || nameSaving}>
              {nameSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : nameSaved ? (
                <Check className="h-4 w-4" aria-hidden />
              ) : null}
              {nameSaved ? "Salvo" : "Salvar"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* ===== Aparência ===== */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Aparência</CardTitle>
            <CardDescription>
              O painel abre por padrão no modo escuro.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2">
            {THEME_OPTIONS.map((option) => {
              const Icon = option.icon;
              const active = currentTheme === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTheme(option.value)}
                  aria-pressed={active}
                  className={cn(
                    "flex min-h-20 flex-col items-center justify-center gap-2 rounded-xl border p-4 text-sm font-medium transition-colors",
                    active
                      ? "border-primary/50 bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                  {option.label}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ===== Integração (Firebase) ===== */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Integração — Firebase</CardTitle>
            <CardDescription>
              {isFirebaseConfigured
                ? "Painel conectado ao Firebase."
                : "Conecte o painel aos seus dados reais."}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {isFirebaseConfigured ? (
            <div className="rounded-xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 ring-1 ring-inset ring-emerald-500/30 dark:text-emerald-400">
              <p className="flex items-center gap-2 font-medium">
                <Check className="h-4 w-4" aria-hidden />
                Conectado ao projeto
              </p>
              <p className="mt-1 break-all text-emerald-700/80 dark:text-emerald-400/80">
                {firebaseProjectId}
              </p>
              <p className="mt-2 text-emerald-700/80 dark:text-emerald-400/80">
                Login e dados rodam no Firebase Authentication + Firestore.
                Confira as regras de segurança no arquivo{" "}
                <code className="rounded bg-emerald-500/10 px-1 py-0.5">
                  firestore.rules
                </code>
                .
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl bg-amber-500/10 px-4 py-3 text-sm text-amber-700 ring-1 ring-inset ring-amber-500/30 dark:text-amber-400">
                <p className="font-medium">Modo demonstração ativo</p>
                <p className="mt-1 text-amber-700/80 dark:text-amber-400/80">
                  Os dados são fictícios e ficam salvos apenas neste navegador.
                  Siga os passos abaixo para ativar contas e dados reais.
                </p>
              </div>
              <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground marker:font-semibold marker:text-foreground">
                <li>
                  Crie um projeto em{" "}
                  <a
                    href="https://console.firebase.google.com"
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-primary hover:underline"
                  >
                    console.firebase.google.com
                  </a>
                  .
                </li>
                <li>
                  Em <strong>Authentication → Sign-in method</strong>, ative{" "}
                  <strong>E-mail/senha</strong> (e Google, se quiser).
                </li>
                <li>
                  Em <strong>Firestore Database</strong>, clique em{" "}
                  <strong>Criar banco de dados</strong>.
                </li>
                <li>
                  Em <strong>Configurações do projeto → Seus apps</strong>,
                  registre um app Web ({"</>"}) para obter o{" "}
                  <code>firebaseConfig</code>.
                </li>
                <li>
                  Preencha as variáveis <code>NEXT_PUBLIC_FIREBASE_*</code> com
                  esses valores (local: <code>.env.local</code>; Vercel:
                  Settings → Environment Variables) e reinicie o servidor ou
                  faça um novo deploy.
                </li>
              </ol>
              <Button variant="outline" onClick={handleCopyEnv}>
                {copied ? (
                  <Check className="h-4 w-4" aria-hidden />
                ) : (
                  <ClipboardCopy className="h-4 w-4" aria-hidden />
                )}
                {copied ? "Copiado!" : "Copiar lista de variáveis"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===== Dados (apenas demonstração) ===== */}
      {mode === "demo" ? (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Dados da demonstração</CardTitle>
              <CardDescription>
                Apenas no modo demonstração (navegador local).
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => setConfirmAction("reset")}>
              <RotateCcw className="h-4 w-4" aria-hidden />
              Restaurar dados de exemplo
            </Button>
            <Button
              variant="outline"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setConfirmAction("clear")}
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              Limpar todos os dados
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* ===== Conta ===== */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Conta</CardTitle>
            <CardDescription>
              Encerra a sessão neste dispositivo.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={async () => {
              await signOutUser();
              router.replace("/login");
            }}
          >
            <LogOut className="h-4 w-4" aria-hidden />
            Sair da conta
          </Button>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmAction !== null}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirmData}
        loading={dataBusy}
        title={
          confirmAction === "reset"
            ? "Restaurar dados de exemplo"
            : "Limpar todos os dados"
        }
        description={
          confirmAction === "reset"
            ? "Os dados fictícios originais voltam a preencher o painel."
            : "Todos os clientes, produtos e pedidos locais serão apagados."
        }
        confirmLabel={confirmAction === "reset" ? "Restaurar" : "Limpar"}
      />
    </div>
  );
}
