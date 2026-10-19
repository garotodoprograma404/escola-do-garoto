import { BadRequestException, type PipeTransform } from '@nestjs/common'
import type { ApiErrorBody } from '@vox/contracts'
import { z } from 'zod'

/**
 * Valida a entrada (body, query ou params) com um schema zod.
 * Uso: `@Body(new ZodValidationPipe(createCouponSchema)) body: CreateCouponInput`
 */
export class ZodValidationPipe<T extends z.ZodType> implements PipeTransform<unknown, z.infer<T>> {
  constructor(private readonly schema: T) {}

  transform(value: unknown): z.infer<T> {
    const parsed = this.schema.safeParse(value)
    if (!parsed.success) {
      const body: ApiErrorBody = {
        statusCode: 400,
        message: 'Dados inválidos',
        issues: z.flattenError(parsed.error).fieldErrors,
      }
      throw new BadRequestException(body)
    }
    return parsed.data
  }
}
