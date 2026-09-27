import type { NextConfig } from "next";

/**
 * Origens permitidas no servidor de desenvolvimento (proteção CSRF do Next).
 *
 * O preview do Arena/e2b expõe o servidor em https://{porta}-{sandboxId}.e2b.app,
 * então a origem é adicionada dinamicamente a partir da variável de ambiente
 * E2B_SANDBOX_ID (quando presente). Localmente, basta http://localhost:3000.
 */
const allowedDevOrigins: string[] = ["http://localhost:3000"];

if (process.env.E2B_SANDBOX_ID) {
  for (const port of [3000, 3001, 8080]) {
    allowedDevOrigins.push(`https://${port}-${process.env.E2B_SANDBOX_ID}.e2b.app`);
  }
}

const nextConfig: NextConfig = {
  allowedDevOrigins,
};

export default nextConfig;
