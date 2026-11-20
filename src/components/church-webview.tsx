import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ActivityIndicator, BackHandler, Linking, Platform, StyleSheet, Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { WebView, WebViewMessageEvent } from "react-native-webview"
import type { ShouldStartLoadRequest, WebViewNavigation } from "react-native-webview/lib/WebViewTypes"

import { Button } from "@/components/ui"
import { colors } from "@/constants/theme"
import { buildSiteBridgeScript, churchSiteUrl, isChurchHost, SiteMessage } from "@/lib/church-site"
import { Session, useSession } from "@/lib/session"

const hostOf = (url: string): string | null => {
  const match = /^https?:\/\/([^/?#:]+)/i.exec(url)
  return match ? match[1] : null
}

/**
 * 로그인한 교회의 홈페이지를 그대로 보여준다 (웹의 성도 로그인 상태로).
 * 교회 사이트 밖의 주소는 기기 브라우저로 열고, 웹에서 로그아웃하면 앱도 로그인 화면으로 돌아간다.
 */
export function ChurchWebView({ session }: { session: Session }) {
  const { rememberTokens, signOut } = useSession()
  // react-native-webview 의 클래스 타입이 새 React Native 타입과 맞지 않아 any 로 둔다 (아트인포 앱과 동일)
  const webView = useRef<any>(null)
  const canGoBack = useRef(false)
  const [failed, setFailed] = useState(false)

  const { church } = session
  const uri = churchSiteUrl(church)
  const bridgeScript = useMemo(() => buildSiteBridgeScript(session.church, session.tokens), [session])

  // Android 뒤로 가기 — 웹 페이지를 먼저 뒤로 보낸다
  useEffect(() => {
    if (Platform.OS !== "android") return
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!canGoBack.current) return false
      webView.current?.goBack()
      return true
    })
    return () => subscription.remove()
  }, [])

  const onMessage = useCallback(
    (event: WebViewMessageEvent) => {
      // 교회 사이트가 보낸 것만 믿는다
      const host = hostOf(event.nativeEvent.url)
      if (!host || !isChurchHost(church, host)) return
      let message: SiteMessage
      try {
        message = JSON.parse(event.nativeEvent.data)
      } catch {
        return
      }
      if (message.type === "signed-out") signOut()
      else if (message.type === "tokens") rememberTokens(message.tokens)
    },
    [church, rememberTokens, signOut],
  )

  const onShouldStartLoad = useCallback(
    (request: ShouldStartLoadRequest) => {
      // 영상 임베드 같은 프레임 안의 이동은 그대로 둔다
      if (request.isTopFrame === false) return true
      const host = hostOf(request.url)
      if (host && isChurchHost(church, host)) return true
      if (/^(about:|blob:|data:)/i.test(request.url)) return true
      // 교회 사이트 밖(유튜브·지도·전화 등)은 기기의 앱/브라우저로
      Linking.openURL(request.url).catch(() => {})
      return false
    },
    [church],
  )

  if (failed) {
    return (
      <SafeAreaView style={styles.failed}>
        <Text style={styles.failedTitle}>{church.name} 페이지를 열지 못했습니다</Text>
        <Text style={styles.failedText}>인터넷 연결을 확인한 뒤 다시 시도해주세요.</Text>
        <Button title="다시 시도" onPress={() => setFailed(false)} style={styles.failedButton} />
        <Button title="로그아웃" variant="secondary" onPress={signOut} />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <WebView
        ref={webView}
        source={{ uri }}
        originWhitelist={["*"]}
        injectedJavaScriptBeforeContentLoaded={bridgeScript}
        onMessage={onMessage}
        onShouldStartLoadWithRequest={onShouldStartLoad}
        onNavigationStateChange={(state: WebViewNavigation): void => {
          canGoBack.current = state.canGoBack
        }}
        onError={() => setFailed(true)}
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        domStorageEnabled
        allowsBackForwardNavigationGestures
        allowsInlineMediaPlayback
        allowsFullscreenVideo
        pullToRefreshEnabled
        setSupportMultipleWindows={false}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.primary} />
          </View>
        )}
        style={styles.webView}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  webView: { flex: 1, backgroundColor: colors.surface },
  loading: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  failed: { flex: 1, justifyContent: "center", paddingHorizontal: 28, gap: 10, backgroundColor: colors.surface },
  failedTitle: { fontSize: 20, fontWeight: "700", color: colors.ink },
  failedText: { fontSize: 15, lineHeight: 22, color: colors.ink2 },
  failedButton: { marginTop: 16 },
})
