import { SITE_ROOT_DOMAINS } from "@/constants/config"
import type { AuthTokens, Church } from "@/lib/api"

/** 교회 홈페이지 주소 — 자체 도메인이 있으면 그 주소, 없으면 {slug}.everychurch.co.kr */
export const churchSiteUrl = (church: Church): string => `https://${church.customDomain ?? `${church.slug}.${SITE_ROOT_DOMAINS[0]}`}`

/** 이 교회 홈페이지의 호스트인가 — 토큰은 이 호스트에서만 다루고, 그 밖의 주소는 외부 브라우저로 연다 */
export function isChurchHost(church: Church, hostname: string): boolean {
  const host = hostname.toLowerCase()
  if (church.customDomain) {
    const custom = church.customDomain.toLowerCase()
    const bare = custom.replace(/^www\./, "")
    if (host === custom || host === bare || host === `www.${bare}`) return true
  }
  return SITE_ROOT_DOMAINS.some(root => host === `${church.slug}.${root}`)
}

export type SiteMessage = { type: "tokens"; tokens: AuthTokens } | { type: "signed-out" }

/**
 * 교회 홈페이지가 열리기 전에 웹뷰에서 실행되는 스크립트.
 * - 웹(onchurch-client lib/api-client.ts)은 로그인 토큰을 쿠키(onchurch.*)에 둔다. 쿠키가 없으면 앱이 가진 토큰을 같은 방식으로 심는다.
 * - 웹이 토큰을 갱신하거나 로그아웃하면('onchurch-auth-change' 이벤트) 앱에 알려 준다.
 * - 둘러보는 중(tokens 가 null)이면 쿠키를 심지 않는다. 웹에서 로그인하면 그 토큰을 앱에 알려 준다.
 * 교회 호스트가 아닌 페이지에서는 아무것도 하지 않는다 — 토큰이 다른 사이트로 나가지 않게.
 */
export function buildSiteBridgeScript(church: Church, tokens: AuthTokens | null): string {
  const config = JSON.stringify({ slug: church.slug, customDomain: church.customDomain, roots: SITE_ROOT_DOMAINS, tokens })
  return `(function () {
  var config = ${config};
  var host = location.hostname.toLowerCase();
  var cookieDomain = null;
  var allowed = false;
  for (var i = 0; i < config.roots.length; i++) {
    if (host === config.slug + "." + config.roots[i]) { allowed = true; cookieDomain = "." + config.roots[i]; }
  }
  if (!allowed && config.customDomain) {
    var bare = config.customDomain.toLowerCase().replace(/^www\\./, "");
    allowed = host === bare || host === "www." + bare;
  }
  if (!allowed || location.protocol !== "https:") return;

  var KEYS = ["accessToken", "accessTokenExpiresIn", "refreshToken", "refreshTokenExpiresIn"];
  function read(name) {
    var target = name + "=";
    var parts = document.cookie.split(";");
    for (var i = 0; i < parts.length; i++) {
      var part = parts[i].trim();
      if (part.indexOf(target) === 0) return decodeURIComponent(part.slice(target.length));
    }
    return null;
  }
  function write(name, value) {
    document.cookie = name + "=" + encodeURIComponent(value) + "; Path=/; Max-Age=2592000; SameSite=Lax; Secure" + (cookieDomain ? "; Domain=" + cookieDomain : "");
  }
  function post(message) {
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(message));
  }

  // 쿠키가 없거나, 앱이 가진 토큰이 더 새것이면(방금 로그인) 앱의 토큰을 심는다.
  // 웹이 갱신한 토큰은 만료 시각이 더 뒤라서 덮어쓰지 않는다.
  if (config.tokens) {
    var cookieExpiry = Date.parse(read("onchurch.refreshTokenExpiresIn") || "");
    var appExpiry = Date.parse(config.tokens.refreshTokenExpiresIn);
    if (!read("onchurch.accessToken") || !(cookieExpiry >= appExpiry)) {
      for (var k = 0; k < KEYS.length; k++) write("onchurch." + KEYS[k], config.tokens[KEYS[k]]);
      write("onchurch.sessionChurch", config.slug);
    }
  }

  // 둘러보는 중에는 로그인한 적이 없으므로 "로그아웃됨"을 알리지 않는다 — 웹에서 로그인한 뒤에만 알린다.
  var signedIn = !!config.tokens;
  function report() {
    var tokens = {};
    for (var k = 0; k < KEYS.length; k++) {
      var value = read("onchurch." + KEYS[k]);
      if (!value) { if (signedIn) post({ type: "signed-out" }); return; }
      tokens[KEYS[k]] = value;
    }
    signedIn = true;
    post({ type: "tokens", tokens: tokens });
  }
  window.addEventListener("onchurch-auth-change", report);
  report();
})();
true;`
}
