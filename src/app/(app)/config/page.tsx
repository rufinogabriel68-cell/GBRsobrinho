"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  Building2,
  CheckCircle2,
  CreditCard,
  Database,
  Download,
  FileText,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Upload,
  Wallet,
  XCircle,
} from "lucide-react";
import { Card, Field, PageHead, Progress } from "@/components/ui";
import { useStore } from "@/lib/store";
import { brl, monthKey } from "@/lib/format";
import { compressImage } from "@/lib/images";
import { BrandMark } from "@/components/shell";

/** Resposta de /api/health — usada no cartão "Conexão e segurança". */
type Health = {
  ok?: boolean;
  database?: string | null;
  label?: string;
  auth?: boolean;
  /** true quando o painel está sem banco configurado (dados só na memória do servidor) */
  demo?: boolean;
  hint?: string;
  error?: string;
};

export default function ConfigPage() {
  const { data, settingsValue, putSettings, notify, status, refresh } = useStore();
  const [company, setCompany] = useState<any>(settingsValue("company", {}));
  const [goals, setGoals] = useState<any>(settingsValue("goals", { monthly: 8000, savingsPct: 20 }));
  const [fees, setFees] = useState<any>(settingsValue("fees", { cardPercent: 3.49, fixedFee: 0.4, pixPercent: 0 }));
  const [pdf, setPdf] = useState<any>(settingsValue("pdf", { footer: "", conditions: "", validity: 15, accent: "#0071E3" }));
  const [notif, setNotif] = useState<any>(settingsValue("notifications", { push: true, email: true, whatsapp: true, dailyBrief: true }));

  /**
   * O banco chega depois do primeiro render (cache local + bootstrap). Sem esta
   * hidratação os campos apareciam vazios e o primeiro "Salvar" zerava as
   * configurações já gravadas.
   */
  // referência estável entre renders (evita recalcular os useMemo a cada render)
  const settingsRows = useMemo(() => data.settings || [], [data]);
  const settingsMap = useMemo(
    () => Object.fromEntries(settingsRows.map((r: any) => [r.key, r.value])),
    [settingsRows],
  );
  const touched = useRef(false);
  const hydrated = useRef(false);
  useEffect(() => {
    if (touched.current || !settingsRows.length) return;
    if (!hydrated.current) {
      hydrated.current = true;
      setCompany(settingsMap.company ?? {});
      setGoals(settingsMap.goals ?? { monthly: 8000, savingsPct: 20 });
      setFees(settingsMap.fees ?? { cardPercent: 3.49, fixedFee: 0.4, pixPercent: 0 });
      setPdf(settingsMap.pdf ?? { footer: "", conditions: "", validity: 15, accent: "#0071E3" });
      setNotif(settingsMap.notifications ?? { push: true, email: true, whatsapp: true, dailyBrief: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsRows.length]);

  const edit = <T,>(setter: (v: T) => void) => (value: T) => {
    touched.current = true;
    setter(value);
  };
  const setCompanyEdit = edit(setCompany);
  const setGoalsEdit = edit(setGoals);
  const setFeesEdit = edit(setFees);
  const setPdfEdit = edit(setPdf);
  const setNotifEdit = edit(setNotif);

  const save = async (label: string) => {
    await refresh();
    notify(label, "green");
  };

  const logoUpload = async (file?: File | null) => {
    if (!file) return;
    try {
      const dataUrl = await compressImage(file, {
        maxSize: 512,
        quality: 0.9,
        mime: file.type === "image/png" ? "image/png" : "image/jpeg",
      });
      const next = { ...company, logo: dataUrl };
      touched.current = true;
      setCompany(next);
      await putSettings("company", next);
      notify("Logo atualizada.", "green");
    } catch {
      notify("Não foi possível ler essa imagem.", "amber");
    }
  };

  const exportCsv = (table: string) => {
    const rows = data[table] || [];
    if (!rows.length) return notify("Nada para exportar nesta tabela.", "amber");
    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(";"),
      ...rows.map((r: any) => headers.map((h) => JSON.stringify(r[h] ?? "")).join(";")),
    ].join("\n");
    download(new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" }), `${table}-${isoToday()}.csv`);
    notify(`CSV de ${table} exportado.`, "green");
  };

  const backup = () => {
    download(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }), `gbr-backup-${isoToday()}.json`);
    notify("Backup completo baixado.", "green");
  };

  const [health, setHealth] = useState<Health | null>(null);
  const [checking, setChecking] = useState(false);

  const checkHealth = useCallback(async () => {
    setChecking(true);
    try {
      const res = await fetch("/api/health", { cache: "no-store" });
      setHealth((await res.json()) as typeof health);
    } catch {
      setHealth({ ok: false, error: "Sem resposta do servidor." });
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => void checkHealth(), 0);
    return () => window.clearTimeout(t);
  }, [checkHealth]);

  const monthIn = (data.finance || [])
    .filter((f: any) => f.kind === "in" && monthKey(f.entryDate) === monthKey(new Date()))
    .reduce((a: number, f: any) => a + Number(f.amount), 0);

  const counts = [
    ["services", "Serviços"],
    ["clients", "Clientes"],
    ["quotes", "Orçamentos"],
    ["orders", "Ordens de serviço"],
    ["stock", "Estoque"],
    ["events", "Agenda"],
    ["finance", "Lançamentos"],
    ["notes", "Anotações"],
  ] as const;

  return (
    <div>
      <PageHead
        eyebrow="Ajustes"
        title="Configurações"
        subtitle="Seus dados, metas, taxas, aparência dos PDFs, notificações e exportação de tudo o que você já registrou."
        actions={
          <>
            <button className="btn" type="button" onClick={() => void refresh()}>Sincronizar agora</button>
            <button className="btn btn-primary" type="button" onClick={backup}>
              <Download size={16} /> Backup
            </button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* empresa */}
        <Card className="p-6 rise lg:col-span-2">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "var(--accentSoft)", color: "var(--accent)" }}>
              <Building2 size={17} />
            </span>
            <div>
              <p className="text-[15.5px] font-semibold">Meus dados</p>
              <p className="text-[12.5px]" style={{ color: "var(--text-3)" }}>Aparecem no topo de todos os documentos</p>
            </div>
          </div>

          <div className="flex flex-col gap-6 sm:flex-row">
            <div className="flex w-full flex-col items-center gap-3 sm:w-48">
              <div
                className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-3xl"
                style={{ background: "var(--inset)", border: "1px solid var(--line)" }}
              >
                {company.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element -- logo enviada pelo usuário (data URL), não passa pelo otimizador do Next
                  <img src={company.logo} alt="Logo da empresa" className="h-full w-full object-cover" />
                ) : (
                  <BrandMark size={56} />
                )}
              </div>
              <label className="btn h-9 w-full px-3 text-[13px]">
                <Upload size={14} /> Trocar logo
                <input type="file" accept="image/*" className="hidden" onChange={(e) => logoUpload(e.target.files?.[0])} />
              </label>
              <p className="text-center text-[11.5px]" style={{ color: "var(--text-3)" }}>PNG ou JPG até 900 KB</p>
            </div>

            <div className="grid flex-1 gap-4 sm:grid-cols-2">
              <Field label="Nome da empresa">
                <input className="input" value={company.name || ""} onChange={(e) => setCompanyEdit({ ...company, name: e.target.value })} />
              </Field>
              <Field label="Responsável">
                <input className="input" value={company.owner || ""} onChange={(e) => setCompanyEdit({ ...company, owner: e.target.value })} />
              </Field>
              <Field label="Telefone / WhatsApp">
                <input className="input" value={company.phone || ""} onChange={(e) => setCompanyEdit({ ...company, phone: e.target.value })} />
              </Field>
              <Field label="E-mail">
                <input className="input" value={company.email || ""} onChange={(e) => setCompanyEdit({ ...company, email: e.target.value })} />
              </Field>
              <Field label="CNPJ / CPF">
                <input className="input" value={company.document || ""} onChange={(e) => setCompanyEdit({ ...company, document: e.target.value })} />
              </Field>
              <Field label="Chave Pix">
                <input className="input" value={company.pix || ""} onChange={(e) => setCompanyEdit({ ...company, pix: e.target.value })} />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Endereço">
                  <input className="input" value={company.address || ""} onChange={(e) => setCompanyEdit({ ...company, address: e.target.value })} />
                </Field>
              </div>
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <button className="btn btn-primary" type="button" onClick={async () => { await putSettings("company", company); save("Dados da empresa salvos."); }}>
              Salvar dados
            </button>
          </div>
        </Card>

        {/* metas */}
        <Card className="p-6 rise" style={{ animationDelay: "50ms" }}>
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "var(--green-soft)", color: "var(--green)" }}>
              <Wallet size={17} />
            </span>
            <div>
              <p className="text-[15.5px] font-semibold">Metas financeiras</p>
              <p className="text-[12.5px]" style={{ color: "var(--text-3)" }}>Alimenta a barra de progresso do painel</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Meta mensal (R$)">
              <input className="input tnum" type="number" value={goals.monthly} onChange={(e) => setGoalsEdit({ ...goals, monthly: Number(e.target.value) })} />
            </Field>
            <Field label="Reserva sugerida (%)">
              <input className="input tnum" type="number" value={goals.savingsPct} onChange={(e) => setGoalsEdit({ ...goals, savingsPct: Number(e.target.value) })} />
            </Field>
          </div>
          <div className="mt-5">
            <div className="mb-2 flex justify-between text-[13px]">
              <span style={{ color: "var(--text-2)" }}>Este mês</span>
              <span className="tnum font-semibold">{brl(monthIn)} / {brl(goals.monthly)}</span>
            </div>
            <Progress value={(monthIn / Math.max(1, goals.monthly)) * 100} thick />
          </div>
          <div className="mt-5 flex justify-end">
            <button className="btn btn-primary" type="button" onClick={async () => { await putSettings("goals", goals); save("Metas atualizadas."); }}>
              Salvar metas
            </button>
          </div>
        </Card>

        {/* taxas */}
        <Card className="p-6 rise" style={{ animationDelay: "90ms" }}>
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "var(--amber-soft)", color: "var(--amber)" }}>
              <CreditCard size={17} />
            </span>
            <div>
              <p className="text-[15.5px] font-semibold">Taxas da maquininha</p>
              <p className="text-[12.5px]" style={{ color: "var(--text-3)" }}>Usadas pela calculadora de orçamentos</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Cartão (%)">
              <input className="input tnum" type="number" step="0.01" value={fees.cardPercent} onChange={(e) => setFeesEdit({ ...fees, cardPercent: Number(e.target.value) })} />
            </Field>
            <Field label="Taxa fixa (R$)">
              <input className="input tnum" type="number" step="0.01" value={fees.fixedFee} onChange={(e) => setFeesEdit({ ...fees, fixedFee: Number(e.target.value) })} />
            </Field>
            <Field label="Pix (%)">
              <input className="input tnum" type="number" step="0.01" value={fees.pixPercent} onChange={(e) => setFeesEdit({ ...fees, pixPercent: Number(e.target.value) })} />
            </Field>
          </div>
          <div className="mt-5 flex justify-end">
            <button className="btn btn-primary" type="button" onClick={async () => { await putSettings("fees", fees); save("Taxas salvas."); }}>
              Salvar taxas
            </button>
          </div>
        </Card>

        {/* pdf */}
        <Card className="p-6 rise lg:col-span-2" style={{ animationDelay: "130ms" }}>
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "var(--accentSoft)", color: "var(--accent)" }}>
              <FileText size={17} />
            </span>
            <div>
              <p className="text-[15.5px] font-semibold">Aparência dos documentos</p>
              <p className="text-[12.5px]" style={{ color: "var(--text-3)" }}>Condições, validade padrão e rodapé do PDF</p>
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <Field label="Condições padrão">
              <textarea className="textarea" rows={4} value={pdf.conditions} onChange={(e) => setPdfEdit({ ...pdf, conditions: e.target.value })} />
            </Field>
            <Field label="Rodapé do PDF">
              <textarea className="textarea" rows={4} value={pdf.footer} onChange={(e) => setPdfEdit({ ...pdf, footer: e.target.value })} />
            </Field>
            <div className="grid gap-4">
              <Field label="Validade padrão (dias)">
                <input className="input tnum" type="number" value={pdf.validity} onChange={(e) => setPdfEdit({ ...pdf, validity: Number(e.target.value) })} />
              </Field>
              <Field label="Cor de destaque">
                <div className="flex gap-2">
                  {["#0071E3", "#30D158", "#FF9F0A", "#BF5AF2"].map((c) => (
                    <button
                      key={c}
                      type="button"
                      aria-label={`Cor ${c}`}
                      onClick={() => setPdfEdit({ ...pdf, accent: c })}
                      className="h-8 w-8 rounded-full"
                      style={{ background: c, outline: pdf.accent === c ? "2px solid var(--text)" : "none", outlineOffset: "2px" }}
                    />
                  ))}
                </div>
              </Field>
            </div>
          </div>
          <div className="mt-5 flex justify-end">
            <button className="btn btn-primary" type="button" onClick={async () => { await putSettings("pdf", pdf); save("Padrões de PDF salvos."); }}>
              Salvar documentos
            </button>
          </div>
        </Card>

        {/* notificações */}
        <Card className="p-6 rise" style={{ animationDelay: "170ms" }}>
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "var(--purple-soft)", color: "var(--purple)" }}>
              <Bell size={17} />
            </span>
            <div>
              <p className="text-[15.5px] font-semibold">Notificações</p>
              <p className="text-[12.5px]" style={{ color: "var(--text-3)" }}>Push no celular, e-mail e lembretes</p>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <button
              className="btn mb-1 w-full"
              type="button"
              onClick={async () => {
                if (typeof Notification === "undefined") return notify("Este navegador não suporta notificações.", "amber");
                const p = await Notification.requestPermission();
                if (p === "granted") {
                  try {
                    new Notification("GBR Soluções", { body: "Notificações ativadas. Você será avisado quando o cliente escrever." });
                  } catch {
                    /* ignora */
                  }
                  notify("Notificações do dispositivo ativadas.", "green");
                } else notify("Permissão de notificação não concedida.", "amber");
              }}
            >
              <Bell size={15} /> Ativar notificações do dispositivo
            </button>
            {[
              ["push", "Push no dispositivo (PWA)"],
              ["email", "Resumos por e-mail"],
              ["whatsapp", "Alertas de mensagem no portal"],
              ["dailyBrief", "Resumo diário às 8h"],
            ].map(([key, label]) => (
              <label
                key={key}
                className="flex cursor-pointer items-center justify-between rounded-2xl px-4 py-3 text-[14px] transition"
                style={{ background: "var(--inset)", border: "1px solid var(--line)" }}
              >
                {label}
                <input
                  type="checkbox"
                  checked={!!notif[key]}
                  onChange={(e) => {
                    const next = { ...notif, [key]: e.target.checked };
                    setNotifEdit(next);
                    void putSettings("notifications", next);
                  }}
                />
              </label>
            ))}
          </div>
        </Card>

        {/* exportação */}
        <Card className="p-6 rise" style={{ animationDelay: "210ms" }}>
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "var(--accentSoft)", color: "var(--accent)" }}>
              <Download size={17} />
            </span>
            <div>
              <p className="text-[15.5px] font-semibold">Exportar e backup</p>
              <p className="text-[12.5px]" style={{ color: "var(--text-3)" }}>CSV por tabela ou backup completo em JSON</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {counts.map(([key, label]) => (
              <button key={key} className="btn h-9 px-3 text-[12.5px]" type="button" onClick={() => exportCsv(key)}>
                {label}
              </button>
            ))}
          </div>
          <button className="btn btn-primary mt-4 w-full" type="button" onClick={backup}>
            <Download size={16} /> Baixar backup completo (JSON)
          </button>
          <p className="mt-3 text-[12.5px]" style={{ color: "var(--text-3)" }}>
            Estado da sincronização: <strong style={{ color: status === "synced" ? "var(--green)" : "var(--amber)" }}>{status}</strong>. Os
            dados ficam em cache local para funcionar offline.
          </p>
        </Card>

        {/* conexão */}
        <Card className="p-6 rise lg:col-span-2" style={{ animationDelay: "250ms" }}>
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "var(--accentSoft)", color: "var(--accent)" }}>
              <Database size={17} />
            </span>
            <div>
              <p className="text-[15.5px] font-semibold">Conexão e segurança</p>
              <p className="text-[12.5px]" style={{ color: "var(--text-3)" }}>
                Onde seus dados estão gravados e quem pode abrir o painel
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span
              className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[13px] font-medium"
              style={{
                background: health?.ok && !health?.demo ? "var(--greenSoft)" : "var(--amberSoft)",
                color: health?.ok && !health?.demo ? "var(--green)" : "var(--amber)",
              }}
            >
              {health?.ok ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
              Banco: {health?.ok ? health.label || health.database : health?.error || "verificando…"}
            </span>
            <span
              className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[13px] font-medium"
              style={{
                background: health?.auth ? "var(--greenSoft)" : "var(--redSoft)",
                color: health?.auth ? "var(--green)" : "var(--red)",
              }}
            >
              <ShieldCheck size={14} />
              {health?.auth ? "Painel protegido por senha" : "Sem senha (APP_PASSWORD não definida)"}
            </span>
            <button className="btn h-9 px-3 text-[13px]" type="button" onClick={() => void checkHealth()} disabled={checking}>
              <RefreshCw size={14} className={checking ? "pulse-dot" : ""} /> Testar conexão
            </button>
            {health?.auth && (
              <a className="btn h-9 px-3 text-[13px]" href="/api/logout">
                <LogOut size={14} /> Sair
              </a>
            )}
          </div>

          {health?.demo && (
            <div
              className="mt-4 rounded-2xl px-4 py-3 text-[13px] leading-relaxed"
              style={{ background: "var(--amberSoft)", color: "var(--text)" }}
            >
              <strong className="font-semibold">Modo demonstração.</strong> O painel está funcionando só na memória do
              servidor — tudo o que você cadastrar some quando ele reiniciar. Para guardar de verdade, crie o projeto no
              Firebase e preencha <code className="mono rounded-md px-1.5 py-0.5" style={{ background: "var(--panel)" }}>FIREBASE_SERVICE_ACCOUNT</code>{" "}
              (passo a passo em <code className="mono">docs/1-firebase.md</code>).
            </div>
          )}

          <p className="mt-4 text-[12.5px] leading-relaxed" style={{ color: "var(--text-3)" }}>
            Firestore e Postgres funcionam com o mesmo app. Para ligar a proteção por senha, defina
            <code className="mono mx-1 rounded-md px-1.5 py-0.5" style={{ background: "var(--inset)" }}>APP_PASSWORD</code>
            nas variáveis de ambiente (local e na Vercel) e faça um novo deploy.
          </p>
        </Card>
      </div>
    </div>
  );
}

const isoToday = () => new Date().toISOString().slice(0, 10);

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
