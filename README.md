# 온교회 앱 (iOS · Android)

성도가 로그인하면 다니는 교회의 온교회 홈페이지로 바로 들어가는 앱. Expo(React Native) 한 벌로 iOS 와 Android 를 만든다.
구조와 배포 방식은 아트인포 앱(`artinfo-app`)·온기 앱(`ongi`)과 같다.

## 화면

| 화면 | 파일 | 설명 |
| --- | --- | --- |
| 로그인 (첫 화면) | `src/app/login.tsx` | 아이디·비밀번호만 입력. 서버가 계정의 교회를 알려주고 그 교회로 들어간다 |
| 교회 찾기 | `src/app/signup/index.tsx` | 교회 이름 검색 → 로고·이름·담임목사·주소 목록에서 선택 |
| 회원가입 | `src/app/signup/form.tsx` | 고른 교회의 성도로 가입 (휴대전화 인증) |
| 교회 화면 | `src/app/index.tsx` | 교회 홈페이지(`{slug}.everychurch.co.kr` 또는 교회 자체 도메인)를 로그인된 상태의 웹뷰로 보여준다 |

회원가입은 앱에서만 교회를 검색해 고른다 (웹은 각 교회 홈페이지에서 그 교회로 가입).

### 로그인 상태가 웹뷰로 넘어가는 방식

웹(onchurch-client)은 로그인 토큰을 `onchurch.*` 쿠키에 둔다. 앱은 로그인·가입으로 받은 토큰을 웹뷰가 열리기 전에 같은 쿠키로 심는다(`src/lib/church-site.ts`).
웹이 토큰을 갱신하면 앱이 그 값을 받아 보관하고, 웹에서 로그아웃하면 앱도 로그인 화면으로 돌아간다. 교회 사이트 밖의 주소는 기기 브라우저로 연다.

## 서버 API (artinfo-server `src/onchurch`)

- `POST /onchurch/auths/app-login` — 앱 로그인 (교회를 묻지 않고, 계정의 교회를 토큰과 함께 반환)
- `GET /onchurch/churches/search?q=` — 교회 이름 검색
- `POST /onchurch/auths/sign-up` · `POST|PUT /onchurch/auths/verifications/mobile` — 웹과 같은 가입·휴대전화 인증
- `GET /onchurch/app/version` — 최소·최신 버전 확인. 값은 마스터 페이지(everychurch.co.kr/master) "앱 버전"에서 관리

## 개발

```bash
npm install
npx expo run:ios        # 또는 npx expo run:android (웹뷰 등 네이티브 모듈이 있어 Expo Go 로는 안 된다)
npx tsc --noEmit && npx eslint src
```

`ios/` · `android/` 폴더는 `expo prebuild` 가 만드는 산출물이라 커밋하지 않는다. 네이티브 설정은 `app.json` 에서 한다.
API 서버를 바꾸려면 `EXPO_PUBLIC_API_URL` 환경변수를 준다 (기본 `https://api-artinfokorea.com`).

## 테스트 배포 · 릴리즈 (GitHub Actions)

| 하는 일 | 실행 |
| --- | --- |
| iOS 빌드 → TestFlight | `gh workflow run ios-testflight.yml` |
| Android 빌드 → Play 내부 테스트 | `gh workflow run android-build.yml` (`-f apk=true` 면 설치용 APK 도) |
| iOS App Store 심사 제출 | `gh workflow run ios-release.yml -f version=1.0.0 -f notes="..."` |
| Android 프로덕션 출시 (내부 테스트 → 프로덕션 승격) | `gh workflow run android-release.yml -f version=1.0.0 -f notes="..."` |

새 버전을 낼 때는 `app.json` 의 `version` 을 올린 뒤 테스트 배포부터 한다. 빌드 번호는 자동(iOS = Actions 실행 번호, Android = EAS 원격 versionCode).
출시 후 마스터 페이지 "앱 버전"에서 최신 버전을 올리면 이전 버전 사용자에게 업데이트 안내가 뜨고, 최소 버전을 올리면 강제 업데이트가 된다.

### 처음 한 번 준비할 것

1. **GitHub 저장소 시크릿** (아트인포·온기 앱 저장소와 같은 값)
   - `ASC_KEY_ID` · `ASC_ISSUER_ID` · `ASC_PRIVATE_KEY` — App Store Connect API 키 (iOS 빌드·업로드·심사 제출)
   - `EXPO_TOKEN` — Android 빌드 (서명 키스토어·versionCode 를 EAS 프로젝트 `@ddoniel/onchurch-app` 에서 가져온다)
   - `PLAY_SERVICE_ACCOUNT_JSON` — Play 업로드·승격 서비스 계정 키
2. **App Store Connect** — 번들 ID `kr.co.everychurch.app` 로 앱을 만든다. 앱 ID(숫자)가 나오면 마스터 페이지 "앱 버전" iOS 스토어 주소에 `https://apps.apple.com/kr/app/id<앱 ID>` 를 넣는다.
3. **Google Play Console** — 패키지 `kr.co.everychurch.app` 로 앱을 만들고 서비스 계정에 권한을 준다. 첫 `.aab` 는 콘솔에서 직접 올려야 API 업로드가 열린다.
4. **Android 서명 키** — 첫 빌드 전에 `npx eas-cli credentials -p android` 로 EAS 에 키스토어를 만든다 (CI 는 비대화형이라 새로 만들지 못한다).
5. 스토어 등록정보는 `store/ko/*.txt` (name · subtitle · description · keywords · promotional_text · release_notes) 가 있으면 심사 제출 때 같이 올라간다.
