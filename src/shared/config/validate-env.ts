import { z } from "zod";

/**
 * Validates process.env against a Zod schema at startup.
 * Calls process.exit(1) with a readable error if validation fails.
 *
 * Usage in src/config/env.ts:
 *   import { validateEnv } from "../shared/config/validate-env";
 *   export const env = validateEnv(EnvSchema);
 */
export function validateEnv<T extends z.ZodTypeAny>(schema: T): z.infer<T> {
  const result = schema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    console.error(
      "Invalid environment variables:\n",
      JSON.stringify(errors, null, 2),
    );
    process.exit(1);
  }

  return result.data;
}
