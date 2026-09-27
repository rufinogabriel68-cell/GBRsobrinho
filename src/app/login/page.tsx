import type { Metadata } from "next";
import { BrandMark } from "@/components/shell";

export const metadata: Metadata = { title: "Entrar — GBR Soluções" };

/**
 * Tela de entrada usada apenas quando `APP_PASSWORD` está definida na Vercel.
 * Formulário simples (POST) — funciona sem JavaScript e no Safari do iPhone.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; erro?: string }>;
}) {
  const { next = "/", erro } = await searchParams;
  const safeNext = next.startsWith("/") ? next : "/";

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-16">
      <div className="card w-full max-w-sm p-7">
        <div className="flex items-center gap-3">
          <BrandMark size={42} />
          <div>
            <p className="text-[16px] font-semibold" style={{ letterSpacing: "-0.02em" }}>
              GBR Soluções
            </p>
            <p className="text-[12.5px]" style={{ color: "var(--text-3)" }}>
              painel particular
            </p>
          </div>
        </div>

        <h1 className="mt-6 text-[22px] font-semibold" style={{ letterSpacing: "-0.03em" }}>
          Digite sua senha
        </h1>
        <p className="mt-1.5 text-[13.5px]" style={{ color: "var(--text-2)" }}>
          Este painel é protegido pela senha definida na Vercel (`APP_PASSWORD`).
        </p>

        <form className="mt-5 flex flex-col gap-3" method="post" action="/api/login">
          <input type="hidden" name="next" value={safeNext} />
          <input
            className="input"
            type="password"
            name="password"
            autoFocus
            autoComplete="current-password"
            placeholder="Sua senha"
            aria-label="Senha"
            required
          />
          {erro && (
            <p className="text-[12.5px]" style={{ color: "var(--red)" }}>
              Senha incorreta. Tente novamente.
            </p>
          )}
          <button className="btn btn-primary h-11" type="submit">
            Entrar
          </button>
        </form>
      </div>
    </main>
  );
}
