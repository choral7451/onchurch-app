import { Stack, useLocalSearchParams } from "expo-router"
import React from "react"
import { StyleSheet, Text, View } from "react-native"

import { colors } from "@/constants/theme"

/** 아직 준비 중인 대시보드 기능 */
export default function SoonScreen() {
  const { title } = useLocalSearchParams<{ title?: string }>()
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: title || "준비 중" }} />
      <Text style={styles.title}>{title} 기능을 준비하고 있어요</Text>
      <Text style={styles.text}>곧 앱에서 바로 쓸 수 있게 열어 드릴게요.</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28, gap: 8, backgroundColor: colors.surface },
  title: { fontSize: 18, fontWeight: "700", color: colors.ink, textAlign: "center" },
  text: { fontSize: 15, color: colors.ink2, textAlign: "center" },
})
