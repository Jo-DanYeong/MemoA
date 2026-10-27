# 무료 Apple 계정으로 iPhone에서 MemoA 테스트

이 절차는 Windows PC, iPhone, 무료 Apple 계정으로 본인 앱을 테스트하기 위한 것입니다.
GitHub의 macOS 빌드 환경에서 **서명 없는 실기기용 Release IPA**를 만들고,
Windows의 Sideloadly에서 직접 서명하여 iPhone에 설치합니다.
GitHub에는 Apple ID, 비밀번호, 인증서, 프로비저닝 프로파일을 등록하지 않습니다.

## 1. IPA 빌드

GitHub Actions의 `iOS - Unsigned IPA`를 사용합니다.
빌드 설정은 `.github/workflows/ios-sideload.yml`입니다.

- `codex/ios-sideload-test` 브랜치에 프론트엔드 변경을 push하면 자동 빌드합니다.
- 워크플로가 기본 브랜치에 포함된 후에는 Actions의 **Run workflow**로도 실행할 수 있습니다.
- Repository variable `MEMOA_IOS_TEST_API_BASE_URL`에 iPhone에서 접속 가능한 API 주소를 지정합니다.
- 수동 실행 시 `api_base_url`을 입력하면 해당 빌드에서만 변수 대신 사용합니다.
- 예: `http://192.168.1.10:8080/api/v1`. `127.0.0.1`과 `localhost`는 iPhone 자신을 가리키므로 사용하지 않습니다.

실기기용 빌드는 표준 GitHub-hosted macOS runner에서 진행합니다.
Expo 라이브러리에 필요한 Swift 버전을 위해 Xcode 26.3을 명시합니다.
공개 저장소에서는 표준 runner 사용이 무료이며, 저장소 공개 범위를 변경하지 않습니다.
소스의 로컬 `ios/`와 `android/`는 건드리지 않고 일회용 runner 안에서 iOS 프로젝트만 재생성합니다.
로컬 HTTP 개발 서버 연결은 이 개인 테스트 IPA에서만 허용합니다.
IPA와 빌드 정보에는 서버 주소가 포함됩니다. 사설 Wi-Fi 주소를 지정하는 것만으로
PC 서버가 인터넷에 공개되지는 않습니다. 포트 포워딩 없이 같은 신뢰할 수 있는
Wi-Fi에서 테스트용 계정을 사용하세요. HTTP 통신에는 암호화가 적용되지 않습니다.
`.env`, 로컬 DB, Apple 서명 키는 업로드하거나 IPA에 포함하지 않습니다.

빌드 성공 후 해당 실행의 **Artifacts → memoa-ios-unsigned**를 다운로드하고 ZIP을 풉니다.

- `MemoA-unsigned.ipa`: Sideloadly에 넣을 앱
- `MemoA-unsigned.ipa.sha256`: 파일 무결성 확인용
- `build-info.json`: 빌드한 커밋과 서버 주소

IPA는 앱의 JavaScript까지 포함하므로 **Metro와 Expo Go가 필요 없습니다**.

## 2. Sideloadly 설치와 iPhone 연결

1. [Sideloadly 공식 사이트](https://sideloadly.io/)에서 Windows 버전을 설치합니다.
2. Sideloadly 안내에 맞는 Apple iTunes/iCloud 구성 요소를 준비합니다.
   기존 Store 버전과 충돌하는 경우 공식 설치 안내를 먼저 확인합니다.
3. iPhone을 USB로 연결하고 잠금을 해제한 뒤, PC 신뢰 안내를 직접 확인합니다.
4. Sideloadly에서 iPhone을 선택하고 `MemoA-unsigned.ipa`를 넣습니다.
5. Apple 계정 로그인과 필요한 인증은 Sideloadly에서 직접 진행합니다.
   Apple 비밀번호나 인증 코드를 채팅, 저장소, Actions secret에 보내지 않습니다.
6. 설치 후 iPhone에서 개발자 신뢰/개발자 모드 안내가 나오면 직접 설정합니다.

무료 계정의 서명은 7일 후 만료되며, 갱신이 필요합니다.
무료 계정은 동시에 설치할 수 있는 앱 수에도 제한이 있습니다.
자세한 사항은 [Sideloadly FAQ](https://sideloadly.io/faq)를 확인합니다.

## 3. 백엔드와 연결해서 테스트

1. PC와 iPhone을 같은 Wi-Fi에 연결합니다.
2. IntelliJ에서 `Backend - Spring Boot`를 실행합니다.
3. iPhone Safari에서 `http://<PC의 Wi-Fi IP>:8080/api/v1/health`를 열어 서버 연결을 확인합니다.
4. MemoA를 열고 로그인 또는 체험 모드로 메시지 입력·분석·일정 저장을 확인합니다.

서버 연결이 안 되면 PC의 방화벽과 공유기의 기기 간 통신 제한을 확인합니다.
Wi-Fi IP가 바뀌면 새 주소로 IPA를 다시 빌드해야 합니다.
서버 없이도 체험 모드에서 단말 분석과 앱 내부 일정 화면을 확인할 수 있습니다.

## 테스트 범위

- 직접 입력, 메시지 분석과 수정, 앱 내부 일정 목록 및 캘린더: 테스트 대상
- 다른 앱 알림 자동 수집: 현재 Android 전용
- iPhone 시스템 공유 확장 및 Apple Calendar 연동: 현재 미구현

이 IPA는 개인 테스트용이며, App Store/TestFlight 배포용 파일이 아닙니다.
