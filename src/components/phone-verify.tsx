import React, { useEffect, useRef, useState } from "react"
import { StyleSheet, Text, View } from "react-native"

import { Button, Field, TextInputRef } from "@/components/ui"
import { colors } from "@/constants/theme"
import { api, ApiError } from "@/lib/api"

type Status = "idle" | "code-sent" | "verified"
const CODE_TTL_SECONDS = 300

const digitsOnly = (value: string) => value.replace(/[^0-9]/g, "")

/** 010-1234-5678 — 웹 가입 폼과 같은 형식으로 서버에 보낸다 */
function formatPhone(raw: string) {
  const d = digitsOnly(raw).slice(0, 11)
  if (d.length < 4) return d
  if (d.length < 8) return `${d.slice(0, 3)}-${d.slice(3)}`
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`
}

/** 휴대전화 번호를 문자 인증번호로 확인한다. 인증이 끝나면 onVerified 로 번호를 넘긴다. */
export function PhoneVerify({ onVerified }: { onVerified: (phone: string) => void }) {
  const [phone, setPhone] = useState("")
  const [code, setCode] = useState("")
  const [status, setStatus] = useState<Status>("idle")
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<{ kind: "info" | "error"; text: string } | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const codeInput = useRef<TextInputRef>(null)

  useEffect(() => {
    if (status !== "code-sent" || secondsLeft <= 0) return
    const timer = setInterval(() => setSecondsLeft(s => Math.max(0, s - 1)), 1000)
    return () => clearInterval(timer)
  }, [status, secondsLeft])

  const sendCode = async () => {
    setBusy(true)
    setNotice(null)
    try {
      await api.sendPhoneCode(phone)
      setStatus("code-sent")
      setCode("")
      setSecondsLeft(CODE_TTL_SECONDS)
      setNotice({ kind: "info", text: "인증번호를 문자로 보냈습니다. 5분 안에 입력해주세요." })
      setTimeout(() => codeInput.current?.focus(), 50)
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof ApiError ? error.message : "인증번호를 보내지 못했습니다." })
    } finally {
      setBusy(false)
    }
  }

  const verifyCode = async () => {
    if (secondsLeft <= 0) {
      setNotice({ kind: "error", text: "인증번호가 만료되었습니다. 인증번호를 다시 받아주세요." })
      return
    }
    setBusy(true)
    setNotice(null)
    try {
      await api.verifyPhoneCode(phone, code)
      setStatus("verified")
      onVerified(phone)
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof ApiError ? error.message : "인증번호를 확인하지 못했습니다." })
    } finally {
      setBusy(false)
    }
  }

  const mmss = `${String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:${String(secondsLeft % 60).padStart(2, "0")}`

  return (
    <View style={styles.group}>
      <View style={styles.inline}>
        <View style={styles.inlineField}>
          <Field
            label={status === "verified" ? "휴대전화 (인증 완료)" : "휴대전화"}
            value={phone}
            onChangeText={value => setPhone(formatPhone(value))}
            placeholder="010-0000-0000"
            keyboardType="number-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            editable={status !== "verified"}
          />
        </View>
        <Button
          title={status === "idle" ? "인증번호 받기" : "다시 받기"}
          variant="secondary"
          onPress={sendCode}
          disabled={digitsOnly(phone).length < 10 || status === "verified"}
          loading={busy && status === "idle"}
          style={styles.inlineButton}
        />
      </View>

      {status === "code-sent" && (
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
          <Button title="확인" onPress={verifyCode} disabled={code.length < 6} loading={busy} style={styles.inlineButton} />
        </View>
      )}
      {notice && <Text style={[styles.notice, notice.kind === "error" && { color: colors.danger }]}>{notice.text}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  group: { gap: 12 },
  inline: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  inlineField: { flex: 1 },
  inlineButton: { minWidth: 108 },
  timer: { fontSize: 14, fontVariant: ["tabular-nums"], color: colors.muted },
  notice: { fontSize: 13, lineHeight: 19, color: colors.ink2 },
})
