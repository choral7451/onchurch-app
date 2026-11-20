import { Image } from "expo-image"
import React from "react"
import { StyleSheet, Text, View } from "react-native"

import { colors } from "@/constants/theme"

/** 교회 로고 — 로고가 없으면 교회 이름 첫 글자 */
export function ChurchLogo({ name, logoUrl, size = 52 }: { name: string; logoUrl: string | null; size?: number }) {
  const box = { width: size, height: size, borderRadius: size * 0.24 }
  if (logoUrl) {
    return <Image source={{ uri: logoUrl }} style={[styles.image, box]} contentFit="contain" accessibilityIgnoresInvertColors />
  }
  return (
    <View style={[styles.fallback, box]}>
      <Text style={[styles.initial, { fontSize: size * 0.42 }]}>{name.trim().charAt(0)}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  image: { backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  fallback: { backgroundColor: "#E4ECF5", alignItems: "center", justifyContent: "center" },
  initial: { fontWeight: "700", color: colors.primary },
})
