import React from "react"
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from "react-native"

import { colors, radius } from "@/constants/theme"

type ButtonProps = {
  title: string
  onPress: () => void
  variant?: "primary" | "secondary"
  disabled?: boolean
  loading?: boolean
  style?: ViewStyle
}

export function Button({ title, onPress, variant = "primary", disabled, loading, style }: ButtonProps) {
  const primary = variant === "primary"
  const inactive = disabled || loading
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        primary ? styles.buttonPrimary : styles.buttonSecondary,
        inactive && (primary ? styles.buttonPrimaryDisabled : styles.buttonSecondaryDisabled),
        pressed && { opacity: 0.85 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={primary ? colors.surface : colors.primary} />
      ) : (
        <Text style={[styles.buttonText, primary ? styles.buttonTextPrimary : styles.buttonTextSecondary, inactive && !primary && { color: colors.muted }]}>
          {title}
        </Text>
      )}
    </Pressable>
  )
}

/** TextInput 인스턴스 — ref 로 focus() 할 때 쓴다 */
export type TextInputRef = React.ComponentRef<typeof TextInput>

type FieldProps = TextInputProps & {
  ref?: React.Ref<TextInputRef>
  label: string
  hint?: string
  error?: string
  /** 입력칸 오른쪽에 붙는 것 (남은 시간 등) */
  trailing?: React.ReactNode
}

export function Field({ ref, label, hint, error, trailing, style, ...input }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrap, !!error && styles.inputWrapError, input.editable === false && styles.inputWrapDisabled]}>
        <TextInput ref={ref} accessibilityLabel={label} placeholderTextColor={colors.muted} autoCapitalize="none" autoCorrect={false} style={[styles.input, style]} {...input} />
        {trailing}
      </View>
      {error ? <Text style={styles.fieldError}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  )
}

/** 폼 전체에 대한 오류 — 무엇이 잘못됐는지 그대로 보여준다 */
export function ErrorNotice({ message }: { message: string }) {
  if (!message) return null
  return (
    <View accessibilityRole="alert" style={styles.errorNotice}>
      <Text style={styles.errorNoticeText}>{message}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  button: { minHeight: 52, borderRadius: radius.md, alignItems: "center", justifyContent: "center", paddingHorizontal: 18 },
  buttonPrimary: { backgroundColor: colors.primary },
  buttonPrimaryDisabled: { backgroundColor: "#A9B6C6" },
  buttonSecondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.primary },
  buttonSecondaryDisabled: { borderColor: colors.line },
  buttonText: { fontSize: 16, fontWeight: "700" },
  buttonTextPrimary: { color: colors.surface },
  buttonTextSecondary: { color: colors.primary },

  field: { gap: 8 },
  label: { fontSize: 14, fontWeight: "600", color: colors.ink2 },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
  },
  inputWrapError: { borderColor: colors.danger },
  inputWrapDisabled: { backgroundColor: colors.bg },
  input: { flex: 1, fontSize: 16, color: colors.ink, paddingVertical: 12 },
  hint: { fontSize: 13, color: colors.muted },
  fieldError: { fontSize: 13, color: colors.danger },

  errorNotice: { backgroundColor: colors.dangerBg, borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 12 },
  errorNoticeText: { fontSize: 14, lineHeight: 20, color: colors.danger },
})
