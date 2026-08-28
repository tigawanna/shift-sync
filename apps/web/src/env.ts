import { DEFAULT_DATABASE_URL } from "@/lib/drizzle/turso";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  DATABASE_AUTH_TOKEN: z.string().optional(),
  BETTER_AUTH_SECRET: z.string().min(1),
  BETTER_AUTH_URL: z.string().url(),
  CORS_ORIGINS: z.string().optional(),
  ADMIN_EMAIL: z.string().optional(),
  VITE_API_URL: z.string().optional(),
});

export type AppEnv = z.infer<typeof envSchema>;

let cachedEnv: AppEnv | undefined;

export function getEnv(): AppEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  cachedEnv = envSchema.parse({
    DATABASE_URL: process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL,
    DATABASE_AUTH_TOKEN: process.env.DATABASE_AUTH_TOKEN,
    BETTER_AUTH_SECRET:
      process.env.BETTER_AUTH_SECRET ?? "dev-only-secret-replace-in-production-32chars",
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? "http://localhost:3090",
    CORS_ORIGINS: process.env.CORS_ORIGINS,
    ADMIN_EMAIL: process.env.ADMIN_EMAIL,
    VITE_API_URL: process.env.VITE_API_URL,
  });

  return cachedEnv;
}
