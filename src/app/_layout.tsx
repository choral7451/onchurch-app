import { Stack } from "expo-router"
import * as SplashScreen from "expo-splash-screen"
import { StatusBar } from "expo-status-bar"
import React, { useEffect } from "react"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { SafeAreaProvider } from "react-native-safe-area-context"

import { UpdateGate } from "@/components/update-gate"
import { colors } from "@/constants/theme"
import { SessionProvider, useSession } from "@/lib/session"
import { usePushNotifications } from "@/lib/use-push-notifications"

SplashScreen.preventAutoHideAsync()

/**
 * 첫 화면은 로그인. 로그인하면 그 계정의 교회 화면(index)만 남고, 로그아웃하면 다시 로그인 화면만 남는다.
 * 저장된 세션을 읽을 때까지는 스플래시를 유지한다.
 */
function Screens() {
  const { isReady, session } = useSession()
  usePushNotifications()

  useEffect(() => {
    if (isReady) SplashScreen.hideAsync()
  }, [isReady])

  if (!isReady) return null

  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.ink,
        headerBackButtonDisplayMode: "minimal",
        headerShadowVisible: false,
        // iOS 26 기본 헤더는 반투명이라 내용이 헤더 밑으로 들어간다 — 불투명 헤더로 고정 (아트인포 앱과 동일)
        headerStyle: { backgroundColor: colors.surface },
        headerTransparent: false,
        contentStyle: { backgroundColor: colors.surface },
      }}
    >
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        {/* 남색 머리 부분 위라서 상태바 글자를 밝게 */}
        <Stack.Screen name="login" options={{ headerShown: false, statusBarStyle: "light" }} />
        <Stack.Screen name="reset-password" options={{ title: "비밀번호 찾기" }} />
        <Stack.Screen name="signup/index" options={{ title: "교회 찾기" }} />
        <Stack.Screen name="signup/form" options={{ title: "회원가입" }} />
      </Stack.Protected>
    </Stack>
  )
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SessionProvider>
          <UpdateGate />
          <StatusBar style="dark" />
          <Screens />
        </SessionProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
