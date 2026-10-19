import { z } from 'zod'

export const courseIdParamSchema = z.object({
  courseId: z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER),
})

export const rankingVisibilitySchema = z.object({ visible: z.boolean() })
export type RankingVisibilityInput = z.infer<typeof rankingVisibilitySchema>

export const engagementQuerySchema = z.object({
  courseId: z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER).optional(),
})
