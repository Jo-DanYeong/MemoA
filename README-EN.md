# MemoA

MemoA is an Android app that analyzes the meaning of tasks, promises, and deadlines contained in KakaoTalk, SMS, and email messages and organizes them into a schedule. Users can review and edit the date, time, location, and preparation items found by AI, then save them. Schedule candidates can be imported via Android notifications and text sharing.

## Key Features

### Message Analysis and Schedule Management

- Direct message input and deep link reception (`memoa://capture?text=...`)
- Interpret message meaning as title, description, date/time, location, and preparation items
- Automatically switch to Korean rule-based analyzer if remote AI analysis fails
- Verify and edit analysis results before saving the schedule
- View schedule list, monthly calendar, and daily schedules
- Automatically add saved schedules to the Android device's `MemoA` calendar
- Add a 30-minute reminder for timed events and use all-day events when no time is set
- Change schedule completion status

### Account and Data

- Sign up and login
- API authentication using 30-day auth token
- Demo mode to view the screen without a server
- User schedule data stored in H2 file database
- Only title, description, date/time, location, and preparation items that the user reviewed are saved as schedule data

### Android Native Features

- Share text from other apps to MemoA
- Check notification access permissions and navigate to settings
- Collect schedule-related notification candidates from KakaoTalk, SMS, etc.
- Store up to 20 candidates temporarily on the device and app reads then deletes them
- Check calendar read/write permission and show integration status in Settings
- Android native code written in Java

> Expo Go cannot load custom native modules, so only direct input, analysis, and MemoA's internal schedule/calendar features are available. Android notification detection, system sharing, and device calendar sync must be tested in the Android development build.

## Tech Stack

| Area | Technology |
| --- | --- |
| Mobile App | React Native 0.86, Expo SDK 57, TypeScript |
| Android Native | Java, NotificationListenerService, Intent/Deep Link |
| Backend | Java 21, Spring Boot 3.5, Spring Web, Spring Data JPA |
| Web Server | Spring Boot embedded Tomcat, default port `8080` |
| Database | H2 file database |
| Container | Docker, Docker Compose |

## Project Structure

Frontend and backend are independent sibling projects under the root, not nested.

```text
MemoA/
├─ FrontEnd/                         React Native Android app
│  ├─ App.tsx                        Top-level app component
│  ├─ src/
│  │  ├─ MemoaApp.tsx                Screen navigation and app state management
│  │  ├─ screens/                    Login, home, input, review, calendar, settings
│  │  ├─ components/                 Common UI components
│  │  ├─ services/api.ts             Spring Boot API calls
│  │  ├─ services/deviceCalendar.ts  Android device calendar sync
│  │  ├─ services/localAnalyzer.ts   Device-based rule analyzer
│  │  └─ native/capture.ts           Sharing/notification native module connection
│  ├─ android/
│  │  └─ app/src/main/java/com/frontend/
│  │     ├─ MainActivity.java
│  │     ├─ MainApplication.java
│  │     ├─ NotificationCaptureService.java
│  │     └─ NotificationCaptureModule.java
├─ BackEnd/                          Spring Boot API server
│  ├─ src/main/java/app/memoa/
│  │  ├─ auth/                       Sign up, login, token
│  │  ├─ analysis/                   Remote AI and rule-based analysis
│  │  ├─ schedule/                   Schedule CRUD
│  │  ├─ common/                     Common error handling
│  │  ├─ config/                     CORS and server settings
│  │  └─ health/                     Health check API
│  ├─ src/main/resources/application.yml
│  └─ Dockerfile
├─ docker-compose.yml
└─ README.md
```

## Prerequisites

- Node.js `22.11.0` or later and npm
- Java 21
- Android Studio and Android SDK Platform Tools
- For physical Android devices: Developer options enabled and USB debugging enabled
- Docker Desktop (when running backend in containers)

Install frontend packages once:

```powershell
cd C:\MemoA\FrontEnd
npm install
```

## Environment Variables

Create a frontend config file:

```powershell
cd C:\MemoA\FrontEnd
Copy-Item .env.example .env
```

When connecting via LAN like Expo Go, change the address in `.env` to your development PC's IPv4 address:

```text
EXPO_PUBLIC_API_BASE_URL=http://192.168.0.10:8080/api/v1
```

For Android dev apps connected via USB, you can also reverse the backend port:

```text
EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:8080/api/v1
```

Backend environment variables:

| Name | Default | Description |
| --- | --- | --- |
| `PORT` | `8080` | Embedded Tomcat port |
| `MEMOA_DATA_PATH` | `./data/memoa` | H2 data file path |
| `MEMOA_AI_ENDPOINT` | Empty | External AI analysis API address |
| `MEMOA_AI_API_KEY` | Empty | External AI Bearer token |

If `MEMOA_AI_ENDPOINT` is missing or the call fails, the server's Korean rule-based analyzer is used.

## Running the Backend

### Spring Boot Local Run

```powershell
cd C:\MemoA\BackEnd
.\gradlew.bat bootRun
```

Spring Boot starts the embedded Tomcat; default address is `http://localhost:8080`.

Health check:

```powershell
Invoke-RestMethod http://localhost:8080/api/v1/health
```

Generate and run executable JAR:

```powershell
cd C:\MemoA\BackEnd
.\gradlew.bat clean test bootJar
java -jar build\libs\memoa.jar
```

### Docker Run

Run from the project root:

```powershell
cd C:\MemoA
docker compose up --build -d
docker compose ps
```

Logs and shutdown:

```powershell
docker compose logs -f memoa-api
docker compose down
```

H2 data persists in the `memoa-data` Docker volume.

## Running the App

### IntelliJ Run Configurations

Open MemoA root in IntelliJ to see backend and frontend run configs separately in the run config dropdown.

| Configuration | Role |
| --- | --- |
| `Backend - Spring Boot` | Runs `bootRun` from `BackEnd` and starts embedded Tomcat on port 8080 |
| `Frontend - Android` | Connects the installed dev app to USB Metro for quick run; auto-installs if not present |
| `Frontend - Reinstall Android` | Rebuilds and reinstalls APK after Java code or Android config changes, then runs |

Backend and frontend are independent. Run `Backend - Spring Boot` first when testing features that need the server, then `Frontend - Android`. For screen-only tests, frontend alone is enough.

If configs don't appear immediately, close and reopen the project at `C:\MemoA`, or go to `File → Reload All from Disk`. Then select your desired config from the run dropdown in the top-right and press Run.

Before running `Frontend - Android`, unlock the phone and grant USB debugging permission. Set `.env` API address for USB reverse method:

```text
EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:8080/api/v1
```

For routine TypeScript screen code testing, use `Frontend - Android`. If the app is already installed, APK build and install are skipped, and the app opens at `127.0.0.1:8081` via USB. Use `Frontend - Reinstall Android` only when Java code or Android settings change. Don't press `a` in Metro or run separate Android App configs, as they may select the LAN address.

### Choosing a Test Method

| Test Purpose | How to Run | Metro Required |
| --- | --- | --- |
| Quick screen and basic feature check | Expo Go | Yes |
| Develop Android native features (notification detection, text sharing) | Android dev app | Yes |
| Full run test like end users | Test release APK | No |

### Recommended Development Test Order

Test with Android native features using this sequence. Initial setup needs `npm install` and dev app install, but later only steps 1–4 repeat.

#### One-Time Setup

```powershell
cd C:\MemoA\FrontEnd
npm install
Copy-Item .env.example .env

cd android
.\gradlew.bat installDebug
```

Set `.env` to use USB reverse:

```text
EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:8080/api/v1
```

#### Step 1: Check Phone Connection

Unlock phone and allow USB debugging. Result should show `device` next to phone.

```powershell
$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
& $adb devices -l
```

#### Step 2: Run Backend

Open first PowerShell and run Spring Boot server. Keep this window open.

```powershell
cd C:\MemoA\BackEnd
.\gradlew.bat bootRun
```

Check health in another PowerShell:

```powershell
Invoke-RestMethod http://localhost:8080/api/v1/health
```

#### Step 3: Run Metro

Open second PowerShell and run Metro. Keep this window open.

```powershell
cd C:\MemoA\FrontEnd
npm run start:dev -- --lan --port 8081
```

#### Step 4: Connect Ports and Run App

Open third PowerShell, connect backend and Metro ports to phone, then run MemoA:

```powershell
$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"

& $adb reverse tcp:8080 tcp:8080
& $adb reverse tcp:8081 tcp:8081

& $adb shell am start `
  -a android.intent.action.VIEW `
  -d "memoa://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081" `
  com.frontend
```

To end testing, press `Ctrl+C` in PowerShells running Metro and Spring Boot. If you change Java code or Android settings, run `installDebug` again. TypeScript screen code changes are auto-reflected by Metro.

### 1. Expo Go

Connect PC and phone to same network and set PC's LAN IPv4 address in `.env`:

```powershell
cd C:\MemoA\FrontEnd
npm start
```

When terminal shows `Using Expo Go`, scan the new QR code with Expo Go. Keep Metro terminal open while using the app.

Features unavailable in Expo Go:

- Android notification auto-detection
- Android system text share receiving
- `MemoaNotificationCapture` Java native module

### 2. Android Dev App — Recommended USB Method

`app-debug.apk` is a **development build** for MemoA, not generic Expo Go. Debug builds need Metro to load JavaScript, so Metro must be running. On first open, you may see Expo dev launcher guide.

#### Initial Install or After Native Code Changes

Check phone status in PowerShell. Should show `device`, not `offline`:

```powershell
$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
& $adb devices -l
```

Build and install APK:

```powershell
cd C:\MemoA\FrontEnd\android
.\gradlew.bat installDebug
```

Or let Expo CLI build, install, and run Metro in one go:

```powershell
cd C:\MemoA\FrontEnd
npm run android:native
```

#### Rerun Installed App

Open first PowerShell and run Metro (keep open):

```powershell
cd C:\MemoA\FrontEnd
npm run start:dev -- --lan --port 8081
```

Open second PowerShell, connect ports via USB, then open MemoA dev app:

```powershell
$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"

& $adb reverse tcp:8081 tcp:8081
& $adb reverse tcp:8080 tcp:8080

& $adb shell am start `
  -a android.intent.action.VIEW `
  -d "memoa://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081" `
  com.frontend
```

This USB method works regardless of school or public Wi-Fi blocking inter-device traffic. Seeing Expo-style dev launcher on first icon tap is normal; the deep link above switches to MemoA screen.

### 3. Install Test Without Expo or Metro

Test release APK includes JavaScript bundle, so Expo Go and Metro aren't needed. Before building, set `.env` `EXPO_PUBLIC_API_BASE_URL` to a backend address accessible from phone.

For example, if dev PC LAN IPv4 is `192.168.0.10`:

```text
EXPO_PUBLIC_API_BASE_URL=http://192.168.0.10:8080/api/v1
```

APK includes the build-time address, so rebuild after changing.

#### Step 1: Run Backend

Connect PC and phone to same network and run backend:

```powershell
cd C:\MemoA\BackEnd
.\gradlew.bat bootRun
```

#### Step 2: Build APK

```powershell
cd C:\MemoA\FrontEnd
npm run android:apk
```

Output file:

```text
C:\MemoA\FrontEnd\android\app\build\outputs\apk\release\app-release.apk
```

#### Step 3: Install APK

Direct copy: Open APK from file app on phone and grant install permission if prompted.

USB install — first check connection:

```powershell
$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
& $adb devices -l
& $adb install -r C:\MemoA\FrontEnd\android\app\build\outputs\apk\release\app-release.apk
```

If output is `Success`, install worked. Long hang or no `Success` means transfer first, then install. Large APKs (60MB+) take 1–2+ minutes via USB.

```powershell
$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
$apk = "C:\MemoA\FrontEnd\android\app\build\outputs\apk\release\app-release.apk"

& $adb push $apk /data/local/tmp/memoa-release.apk
& $adb shell pm install -r -d /data/local/tmp/memoa-release.apk
& $adb shell rm -f /data/local/tmp/memoa-release.apk
```

If `INSTALL_FAILED_UPDATE_INCOMPATIBLE` appears, delete existing MemoA app first then reinstall (this also deletes on-device app data).

#### Step 4: Run App

Tap MemoA icon on phone or run:

```powershell
$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
& $adb shell am start -n com.frontend/.MainActivity
```

Release APK doesn't need Expo Go or Metro, but backend must keep running for login, server analysis, and schedule save features.

This APK is dev-signed internally for testing. Before Play Store or external release, use separate release keystore and secure key management.

## Core APIs

Base path is `/api/v1`.

| Method | Path | Function |
| --- | --- | --- |
| `GET` | `/health` | Check server status |
| `POST` | `/auth/signup` | Sign up |
| `POST` | `/auth/login` | Login |
| `POST` | `/analysis` | Analyze message |
| `GET` | `/schedules` | Get user schedules |
| `POST` | `/schedules` | Save schedule |
| `PUT` | `/schedules/{id}` | Update and mark schedule complete |
| `DELETE` | `/schedules/{id}` | Delete schedule |

Schedule APIs pass the login response token as `Authorization: Bearer <token>` header.

## AI Analysis API Integration

External AI gateway receives `message`, `sourceType`, `referenceDate`, `language`, `instruction`, `responseSchema`. Interpret the full message meaning and return JSON below; time is `HH:mm` only.

```json
{
  "title": "Science report submission",
  "details": "Submit final report in science lab with experiment notes and USB.",
  "dueDate": "2026-09-12",
  "dueTime": "15:00",
  "location": "Science Lab",
  "preparations": ["Experiment Notes", "USB"],
  "sourceType": "SHARE",
  "confidence": 0.94,
  "needsReview": false
}
```

## Troubleshooting

### `There was a problem loading the project`

Real error found:

```text
java.io.IOException: unexpected end of stream on http://127.0.0.1:8081
```

On Windows, `--localhost` Metro may bind only to IPv6 `::1` in some environments. But `adb reverse tcp:8081 tcp:8081` connects to IPv4 `127.0.0.1`, breaking the stream.

Fix:

1. Run Metro with `--lan`, not `--localhost`.
2. Set `adb reverse tcp:8081 tcp:8081`.
3. Open project with `127.0.0.1:8081` via deep link in Android USB steps above.

### App Shows Blank Screen

- Verify Metro is running.
- Check `http://127.0.0.1:8081/status` returns `packager-status:running`.
- USB dev app needs `tcp:8081 tcp:8081` in `adb reverse --list`.
- Expo Go needs PC and phone on same network; restart Metro for new QR.

### ADB Shows `offline`

- Unlock phone.
- Use different USB cable and PC native port.
- Cancel and re-grant USB debugging approval in developer options.
- Select `Always Allow` for RSA auth prompt.

```powershell
$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
& $adb kill-server
& $adb start-server
& $adb devices -l
```

### Port 8081 Already in Use

Close running Metro terminal or check the process:

```powershell
Get-NetTCPConnection -State Listen -LocalPort 8081
```

## Validation Commands

Frontend:

```powershell
cd C:\MemoA\FrontEnd
npx expo install --check
npx tsc --noEmit
npm test -- --runInBand
npm run lint
npx expo export --platform android --output-dir .expo\verify-export --clear
```

Backend:

```powershell
cd C:\MemoA\BackEnd
.\gradlew.bat clean test bootJar
```

## Current Limitations

- AI analysis results must always be reviewed by user before saving.
- If notification doesn't show actual message body, analysis fails.
- Real schedule push needs FCM credentials and Android deployment setup.
