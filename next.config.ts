import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // firebase-admin usa gRPC/nativos: melhor deixar fora do bundle do servidor
  serverExternalPackages: ["firebase-admin"],
  poweredByHeader: false,
};

export default nextConfig;
