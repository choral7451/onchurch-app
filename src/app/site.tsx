import { Stack, useLocalSearchParams } from "expo-router"
import React from "react"

import { ChurchWebView } from "@/components/church-webview"
import { useSession } from "@/lib/session"

/** 교회 홈페이지의 한 화면 (대시보드 버튼·알림에서 연다) */
export default function SiteScreen() {
  const { session } = useSession()
  const { path, title } = useLocalSearchParams<{ path?: string; title?: string }>()
  if (!session) return null
  return (
    <>
      <Stack.Screen options={{ title: title || session.church.name }} />
      {/* 다른 계정으로 다시 로그인하면 웹뷰를 새로 만든다 */}
      <ChurchWebView key={session.tokens?.refreshToken ?? `guest-${session.church.slug}`} session={session} path={path} />
    </>
  )
}
