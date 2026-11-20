import Constants from "expo-constants"
import React, { useCallback, useEffect, useRef, useState } from "react"
import { Alert, AppState, Linking, Modal, Platform, StyleSheet, Text, View } from "react-native"

import { Button } from "@/components/ui"
import { colors } from "@/constants/theme"
import { api, AppVersionCheck } from "@/lib/api"

/** 앱이 다시 활성화될 때 재확인하는 최소 간격 — 매번 치지 않도록 */
const RECHECK_INTERVAL_MS = 10 * 60 * 1000

const DEFAULT_MESSAGE = "안정적인 이용을 위해 최신 버전으로 업데이트해 주세요."

/** app.json 의 version — 스토어 빌드와 같은 값 */
const currentAppVersion = (): string | null => Constants.expoConfig?.version ?? null

/**
 * 최소 버전 게이트 (아트인포 앱 UpdateGate 와 같은 동작) — 기동 시와 포그라운드 복귀 시 서버(/onchurch/app/version)에
 * 현재 버전을 보내 최소 버전보다 낮으면 닫을 수 없는 업데이트 화면을 띄운다. 값은 마스터 페이지 "앱 버전"에서 관리한다.
 * 최신 버전보다만 낮으면 세션당 한 번 선택 안내. 서버 오류·오프라인이면 아무것도 하지 않는다(열어 둔다).
 */
export function UpdateGate() {
  const [required, setRequired] = useState<AppVersionCheck | null>(null)
  const lastCheckedAt = useRef(0)
  const softPrompted = useRef(false)

  const check = useCallback(async () => {
    const version = currentAppVersion()
    if (!version || Platform.OS === "web") return
    lastCheckedAt.current = Date.now()
    try {
      const result = await api.checkAppVersion(Platform.OS === "ios" ? "ios" : "android", version)
      if (result.updateRequired) {
        setRequired(result)
        return
      }
      setRequired(null)
      const storeUrl = result.storeUrl
      if (result.updateAvailable && storeUrl && !softPrompted.current) {
        softPrompted.current = true
        Alert.alert("새 버전이 있어요", result.message ?? `온교회 ${result.latestVersion} 버전을 받을 수 있어요.`, [
          { text: "나중에", style: "cancel" },
          { text: "업데이트", onPress: () => Linking.openURL(storeUrl) },
        ])
      }
    } catch {
      // 네트워크·서버 문제로는 앱을 막지 않는다
    }
  }, [])

  useEffect(() => {
    // 렌더 직후 동기 setState 를 피하려고 한 틱 뒤에 확인한다
    const initial = setTimeout(check, 0)
    const subscription = AppState.addEventListener("change", state => {
      if (state === "active" && Date.now() - lastCheckedAt.current > RECHECK_INTERVAL_MS) check()
    })
    return () => {
      clearTimeout(initial)
      subscription.remove()
    }
  }, [check])

  if (!required) return null
  const storeUrl = required.storeUrl
  const storeName = Platform.OS === "ios" ? "App Store" : "Google Play"

  return (
    <Modal visible transparent={false} animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={() => undefined}>
      <View style={styles.container}>
        <Text style={styles.title}>업데이트가 필요해요</Text>
        <Text style={styles.message}>{required.message ?? DEFAULT_MESSAGE}</Text>
        <Text style={styles.versions}>
          지금 버전 {currentAppVersion()}, 필요한 버전 {required.minVersion} 이상
        </Text>
        {storeUrl ? (
          <Button title={`${storeName}에서 업데이트`} style={styles.button} onPress={() => Linking.openURL(storeUrl)} />
        ) : (
          <Text style={styles.message}>{storeName}에서 온교회를 찾아 업데이트해 주세요.</Text>
        )}
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface, justifyContent: "center", paddingHorizontal: 28, gap: 12 },
  title: { fontSize: 26, fontWeight: "800", color: colors.ink },
  message: { fontSize: 16, lineHeight: 24, color: colors.ink2 },
  versions: { fontSize: 13, color: colors.muted },
  button: { marginTop: 20 },
})
