import * as Notifications from "expo-notifications"
import { useEffect } from "react"
import { AppState } from "react-native"

import { clearDeliveredNotifications, openPushPath } from "@/lib/push"

// 앱이 켜져 있을 때도 배너로 보여준다
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
})

/**
 * 알림을 탭하면 교회 홈페이지의 해당 화면을 연다(웹뷰가 openPushPath 를 받는다).
 * 앱이 활성화되면 알림창·배지를 비운다. 토큰 등록은 웹뷰가 로그인 토큰을 알려 줄 때 한다(church-webview.tsx).
 */
export const usePushNotifications = () => {
  useEffect(() => {
    void clearDeliveredNotifications()
    const appState = AppState.addEventListener("change", state => {
      if (state === "active") void clearDeliveredNotifications()
    })
    // 종료 상태에서 알림으로 켜진 경우 — 처리한 뒤 비워, 다음에 앱을 켤 때 같은 화면으로 다시 가지 않게 한다
    const last = Notifications.getLastNotificationResponse()
    if (last) {
      openPushPath(last.notification.request.content.data as Record<string, unknown>)
      Notifications.clearLastNotificationResponse()
    }
    const responses = Notifications.addNotificationResponseReceivedListener(response => {
      openPushPath(response.notification.request.content.data as Record<string, unknown>)
      Notifications.clearLastNotificationResponse()
    })
    return () => {
      appState.remove()
      responses.remove()
    }
  }, [])
}
