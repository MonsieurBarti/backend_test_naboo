import { z } from "zod";
import { validateEnv } from "../shared/config/validate-env";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3000),
  MONGODB_URI: z.string(),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("info"),
  IS_LOCAL: z.coerce.boolean().default(false),
});

export const env = validateEnv(EnvSchema);
export type EnvVars = z.infer<typeof EnvSchema>;

// For NestJS ConfigModule.forRoot validate option — throws instead of process.exit
export function validateEnvironment(config: Record<string, unknown>): EnvVars {
  const result = EnvSchema.safeParse(config);
  if (!result.success) {
    const errors = z.flattenError(result.error).fieldErrors;
    throw new Error(`Invalid environment variables:\n${JSON.stringify(errors, null, 2)}`);
  }
  return result.data;
}
