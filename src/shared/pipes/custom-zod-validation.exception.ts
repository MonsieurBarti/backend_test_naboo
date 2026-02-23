import { HttpException, HttpStatus } from "@nestjs/common";
import { z } from "zod";

export class CustomZodValidationException extends HttpException {
  constructor(error: z.ZodError) {
    super(
      {
        statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        message: "Validation failed",
        errors: error.flatten().fieldErrors,
      },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}
