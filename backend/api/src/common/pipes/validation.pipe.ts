import { BadRequestException } from '@nestjs/common';
import { ZodSchema, ZodError } from 'zod';
import type { PipeTransform } from '@nestjs/common';

/**
 * Zod validation pipe — validates request body/params against a Zod schema.
 *
 * Usage:
 *   @Body(new ZodValidationPipe(createEventSchema)) body: CreateEventInput
 */
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: this.formatZodError(result.error),
      });
    }
    return result.data;
  }

  private formatZodError(error: ZodError) {
    return error.errors.map((e) => ({
      path: e.path.join('.'),
      message: e.message,
    }));
  }
}

/**
 * Global validation pipe instance.
 * Applied in main.ts as useGlobalPipes.
 */
export const GlobalValidationPipe = new ZodValidationPipe({
  safeParse: (value: unknown) => ({ success: true, data: value }),
} as unknown as ZodSchema);
