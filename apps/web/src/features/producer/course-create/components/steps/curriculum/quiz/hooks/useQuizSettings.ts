import { useCallback, useEffect, useState } from 'react'
import type { QuizSettings } from '../types'
import { DEFAULT_QUIZ_SETTINGS } from '../constants'

function resolveSettings(initialSettings?: QuizSettings): QuizSettings {
  return {
    ...DEFAULT_QUIZ_SETTINGS,
    ...(initialSettings || {}),
  }
}

function areSettingsEqual(a: QuizSettings, b: QuizSettings): boolean {
  return (
    a.passing_score === b.passing_score &&
    a.time_limit_minutes === b.time_limit_minutes &&
    a.allow_retake === b.allow_retake &&
    a.show_answers_after === b.show_answers_after &&
    a.shuffle_questions === b.shuffle_questions &&
    a.shuffle_options === b.shuffle_options
  )
}

export function useQuizSettings(initialSettings?: QuizSettings) {
  const [settings, setSettings] = useState<QuizSettings>(() => resolveSettings(initialSettings))

  useEffect(() => {
    const resolvedSettings = resolveSettings(initialSettings)
    setSettings((prev) => (areSettingsEqual(prev, resolvedSettings) ? prev : resolvedSettings))
  }, [initialSettings])

  const updateSettings = useCallback((updates: Partial<QuizSettings>): void => {
    setSettings((prev) => ({ ...prev, ...updates }))
  }, [])

  const resetSettings = useCallback((): void => {
    setSettings(DEFAULT_QUIZ_SETTINGS)
  }, [])

  return {
    settings,
    updateSettings,
    resetSettings,
  }
}
