# MemoA

MemoA는 카카오톡, 문자, 이메일 등에 포함된 과제·약속·준비물·마감 정보를 분석해 일정으로 정리하는 Android 앱입니다. 사용자는 AI 분석 결과를 확인하고 수정한 뒤 저장할 수 있으며, Android 알림과 텍스트 공유를 통해 일정 후보를 가져올 수 있습니다.

## 주요 기능

### 메시지 분석과 일정 관리

- 메시지 직접 입력 및 `memoa://capture?text=...` 딥링크 수신
- 해야 할 일, 날짜, 시간, 장소, 준비물 추출
- 원격 AI 분석 실패 시 한국어 규칙 기반 분석기로 자동 전환
- 분석 결과 확인·수정 후 일정 저장
- 일정 목록, 월간 캘린더, 날짜별 일정 확인
- 일정 완료 상태 변경

### 계정과 데이터

- 회원가입 및 로그인
- 30일 인증 토큰을 이용한 API 인증
- 서버 없이 화면을 확인할 수 있는 체험 모드
- 사용자별 일정 데이터를 H2 파일 데이터베이스에 저장
- 원본 메시지는 일정 테이블에 저장하지 않고 분석 요청에만 사용

### Android 네이티브 기능

- 다른 앱의 텍스트 공유 메뉴에서 MemoA로 메시지 전달
- 알림 접근 권한 확인 및 설정 화면 이동
- 카카오톡·문자 등에서 일정 표현이 포함된 알림 후보 수집
- 후보는 최대 20개까지 단말에 임시 저장하고 앱이 읽은 뒤 삭제
- Android 네이티브 코드는 Java로 작성

> Expo Go에서는 사용자 정의 네이티브 모듈을 불러올 수 없으므로 직접 입력, 분석, 일정 및 캘린더 기능만 사용할 수 있습니다. Android 알림 감지와 시스템 공유 기능은 Android 개발 빌드에서 테스트해야 합니다.

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
| `MEMOA_AI_ENDPOINT` | 빈 값 | 외부 AI 분석 API 주소 |
| `MEMOA_AI_API_KEY` | 빈 값 | 외부 AI Bearer 토큰 |

`MEMOA_AI_ENDPOINT`가 없거나 호출에 실패하면 서버의 한국어 규칙 기반 분석기가 사용됩니다.

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

외부 AI 게이트웨이는 `message`, `sourceType`, `referenceDate`, `language`, `responseSchema`를 받고 다음 형태의 JSON을 반환해야 합니다.

```json
{
  "title": "과학 수행평가 보고서 제출",
  "details": "",
  "dueDate": "2026-09-12",
  "dueTime": "15:00:00",
  "location": "과학실",
  "materials": ["실험 노트", "USB"],
  "sourceType": "SHARE",
  "confidence": 0.94,
  "needsReview": false
}
```

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
