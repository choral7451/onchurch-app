import { router } from "expo-router"
import React, { useEffect, useRef, useState } from "react"
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native"

import { ChurchLogo } from "@/components/church-logo"
import { colors, radius } from "@/constants/theme"
import { api, ApiError, ChurchSearchItem } from "@/lib/api"

type Status = "idle" | "loading" | "done" | "error"

/** 회원가입 1단계 — 교회 이름으로 찾아 가입할 교회를 고른다 */
export default function ChurchSearchScreen() {
  const [keyword, setKeyword] = useState("")
  const [status, setStatus] = useState<Status>("idle")
  const [churches, setChurches] = useState<ChurchSearchItem[]>([])
  const [errorMessage, setErrorMessage] = useState("")
  // 늦게 도착한 이전 검색 결과가 최신 결과를 덮지 않도록
  const searchSeq = useRef(0)

  const query = keyword.trim()

  useEffect(() => {
    const seq = ++searchSeq.current
    if (!query) return
    // 글자를 치는 동안에는 기다렸다가 한 번만 찾는다
    const timer = setTimeout(async () => {
      setStatus("loading")
      try {
        const result = await api.searchChurches(query)
        if (seq !== searchSeq.current) return
        setChurches(result)
        setStatus("done")
      } catch (error) {
        if (seq !== searchSeq.current) return
        setErrorMessage(error instanceof ApiError ? error.message : "교회를 찾지 못했습니다. 잠시 후 다시 시도해주세요.")
        setStatus("error")
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  const select = (church: ChurchSearchItem) =>
    router.push({
      pathname: "/signup/form",
      params: { slug: church.slug, name: church.name, logoUrl: church.logoUrl ?? "", customDomain: church.customDomain ?? "" },
    })

  const showResults = query.length > 0 && status === "done"

  return (
    <View style={styles.screen}>
      <View style={styles.searchBox}>
        <TextInput
          value={keyword}
          onChangeText={setKeyword}
          placeholder="교회 이름을 입력하세요"
          placeholderTextColor={colors.muted}
          accessibilityLabel="교회 이름 검색"
          autoFocus
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
          style={styles.searchInput}
        />
        {query.length > 0 && status === "loading" && <ActivityIndicator color={colors.primary} />}
      </View>

      {!query ? (
        <Text style={styles.guide}>다니시는 교회 이름을 검색한 뒤, 목록에서 교회를 골라주세요.</Text>
      ) : status === "error" ? (
        <Text style={[styles.guide, { color: colors.danger }]}>{errorMessage}</Text>
      ) : showResults && churches.length === 0 ? (
        <Text style={styles.guide}>
          “{query}” 이름의 교회를 찾지 못했습니다.{"\n"}교회 이름의 일부만 입력해 보세요. 온교회를 쓰지 않는 교회는 나오지 않습니다.
        </Text>
      ) : null}

      {showResults && churches.length > 0 && (
        <FlatList
          data={churches}
          keyExtractor={church => String(church.id)}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={[item.name, item.pastorName && `담임목사 ${item.pastorName}`, item.address].filter(Boolean).join(", ")}
              onPress={() => select(item)}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            >
              <ChurchLogo name={item.name} logoUrl={item.logoUrl} />
              <View style={styles.rowBody}>
                <Text style={styles.churchName} numberOfLines={1}>
                  {item.name}
                </Text>
                {!!item.pastorName && (
                  <Text style={styles.pastor} numberOfLines={1}>
                    담임목사 {item.pastorName}
                  </Text>
                )}
                <Text style={styles.address} numberOfLines={2}>
                  {item.address || "주소가 등록되지 않았습니다"}
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginTop: 8,
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: 14,
  },
  searchInput: { flex: 1, fontSize: 17, color: colors.ink, paddingVertical: 12 },
  guide: { marginHorizontal: 24, marginTop: 20, fontSize: 15, lineHeight: 23, color: colors.muted },
  list: { paddingTop: 8, paddingBottom: 32 },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.line, marginLeft: 86 },
  row: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 20, paddingVertical: 14 },
  rowPressed: { backgroundColor: colors.bg },
  rowBody: { flex: 1, gap: 3 },
  churchName: { fontSize: 17, fontWeight: "700", color: colors.ink },
  pastor: { fontSize: 14, color: colors.ink2 },
  address: { fontSize: 13, lineHeight: 18, color: colors.muted },
})
