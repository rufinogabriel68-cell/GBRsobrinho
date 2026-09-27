import "dotenv/config";
import { defineConfig } from "drizzle-kit";

/** Só é necessário se você usar Postgres (Firestore não precisa de migração). */
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
});
