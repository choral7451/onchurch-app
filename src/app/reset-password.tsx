import { router } from "expo-router"
import React, { useState } from "react"
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { PhoneVerify } from "@/components/phone-verify"
import { Button, ErrorNotice, Field } from "@/components/ui"
import { colors, radius } from "@/constants/theme"
import { api, ApiError } from "@/lib/api"

/** 아이디와 가입 연락처 문자 인증으로 새 비밀번호를 정한다 */
export default function ResetPasswordScreen() {
  const insets = useSafeAreaInsets()
  const [userId, setUserId] = useState("")
  const [phone, setPhone] = useState<string | null>(null)
  const [password, setPassword] = useState("")
  const [passwordConfirm, setPasswordConfirm] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [done, setDone] = useState(false)

  const passwordMismatch = passwordConfirm.length > 0 && password !== passwordConfirm
  const canSubmit = userId.trim().length > 0 && !!phone && password.length >= 8 && password === passwordConfirm

  const submit = async () => {
    if (!canSubmit || !phone || submitting) return
    setSubmitting(true)
    setErrorMessage("")
    try {
      await api.resetPassword(userId.trim(), phone, password)
      setDone(true)
    } catch (error) {
      setErrorMessage(error instanceof ApiError ? error.message : "비밀번호를 바꾸지 못했습니다. 잠시 후 다시 시도해주세요.")
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <View style={[styles.screen, styles.done]}>
        <View accessibilityRole="alert" style={styles.doneNotice}>
          <Text style={styles.doneText}>비밀번호를 바꿨습니다. 새 비밀번호로 로그인해주세요.</Text>
        </View>
        <Button title="로그인하기" onPress={() => router.back()} />
      </View>
    )
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 28 }]} keyboardShouldPersistTaps="handled">
        <Text style={styles.intro}>아이디와 가입할 때 등록한 휴대전화를 확인한 뒤 새 비밀번호를 정합니다.</Text>
        <Field label="아이디" value={userId} onChangeText={setUserId} placeholder="아이디" autoComplete="username" textContentType="username" />
        <PhoneVerify onVerified={setPhone} />
        {phone && (
          <>
            <Field label="새 비밀번호" value={password} onChangeText={setPassword} placeholder="8자 이상" secureTextEntry autoComplete="new-password" textContentType="newPassword" />
            <Field
              label="새 비밀번호 확인"
              value={passwordConfirm}
              onChangeText={setPasswordConfirm}
              placeholder="비밀번호를 한 번 더 입력"
              secureTextEntry
              autoComplete="new-password"
              textContentType="newPassword"
              error={passwordMismatch ? "비밀번호가 서로 다릅니다." : undefined}
            />
          </>
        )}
        <ErrorNotice message={errorMessage} />
        <Button title="비밀번호 바꾸기" onPress={submit} disabled={!canSubmit} loading={submitting} />
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  scroll: { paddingHorizontal: 24, paddingTop: 12, gap: 18 },
  intro: { fontSize: 15, lineHeight: 22, color: colors.ink2 },
  done: { paddingHorizontal: 24, paddingTop: 24, gap: 18 },
  doneNotice: { backgroundColor: colors.bg, borderRadius: radius.md, padding: 16 },
  doneText: { fontSize: 15, lineHeight: 22, color: colors.ink },
})
