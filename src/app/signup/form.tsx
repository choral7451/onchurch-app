import { useLocalSearchParams } from "expo-router"
import React, { useEffect, useRef, useState } from "react"
import { KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { ChurchLogo } from "@/components/church-logo"
import { Button, ErrorNotice, Field, TextInputRef } from "@/components/ui"
import { PRIVACY_URL, TERMS_URL } from "@/constants/config"
import { colors, radius } from "@/constants/theme"
import { api, ApiError, Church } from "@/lib/api"
import { useSession } from "@/lib/session"

type PhoneStatus = "idle" | "code-sent" | "verified"
const CODE_TTL_SECONDS = 300

const digitsOnly = (value: string) => value.replace(/[^0-9]/g, "")

/** 010-1234-5678 — 웹 가입 폼과 같은 형식으로 서버에 보낸다 */
function formatPhone(raw: string) {
  const d = digitsOnly(raw).slice(0, 11)
  if (d.length < 4) return d
  if (d.length < 8) return `${d.slice(0, 3)}-${d.slice(3)}`
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`
}

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
  const [phone, setPhone] = useState("")
  const [code, setCode] = useState("")
  const [phoneStatus, setPhoneStatus] = useState<PhoneStatus>("idle")
  const [phoneBusy, setPhoneBusy] = useState(false)
  const [phoneNotice, setPhoneNotice] = useState<{ kind: "info" | "error"; text: string } | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [agreed, setAgreed] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const codeInput = useRef<TextInputRef>(null)

  useEffect(() => {
    if (phoneStatus !== "code-sent" || secondsLeft <= 0) return
    const timer = setInterval(() => setSecondsLeft(s => Math.max(0, s - 1)), 1000)
    return () => clearInterval(timer)
  }, [phoneStatus, secondsLeft])

  const phoneValid = digitsOnly(phone).length >= 10
  const passwordMismatch = passwordConfirm.length > 0 && password !== passwordConfirm

  const sendCode = async () => {
    setPhoneBusy(true)
    setPhoneNotice(null)
    try {
      await api.sendPhoneCode(phone)
      setPhoneStatus("code-sent")
      setCode("")
      setSecondsLeft(CODE_TTL_SECONDS)
      setPhoneNotice({ kind: "info", text: "인증번호를 문자로 보냈습니다. 5분 안에 입력해주세요." })
      setTimeout(() => codeInput.current?.focus(), 50)
    } catch (error) {
      setPhoneNotice({ kind: "error", text: error instanceof ApiError ? error.message : "인증번호를 보내지 못했습니다." })
    } finally {
      setPhoneBusy(false)
    }
  }

  const verifyCode = async () => {
    if (secondsLeft <= 0) {
      setPhoneNotice({ kind: "error", text: "인증번호가 만료되었습니다. 인증번호를 다시 받아주세요." })
      return
    }
    setPhoneBusy(true)
    setPhoneNotice(null)
    try {
      await api.verifyPhoneCode(phone, code)
      setPhoneStatus("verified")
    } catch (error) {
      setPhoneNotice({ kind: "error", text: error instanceof ApiError ? error.message : "인증번호를 확인하지 못했습니다." })
    } finally {
      setPhoneBusy(false)
    }
  }

  const canSubmit =
    name.trim().length > 0 && userId.trim().length >= 4 && password.length >= 8 && password === passwordConfirm && phoneStatus === "verified" && agreed

  const submit = async () => {
    if (!canSubmit || submitting) return
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

  const mmss = `${String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:${String(secondsLeft % 60).padStart(2, "0")}`

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 28 }]} keyboardShouldPersistTaps="handled">
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

        <View style={styles.phoneGroup}>
          <View style={styles.inline}>
            <View style={styles.inlineField}>
              <Field
                label={phoneStatus === "verified" ? "휴대전화 (인증 완료)" : "휴대전화"}
                value={phone}
                onChangeText={value => setPhone(formatPhone(value))}
                placeholder="010-0000-0000"
                keyboardType="number-pad"
                autoComplete="tel"
                textContentType="telephoneNumber"
                editable={phoneStatus !== "verified"}
              />
            </View>
            <Button
              title={phoneStatus === "idle" ? "인증번호 받기" : "다시 받기"}
              variant="secondary"
              onPress={sendCode}
              disabled={!phoneValid || phoneStatus === "verified"}
              loading={phoneBusy && phoneStatus === "idle"}
              style={styles.inlineButton}
            />
          </View>

          {phoneStatus === "code-sent" && (
            <View style={styles.inline}>
              <View style={styles.inlineField}>
                <Field
                  ref={codeInput}
                  label="인증번호"
                  value={code}
                  onChangeText={value => setCode(digitsOnly(value).slice(0, 6))}
                  placeholder="6자리 숫자"
                  keyboardType="number-pad"
                  autoComplete="one-time-code"
                  textContentType="oneTimeCode"
                  maxLength={6}
                  trailing={<Text style={[styles.timer, secondsLeft <= 30 && { color: colors.danger }]}>{mmss}</Text>}
                />
              </View>
              <Button title="확인" onPress={verifyCode} disabled={code.length < 6} loading={phoneBusy} style={styles.inlineButton} />
            </View>
          )}
          {phoneNotice && <Text style={[styles.phoneNotice, phoneNotice.kind === "error" && { color: colors.danger }]}>{phoneNotice.text}</Text>}
        </View>

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
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  scroll: { paddingHorizontal: 24, paddingTop: 12, gap: 18 },
  church: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: radius.md, backgroundColor: colors.bg },
  churchBody: { flex: 1, gap: 2 },
  churchName: { fontSize: 16, fontWeight: "700", color: colors.ink },
  churchNote: { fontSize: 13, color: colors.muted },
  phoneGroup: { gap: 12 },
  inline: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  inlineField: { flex: 1 },
  inlineButton: { minWidth: 108 },
  timer: { fontSize: 14, fontVariant: ["tabular-nums"], color: colors.muted },
  phoneNotice: { fontSize: 13, lineHeight: 19, color: colors.ink2 },
  agree: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 1.5, borderColor: colors.muted, alignItems: "center", justifyContent: "center" },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkmark: { color: colors.surface, fontSize: 15, fontWeight: "800", lineHeight: 18 },
  agreeText: { flex: 1, fontSize: 14, lineHeight: 21, color: colors.ink2 },
  link: { fontWeight: "700", color: colors.primary, textDecorationLine: "underline" },
})
