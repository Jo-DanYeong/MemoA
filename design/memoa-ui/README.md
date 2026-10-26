# MemoA UI/UX 디자인

12종의 필수 화면과 세부 흐름·상태를 포함한 **47개 360×800dp 시안**입니다.

## 먼저 확인하기

- **preview.html**을 브라우저로 열면 모든 화면과 주요 사용자 흐름을 확인할 수 있습니다.
- 화면 내부를 스크롤하면 입력 폼 하단, 원본 메시지, AI 일정 후보 등을 확인할 수 있습니다.
- **전체 시안**에서 47개 화면을 한 번에 살펴볼 수 있습니다.
- **흐름 체험** 또는 홈의 **직접 입력**으로 시작하세요. AI 분석과 계정 기능은 샘플로 동작합니다. 실제 서버나 메시지 서비스에 연결되지 않습니다.

## Figma 작업 상태

Figma 파일은 생성되었지만 Starter 계정의 MCP 호출 한도로 화면 생성 작업이 중단되었습니다. 클라우드 파일에는 이 시안의 화면이 아직 배치되지 않았습니다.

생성된 파일: https://www.figma.com/design/fA0xyJ3BnG3ze5nVsrLKUF

**figma-import** 폴더는 편집 가능한 텍스트·벡터·프레임·컴포넌트·색상 변수로 이 시안을 가져오는 로컬 Figma 개발 플러그인입니다. Figma에서의 실제 실행은 현재 도구 한도로 검증하지 못했습니다. 로컬 화면 렌더링과 파일 구문 검증은 완료했습니다.

## Figma에 가져오기

1. Figma 데스크톱에서 위 파일 또는 새 디자인 파일을 엽니다. 빈 페이지 하나로 시작하는 파일을 권장합니다. Noto Sans KR 글꼴이 필요합니다.
2. **Plugins → Development → Import plugin from manifest…**에서 **figma-import/manifest.json**을 선택합니다.
3. Development 메뉴에서 **MemoA UI · 디자인 가져오기**를 실행합니다.
4. 안내·디자인 시스템 / 컴포넌트 / 화면 페이지가 생성됩니다. 화면 페이지에는 주요 버튼의 프로토타입 연결도 포함됩니다.

공식 안내: https://help.figma.com/hc/en-us/articles/360042786733-Create-a-plugin-for-development

플러그인의 실행 권한이나 개발 메뉴가 제한된 환경에서는 **screens** 폴더의 SVG를 캔버스로 끌어와 시각 시안을 가져올 수 있습니다. SVG는 컴포넌트 및 프로토타입 연결을 포함하지 않으며, 텍스트가 윤곽선으로 변환될 수 있습니다.

## 디자인 시스템

- Material 3 기반의 밝은 배경과 둥근 카드
- 주요 색상: 블루 #245BCE, 보조 블루 #E9F0FF, AI 안내 민트 #E4F5EF
- 글꼴: Noto Sans KR, 본문 14–16sp, 제목 18–28sp
- 모든 인터랙션 터치 영역: 최소 48×48dp
- 4개 하단 탭: 홈 / 캘린더 / 일정 목록 / 설정
- 날짜 셀: 48×48dp, 버튼 높이 52dp
- 시간 표기: HH:mm, 24시간제
- 색상만으로 상태를 구분하지 않고 텍스트 및 아이콘 병행

### 주요 색 대비

| 전경 / 배경 | 대비 |
|---|---:|
| surface / blue | 6.06:1 |
| ink / bg | 13.56:1 |
| muted / surface | 5.60:1 |
| green / mint | 5.95:1 |
| amber / amberSoft | 5.87:1 |
| red / redSoft | 5.70:1 |

## UX 결정

- AI 추출 요약은 민트색 읽기 전용 영역, 수정값은 흰색 입력 영역으로 구분합니다.
- 날짜 또는 시간이 불명확하면 확인 필요를 표시합니다. 확인 전 저장은 비활성화합니다.
- 알림 감지는 후보 제안만 하며 사용자 확인 없이 저장하지 않습니다.
- 알림 접근 권한과 일정 알림 표시 권한을 구분합니다. 거부해도 직접 입력과 공유는 계속 사용할 수 있습니다.
- 원본 메시지는 분석 확인 단계에서 미리 봅니다. 저장 기본값은 보관하지 않음으로 제안했습니다. 실제 처리·보관 정책은 서비스 정책에 맞춰 확정해야 합니다.
- 삭제는 확인 다이얼로그를 거칩니다.
- 샘플 기준일은 2026.09.07(월), 이번 주 금요일은 **2026.09.11(금)**, 시간은 **14:00**입니다.

## 화면 목록

| 파일 키 | 화면 | 구분 |
|---|---|---|
| splash | 01 스플래시 | 시작과 계정 |
| onboarding | 02 온보딩 | 시작과 계정 |
| login | 03 로그인 | 시작과 계정 |
| login-error | 03a 로그인 · 입력 오류 | 시작과 계정 |
| login-loading | 03b 로그인 · 로딩 | 시작과 계정 |
| signup | 04 회원가입 | 시작과 계정 |
| signup-error | 04a 회원가입 · 오류 | 시작과 계정 |
| reset | 04b 비밀번호 재설정 | 시작과 계정 |
| reset-sent | 04c 재설정 안내 | 시작과 계정 |
| home | 05 홈 | 메시지와 분석 |
| home-empty | 05a 홈 · 빈 상태 | 메시지와 분석 |
| share | 06 다른 앱에서 공유하기 | 메시지와 분석 |
| input | 07 메시지 입력 | 메시지와 분석 |
| input-shared | 07a 공유받은 메시지 | 메시지와 분석 |
| input-empty | 07b 메시지 입력 · 빈 상태 | 메시지와 분석 |
| analyzing | 08 AI 분석 중 | 메시지와 분석 |
| analysis-error | 08a AI 분석 · 오류 | 메시지와 분석 |
| analysis-none | 08b AI 분석 · 후보 없음 | 메시지와 분석 |
| result | 09 분석 결과 확인 | 결과 확인과 저장 |
| result-review | 09a 분석 결과 · 확인 필요 | 결과 확인과 저장 |
| edit | 14 일정 수정 | 결과 확인과 저장 |
| manual | 14a 일정 직접 추가 | 결과 확인과 저장 |
| saved | 10 일정 저장 완료 | 결과 확인과 저장 |
| suggestion | 11 알림 감지 · 일정 제안 | 권한과 제안 |
| calendar | 12 캘린더 | 일정 관리 |
| calendar-empty | 12a 캘린더 · 빈 날짜 | 일정 관리 |
| list | 13 일정 목록 · 오늘 | 일정 관리 |
| list-upcoming | 13a 일정 목록 · 예정 | 일정 관리 |
| list-complete | 13b 일정 목록 · 완료 | 일정 관리 |
| search-empty | 13c 검색 · 결과 없음 | 일정 관리 |
| filter | 13d 일정 필터 | 일정 관리 |
| detail | 14 일정 상세 | 일정 관리 |
| detail-complete | 14b 일정 상세 · 완료 | 일정 관리 |
| delete-confirm | 15 삭제 확인 | 일정 관리 |
| deleted | 15a 일정 삭제 완료 | 일정 관리 |
| reminder | 16 일정 알림 | 일정 관리 |
| settings | 17 설정 | 설정과 권한 |
| permission | 18 알림 접근 권한 안내 | 설정과 권한 |
| permission-denied | 18a 권한 거부 상태 | 설정과 권한 |
| permission-enabled | 18b 권한 허용 상태 | 설정과 권한 |
| android-permission | 18c 시스템 권한 이동 안내 | 설정과 권한 |
| notification-settings | 19 일정 알림 설정 | 설정과 권한 |
| notification-denied | 19a 알림 표시 권한 꺼짐 | 설정과 권한 |
| privacy | 20 개인정보와 원본 메시지 | 설정과 권한 |
| logout | 21 로그아웃 확인 | 설정과 권한 |
| app-info | 22 앱 정보 | 설정과 권한 |
| terms | 23 이용약관 및 개인정보 | 설정과 권한 |

## 파일 구성

- preview.html + design-data.js + enhance.js: 인터랙티브 검토본
- screens/*.svg: 각 화면의 360×800 벡터 시안
- previews/*.png: 렌더링해 점검한 각 화면과 스크롤 하단 이미지
- overview.png: 주요 화면 요약 이미지
- figma-import/manifest.json + code.js: Figma 가져오기 플러그인
- design-spec.json: 전체 화면과 공통 컴포넌트의 구조화된 원본
- build.cjs / package.cjs: 생성 스크립트
- qa-report.json: 화면 크기·글자 크기·터치 영역·오버플로·주요 화면 전환 점검 결과

아이콘: Lucide (ISC License). 아이콘 원본을 편집 가능한 SVG로 사용합니다.
