import { type ArgumentMetadata, Injectable, type PipeTransform, type Type } from "@nestjs/common";
import { z } from "zod";
import { ZOD_SCHEMA_KEY } from "../decorators/zod-schema.decorator";
import { CustomZodValidationException } from "./custom-zod-validation.exception";

/**
 * Zod validation pipe — two modes:
 *
 * 1. Manual: `new ZodValidationPipe(schema)` — validates using the provided schema
 * 2. Global: `new ZodValidationPipe()` — auto-detects schemas from @ZodSchema decorator
 *
 * Register globally in main.ts:
 *   app.useGlobalPipes(new ZodValidationPipe());
 *
 * Use per-route with explicit schema:
 *   @Body(new ZodValidationPipe(CreateUserSchema)) body: CreateUserDto
 */
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema?: z.ZodTypeAny) {}

  transform(value: unknown, metadata: ArgumentMetadata) {
    if (!["body", "query", "param"].includes(metadata.type)) return value;
    if (this.schema) return this.validateWithSchema(value, this.schema);
    return this.validateWithMetadata(value, metadata);
  }

  private validateWithMetadata(value: unknown, metadata: ArgumentMetadata) {
    if (!metadata.metatype) return value;
    const schema = this.getSchemaFromMetadata(metadata.metatype);
    if (!schema) return value;
    return this.validateWithSchema(value, schema);
  }

  private validateWithSchema(value: unknown, schema: z.ZodTypeAny) {
    try {
      return schema.parse(value);
    } catch (error) {
      if (error instanceof z.ZodError) throw new CustomZodValidationException(error);
      throw error;
    }
  }

  private getSchemaFromMetadata(metatype: Type<unknown>): z.ZodTypeAny | undefined {
    return Reflect.getMetadata(ZOD_SCHEMA_KEY, metatype);
  }
}

/** Convenience factory for per-route pipes */
export function createZodPipe(schema: z.ZodTypeAny): ZodValidationPipe {
  return new ZodValidationPipe(schema);
}
