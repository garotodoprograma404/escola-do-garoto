export type CourseAuditDecision = 'approved' | 'rejected' | 'changes_requested'

export type CourseAuditNotificationInput = {
  courseId: number
  courseTitle: string
  decision: CourseAuditDecision
  feedback?: string | null
  changesRequested?: string[] | null
}

/**
 * Texto da notificação que o produtor recebe quando o admin decide sobre o curso.
 */
export function buildAuditNotification(input: CourseAuditNotificationInput) {
  let title = ''
  let message = ''

  switch (input.decision) {
    case 'approved':
      title = '✅ Curso Aprovado!'
      message = `Parabéns! Seu curso "${input.courseTitle}" foi aprovado e já está disponível na plataforma.`
      break
    case 'rejected':
      title = '❌ Curso Rejeitado'
      message = `Infelizmente, seu curso "${input.courseTitle}" não foi aprovado. Motivo: ${input.feedback || 'Não especificado'}`
      break
    case 'changes_requested':
      title = '🔄 Mudanças Solicitadas'
      message = `Seu curso "${input.courseTitle}" precisa de algumas melhorias antes de ser aprovado.`
      if (input.changesRequested && input.changesRequested.length > 0) {
        message += ` Mudanças necessárias: ${input.changesRequested.join(', ')}.`
      }
      break
  }

  if (input.feedback && input.decision !== 'rejected') {
    message += ` Feedback: ${input.feedback}`
  }

  return {
    type: 'course_update',
    title,
    message,
    link: `/producer/courses/${input.courseId}`,
    metadata: {
      course_id: String(input.courseId),
      course_title: input.courseTitle,
      decision: input.decision,
      feedback: input.feedback ?? null,
      changes_requested: input.changesRequested ?? null,
    },
  }
}
