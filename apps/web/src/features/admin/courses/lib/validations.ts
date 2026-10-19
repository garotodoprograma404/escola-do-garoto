import { z } from 'zod'

// Validation schema for course approval
export const approveSchema = z.object({
  feedback: z.string().optional(),
})

// Validation schema for course rejection
export const rejectSchema = z.object({
  reason: z
    .string()
    .min(10, 'O motivo deve ter pelo menos 10 caracteres')
    .max(1000, 'O motivo deve ter no máximo 1000 caracteres'),
})

// Validation schema for requesting changes
export const requestChangesSchema = z.object({
  feedback: z
    .string()
    .min(10, 'O feedback deve ter pelo menos 10 caracteres')
    .max(1000, 'O feedback deve ter no máximo 1000 caracteres'),
  changes: z.array(z.string()).min(1, 'Selecione pelo menos uma mudança necessária'),
})

// Validation schema for admin course creation

// Validation schema for admin enroll student
export const enrollStudentSchema = z.object({
  courseId: z.string().min(1, 'Curso inválido'),
  studentId: z.string().uuid('Aluno inválido'),
})

// Validation schema for move course to draft
export const moveCourseToDraftSchema = z.object({
  reason: z.string().max(1000, 'Motivo deve ter no máximo 1000 caracteres').optional(),
})

// Validation schema for archive
export const archiveCourseSchema = z.object({
  reason: z.string().max(1000, 'Motivo deve ter no máximo 1000 caracteres').optional(),
})

export const adminCourseEditorSettingsSchema = z
  .object({
    ownerMode: z.enum(['self', 'producer']),
    producerId: z.string().uuid('Produtor inválido').optional().nullable(),
    isFeatured: z.boolean().default(false),
    couponsEnabled: z.boolean().default(false),
    priceLockedByAdmin: z.boolean().default(false),
    adminNotes: z
      .string()
      .max(2000, 'Notas devem ter no máximo 2000 caracteres')
      .optional()
      .nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.ownerMode === 'producer' && !data.producerId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Selecione um produtor para vincular ao curso',
        path: ['producerId'],
      })
    }
  })

// Validation schema for course editing (admin)

export type ApproveFormData = z.infer<typeof approveSchema>
export type RejectFormData = z.infer<typeof rejectSchema>
export type RequestChangesFormData = z.infer<typeof requestChangesSchema>
export type EnrollStudentFormData = z.infer<typeof enrollStudentSchema>
export type ArchiveCourseFormData = z.infer<typeof archiveCourseSchema>
export type MoveCourseToDraftFormData = z.infer<typeof moveCourseToDraftSchema>
export type AdminCourseEditorSettingsFormData = z.infer<typeof adminCourseEditorSettingsSchema>
