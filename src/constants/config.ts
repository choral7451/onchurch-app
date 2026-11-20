/** 온교회 API 서버 — 웹(onchurch-client)과 같은 서버 */
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "https://api-artinfokorea.com"

/** 교회 홈페이지 서비스 도메인 — {slug}.everychurch.co.kr */
export const SITE_ROOT_DOMAINS = ["everychurch.co.kr", "onchurch.kr"]

export const TERMS_URL = "https://everychurch.co.kr/terms"
export const PRIVACY_URL = "https://everychurch.co.kr/privacy"
