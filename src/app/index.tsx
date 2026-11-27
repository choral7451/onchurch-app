import { router } from "expo-router"
import React, { useEffect } from "react"
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import { ChurchLogo } from "@/components/church-logo"
import { colors, radius } from "@/constants/theme"
import { DASHBOARD_ITEMS, DashboardItem } from "@/lib/dashboard-menu"
import { subscribePushPath, syncPushToken, takePendingPushPath } from "@/lib/push"
import { useSession } from "@/lib/session"

const openSite = (path: string, title: string) => router.push({ pathname: "/site", params: { path, title } })

/** 첫 화면 — 교회 이름과 자주 쓰는 기능 바로가기. 각 버튼은 교회 홈페이지의 해당 화면(웹뷰)이나 앱 기능을 연다. */
export default function Dashboard() {
  const { session, signOut } = useSession()
  const accessToken = session?.tokens?.accessToken ?? null

  // 알림을 탭함 — 앱이 알림으로 켜졌으면 바로, 켜져 있었으면 그때 그 화면을 연다
  useEffect(() => {
    const pending = takePendingPushPath()
    if (pending) openSite(pending, "")
    return subscribePushPath(path => openSite(path, ""))
  }, [])

  // 로그인했으면 이 기기를 알림 대상으로 등록 (처음 한 번 권한을 묻는다). 토큰이 만료됐으면 웹뷰를 열 때 다시 등록된다.
  useEffect(() => {
    if (accessToken) void syncPushToken(accessToken)
  }, [accessToken])

  if (!session) return null
  const { church } = session
  const guest = !session.tokens

  const onPress = (item: DashboardItem) => {
    if (item.path) openSite(item.path, item.key === "homepage" ? church.name : item.label)
    else router.push({ pathname: "/soon", params: { title: item.label } })
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <ChurchLogo name={church.name} logoUrl={church.logoUrl} size={44} />
          <Text style={styles.churchName} numberOfLines={1}>
            {church.name}
          </Text>
          {guest && (
            <Pressable accessibilityRole="button" hitSlop={10} onPress={signOut}>
              <Text style={styles.login}>로그인</Text>
            </Pressable>
          )}
        </View>
        <Text style={styles.greeting}>오늘도 말씀과 함께하는 하루 되세요</Text>

        <View style={styles.card}>
          {DASHBOARD_ITEMS.map(item => (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              onPress={() => onPress(item)}
              style={({ pressed }) => [styles.cell, pressed && styles.cellPressed]}
            >
              <View style={[styles.iconWrap, { backgroundColor: item.tint }]}>
                <Text style={styles.icon}>{item.emoji}</Text>
              </View>
              <Text style={styles.label} numberOfLines={1}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32 },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  churchName: { flex: 1, fontSize: 20, fontWeight: "700", color: colors.ink },
  login: { fontSize: 15, fontWeight: "600", color: colors.accent },
  greeting: { marginTop: 18, marginBottom: 16, fontSize: 15, color: colors.ink2 },
  card: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: radius.lg + 4,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  cell: { width: "33.333%", alignItems: "center", paddingVertical: 18, borderRadius: radius.md },
  cellPressed: { backgroundColor: colors.bg },
  iconWrap: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  icon: { fontSize: 34 },
  label: { marginTop: 10, fontSize: 15, fontWeight: "600", color: colors.ink },
})
