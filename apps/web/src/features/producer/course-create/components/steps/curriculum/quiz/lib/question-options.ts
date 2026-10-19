import { isUploadedFilePath } from '../../../../../lib/video-url'
import { MAX_OPTIONS, MIN_OPTIONS } from '../constants'
import type { QuestionFormData, QuestionFormErrors, QuestionType, QuizOption } from '../types'

export const OBJECTIVE_QUESTION_TYPES: QuestionType[] = [
  'multiple_choice',
  'multiple_answer',
  'true_false',
]

export function newOption(order: number): QuizOption {
  return { id: `opt-${crypto.randomUUID()}`, option_text: '', is_correct: false, order }
}

/** Duas alternativas vazias: ponto de partida de uma questão nova. */
export function createDefaultOptions(): QuizOption[] {
  return [newOption(0), newOption(1)]
}

export function areOptionsEqual(a: QuizOption[], b: QuizOption[]): boolean {
  if (a.length !== b.length) return false

  return a.every((optionA, index) => {
    const optionB = b[index]
    return (
      optionA.id === optionB.id &&
      optionA.option_text === optionB.option_text &&
      optionA.is_correct === optionB.is_correct &&
      optionA.order === optionB.order
    )
  })
}

/** Qual lado (verdadeiro ou falso) está marcado como correto, mesmo em dados antigos sem texto padrão. */
function getTrueFalseOptionState(options: QuizOption[]): {
  trueIsCorrect: boolean
  falseIsCorrect: boolean
} {
  const byText = options.reduce<Record<string, QuizOption>>((acc, option) => {
    acc[option.option_text.trim().toLowerCase()] = option
    return acc
  }, {})

  const explicitTrue = (byText['verdadeiro'] || byText.true)?.is_correct ?? false
  const explicitFalse = (byText.falso || byText.false)?.is_correct ?? false

  if (explicitTrue || explicitFalse) {
    return { trueIsCorrect: explicitTrue, falseIsCorrect: explicitFalse && !explicitTrue }
  }

  const selected = options.filter((option) => option.is_correct)
  if (selected.length === 1) {
    const selectedIndex = options.findIndex((option) => option.id === selected[0].id)
    return { trueIsCorrect: selectedIndex === 0, falseIsCorrect: selectedIndex === 1 }
  }

  return { trueIsCorrect: false, falseIsCorrect: false }
}

/** Verdadeiro/Falso sempre tem exatamente duas alternativas, com esses textos, nessa ordem. */
export function normalizeTrueFalseOptions(options: QuizOption[]): QuizOption[] {
  const { trueIsCorrect, falseIsCorrect } = getTrueFalseOptionState(options)
  const trueOption = options.find((option) =>
    ['verdadeiro', 'true'].includes(option.option_text.trim().toLowerCase()),
  )
  const falseOption = options.find((option) =>
    ['falso', 'false'].includes(option.option_text.trim().toLowerCase()),
  )

  return [
    {
      id: trueOption?.id || options[0]?.id || `opt-${crypto.randomUUID()}`,
      option_text: 'Verdadeiro',
      is_correct: trueIsCorrect,
      order: 0,
    },
    {
      id: falseOption?.id || options[1]?.id || `opt-${crypto.randomUUID()}`,
      option_text: 'Falso',
      is_correct: falseIsCorrect,
      order: 1,
    },
  ]
}

/** Completa com alternativas vazias até o mínimo e renumera a ordem. */
export function ensureMinimumOptions(options: QuizOption[]): QuizOption[] {
  const completed = [...options]
  while (completed.length < MIN_OPTIONS) {
    completed.push(newOption(completed.length))
  }
  return completed.map((option, index) => ({ ...option, order: index }))
}

/** Marca/desmarca a alternativa; nos tipos de resposta única, marcar uma desmarca as outras. */
export function toggleCorrectOption(
  type: QuestionType,
  options: QuizOption[],
  id: string,
): QuizOption[] {
  if (!options.some((option) => option.id === id)) return options

  if (type === 'multiple_choice' || type === 'true_false') {
    return options.map((option) => ({
      ...option,
      is_correct: option.id === id ? !option.is_correct : false,
    }))
  }

  return options.map((option) =>
    option.id === id ? { ...option, is_correct: !option.is_correct } : option,
  )
}

export function canAddOption(type: QuestionType, options: QuizOption[]): boolean {
  return type !== 'true_false' && options.length < MAX_OPTIONS
}

export function canRemoveOption(type: QuestionType, options: QuizOption[]): boolean {
  return type !== 'true_false' && options.length > MIN_OPTIONS
}

/** Regras do formulário de questão. Vazio = pode salvar. */
export function validateQuestion(formData: QuestionFormData): QuestionFormErrors {
  const errors: QuestionFormErrors = {}

  if (!formData.question_text.trim()) {
    errors.question_text = 'Pergunta é obrigatória'
  }

  const imageUrl = formData.question_image_url.trim()
  // Arquivo enviado pelo próprio assistente (`/api/files/public/...`) também vale.
  if (imageUrl && !isUploadedFilePath(imageUrl)) {
    try {
      if (new URL(imageUrl).protocol !== 'https:') {
        errors.question_image_url = 'Use uma URL segura iniciando com https://'
      }
    } catch {
      errors.question_image_url = 'URL da imagem inválida'
    }
  }

  if (formData.question_image_alt.trim().length > 180) {
    errors.question_image_alt = 'Texto alternativo deve ter no máximo 180 caracteres'
  }

  if (formData.points < 1) {
    errors.points = 'Pontuação deve ser maior que 0'
  }

  if (OBJECTIVE_QUESTION_TYPES.includes(formData.type)) {
    const filled = formData.options.filter((option) => option.option_text.trim())
    if (filled.length < MIN_OPTIONS) {
      errors.options = `Mínimo ${MIN_OPTIONS} opções preenchidas`
    }

    const correct = formData.options.filter((option) => option.is_correct)
    if (correct.length === 0) {
      errors.options = 'Marque pelo menos uma resposta correta'
    }

    if (formData.type === 'multiple_choice' && correct.length > 1) {
      errors.options = 'Múltipla escolha permite apenas uma resposta correta'
    }
  }

  return errors
}
