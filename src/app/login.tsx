import { router } from "expo-router"
import React, { useRef, useState } from "react"
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { Button, ErrorNotice, Field, TextInputRef } from "@/components/ui"
import { colors } from "@/constants/theme"
import { api, ApiError } from "@/lib/api"
import { useSession } from "@/lib/session"

export default function LoginScreen() {
  const insets = useSafeAreaInsets()
  const { signIn } = useSession()
  const passwordInput = useRef<TextInputRef>(null)
  const [userId, setUserId] = useState("")
  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  const canSubmit = userId.trim().length > 0 && password.length > 0

  const submit = async () => {
    if (!canSubmit || submitting) return
    setSubmitting(true)
    setErrorMessage("")
    try {
      // 성공하면 _layout 의 가드가 교회 화면으로 바꾼다
      await signIn(await api.login(userId.trim(), password))
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "로그인하지 못했습니다. 잠시 후 다시 시도해주세요.")
      setSubmitting(false)
    }
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" bounces={false}>
        <View style={[styles.masthead, { paddingTop: insets.top + 56 }]}>
          <View style={styles.cross} accessible={false}>
            <View style={styles.crossVertical} />
            <View style={styles.crossHorizontal} />
          </View>
          <Text style={styles.wordmark} accessibilityRole="header">
            온교회
          </Text>
          <Text style={styles.tagline}>로그인하면 다니시는 교회로 바로 들어갑니다</Text>
        </View>

        <View style={[styles.sheet, { paddingBottom: insets.bottom + 28 }]}>
          <Field
            label="아이디"
            value={userId}
            onChangeText={setUserId}
            placeholder="아이디"
            autoComplete="username"
            textContentType="username"
            returnKeyType="next"
            onSubmitEditing={() => passwordInput.current?.focus()}
            submitBehavior="submit"
          />
          <Field
            ref={passwordInput}
            label="비밀번호"
            value={password}
            onChangeText={setPassword}
            placeholder="비밀번호"
            secureTextEntry
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={submit}
          />
          <ErrorNotice message={errorMessage} />
          <Button title="로그인" onPress={submit} disabled={!canSubmit} loading={submitting} />

          <View style={styles.signup}>
            <Text style={styles.signupText}>처음이신가요?</Text>
            <Pressable accessibilityRole="link" hitSlop={12} onPress={() => router.push("/signup")}>
              <Text style={styles.signupLink}>교회 찾아 회원가입</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.primary },
  scroll: { flexGrow: 1 },
  masthead: { paddingHorizontal: 28, paddingBottom: 40 },
  // 가는 선 두 개로 그린 십자가 — 이 화면의 유일한 장식
  cross: { width: 34, height: 48, marginBottom: 28 },
  crossVertical: { position: "absolute", left: 16, top: 0, width: 2, height: 48, backgroundColor: colors.surface },
  crossHorizontal: { position: "absolute", left: 0, top: 14, width: 34, height: 2, backgroundColor: colors.surface },
  wordmark: { fontSize: 44, fontWeight: "800", letterSpacing: -1, color: colors.surface },
  tagline: { marginTop: 10, fontSize: 16, lineHeight: 24, color: colors.onPrimaryMuted },
  sheet: {
    flex: 1,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 28,
    paddingTop: 32,
    gap: 18,
  },
  signup: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 10 },
  signupText: { fontSize: 15, color: colors.muted },
  signupLink: { fontSize: 15, fontWeight: "700", color: colors.primary, textDecorationLine: "underline" },
})
