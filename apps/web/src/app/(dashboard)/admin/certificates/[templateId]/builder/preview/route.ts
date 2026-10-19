import { apiServer } from '@/lib/server-api'

type ParamsShape = { templateId: string }

interface RouteContext {
  params: ParamsShape | Promise<ParamsShape>
}

const PREVIEW_FIELDS = [
  'student_name',
  'course_title',
  'issue_date',
  'certificate_code',
  'workload_hours',
] as const

function textResponse(message: string, status: number) {
  return new Response(message, {
    status,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  })
}

export async function GET(request: Request, context: RouteContext) {
  const resolvedParams = context.params instanceof Promise ? await context.params : context.params
  const templateId = Number.parseInt(resolvedParams.templateId, 10)

  if (!Number.isFinite(templateId) || templateId <= 0) {
    return textResponse('Template inválido', 400)
  }

  const url = new URL(request.url)
  const query: Record<string, string> = {}
  for (const field of PREVIEW_FIELDS) {
    const value = url.searchParams.get(field)
    if (value) query[field] = value
  }

  // A API confere sessão e papel admin e monta o HTML (escapando todo texto).
  const result = await apiServer<{ html: string }>(
    `/certificates/templates/${templateId}/preview`,
    { query },
  )

  if (!result.ok) {
    const status = result.error.statusCode
    if (status === 401 || status === 403) return textResponse('Acesso negado', 403)
    if (status === 404) return textResponse('Template não encontrado', 404)
    if (status === 400) return textResponse('Template inválido', 400)
    return textResponse('Não foi possível gerar o preview agora', 502)
  }

  return new Response(result.data.html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  })
}
