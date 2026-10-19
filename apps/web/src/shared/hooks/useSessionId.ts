'use client'

import { useEffect, useState } from 'react'

const SESSION_KEY = 'blog_session_id'
const SESSION_DURATION = 24 * 60 * 60 * 1000 // 24 hours

function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
}

function getStoredSession(): { id: string; timestamp: number } | null {
  if (typeof window === 'undefined') return null

  try {
    const stored = localStorage.getItem(SESSION_KEY)
    if (!stored) return null

    const session = JSON.parse(stored)
    const now = Date.now()

    // Check if session expired (24h)
    if (now - session.timestamp > SESSION_DURATION) {
      localStorage.removeItem(SESSION_KEY)
      return null
    }

    return session
  } catch {
    return null
  }
}

function storeSession(id: string) {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        id,
        timestamp: Date.now(),
      }),
    )
  } catch (error) {
    console.error('Error storing session:', error)
  }
}

export function useSessionId() {
  const [sessionId, setSessionId] = useState<string>('')

  useEffect(() => {
    const existing = getStoredSession()

    if (existing) {
      setSessionId(existing.id)
    } else {
      const newId = generateSessionId()
      storeSession(newId)
      setSessionId(newId)
    }
  }, [])

  return sessionId
}
