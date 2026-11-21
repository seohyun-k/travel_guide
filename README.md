# 🇭🇰 Hong Kong Trip 2026 — 인터랙티브 여행 플래너

2026년 12월 1일(화) ~ 5일(토) 홍콩 4박 5일 여행을 위한 모바일 우선 PWA 웹앱입니다.
날짜별 일정과 Google 지도의 실제 이동 경로가 연동되며, 여행 중 일정을 자유롭게 고칠 수 있습니다.

## 주요 기능

| 화면 | 기능 |
| --- | --- |
| **홈** | D-Day, 항공편, 오늘 일정/다음 방문 장소 + 이동 시간, 날짜별 카드(가로 스와이프), 전체 지도 미리보기, 숙소 정보 |
| **지도·일정** | 상단 날짜 탭 → 일정·지도 동시 변경 / 번호 마커(카테고리 아이콘) / Routes API 실제 경로(도보=점선, MTR·버스·트램=노선 색, 페리=파선) / 경로 클릭 시 출발·도착·소요 시간 / 마커 ↔ 일정 양방향 강조 / 전체 일정 보기 / GPS 현재 위치 / 전체 경로 맞춤 / 모바일 바텀시트(3단 스냅) · 데스크톱 좌우 분할 |
| **장소 상세** | 한/영 이름, Google 사진, 주소, 영업시간, 평점, 추천 시간·체류 시간, 볼거리·사진 스팟, 추천 메뉴·예상 비용, 홈페이지, Google Maps 길찾기 |
| **편집** | 추가·삭제·시간 수정, 드래그 앤 드롭 순서 변경(시간 슬롯 자동 재배정), Google 장소 검색 후 추가, 다른 날짜로 이동/하루 일정 교환, 일괄 시간 이동, 날짜별·전체 초기화 |
| **특수 일정** | 12/3 학회 종료 시간 입력 → 이후 관광 일정 자동 이동 / 12/5 공항 도착 목표(13:30) 고정, 누적 지연 시 경고 / 이동 시간 부족 충돌 표시 |
| **즐겨찾기** | 사진 명소·맛집·카페 필터, 추천 장소, 바로 일정에 추가 |
| **준비·경비** | 체크리스트(여권·항공권·숙소·디즈니 티켓·옥토퍼스·eSIM·보조배터리·환전) / 경비: HKD·KRW, 예상·실제, 카테고리별 합계, 환율 직접 입력 또는 외부 환율 불러오기 |
| **설정** | API 상태, 장소 검증 결과, 경로 재계산, JSON 내보내기/가져오기, 전체 초기화, PWA 설치 안내 |

모든 데이터는 브라우저(localStorage)에 자동 저장되고, 서비스 워커가 앱 화면을 캐시하므로 오프라인에서도 저장된 일정·경로를 볼 수 있습니다.

## 데이터 정확성 원칙

- 장소 좌표·주소·Place ID·영업시간·사진은 **Google Places API (New)** 응답만 사용합니다. 검색 결과가 홍콩 밖이거나 예상 지역과 주소가 다르면 ‘주소 대조 필요’, 찾지 못하면 ‘장소 확인 불가’로 표시합니다.
- 경로·이동 시간·대중교통 노선은 **Google Routes API** 응답만 사용합니다. 경로를 받지 못한 구간은 **직선으로 잇지 않고** ‘경로 미지원’과 Google Maps 길찾기 링크를 보여줍니다.
- API 키가 없으면 OpenStreetMap 샘플 지도에 **근사 위치(점선 마커·미검증 배지)** 만 표시하며 경로선은 그리지 않습니다. 근사 좌표를 확신할 수 없는 장소(예: Wa So Cafe, 디즈니랜드 내부 어트랙션)는 샘플 지도에서도 제외합니다.
- ‘코즈웨이베이 저녁’처럼 지역 단위 일정은 특정 식당을 지어내지 않고 지역으로 둡니다. 편집 → Google 장소 검색으로 실제 식당을 지정하세요.
- 추천 메뉴·예상 비용·사진 스팟은 참고용 가이드입니다. 디즈니랜드 개장·공연 시간, 페리 시간표는 공식 사이트에서 확인 후 수정하세요.

## 📱 폰에서 쓰기 — 웹사이트로 공개 (GitHub Pages, 무료)

주소만 알면 누구나 폰 브라우저로 열 수 있고, ‘홈 화면에 추가’하면 앱처럼 설치됩니다.

1. 이 브랜치를 `main` 에 병합합니다 (배포 워크플로는 `main` 에 푸시될 때 실행).
2. 저장소 **Settings → Pages → Build and deployment → Source** 를 **GitHub Actions** 로 바꿉니다 (최초 1회).
3. (선택, 권장) **Settings → Secrets and variables → Actions → New repository secret**
   - 이름 `GOOGLE_MAPS_API_KEY`, 값: 브라우저용 키
   - Google Cloud 에서 이 키를 **HTTP 리퍼러 `https://seohyun-k.github.io/*`** 로 제한하고, API 제한은 **Maps JavaScript API, Places API (New), Routes API** 를 허용
   - 시크릿이 없어도 배포는 되며, 샘플 지도 모드로 동작합니다.
4. **Actions → Deploy to GitHub Pages → Run workflow** (또는 main 에 푸시) → 몇 분 뒤
   **https://seohyun-k.github.io/travel_guide/** 에서 열립니다.
5. 폰에서 주소를 열고 **iPhone: 공유 → 홈 화면에 추가 / Android: ⋮ → 앱 설치**.

> 정적 배포에서는 서버가 없으므로 장소 검증·검색·경로 계산을 **브라우저에서 Maps JavaScript API** 로 수행합니다
> (서버 키 불필요). 브라우저 키는 웹페이지에 포함되므로 반드시 리퍼러 제한을 걸어 주세요.
>
> 일정·체크리스트·경비는 **각자의 폰에 따로 저장**됩니다. 동행과 같은 일정을 쓰려면
> 설정 → JSON 내보내기 파일을 보내고, 받은 사람이 JSON 가져오기를 하면 됩니다.

로컬에서 정적 빌드만 확인하려면: `npm run build:static` → `out/` 폴더.

## 실행 (개발 / 서버 모드)

```bash
npm install
cp .env.example .env.local   # 키 입력
npm run dev                  # http://localhost:3000
# 배포용
npm run build && npm start
```

Node.js 20 이상. Vercel 등 Next.js 서버를 지원하는 호스팅에 배포하세요(API 라우트가 있어 정적 export는 불가).

## Google API 설정 방법

1. [Google Cloud Console](https://console.cloud.google.com/)에서 프로젝트 생성 후 **결제 계정 연결**.
2. **API 및 서비스 → 라이브러리**에서 다음을 사용 설정:
   - Maps JavaScript API
   - Places API (New)
   - Routes API
3. **사용자 인증 정보 → API 키 만들기**로 키를 **두 개** 만듭니다.

| 환경변수 | 용도 | 권장 제한 |
| --- | --- | --- |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | 브라우저 지도 표시 | 애플리케이션 제한: **HTTP 리퍼러** (`https://내도메인/*`, `http://localhost:3000/*`) · API 제한: **Maps JavaScript API** 만 |
| `GOOGLE_MAPS_SERVER_KEY` | 서버에서 장소 검증·검색·사진, 경로 계산 | API 제한: **Places API (New), Routes API** 만 · 가능하면 서버 IP 제한. **`NEXT_PUBLIC_` 접두사를 절대 붙이지 마세요** |
| `NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` (선택) | 고급 마커용 Map ID | Google Cloud → 지도 관리에서 생성. 없으면 `DEMO_MAP_ID` 사용 |

서버 키는 `/api/places/*`, `/api/routes` 라우트에서만 사용되며 클라이언트로 전달되지 않습니다(사진은 서버가 사진 URL로 리다이렉트). 경로 API는 홍콩 영역 좌표만 받도록 제한되어 있지만, 공개 배포 시에는 Vercel 비밀번호 보호나 간단한 인증을 추가해 키 남용을 막는 것을 권장합니다.

### 키가 하나도 없을 때
앱은 그대로 동작합니다. 설정 안내 배너와 샘플 지도(근사 위치, 경로선 없음)를 보여주고, 각 구간에는 ‘실제 경로 미계산’과 Google Maps 길찾기 링크를 제공합니다.

### 오류 처리
- 지도 키 인증 실패/스크립트 로드 실패 → 샘플 지도로 자동 전환 + 원인 표시
- 경로 미지원 → 해당 교통수단 표시 + 외부 길찾기 링크, API 오류 → ‘다시 시도’
- 위치 권한 거부/시간 초과 → 지도 위 안내 메시지
- 오프라인 → 상단 배너, 저장된 일정·경로 캐시로 열람

## 기술 스택
Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS (shadcn/ui 스타일의 자체 UI 컴포넌트) · Zustand(persist → localStorage) · dnd-kit · Google Maps JavaScript API(Advanced Markers) · Places API (New) · Routes API · Leaflet(키 없을 때 샘플 지도) · PWA(manifest + service worker)

## 구조
```
app/
  api/config            서버 키 설정 여부
  api/places/resolve    장소 검증 (Text Search / Place Details)
  api/places/search     장소 검색 (편집 화면)
  api/places/photo      사진 프록시
  api/routes            Routes API computeRoutes
components/             화면 (Home, Planner, MapPanel, GoogleMap, SampleMap, Timeline, ItemEditor, PlaceDetail, Favorites, Prep, Settings …)
lib/data/               초기 일정·장소 카탈로그
lib/store.ts            Zustand 저장소 (자동 저장, 내보내기/가져오기)
lib/trip.ts             장소 검증·경로 계산·충돌 분석
public/sw.js            오프라인 캐시
```
