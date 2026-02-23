import { z } from "zod";

export const ZOD_SCHEMA_KEY = Symbol("ZOD_SCHEMA");

export function ZodSchema(schema: z.ZodTypeAny): ClassDecorator {
  return (target) => {
    Reflect.defineMetadata(ZOD_SCHEMA_KEY, schema, target);
  };
}
