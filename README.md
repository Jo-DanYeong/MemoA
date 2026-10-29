# MemoA

MemoA는 카카오톡, 문자, 이메일 등에 포함된 과제·약속·마감 문장의 의미를 분석해 일정으로 정리하는 Android 앱입니다. 사용자는 AI가 찾은 날짜, 시간, 장소와 준비 사항을 확인하고 수정한 뒤 저장할 수 있으며, Android 알림과 텍스트 공유를 통해 일정 후보를 가져올 수 있습니다.

## 주요 기능

### 메시지 분석과 일정 관리

- 메시지 직접 입력 및 `memoa://capture?text=...` 딥링크 수신
- 메시지 의미를 제목·설명, 날짜·시간, 장소와 준비 사항으로 해석
- 백엔드에서 Groq API로 문장을 해석하고, 원격 분석 실패 시 한국어 규칙 기반 분석기로 전환
- 제목은 `[말머리] 핵심 행동`으로 요약하며, 알림 앱·발신자·대화방은 제목에서 제외
- 분석 결과 화면에 Groq 추출과 기본 추출을 구분해서 표시
- 분석 결과 확인·수정 후 일정 저장
- 일정 목록, 월간 캘린더, 날짜별 일정 확인
- 저장한 일정을 Android의 `MemoA` 기기 캘린더에 자동 등록
- 시간 일정은 30분 전 알림, 시간 미지정 일정은 종일 일정으로 등록
- 일정 완료 상태 변경

### 계정과 데이터

- 회원가입 및 로그인
- 30일 인증 토큰을 이용한 API 인증
- 서버 없이 화면을 확인할 수 있는 체험 모드
- 사용자별 일정 데이터를 H2 파일 데이터베이스에 저장
- 사용자가 확인한 제목, 설명, 날짜·시간, 장소와 준비 사항만 일정 데이터로 저장

### Android 네이티브 기능

- 다른 앱의 텍스트 공유 메뉴에서 MemoA로 메시지 전달
- 알림 접근 권한 확인 및 설정 화면 이동
- 카카오톡·문자·Instagram DM 등에서 일정 표현이 포함된 알림 후보 수집
- 일반 본문, 대화형 메시지, 여러 줄 묶음 알림을 읽으며 최신 메시지를 기준으로 일정 후보 판단
- 후보는 최대 20개까지 단말에 임시 저장하고, 홈에서 직접 선택해 확인한 뒤 일정 저장 또는 삭제 시 제거
- 앱의 홈이 활성화되면 수집된 후보 본문을 서버로 보내 분석하고 요약 제목을 표시 (같은 실행 중 동일 후보 중복 호출 방지)
- 새 알림·후보 삭제·감지 앱 선택 변경은 네이티브 이벤트로 홈에 즉시 반영하며, AI 응답 대기 중에도 새 후보 수를 갱신
- AI 요청은 순서대로 처리하고, 삭제된 후보의 늦은 응답은 홈에 다시 추가하지 않음
- 백그라운드 네이티브 감지는 키워드 검사로 후보를 보관하며, Groq 분석은 앱 홈에서 진행
- 로그인·앱 복귀 시 입력 화면이나 권한 설정을 자동으로 열지 않으며, 권한은 설정 탭에서 직접 허용
- 재설치 이전에 게시된 알림은 제외하고, 날씨·뉴스·배터리 상태 앱은 기본 감지 대상에서 제외 (설정에서 변경 가능)
- 캘린더 읽기·쓰기 권한 확인 및 설정 화면에서 연동 상태 표시
- Android 네이티브 코드는 Java로 작성

> Expo Go에서는 사용자 정의 네이티브 모듈을 불러올 수 없으므로 직접 입력, 분석, MemoA 내부 일정·캘린더만 사용할 수 있습니다. Android 알림 감지, 시스템 공유, 기기 캘린더 연동은 Android 개발 빌드에서 테스트해야 합니다.

### iPhone 개인 테스트

Windows와 무료 Apple 계정으로 실기기 테스트를 준비하는 방법은
[iPhone 개인 테스트 안내](FrontEnd/docs/ios-sideload.md)를 참고하세요.
GitHub Actions에서 서명 없는 Release IPA를 만들고 Sideloadly로 직접 서명·설치합니다.
현재 Android 전용 기능과 iPhone에서 확인할 수 있는 기능은 안내 문서에 구분했습니다.

iOS 27에서는 [알림 단축어 연동](FrontEnd/docs/ios-notification-shortcuts.md)을 설정하면
선택한 앱의 새 알림을 기기에 임시저장하고 AI로 분석할 수 있습니다.
연동 동작이 포함된 새 IPA가 필요하며, 실제 알림 본문 전달·잠금 상태 실행은 iPhone에서 확인해야 합니다.

설정 화면은 실행 중인 OS에 맞게 구성됩니다. Android에는 알림 접근·배터리 제한·수집 앱 선택·기기 캘린더를,
iPhone에는 단축어 자동화·로컬 네트워크 접근을 표시합니다. 감지 알림은 각 OS의 실제 허용 상태를 확인하며,
이미 허용되었거나 차단된 권한은 해당 OS의 앱 설정에서 변경합니다.

iPhone 서버 주소는 `http://100.72.90.63:8080/api/v1`이며 휴대폰에서도 같은 Tailscale 네트워크에 연결해야 합니다.
`FrontEnd/.env`의 `EXPO_PUBLIC_IOS_API_BASE_URL`로 iPhone 주소를 별도로 지정합니다.
Android 개발 앱은 기존 `EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:8080/api/v1`과 USB reverse 연결을 사용합니다.

## 기술 구성

| 영역 | 기술 |
| --- | --- |
| 모바일 앱 | React Native 0.86, Expo SDK 57, TypeScript |
| Android 네이티브 | Java, NotificationListenerService, Intent/Deep Link |
| 백엔드 | Java 21, Spring Boot 3.5, Spring Web, Spring Data JPA |
| 웹 서버 | Spring Boot 내장 Tomcat, 기본 포트 `8080` |
| 데이터베이스 | H2 파일 데이터베이스 |
| 컨테이너 | Docker, Docker Compose |

## 프로젝트 구조

프론트엔드와 백엔드는 서로 포함 관계가 아닌 루트 아래의 독립된 형제 프로젝트입니다.

```text
MemoA/
├─ FrontEnd/                         React Native Android 앱
│  ├─ App.tsx                        앱 최상위 컴포넌트
│  ├─ src/
│  │  ├─ MemoaApp.tsx                화면 전환과 앱 상태 관리
│  │  ├─ screens/                    로그인, 홈, 입력, 검토, 캘린더, 설정
│  │  ├─ components/                 공통 UI 컴포넌트
│  │  ├─ services/api.ts             Spring Boot API 호출
│  │  ├─ services/deviceCalendar.ts  Android 기기 캘린더 연동
│  │  ├─ services/localAnalyzer.ts   단말 규칙 기반 분석기
│  │  └─ native/capture.ts           공유/알림 네이티브 모듈 연결
│  ├─ android/
│  │  └─ app/src/main/java/com/frontend/
│  │     ├─ MainActivity.java
│  │     ├─ MainApplication.java
│  │     ├─ NotificationCaptureService.java
│  │     └─ NotificationCaptureModule.java
├─ BackEnd/                          Spring Boot API 서버
│  ├─ src/main/java/app/memoa/
│  │  ├─ auth/                       회원가입, 로그인, 토큰
│  │  ├─ analysis/                   원격 AI 및 규칙 기반 분석
│  │  ├─ schedule/                   일정 CRUD
│  │  ├─ common/                     공통 오류 처리
│  │  ├─ config/                     CORS 등 서버 설정
│  │  └─ health/                     상태 확인 API
│  ├─ src/main/resources/application.yml
│  └─ Dockerfile
├─ docker-compose.yml
└─ README.md
```

## 사전 준비

- Node.js `22.11.0` 이상 및 npm
- Java 21
- Android Studio와 Android SDK Platform Tools
- Android 실기기 사용 시 개발자 옵션과 USB 디버깅 활성화
- Docker Desktop(컨테이너로 백엔드를 실행할 때)

프론트엔드 패키지는 최초 한 번 설치합니다.

```powershell
cd C:\MemoA\FrontEnd
npm install
```

## 환경변수

프론트엔드 설정 파일을 생성합니다.

```powershell
cd C:\MemoA\FrontEnd
Copy-Item .env.example .env
```

Expo Go처럼 LAN으로 연결할 때는 `.env`의 주소를 개발 PC의 IPv4 주소로 변경합니다.

```text
EXPO_PUBLIC_API_BASE_URL=http://192.168.0.10:8080/api/v1
```

USB로 연결한 Android 개발 앱에서는 백엔드 포트도 reverse할 수 있습니다.

```text
EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:8080/api/v1
```

백엔드에서 사용할 수 있는 환경변수는 다음과 같습니다.

| 이름 | 기본값 | 설명 |
| --- | --- | --- |
| `PORT` | `8080` | 내장 Tomcat 포트 |
| `MEMOA_DATA_PATH` | `./data/memoa` | H2 데이터 파일 경로 |
| `MEMOA_AI_PROVIDER` | `groq` | `groq`, `openai` 또는 기존 외부 서버용 `gateway` |
| `GROQ_API_KEY` | 빈 값 | 백엔드 전용 Groq API 키 |
| `GROQ_MODEL` | `openai/gpt-oss-120b` | Groq에서 실행할 구조화 출력 지원 모델 |
| `OPENAI_API_KEY` | 빈 값 | 백엔드 전용 OpenAI API 키 |
| `OPENAI_MODEL` | `gpt-5-mini` | OpenAI 분석 모델 |
| `MEMOA_AI_ENDPOINT` | 빈 값 | `gateway` 모드의 외부 분석 API 주소 |
| `MEMOA_AI_API_KEY` | 빈 값 | `gateway` 모드의 Bearer 토큰 |

선택한 제공자의 키가 없거나 호출에 실패하면 서버의 한국어 규칙 기반 분석기가 사용됩니다.
이 경우 응답의 `analysisMethod`는 `SERVER_RULES`이며 화면에도 기본 분석이라고 표시합니다.
Groq 실패 시 OpenAI를 자동 호출하지 않습니다. 기존 OpenAI 키가 남아 있어도 `groq` 모드에서는 사용하지 않습니다.

## 백엔드 실행

### Spring Boot 로컬 실행

```powershell
cd C:\MemoA\BackEnd
.\gradlew.bat bootRun
```

Spring Boot가 내장 Tomcat을 시작하며 기본 주소는 `http://localhost:8080`입니다.

상태 확인:

```powershell
Invoke-RestMethod http://localhost:8080/api/v1/health
```

실행형 JAR 생성 및 실행:

```powershell
cd C:\MemoA\BackEnd
.\gradlew.bat clean test bootJar
java -jar build\libs\memoa.jar
```

### Docker 실행

프로젝트 루트에서 실행합니다.

```powershell
cd C:\MemoA
docker compose up --build -d
docker compose ps
```

로그와 종료 명령:

```powershell
docker compose logs -f memoa-api
docker compose down
```

H2 데이터는 `memoa-data` Docker 볼륨에 유지됩니다.

## 앱 실행

### IntelliJ 실행 구성

MemoA 루트를 IntelliJ로 열면 실행 구성 목록에서 백엔드와 프론트엔드를 따로 선택할 수 있습니다.

| 실행 구성 | 역할 |
| --- | --- |
| `Backend - Spring Boot` | `BackEnd`의 `bootRun`을 실행하고 내장 Tomcat을 8080 포트에 시작 |
| `Frontend - Android` | 설치된 개발 앱을 USB의 Metro에 연결해 빠르게 실행. 앱이 없으면 최초 설치도 자동 처리 |
| `Frontend - Reinstall Android` | Java 코드나 Android 설정 변경 후 APK를 다시 빌드하고 설치한 뒤 실행 |

백엔드와 프론트엔드는 서로 독립된 구성입니다. 서버가 필요한 기능을 테스트할 때는 `Backend - Spring Boot`를 먼저 실행한 뒤 `Frontend - Android`를 실행합니다. 화면만 확인할 때는 프론트엔드 구성만 실행해도 됩니다.

IntelliJ를 실행한 상태에서 구성이 바로 보이지 않으면 프로젝트를 닫았다가 `C:\MemoA`를 다시 열거나, `파일 → 디스크에서 모두 다시 로드`를 실행합니다. 이후 오른쪽 위 실행 구성 목록에서 원하는 구성을 선택하고 실행 버튼을 누릅니다.

`Frontend - Android`를 실행하기 전에는 휴대폰 잠금을 해제하고 USB 디버깅을 허용해야 합니다. `.env`의 API 주소는 USB reverse 방식에 맞게 다음 값으로 설정합니다.

```text
EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:8080/api/v1
```

평소 TypeScript 화면 코드를 테스트할 때는 `Frontend - Android`를 사용합니다. 이미 앱이 설치되어 있으면 APK 빌드와 설치를 생략하고 `127.0.0.1:8081` USB 주소로 앱을 엽니다. Java 코드나 Android 설정을 변경했을 때만 `Frontend - Reinstall Android`를 사용합니다. 별도의 Android App 구성을 함께 실행하거나 Metro에서 `a` 키를 누르면 LAN 주소가 선택될 수 있으므로 누르지 않습니다.

기기 캘린더 연동은 네이티브 모듈을 사용하므로 `expo-calendar`를 처음 받은 뒤에는 반드시 `Frontend - Reinstall Android` 또는 아래 명령으로 개발 앱을 다시 설치해야 합니다.

```powershell
cd C:\MemoA\FrontEnd
npm run android:idea:reinstall
```

### 테스트 방법 선택

| 테스트 목적 | 실행 방법 | Metro 필요 여부 |
| --- | --- | --- |
| 화면과 기본 기능을 빠르게 확인 | Expo Go | 필요 |
| 알림 감지·텍스트 공유 등 Android 네이티브 기능 개발 | Android 개발 앱 | 필요 |
| 사용자가 설치한 것과 같은 형태로 전체 동작 확인 | 테스트용 release APK | 불필요 |

### 평소 개발 테스트 권장 순서

Android 네이티브 기능까지 테스트할 때는 아래 순서로 실행합니다. 최초 한 번은 `npm install`과 개발 앱 설치가 필요하지만, 이후에는 1~4단계만 반복하면 됩니다.

#### 최초 한 번 준비

```powershell
cd C:\MemoA\FrontEnd
npm install
Copy-Item .env.example .env

cd android
.\gradlew.bat installDebug
```

`FrontEnd/.env`에는 USB reverse를 사용할 수 있도록 다음 주소를 설정합니다.

```text
EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:8080/api/v1
```

#### 1단계: 휴대폰 연결 확인

휴대폰 잠금을 해제하고 USB 디버깅을 허용합니다. 결과에서 휴대폰 옆에 `device`가 표시되어야 합니다.

```powershell
$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
& $adb devices -l
```

#### 2단계: 백엔드 실행

첫 번째 PowerShell을 열고 Spring Boot 서버를 실행합니다. 이 창은 테스트하는 동안 닫지 않습니다.

```powershell
cd C:\MemoA\BackEnd
.\gradlew.bat bootRun
```

서버가 시작되면 다른 PowerShell에서 상태를 확인할 수 있습니다.

```powershell
Invoke-RestMethod http://localhost:8080/api/v1/health
```

#### 3단계: Metro 실행

두 번째 PowerShell에서 Metro를 실행하고 창을 계속 열어 둡니다.

```powershell
cd C:\MemoA\FrontEnd
npm run start:dev -- --lan --port 8081
```

#### 4단계: 포트 연결 후 앱 실행

세 번째 PowerShell에서 백엔드와 Metro 포트를 휴대폰으로 연결한 다음 MemoA를 실행합니다.

```powershell
$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"

& $adb reverse tcp:8080 tcp:8080
& $adb reverse tcp:8081 tcp:8081

& $adb shell am start `
  -a android.intent.action.VIEW `
  -d "memoa://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081" `
  com.frontend
```

테스트를 종료할 때는 Metro와 Spring Boot가 실행 중인 PowerShell에서 각각 `Ctrl+C`를 누릅니다. 앱의 Java 코드나 Android 설정을 변경한 경우에는 `installDebug`를 다시 실행해야 하며, TypeScript 화면 코드만 변경한 경우에는 Metro가 변경사항을 자동 반영합니다.

### 1. Expo Go

PC와 휴대폰을 같은 네트워크에 연결하고 `.env`에 PC의 LAN IPv4 주소를 설정합니다.

```powershell
cd C:\MemoA\FrontEnd
npm start
```

터미널에 `Using Expo Go`가 표시되면 새 QR 코드를 Expo Go로 스캔합니다. Metro가 실행 중인 터미널은 앱을 사용하는 동안 닫지 않습니다.

Expo Go에서 사용할 수 없는 기능:

- Android 알림 자동 감지
- Android 시스템 텍스트 공유 수신
- `MemoaNotificationCapture` Java 네이티브 모듈

### 2. Android 개발 앱 — 권장 USB 실행법

`app-debug.apk`는 일반 Expo Go가 아니라 MemoA 전용 **development build**입니다. 디버그 빌드는 JavaScript를 Metro에서 받기 때문에 Metro가 반드시 실행 중이어야 하며, 처음 열면 Expo 개발 런처 안내가 한 번 표시될 수 있습니다.

#### 최초 설치 또는 네이티브 코드 변경 후

PowerShell에서 휴대폰 상태를 확인합니다. 결과가 `offline`이 아닌 `device`여야 합니다.

```powershell
$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
& $adb devices -l
```

APK를 빌드하고 설치합니다.

```powershell
cd C:\MemoA\FrontEnd\android
.\gradlew.bat installDebug
```

또는 Expo CLI가 빌드, 설치 및 Metro 실행을 한 번에 처리하게 할 수 있습니다.

```powershell
cd C:\MemoA\FrontEnd
npm run android:native
```

#### 설치된 앱을 다시 실행할 때

첫 번째 PowerShell에서 Metro를 실행하고 창을 계속 열어 둡니다.

```powershell
cd C:\MemoA\FrontEnd
npm run start:dev -- --lan --port 8081
```

두 번째 PowerShell에서 Metro와 백엔드 포트를 USB로 연결한 뒤 MemoA 개발 앱을 엽니다.

```powershell
$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"

& $adb reverse tcp:8081 tcp:8081
& $adb reverse tcp:8080 tcp:8080

& $adb shell am start `
  -a android.intent.action.VIEW `
  -d "memoa://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081" `
  com.frontend
```

이 USB 방식은 학교·공용 Wi-Fi의 기기 간 통신 차단 여부와 관계없이 동작합니다. `app-debug.apk`를 아이콘으로만 실행했을 때 Expo 형태의 개발 런처가 보이는 것은 정상이며, 위 딥링크 명령이 Metro 프로젝트를 열어 MemoA 화면으로 전환합니다.

### 3. Expo와 Metro 없이 설치 테스트

테스트용 release APK에는 JavaScript 번들이 포함되므로 Expo Go와 Metro가 필요하지 않습니다. 빌드하기 전에 `FrontEnd/.env`의 `EXPO_PUBLIC_API_BASE_URL`을 휴대폰에서 접근 가능한 백엔드 주소로 설정합니다.

예를 들어 개발 PC의 LAN IPv4 주소가 `192.168.0.10`이라면 다음과 같이 설정합니다. APK에는 빌드 시점의 주소가 포함되므로 주소를 바꾼 후에는 반드시 다시 빌드해야 합니다.

```text
EXPO_PUBLIC_API_BASE_URL=http://192.168.0.10:8080/api/v1
```

#### 1단계: 백엔드 실행

휴대폰과 PC를 같은 네트워크에 연결하고 백엔드를 실행합니다.

```powershell
cd C:\MemoA\BackEnd
.\gradlew.bat bootRun
```

#### 2단계: APK 빌드

```powershell
cd C:\MemoA\FrontEnd
npm run android:apk
```

생성 파일:

```text
C:\MemoA\FrontEnd\android\app\build\outputs\apk\release\app-release.apk
```

#### 3단계: APK 설치

휴대폰으로 APK를 직접 복사한 경우 파일 앱에서 APK를 열고, 요청이 나오면 해당 파일 앱의 `출처를 알 수 없는 앱 설치` 권한을 허용합니다.

USB로 설치할 때는 먼저 연결 상태를 확인합니다.

```powershell
$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
& $adb devices -l
& $adb install -r C:\MemoA\FrontEnd\android\app\build\outputs\apk\release\app-release.apk
```

마지막 출력이 `Success`이면 설치된 것입니다. `Performing Streamed Install`에서 오래 멈추거나 `Success`가 출력되지 않으면 APK를 먼저 전송한 뒤 직접 설치합니다. 60MB 이상의 APK는 USB 연결 상태에 따라 전송에 1~2분 이상 걸릴 수 있습니다.

```powershell
$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
$apk = "C:\MemoA\FrontEnd\android\app\build\outputs\apk\release\app-release.apk"

& $adb push $apk /data/local/tmp/memoa-release.apk
& $adb shell pm install -r -d /data/local/tmp/memoa-release.apk
& $adb shell rm -f /data/local/tmp/memoa-release.apk
```

기존 개발 앱과 서명이 충돌해 `INSTALL_FAILED_UPDATE_INCOMPATIBLE`가 표시될 경우 기존 MemoA 앱을 삭제한 뒤 다시 설치해야 합니다. 기존 앱 삭제 시 단말에 저장된 앱 데이터도 삭제됩니다.

#### 4단계: 앱 실행

휴대폰의 MemoA 아이콘을 누르거나 다음 명령으로 실행합니다.

```powershell
$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
& $adb shell am start -n com.frontend/.MainActivity
```

release APK 실행에는 Expo Go와 Metro가 필요하지 않지만, 로그인·서버 분석·일정 저장 기능을 사용하려면 백엔드는 계속 실행되어 있어야 합니다.

이 APK는 개발용 키로 서명된 내부 테스트 빌드입니다. Play Store나 외부 배포 전에는 별도의 release keystore와 안전한 키 관리 설정이 필요합니다.

## 주요 API

기본 경로는 `/api/v1`입니다.

| 메서드 | 경로 | 기능 |
| --- | --- | --- |
| `GET` | `/health` | 서버 상태 확인 |
| `POST` | `/auth/signup` | 회원가입 |
| `POST` | `/auth/login` | 로그인 |
| `POST` | `/analysis` | 메시지 분석 |
| `GET` | `/schedules` | 사용자 일정 조회 |
| `POST` | `/schedules` | 일정 저장 |
| `PUT` | `/schedules/{id}` | 일정 수정 및 완료 상태 변경 |
| `DELETE` | `/schedules/{id}` | 일정 삭제 |

일정 API는 로그인 응답의 토큰을 `Authorization: Bearer <token>` 헤더로 전달합니다.

## AI 분석 API 연동

[Groq Console](https://console.groq.com/keys)에서 무료 플랜으로 API 키를 발급합니다.
MemoA 루트에서 `.env.example`을 `.env`로 복사하고 발급한 키를 직접 입력합니다.
실제 키는 Git에 올리거나 프론트엔드의 `EXPO_PUBLIC_*` 변수에 넣지 않습니다.

```dotenv
MEMOA_AI_PROVIDER=groq
GROQ_API_KEY=여기에_본인의_Groq_API_키
GROQ_MODEL=openai/gpt-oss-120b
```

Spring Boot는 루트 또는 `BackEnd`에서 실행할 때 해당 `.env` 설정을 읽습니다.
IntelliJ의 `Backend - Spring Boot`는 `BackEnd`를 작업 폴더로 사용하므로 상위 루트의 `.env`도 읽습니다.
변경 후 백엔드를 재시작합니다. Docker Compose도 루트 `.env`의 변수를 컨테이너에 전달하므로
`docker compose up -d --build`로 반영합니다. `.env` 자체는 Docker 이미지에 복사하지 않습니다.

백엔드는 [Groq Structured Outputs](https://console.groq.com/docs/structured-outputs)의 strict JSON Schema를
사용해 제목·설명·날짜·시간·장소·준비 사항을 JSON으로 받습니다.
알림 발신자·대화방 출처 라벨은 메시지 본문에서 제거합니다.
원문을 길게 복사한 제목이나 미완료·거절·오류 응답은 AI 성공으로 처리하지 않습니다.
키와 원문은 서버 로그에 기록하지 않습니다.

Groq 무료 플랜에는 요청·토큰 사용량 제한이 있습니다. `HTTP 429`가 나오면
[Groq 계정의 사용 한도](https://console.groq.com/settings/limits)를 확인하고 제한이 풀린 뒤 다시 분석합니다.
자동으로 유료 플랜으로 전환하거나 다른 유료 API로 우회하지 않습니다.

분석 API 응답 예시입니다. 시간은 `HH:mm` 형식입니다.

```json
{
  "title": "[과제] 과학 수행평가 보고서 제출 (과학실)",
  "details": "과학실에서 실험 노트와 USB를 챙겨 보고서 최종본을 제출합니다.",
  "dueDate": "2026-09-12",
  "dueTime": "15:00",
  "location": "과학실",
  "preparations": ["실험 노트", "USB"],
  "sourceType": "SHARE",
  "confidence": 0.94,
  "needsReview": false,
  "analysisMethod": "GROQ"
}
```

`analysisMethod`는 `GROQ`, `OPENAI`, `GATEWAY`, `SERVER_RULES` 중 하나이며,
단말의 오프라인 기본 분석은 `DEVICE_RULES`를 사용합니다.
OpenAI를 명시적으로 선택하려면 `MEMOA_AI_PROVIDER=openai`, `OPENAI_API_KEY`, `OPENAI_MODEL`을 설정합니다.
기존 별도 분석 서버를 사용할 때만 `MEMOA_AI_PROVIDER=gateway`와 `MEMOA_AI_ENDPOINT`를 설정합니다.
이 서버는 `message`, `sourceType`, `referenceDate`, `language`, `instruction`, `responseSchema`를 받고
위와 같은 일정 필드를 반환하는 기존 방식입니다.

## 문제 해결

### `There was a problem loading the project`

이번에 확인된 실제 오류는 다음과 같습니다.

```text
java.io.IOException: unexpected end of stream on http://127.0.0.1:8081
```

Windows에서 Metro를 `--localhost`로 실행하면 환경에 따라 IPv6 `::1`에만 바인딩될 수 있습니다. 반면 `adb reverse tcp:8081 tcp:8081`은 IPv4 `127.0.0.1`로 연결되어 응답이 중간에 끊겼습니다.

해결 방법:

1. Metro를 `--localhost`가 아니라 `--lan`으로 실행합니다.
2. `adb reverse tcp:8081 tcp:8081`을 설정합니다.
3. 위 Android USB 실행 절차의 딥링크 명령으로 `127.0.0.1:8081` 프로젝트를 엽니다.

### 앱이 흰 화면으로 표시됨

- Metro가 실행 중인지 확인합니다.
- `http://127.0.0.1:8081/status`가 `packager-status:running`을 반환하는지 확인합니다.
- USB 개발 앱은 `adb reverse --list`에 `tcp:8081 tcp:8081`이 있어야 합니다.
- Expo Go는 PC와 휴대폰이 같은 네트워크여야 하며, Metro를 재시작해 새 QR을 사용해야 합니다.

### ADB가 `offline`으로 표시됨

- 휴대폰 잠금을 해제합니다.
- 데이터 전송이 가능한 다른 USB 케이블과 PC 본체 포트를 사용합니다.
- Android 개발자 옵션에서 USB 디버깅 권한 승인을 취소한 뒤 다시 연결합니다.
- RSA 인증 창에서 `항상 허용`을 선택합니다.

```powershell
$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
& $adb kill-server
& $adb start-server
& $adb devices -l
```

### 8081 포트가 이미 사용 중임

실행 중인 Metro 터미널을 종료하거나 해당 프로세스를 확인합니다.

```powershell
Get-NetTCPConnection -State Listen -LocalPort 8081
```

## 검증 명령

프론트엔드:

```powershell
cd C:\MemoA\FrontEnd
npx expo install --check
npx tsc --noEmit
npm test -- --runInBand
npm run lint
npx expo export --platform android --output-dir .expo\verify-export --clear
```

백엔드:

```powershell
cd C:\MemoA\BackEnd
.\gradlew.bat clean test bootJar
```

## 현재 제한사항

- AI 분석 결과는 항상 사용자가 검토한 뒤 저장해야 합니다.
- Android 알림에 실제 메시지 본문이 표시되지 않으면 분석할 수 없습니다.
- 실제 일정 푸시는 FCM 자격 증명과 Android 배포 설정이 추가로 필요합니다.
