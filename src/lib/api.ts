import { API_BASE_URL } from "@/constants/config"

export class ApiError extends Error {
  code: string
  status: number

  constructor(message: string, code: string, status: number) {
    super(message)
    this.code = code
    this.status = status
  }
}

export type AuthTokens = {
  accessToken: string
  accessTokenExpiresIn: string
  refreshToken: string
  refreshTokenExpiresIn: string
}

/** 앱이 들어갈 교회 — 로그인 응답·교회 검색 결과에서 온다 */
export type Church = {
  slug: string
  name: string
  logoUrl: string | null
  /** 교회 자체 도메인 (없으면 {slug}.everychurch.co.kr) */
  customDomain: string | null
}

export type ChurchSearchItem = Church & {
  id: number
  address: string | null
  pastorName: string | null
}

export type AppVersionCheck = {
  platform: "ios" | "android"
  /** 이보다 낮으면 강제 업데이트 */
  minVersion: string
  latestVersion: string | null
  /** iOS 는 마스터 페이지에 주소를 넣기 전이면 null */
  storeUrl: string | null
  message: string | null
  updateRequired: boolean | null
  updateAvailable: boolean | null
}

/** 서버 응답은 { code, message, item } 으로 감싸져 온다 */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    })
  } catch {
    throw new ApiError("인터넷 연결을 확인한 뒤 다시 시도해주세요.", "NETWORK_ERROR", 0)
  }

  const body = await response.json().catch(() => null)
  if (!response.ok) {
    const raw = body?.message
    const message = Array.isArray(raw) ? raw.join("\n") : (raw ?? "요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.")
    throw new ApiError(message, body?.code ?? "ERROR", response.status)
  }
  return body?.item as T
}

const post = <T>(path: string, body: unknown) => request<T>(path, { method: "POST", body: JSON.stringify(body) })
const put = <T>(path: string, body: unknown) => request<T>(path, { method: "PUT", body: JSON.stringify(body) })

const toTokens = (item: AuthTokens): AuthTokens => ({
  accessToken: item.accessToken,
  accessTokenExpiresIn: String(item.accessTokenExpiresIn),
  refreshToken: item.refreshToken,
  refreshTokenExpiresIn: String(item.refreshTokenExpiresIn),
})

export const api = {
  /** 앱 로그인 — 교회를 묻지 않고, 계정의 교회를 토큰과 함께 받는다 */
  async login(userId: string, password: string): Promise<{ tokens: AuthTokens; church: Church }> {
    const item = await post<AuthTokens & { church: Church }>("/onchurch/auths/app-login", { userId, password })
    return { tokens: toTokens(item), church: item.church }
  },

  /** 운영 중인 교회를 이름으로 찾는다 */
  async searchChurches(keyword: string): Promise<ChurchSearchItem[]> {
    const item = await request<{ churches: ChurchSearchItem[] }>(`/onchurch/churches/search?q=${encodeURIComponent(keyword)}`)
    return item.churches
  },

  sendPhoneCode: (phone: string) => post<{ sent: boolean }>("/onchurch/auths/verifications/mobile", { phone }),
  verifyPhoneCode: (phone: string, code: string) => put<{ verified: boolean }>("/onchurch/auths/verifications/mobile", { phone, code }),

  /** 성도 가입 — 고른 교회(churchSlug) 소속으로 만들어진다 */
  async signup(params: { userId: string; password: string; name: string; phone: string; churchSlug: string }): Promise<AuthTokens> {
    return toTokens(await post<AuthTokens>("/onchurch/auths/sign-up", { ...params, marketingConsent: false }))
  },

  checkAppVersion: (platform: "ios" | "android", version: string) =>
    request<AppVersionCheck>(`/onchurch/app/version?platform=${platform}&version=${encodeURIComponent(version)}`),
}
