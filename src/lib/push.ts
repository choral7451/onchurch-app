import Constants from "expo-constants"
import * as Device from "expo-device"
import * as Notifications from "expo-notifications"
import { AndroidImportance } from "expo-notifications"
import { Platform } from "react-native"

import { api } from "@/lib/api"

/**
 * 온교회 앱 푸시 (아트인포 앱 src/lib/push.ts 와 같은 구성).
 * - registered: 토큰이 서버에 등록됨
 * - denied: 기기 설정에서 알림이 꺼져 있음 → 마이페이지에서 설정 앱으로 안내
 * - unavailable: 시뮬레이터 등 토큰을 받을 수 없는 환경
 * - error: 등록 요청 실패 (네트워크 등)
 * - idle: 아직 시도 전
 * 누구에게 보낼지(새 글·댓글, 알림 끔)는 서버가 정한다. 앱은 기기 토큰만 등록한다.
 */
export type PushStatus = "idle" | "registered" | "denied" | "unavailable" | "error"

let status: PushStatus = "idle"
/** 마지막으로 서버에 등록한 이 기기의 토큰과 그때의 계정 토큰 — 같으면 다시 보내지 않는다 */
let registered: { pushToken: string; accessToken: string } | null = null

export const getPushStatus = () => status

const fetchExpoPushToken = async (askPermission: boolean): Promise<{ token: string | null; denied: boolean }> => {
  if (!Device.isDevice) return { token: null, denied: false }
  // Android 13+ 는 알림 채널이 있어야 권한 팝업이 뜬다 — 서버가 channelId 없이 보내므로 Expo 기본값 'default' 와 맞춘다
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", { name: "교회 소식", importance: AndroidImportance.DEFAULT })
  }
  const existing = await Notifications.getPermissionsAsync()
  let granted = existing.granted
  if (!granted && askPermission && existing.canAskAgain) granted = (await Notifications.requestPermissionsAsync()).granted
  if (!granted) return { token: null, denied: true }
  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined
  const { data } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)
  return { token: data, denied: false }
}

/**
 * 권한을 묻고(처음 한 번) 이 기기 토큰을 서버에 등록한다 — 웹뷰가 로그인 토큰을 알려 줄 때, 앱이 다시 활성화될 때 호출.
 * askPermission=false 면 권한 팝업 없이 현재 상태만 확인한다.
 */
export const syncPushToken = async (accessToken: string, askPermission = true): Promise<PushStatus> => {
  try {
    const { token, denied } = await fetchExpoPushToken(askPermission)
    if (denied) return (status = "denied")
    if (!token) return (status = "unavailable")
    if (registered?.pushToken !== token || registered.accessToken !== accessToken) {
      await api.registerPushToken(token, Platform.OS === "android" ? "android" : "ios", accessToken)
      registered = { pushToken: token, accessToken }
    }
    return (status = "registered")
  } catch {
    return (status = "error")
  }
}

/** 로그아웃 직전에 호출 — 이 기기 토큰만 서버에서 지운다 (실패해도 무시) */
export const unregisterCurrentPushToken = async (): Promise<void> => {
  const token = registered?.pushToken
  registered = null
  status = "idle"
  if (token) await api.unregisterPushToken(token).catch(() => {})
}

/** 알림창의 온교회 알림을 지우고 아이콘 배지를 0 으로 — 실패해도 조용히 */
export const clearDeliveredNotifications = async (): Promise<void> => {
  try {
    await Notifications.dismissAllNotificationsAsync()
    await Notifications.setBadgeCountAsync(0)
  } catch {
    // 알림 권한이 없거나 지원하지 않는 환경
  }
}

// ── 알림을 탭했을 때 열 교회 홈페이지 경로 ─────────────────────────
// 서버가 data.path 에 교회 홈페이지 안의 경로(/notices, /community?post=7 …)를 넣는다. 웹뷰가 받아 그 화면을 연다.

let pendingPath: string | null = null
const pathListeners = new Set<(path: string) => void>()

/** 같은 사이트 안의 경로만 받는다 — "//다른사이트" 나 전체 주소는 버린다 */
const toSitePath = (value: unknown): string | null =>
  typeof value === "string" && value.startsWith("/") && !value.startsWith("//") ? value : null

export const openPushPath = (data: Record<string, unknown> | undefined) => {
  const path = toSitePath(data?.path)
  if (!path) return
  if (pathListeners.size === 0) {
    // 웹뷰가 아직 없다(앱이 알림으로 켜짐) — 웹뷰가 만들어질 때 첫 주소로 쓴다
    pendingPath = path
    return
  }
  pathListeners.forEach(listener => listener(path))
}

/** 웹뷰가 처음 열 경로 — 알림으로 앱이 켜졌으면 그 경로, 아니면 null (한 번 꺼내면 비워진다) */
export const takePendingPushPath = (): string | null => {
  const path = pendingPath
  pendingPath = null
  return path
}

export const subscribePushPath = (listener: (path: string) => void) => {
  pathListeners.add(listener)
  return () => {
    pathListeners.delete(listener)
  }
}
