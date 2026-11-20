import * as SecureStore from "expo-secure-store"
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"

import type { AuthTokens, Church } from "@/lib/api"

/**
 * 로그인 세션 = 들어갈 교회 + 토큰.
 * 교회 화면은 웹뷰(교회 홈페이지)라서 로그인 상태의 주인은 웹뷰의 쿠키다. 앱은 토큰을 웹뷰에 심어 주고,
 * 웹이 토큰을 갱신하면 그 값을 다시 받아 보관한다(church-webview.tsx) — 쿠키가 지워져도 다시 심을 수 있도록.
 */
export type Session = { church: Church; tokens: AuthTokens }

const STORAGE_KEY = "onchurch.session"

type SessionContextValue = {
  /** 저장된 세션을 읽기 전에는 false */
  isReady: boolean
  session: Session | null
  signIn: (session: Session) => Promise<void>
  /** 웹뷰가 갱신한 토큰 보관 — 화면은 다시 그리지 않는다 */
  rememberTokens: (tokens: AuthTokens) => void
  signOut: () => Promise<void>
}

const SessionContext = createContext<SessionContextValue | null>(null)

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false)
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    let cancelled = false
    SecureStore.getItemAsync(STORAGE_KEY)
      .then(raw => (raw ? (JSON.parse(raw) as Session) : null))
      .catch(() => null)
      .then(saved => {
        if (cancelled) return
        setSession(saved)
        setIsReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const signIn = useCallback(async (next: Session) => {
    await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(next))
    setSession(next)
  }, [])

  const rememberTokens = useCallback(
    (tokens: AuthTokens) => {
      if (!session || tokens.refreshToken === session.tokens.refreshToken) return
      // state 는 그대로 둔다 — 바꾸면 웹뷰가 새 토큰으로 다시 만들어진다
      SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify({ church: session.church, tokens })).catch(() => {})
    },
    [session],
  )

  const signOut = useCallback(async () => {
    await SecureStore.deleteItemAsync(STORAGE_KEY).catch(() => {})
    setSession(null)
  }, [])

  const value = useMemo(() => ({ isReady, session, signIn, rememberTokens, signOut }), [isReady, session, signIn, rememberTokens, signOut])
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext)
  if (!value) throw new Error("SessionProvider 안에서만 쓸 수 있습니다")
  return value
}
