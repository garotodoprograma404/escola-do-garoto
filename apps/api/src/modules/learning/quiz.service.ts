import { HttpException, Inject, Injectable, Logger } from '@nestjs/common'
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm'
import { DB, type Database } from '../../database/database.module.js'
import {
  quizAttempts,
  quizOptions,
  quizQuestions,
  quizSettings,
} from '../../database/schema/index.js'
import { LearningAccessService } from './learning-access.service.js'
import type { SubmitQuizInput } from './learning.schemas.js'
import type { LearningActivity } from './learning-activity.service.js'
import { ProgressService } from './progress.service.js'
import { gradeQuiz, isApproved, redactFeedback, type QuestionFeedback } from './quiz-grading.js'

const SUPPORTED_TYPES = ['multiple_choice', 'multiple_answer', 'true_false'] as const
type QuestionType = (typeof SUPPORTED_TYPES)[number]

type QuizLoadStatus =
  'ready' | 'access_denied' | 'not_configured' | 'no_valid_questions' | 'technical_error'

type QuizLoadDetail =
  | 'enrollment_missing'
  | 'lesson_missing'
  | 'lesson_course_mismatch'
  | 'settings_missing'
  | 'no_supported_questions'

type QuizAttemptView = {
  id: string
  attemptNumber: number
  scorePercentage: number
  scoredPoints: number
  totalPoints: number
  passed: boolean
  finalizedAt: Date
  answers: Array<{ questionId: number; selectedOptionIds: number[] }>
  feedback: QuestionFeedback[]
}

type QuizData = {
  lessonId: number
  approvalRequired: boolean
  passingScore: number
  allowRetake: boolean
  showAnswersAfter: boolean
  shuffleQuestions: boolean
  shuffleOptions: boolean
  timeLimitMinutes: number | null
  latestAttempt: QuizAttemptView | null
  attemptsCount: number
  questions: Array<{
    id: number
    type: QuestionType
    questionText: string
    questionImageUrl: string | null
    questionImageAlt: string | null
    explanation: string | null
    points: number
    displayOrder: number
    options: Array<{ id: number; optionText: string; displayOrder: number }>
  }>
}

export type QuizLoadResult = {
  status: QuizLoadStatus
  detail: QuizLoadDetail | null
  quiz: QuizData | null
}

export type QuizSubmitResult = {
  passed: boolean
  approvalRequired: boolean
  passingScore: number
  scorePercentage: number
  objectiveScoredPoints: number
  objectiveTotalPoints: number
  objectiveCorrectQuestions: number
  objectiveTotalQuestions: number
  questionFeedbacks: QuestionFeedback[]
}

type QuizErrorType = 'access' | 'validation' | 'configuration' | 'technical'

/** Erro de quiz com `code` estável (o front mostra a mensagem e registra o código). */
function quizError(
  status: number,
  message: string,
  code: string,
  errorType: QuizErrorType,
): HttpException {
  return new HttpException({ statusCode: status, message, code, errorType }, status)
}

function parseAnswers(value: unknown): QuizAttemptView['answers'] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    const entry = item as { questionId?: unknown; selectedOptionIds?: unknown } | null
    if (!entry || typeof entry.questionId !== 'number' || !Array.isArray(entry.selectedOptionIds)) {
      return []
    }
    return [
      {
        questionId: entry.questionId,
        selectedOptionIds: entry.selectedOptionIds.filter(
          (id): id is number => typeof id === 'number',
        ),
      },
    ]
  })
}

function parseFeedback(value: unknown): QuestionFeedback[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    const entry = item as {
      questionId?: unknown
      isCorrect?: unknown
      correctOptionIds?: unknown
      explanation?: unknown
    } | null
    if (
      !entry ||
      typeof entry.questionId !== 'number' ||
      !Array.isArray(entry.correctOptionIds) ||
      (entry.isCorrect !== null && typeof entry.isCorrect !== 'boolean')
    ) {
      return []
    }
    return [
      {
        questionId: entry.questionId,
        isCorrect: entry.isCorrect,
        correctOptionIds: entry.correctOptionIds.filter(
          (id): id is number => typeof id === 'number',
        ),
        explanation: typeof entry.explanation === 'string' ? entry.explanation : null,
      },
    ]
  })
}

/**
 * Quiz do aluno: carregar (SEM gabarito) e responder.
 *
 * O navegador do aluno nunca pode ler `is_correct` ANTES de responder (seria o gabarito de graça).
 * Por isso a coluna `is_correct` só é lida aqui, dentro da correção, e o gabarito só volta depois
 * de responder (e só se `show_answers_after` estiver ligado).
 */
@Injectable()
export class QuizService {
  private readonly logger = new Logger(QuizService.name)

  constructor(
    @Inject(DB) private readonly db: Database,
    @Inject(LearningAccessService) private readonly access: LearningAccessService,
    @Inject(ProgressService) private readonly progress: ProgressService,
  ) {}

  async loadQuiz(userId: string, courseId: number, lessonId: number): Promise<QuizLoadResult> {
    const unavailable = (
      status: Exclude<QuizLoadStatus, 'ready'>,
      detail: QuizLoadDetail | null,
    ) => {
      this.logger.warn(
        `quiz indisponível: ${status}/${detail ?? '-'} (aula ${lessonId}, curso ${courseId})`,
      )
      return { status, detail, quiz: null } satisfies QuizLoadResult
    }

    if (!(await this.access.findEnrollment(userId, courseId))) {
      return unavailable('access_denied', 'enrollment_missing')
    }
    const lesson = await this.access.findPublishedLesson(lessonId)
    if (!lesson) return unavailable('access_denied', 'lesson_missing')
    if (lesson.courseId !== courseId) return unavailable('access_denied', 'lesson_course_mismatch')

    const [settings] = await this.db
      .select({
        lessonId: quizSettings.lessonId,
        passingScore: quizSettings.passingScore,
        allowRetake: quizSettings.allowRetake,
        showAnswersAfter: quizSettings.showAnswersAfter,
        shuffleQuestions: quizSettings.shuffleQuestions,
        shuffleOptions: quizSettings.shuffleOptions,
        timeLimitMinutes: quizSettings.timeLimitMinutes,
      })
      .from(quizSettings)
      .where(eq(quizSettings.lessonId, lessonId))
    if (!settings) return unavailable('not_configured', 'settings_missing')

    const questions = await this.db
      .select({
        id: quizQuestions.id,
        type: quizQuestions.type,
        questionText: quizQuestions.questionText,
        questionImageUrl: quizQuestions.questionImageUrl,
        questionImageAlt: quizQuestions.questionImageAlt,
        points: quizQuestions.points,
        displayOrder: quizQuestions.displayOrder,
      })
      .from(quizQuestions)
      .where(
        and(
          eq(quizQuestions.lessonId, lessonId),
          inArray(quizQuestions.type, [...SUPPORTED_TYPES]),
        ),
      )
      .orderBy(asc(quizQuestions.displayOrder), asc(quizQuestions.id))
    if (questions.length === 0) return unavailable('no_valid_questions', 'no_supported_questions')

    // `is_correct` NÃO está no select: o gabarito não sai por aqui.
    const options = await this.db
      .select({
        id: quizOptions.id,
        questionId: quizOptions.questionId,
        optionText: quizOptions.optionText,
        displayOrder: quizOptions.displayOrder,
      })
      .from(quizOptions)
      .where(
        inArray(
          quizOptions.questionId,
          questions.map((question) => question.id),
        ),
      )
      .orderBy(asc(quizOptions.displayOrder), asc(quizOptions.id))

    const [latest] = await this.db
      .select({
        id: quizAttempts.id,
        attemptNumber: quizAttempts.attemptNumber,
        scorePercentage: quizAttempts.scorePercentage,
        scoredPoints: quizAttempts.scoredPoints,
        totalPoints: quizAttempts.totalPoints,
        passed: quizAttempts.passed,
        finalizedAt: quizAttempts.finalizedAt,
        answers: quizAttempts.answers,
        feedback: quizAttempts.feedback,
      })
      .from(quizAttempts)
      .where(and(eq(quizAttempts.studentId, userId), eq(quizAttempts.lessonId, lessonId)))
      .orderBy(desc(quizAttempts.attemptNumber))
      .limit(1)
    const [countRow] = await this.db
      .select({ total: sql<number>`count(*)::int` })
      .from(quizAttempts)
      .where(and(eq(quizAttempts.studentId, userId), eq(quizAttempts.lessonId, lessonId)))

    const quiz: QuizData = {
      lessonId: settings.lessonId,
      approvalRequired: settings.passingScore > 0,
      passingScore: settings.passingScore,
      allowRetake: settings.allowRetake,
      showAnswersAfter: settings.showAnswersAfter,
      shuffleQuestions: settings.shuffleQuestions,
      shuffleOptions: settings.shuffleOptions,
      timeLimitMinutes: settings.timeLimitMinutes,
      attemptsCount: countRow?.total ?? 0,
      latestAttempt: latest
        ? {
            id: latest.id,
            attemptNumber: latest.attemptNumber,
            scorePercentage: latest.scorePercentage,
            scoredPoints: latest.scoredPoints,
            totalPoints: latest.totalPoints,
            passed: latest.passed,
            finalizedAt: latest.finalizedAt,
            answers: parseAnswers(latest.answers),
            // Tentativa antiga também respeita "mostrar respostas depois".
            feedback: redactFeedback(parseFeedback(latest.feedback), settings.showAnswersAfter),
          }
        : null,
      questions: questions.map((question) => ({
        ...question,
        // A explicação faz parte do gabarito: só sai depois de responder (no feedback).
        explanation: null,
        type: question.type as QuestionType,
        options: options
          .filter((option) => option.questionId === question.id)
          .map(({ id, optionText, displayOrder }) => ({ id, optionText, displayOrder })),
      })),
    }
    return { status: 'ready', detail: null, quiz }
  }

  /**
   * Corrige o quiz. `finalize: false` corrige só as perguntas enviadas (feedback pergunta a
   * pergunta, nada é gravado); `finalize: true` exige todas respondidas, grava a tentativa e,
   * aprovado, conclui a aula (e o curso, se for a última).
   */
  async submit(
    userId: string,
    lessonId: number,
    input: SubmitQuizInput,
  ): Promise<QuizSubmitResult> {
    const { result, event, activities } = await this.db.transaction(async (tx) => {
      const lesson = await this.access.findPublishedLesson(lessonId, tx)
      if (!lesson) {
        throw quizError(404, 'Aula de quiz não encontrada', 'LESSON_NOT_FOUND', 'access')
      }
      // Finalizar trava a matrícula: duas tentativas simultâneas não repetem o número da tentativa.
      const enrollment = await this.access.findEnrollment(userId, lesson.courseId, tx, {
        lock: input.finalize,
      })
      if (!enrollment) {
        throw quizError(
          403,
          'Você não está matriculado neste curso',
          'ENROLLMENT_NOT_FOUND',
          'access',
        )
      }

      const [settings] = await tx
        .select({
          passingScore: quizSettings.passingScore,
          allowRetake: quizSettings.allowRetake,
          showAnswersAfter: quizSettings.showAnswersAfter,
        })
        .from(quizSettings)
        .where(eq(quizSettings.lessonId, lessonId))
      if (!settings) {
        throw quizError(
          422,
          'Configuração do quiz não encontrada',
          'QUIZ_SETTINGS_NOT_FOUND',
          'configuration',
        )
      }

      const [latestAttempt] = await tx
        .select({ attemptNumber: quizAttempts.attemptNumber })
        .from(quizAttempts)
        .where(and(eq(quizAttempts.studentId, userId), eq(quizAttempts.lessonId, lessonId)))
        .orderBy(desc(quizAttempts.attemptNumber))
        .limit(1)
      if (latestAttempt && !settings.allowRetake) {
        throw quizError(
          409,
          'Este quiz já foi finalizado e não permite nova tentativa',
          'RETAKE_NOT_ALLOWED',
          'validation',
        )
      }

      const requestedIds = [...new Set(input.answers.map((answer) => answer.questionId))]
      if (requestedIds.length === 0) {
        throw quizError(400, 'Nenhuma resposta foi informada', 'ANSWERS_REQUIRED', 'validation')
      }

      const questions = await tx
        .select({
          id: quizQuestions.id,
          type: quizQuestions.type,
          points: quizQuestions.points,
          explanation: quizQuestions.explanation,
        })
        .from(quizQuestions)
        .where(
          input.finalize
            ? eq(quizQuestions.lessonId, lessonId)
            : and(eq(quizQuestions.lessonId, lessonId), inArray(quizQuestions.id, requestedIds)),
        )
        .orderBy(asc(quizQuestions.displayOrder), asc(quizQuestions.id))
      if (questions.length === 0 && !input.finalize) {
        // Nenhuma das perguntas enviadas é deste quiz.
        throw quizError(
          400,
          'Respostas inválidas para este quiz',
          'INVALID_QUESTION_IDS',
          'validation',
        )
      }
      if (questions.length === 0) {
        throw quizError(
          422,
          'Este quiz não possui questões',
          'QUIZ_HAS_NO_QUESTIONS',
          'configuration',
        )
      }
      if (questions.some((question) => !SUPPORTED_TYPES.includes(question.type as QuestionType))) {
        throw quizError(
          422,
          'Este quiz possui tipos de questão não suportados',
          'QUIZ_UNSUPPORTED_QUESTION_TYPES',
          'configuration',
        )
      }

      const questionIds = new Set(questions.map((question) => question.id))
      if (requestedIds.some((id) => !questionIds.has(id))) {
        throw quizError(
          400,
          'Respostas inválidas para este quiz',
          'INVALID_QUESTION_IDS',
          'validation',
        )
      }

      const optionRows = await tx
        .select({
          id: quizOptions.id,
          questionId: quizOptions.questionId,
          isCorrect: quizOptions.isCorrect,
        })
        .from(quizOptions)
        .where(inArray(quizOptions.questionId, [...questionIds]))
      const allOptions = new Map<number, Set<number>>()
      const correctOptions = new Map<number, number[]>()
      for (const option of optionRows) {
        const all = allOptions.get(option.questionId) ?? new Set<number>()
        all.add(option.id)
        allOptions.set(option.questionId, all)
        if (option.isCorrect) {
          correctOptions.set(option.questionId, [
            ...(correctOptions.get(option.questionId) ?? []),
            option.id,
          ])
        }
      }

      const selected = new Map<number, number[]>()
      for (const answer of input.answers) {
        const allowed = allOptions.get(answer.questionId) ?? new Set<number>()
        if (answer.selectedOptionIds.some((optionId) => !allowed.has(optionId))) {
          throw quizError(
            400,
            'Resposta com alternativa inválida',
            'INVALID_OPTION_IDS',
            'validation',
          )
        }
        selected.set(
          answer.questionId,
          [...new Set(answer.selectedOptionIds)].sort((a, b) => a - b),
        )
      }

      if (
        input.finalize &&
        questions.some((question) => (selected.get(question.id)?.length ?? 0) === 0)
      ) {
        throw quizError(
          400,
          'Responda todas as perguntas antes de finalizar o quiz',
          'FINALIZE_WITH_PENDING_ANSWERS',
          'validation',
        )
      }

      const grade = gradeQuiz({
        questions,
        correctOptionIdsByQuestion: correctOptions,
        selectedOptionIdsByQuestion: selected,
      })
      const approvalRequired = settings.passingScore > 0
      const passed = isApproved({
        totalPoints: grade.totalPoints,
        scorePercentage: grade.scorePercentage,
        passingScore: settings.passingScore,
      })

      let completionEvent: Awaited<
        ReturnType<ProgressService['completeLessonInTransaction']>
      >['event']
      const activities: LearningActivity[] = []
      if (input.finalize) {
        await tx.insert(quizAttempts).values({
          lessonId,
          courseId: lesson.courseId,
          studentId: userId,
          attemptNumber: (latestAttempt?.attemptNumber ?? 0) + 1,
          scorePercentage: grade.scorePercentage,
          scoredPoints: grade.scoredPoints,
          totalPoints: grade.totalPoints,
          passed,
          answers: questions.map((question) => ({
            questionId: question.id,
            selectedOptionIds: selected.get(question.id) ?? [],
          })),
          feedback: grade.feedbacks,
        })

        if (passed) {
          const completed = await this.progress.completeLessonInTransaction(
            tx,
            userId,
            lesson,
            enrollment.id,
          )
          completionEvent = completed.event
          activities.push(
            {
              type: 'quiz_passed',
              userId,
              courseId: lesson.courseId,
              lessonId,
              perfect: grade.totalPoints > 0 && grade.scoredPoints === grade.totalPoints,
            },
            ...this.progress.lessonActivity(userId, lesson, completed),
          )
        }
      }

      // Correção "de teste" (sem finalizar) antes de a pessoa ter qualquer tentativa valendo seria
      // um oráculo de respostas (nota e acerto por pergunta) para chegar a 100% na primeira
      // tentativa real. Só devolve o resultado depois que ela já tem tentativa finalizada.
      const revealsResult = input.finalize || Boolean(latestAttempt)

      return {
        result: {
          passed: revealsResult ? passed : false,
          approvalRequired,
          passingScore: settings.passingScore,
          scorePercentage: revealsResult ? grade.scorePercentage : 0,
          objectiveScoredPoints: revealsResult ? grade.scoredPoints : 0,
          objectiveTotalPoints: grade.totalPoints,
          objectiveCorrectQuestions: revealsResult ? grade.correctQuestions : 0,
          objectiveTotalQuestions: grade.totalQuestions,
          questionFeedbacks: revealsResult
            ? redactFeedback(grade.feedbacks, settings.showAnswersAfter)
            : [],
        } satisfies QuizSubmitResult,
        event: completionEvent,
        activities,
      }
    })

    await this.progress.publish(event, activities)
    return result
  }
}
