# MemoA FrontEnd

MemoA의 Expo SDK 57 + React Native 0.86 모바일 앱입니다. 프로젝트 전체 기능, 구조, 환경변수, 백엔드 및 Docker 실행법은 [루트 README](../README.md)를 참고하세요.

## 빠른 실행

Expo Go:

```powershell
cd C:\MemoA\FrontEnd
npm install
npm start
```

설치된 Android development build용 Metro:

```powershell
cd C:\MemoA\FrontEnd
npm run start:dev -- --lan --port 8081
```

Android 최초 빌드 및 설치:

```powershell
cd C:\MemoA\FrontEnd
npm run android:native
```

USB에서 `There was a problem loading the project` 오류가 발생하면 루트 README의 **Android 개발 앱 — 권장 USB 실행법**과 **문제 해결** 절을 따르세요.
