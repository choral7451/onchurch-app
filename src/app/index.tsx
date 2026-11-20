import React from "react"

import { ChurchWebView } from "@/components/church-webview"
import { useSession } from "@/lib/session"

/** 교회 화면 (로그인했거나 둘러보는 중) — 교회를 고르기 전에는 _layout 의 가드가 로그인 화면으로 보낸다 */
export default function ChurchHome() {
  const { session } = useSession()
  if (!session) return null
  // 다른 계정으로 다시 로그인하면 웹뷰를 새로 만든다
  return <ChurchWebView key={session.tokens?.refreshToken ?? `guest-${session.church.slug}`} session={session} />
}
