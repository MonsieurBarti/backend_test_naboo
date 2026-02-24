import { z } from "zod";

/**
 * Validates process.env against a Zod schema at startup.
 * Throws an Error with a readable message if validation fails.
 *
 * Usage in src/config/env.ts:
 *   import { validateEnv } from "../shared/config/validate-env";
 *   const parsed = validateEnv(EnvSchema);
 */
export function validateEnv<T extends z.ZodTypeAny>(schema: T): z.infer<T> {
  const result = schema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    throw new Error(`Invalid environment variables:\n${JSON.stringify(errors, null, 2)}`);
  }

  return result.data;
}
