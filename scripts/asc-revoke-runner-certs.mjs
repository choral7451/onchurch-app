// CI 빌드가 끝난 뒤, 이 러너에서 Xcode 자동 서명이 만든 개발용 인증서("Created via API")를 Apple 에서 폐기한다.
// 러너는 매번 새 맥이라 빌드할 때마다 인증서가 하나씩 생기고, 쌓이면 계정 한도에 걸려 빌드가 실패한다.
// 이 러너 키체인에 있는 Apple Development 인증서의 시리얼과 같은 것만 지우므로
// 같은 팀을 쓰는 다른 앱(아트인포·온기)의 빌드가 동시에 돌아도 그쪽 인증서는 건드리지 않는다. 배포 인증서는 대상이 아니다.
// 실행: node scripts/asc-revoke-runner-certs.mjs   (ASC_KEY_ID · ASC_ISSUER_ID · ASC_PRIVATE_KEY 환경변수 필요)
import { execFileSync } from "node:child_process"
import { createPrivateKey, sign, X509Certificate } from "node:crypto"

const { ASC_KEY_ID, ASC_ISSUER_ID, ASC_PRIVATE_KEY } = process.env
if (!ASC_KEY_ID || !ASC_ISSUER_ID || !ASC_PRIVATE_KEY) {
  console.log("ASC 키가 없어 인증서 정리를 건너뜁니다")
  process.exit(0)
}

const b64url = buf => Buffer.from(buf).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_")

function token() {
  const now = Math.floor(Date.now() / 1000)
  const head = b64url(JSON.stringify({ alg: "ES256", kid: ASC_KEY_ID, typ: "JWT" }))
  const body = b64url(JSON.stringify({ iss: ASC_ISSUER_ID, iat: now, exp: now + 15 * 60, aud: "appstoreconnect-v1" }))
  const sig = sign("sha256", Buffer.from(`${head}.${body}`), { key: createPrivateKey(ASC_PRIVATE_KEY), dsaEncoding: "ieee-p1363" })
  return `${head}.${body}.${b64url(sig)}`
}

const normalize = serial => serial.replace(/[^0-9a-f]/gi, "").replace(/^0+/, "").toUpperCase()

// 이 러너 키체인의 Apple Development 인증서 시리얼
function runnerSerials() {
  let pem = ""
  try {
    pem = execFileSync("security", ["find-certificate", "-a", "-c", "Apple Development", "-p"], { encoding: "utf8" })
  } catch {
    return []
  }
  const blocks = pem.match(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g) ?? []
  return blocks.map(block => normalize(new X509Certificate(block).serialNumber))
}

async function api(path, init = {}) {
  const res = await fetch(`https://api.appstoreconnect.apple.com${path}`, { ...init, headers: { Authorization: `Bearer ${token()}`, ...init.headers } })
  if (!res.ok && res.status !== 204) throw new Error(`${init.method ?? "GET"} ${path} → ${res.status} ${await res.text()}`)
  return res.status === 204 ? null : res.json()
}

const serials = new Set(runnerSerials())
if (serials.size === 0) {
  console.log("이 러너에서 만든 개발용 인증서가 없습니다")
  process.exit(0)
}

const list = await api("/v1/certificates?filter[certificateType]=DEVELOPMENT,IOS_DEVELOPMENT&limit=200")
const targets = (list.data ?? []).filter(cert => serials.has(normalize(cert.attributes?.serialNumber ?? "")))
for (const cert of targets) {
  await api(`/v1/certificates/${cert.id}`, { method: "DELETE" })
  console.log(`폐기: ${cert.attributes?.name ?? "certificate"} (${cert.id})`)
}
console.log(`정리 완료 — ${targets.length}개 폐기`)
