import { useLocalSearchParams } from "expo-router"
import React, { useState } from "react"
import { Linking, Pressable, StyleSheet, Text, View } from "react-native"
import { KeyboardAwareScrollView } from "react-native-keyboard-controller"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { ChurchLogo } from "@/components/church-logo"
import { PhoneVerify } from "@/components/phone-verify"
import { Button, ErrorNotice, Field } from "@/components/ui"
import { PRIVACY_URL, TERMS_URL } from "@/constants/config"
import { colors, radius } from "@/constants/theme"
import { api, ApiError, Church } from "@/lib/api"
import { useSession } from "@/lib/session"

/** 회원가입 2단계 — 고른 교회의 성도로 가입한다 */
export default function SignupFormScreen() {
  const insets = useSafeAreaInsets()
  const { signIn } = useSession()
  const params = useLocalSearchParams<{ slug: string; name: string; logoUrl?: string; customDomain?: string }>()
  const church: Church = { slug: params.slug, name: params.name, logoUrl: params.logoUrl || null, customDomain: params.customDomain || null }

  const [name, setName] = useState("")
  const [userId, setUserId] = useState("")
  const [password, setPassword] = useState("")
  const [passwordConfirm, setPasswordConfirm] = useState("")
  const [phone, setPhone] = useState<string | null>(null)
  const [agreed, setAgreed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const passwordMismatch = passwordConfirm.length > 0 && password !== passwordConfirm

  const canSubmit =
    name.trim().length > 0 && userId.trim().length >= 4 && password.length >= 8 && password === passwordConfirm && !!phone && agreed

  const submit = async () => {
    if (!canSubmit || !phone || submitting) return
    setSubmitting(true)
    setErrorMessage("")
    try {
      const tokens = await api.signup({ userId: userId.trim(), password, name: name.trim(), phone, churchSlug: church.slug })
      // 성공하면 _layout 의 가드가 교회 화면으로 바꾼다
      await signIn({ church, tokens })
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "가입하지 못했습니다. 잠시 후 다시 시도해주세요.")
      setSubmitting(false)
    }
  }

  return (
    // 입력칸에 들어가면 그 칸이 키보드 위로 올라오도록 스크롤한다 (Android 는 edge-to-edge 라 창 크기가 줄지 않는다)
    <KeyboardAwareScrollView
      style={styles.screen}
      contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 28 }]}
      keyboardShouldPersistTaps="handled"
      bottomOffset={24}
    >
        <View style={styles.church}>
          <ChurchLogo name={church.name} logoUrl={church.logoUrl} size={44} />
          <View style={styles.churchBody}>
            <Text style={styles.churchName} numberOfLines={1}>
              {church.name}
            </Text>
            <Text style={styles.churchNote}>이 교회의 성도로 가입합니다</Text>
          </View>
        </View>

        <Field label="이름" value={name} onChangeText={setName} placeholder="홍길동" autoComplete="name" textContentType="name" autoCapitalize="words" />
        <Field label="아이디" value={userId} onChangeText={setUserId} placeholder="영문, 숫자 4자 이상" autoComplete="username-new" textContentType="username" />
        <Field label="비밀번호" value={password} onChangeText={setPassword} placeholder="8자 이상" secureTextEntry autoComplete="new-password" textContentType="newPassword" />
        <Field
          label="비밀번호 확인"
          value={passwordConfirm}
          onChangeText={setPasswordConfirm}
          placeholder="비밀번호를 한 번 더 입력"
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          error={passwordMismatch ? "비밀번호가 서로 다릅니다." : undefined}
        />

        <PhoneVerify onVerified={setPhone} />

        <View style={styles.agree}>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: agreed }}
            accessibilityLabel="이용약관과 개인정보 처리방침에 동의"
            hitSlop={10}
            onPress={() => setAgreed(v => !v)}
            style={[styles.checkbox, agreed && styles.checkboxChecked]}
          >
            {agreed && <Text style={styles.checkmark}>✓</Text>}
          </Pressable>
          <Text style={styles.agreeText}>
            <Text style={styles.link} accessibilityRole="link" onPress={() => Linking.openURL(TERMS_URL)}>
              이용약관
            </Text>
            과{" "}
            <Text style={styles.link} accessibilityRole="link" onPress={() => Linking.openURL(PRIVACY_URL)}>
              개인정보 처리방침
            </Text>
            에 동의합니다. 입력한 정보는 {church.name}에 제공됩니다.
          </Text>
        </View>

        <ErrorNotice message={errorMessage} />
        <Button title="가입하고 시작하기" onPress={submit} disabled={!canSubmit} loading={submitting} />
    </KeyboardAwareScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  scroll: { paddingHorizontal: 24, paddingTop: 12, gap: 18 },
  church: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: radius.md, backgroundColor: colors.bg },
  churchBody: { flex: 1, gap: 2 },
  churchName: { fontSize: 16, fontWeight: "700", color: colors.ink },
  churchNote: { fontSize: 13, color: colors.muted },
  agree: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 1.5, borderColor: colors.muted, alignItems: "center", justifyContent: "center" },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkmark: { color: colors.surface, fontSize: 15, fontWeight: "800", lineHeight: 18 },
  agreeText: { flex: 1, fontSize: 14, lineHeight: 21, color: colors.ink2 },
  link: { fontWeight: "700", color: colors.primary, textDecorationLine: "underline" },
})
