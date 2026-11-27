/**
 * 첫 화면(대시보드) 바로가기.
 * path 가 있으면 교회 홈페이지의 그 화면을 앱 안에서 열고, 없으면 아직 준비 중인 기능이다.
 */
export type DashboardItem = {
  key: string
  label: string
  emoji: string
  /** 아이콘 뒤 동그라미 색 */
  tint: string
  path: string | null
}

export const DASHBOARD_ITEMS: DashboardItem[] = [
  { key: "meditation", label: "오늘의 묵상", emoji: "🌱", tint: "#EAF4EC", path: "/bible" },
  { key: "reading", label: "성경통독", emoji: "📖", tint: "#EAF1F8", path: "/bible" },
  { key: "bible-search", label: "성경찾기", emoji: "🔍", tint: "#F6F0E4", path: null },
  { key: "prayer", label: "기도 요청", emoji: "🙏", tint: "#F8EEE8", path: "/community" },
  { key: "bulletin", label: "주보", emoji: "📰", tint: "#EEF0F3", path: "/sermons" },
  { key: "notices", label: "알림장", emoji: "🔔", tint: "#FBF3DF", path: "/notices" },
  { key: "attendance", label: "앱출석", emoji: "✅", tint: "#E8F5EE", path: null },
  { key: "hymn", label: "찬송가찾기", emoji: "🎵", tint: "#EFEAF7", path: null },
  { key: "homepage", label: "홈페이지", emoji: "⛪", tint: "#EAF1F8", path: "/" },
]
