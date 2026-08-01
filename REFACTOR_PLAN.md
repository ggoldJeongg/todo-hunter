# 디자인 시스템 리팩토링 플랜

> 목표: **하이브리드 픽셀 UI**(픽셀 악센트 + 클린 베이스)를 일관되게 만들고,
> 페이지마다 인라인 중복된 UI 요소를 **공통 컴포넌트**로 추출한다.

## 0. 설계 원칙

- **분류 규칙**: `픽셀 = 조작 컨트롤 + 게임 세계 프레임` / `소프트 = 콘텐츠·데이터 표면 + 작은 칩`
- **통일 3접착제** (섞어도 안 튀게 하는 핵심)
  1. **단일 팔레트** — 픽셀/소프트 모두 `--brand-brown` · `--pixel-*` · `--stat-*` 토큰만 사용
  2. **라운드 스케일** — 소프트는 `6px / 12px` 2단계만
  3. **그림자 레시피** — 소프트 요소는 동일한 `--shadow-soft` 하나만

### 요소별 스타일 결정 (기준표)

| 요소 | 스타일 | 근거 |
|---|---|---|
| 버튼 / 탭 / 입력창 | **픽셀** | 폼 안에서 짝을 이루는 조작 컨트롤 |
| 게임 프레임(배틀필드·캐릭터카드·HUD) | **픽셀** | "게임 화면" 정체성 |
| HP/스탯 바 | **픽셀** | 세그먼트 게임 바 |
| 리스트 카드 · 뱃지 · 모달 바디 · 토스트 | **소프트** | 콘텐츠·가독 우선, 작아서 픽셀 테두리가 튐 |
| 하단 네비 · 페이지 헤더 | **소프트/중립** | 앱 크롬 |

---

## Phase 1 — 토큰 / 팔레트 정리 (선행 · 효과 최대)

> 컴포넌트 추출보다 **먼저** 한다. 이것만으로 "튀는" 느낌의 절반이 사라진다.

### 1.1 스탯 색 뮤트 (STR 등)

현재 `Tag`가 Tailwind 기본색(`bg-red-500` 등)이라 양피지 위에서 쨍하다. 팔레트에 맞춰 뮤트한다.

**`app/globals.css` `:root` 에 토큰 추가:**
```css
--stat-str: #B24A3A;  /* red   (기존 #ef4444) */
--stat-int: #3F6E93;  /* blue  (기존 #3b82f6) */
--stat-emo: #6E5296;  /* purple(기존 #a855f7) */
--stat-fin: #4F8A55;  /* green (기존 #22c55e) */
--stat-liv: #C79A46;  /* gold  (기존 #eab308) */
```

**`tailwind.config.ts` `colors` 에 매핑:**
```ts
stat: {
  str: 'var(--stat-str)', int: 'var(--stat-int)', emo: 'var(--stat-emo)',
  fin: 'var(--stat-fin)', liv: 'var(--stat-liv)',
},
```

**`components/common/Tag.tsx` variant 교체:**
```ts
STR: "bg-stat-str text-white",
INT: "bg-stat-int text-white",
EMO: "bg-stat-emo text-white",
FIN: "bg-stat-fin text-white",
LIV: "bg-stat-liv text-white",
```
> 파급: 스탯색 쓰는 모든 곳(퀘스트 리스트 뱃지·폼 선택·성장정원 등)이 한 번에 톤 통일.

### 1.2 소프트 라운드 / 그림자 토큰

**`app/globals.css` `:root`:**
```css
--radius-soft: 12px;      /* 카드 */
--radius-soft-sm: 6px;    /* 뱃지·작은 요소 */
--shadow-soft: 0 2px 5px rgba(90, 54, 22, 0.14);
```
- 기존 `.quest-card` / `Tag(sm)` 의 하드코딩 값을 이 토큰으로 치환.

**작업 파일**: `app/globals.css`, `tailwind.config.ts`, `components/common/Tag.tsx`
**커밋**: `style(tokens): 스탯색 뮤트 + 소프트 라운드/그림자 토큰화`

---

## Phase 2 — 공통 컴포넌트 추출 (우선순위 순)

### 2.1 `<PageHeader>` — 최우선 (중복 8곳)

`← 뒤로가기 + 가운데 타이틀 + (선택) 우측 액션` 헤더가 8개 페이지에 복붙돼 있다.

**API:**
```tsx
interface PageHeaderProps {
  title: string;
  onBack?: () => void;      // 없으면 router.back()
  right?: React.ReactNode;  // 우측 액션(예: 저장 버튼)
}
```
**대체 대상 파일:**
- `components/quest/QuestForm.tsx` (헤더 + 우측 저장 버튼)
- `app/(auth)/findid/page.tsx`, `app/(auth)/findpw/page.tsx`
- `app/(auth)/signup/page.tsx`
- `app/settings/page.tsx`
- `app/terms/page.tsx`, `app/privacy/page.tsx`
- `app/account/delete/page.tsx`

**스타일**: 소프트/중립 (텍스트 + 아이콘 버튼)
**커밋**: `refactor(ui): PageHeader 공통 컴포넌트 추출 (8개 페이지 적용)`

### 2.2 `<ChoiceButton>` (토글/선택 버튼)

`is-rounded + active/inactive` 선택 버튼이 반복된다(일간/주간, 요일, 난이도).

**API:**
```tsx
interface ChoiceButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  // active → bg-brand text-white ring-2 ring-ink / else → bg-paper text-stone
}
```
**대체 대상:**
- `components/quest/QuestForm.tsx` — 일간/주간(142~163), 반복 요일(176~190), 난이도(200~221)
- `components/quest/SplitSuggestions.tsx` — 선택 항목(119)

**스타일**: 픽셀 (`is-rounded`)
**커밋**: `refactor(ui): ChoiceButton 추출 (QuestForm 토글 통합)`

### 2.3 `<Tabs>`

일간/주간 탭이 `quest/page.tsx`에 인라인. 향후 다른 탭에도 재사용 가능.

**API:**
```tsx
interface TabsProps {
  tabs: { key: string; label: React.ReactNode }[];
  active: string;
  onChange: (key: string) => void;
}
```
**대체 대상:** `app/play/quest/page.tsx` (28~49)
**스타일**: 픽셀 (활성 `bg-brand`, 하단 라인)
**커밋**: `refactor(ui): Tabs 컴포넌트 추출 (퀘스트 탭)`

### 2.4 `<IconButton>`

`<button><Image .../></button>` 아이콘 버튼이 리스트에서 반복(완료·쪼개기·수정·삭제).

**API:**
```tsx
interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  src: string;        // 아이콘 경로
  alt: string;
  size?: number;      // 기본 20
}
```
**대체 대상:** `components/quest/DailyQuest.tsx`, `components/quest/WeeklyQuest.tsx`
**스타일**: 중립 (20×20 정렬)
**커밋**: `refactor(ui): IconButton 추출 (퀘스트 리스트 아이콘 통합)`

### 2.5 `<Input>` 기본값 정리

`is-rounded-form w-full shadow-none` 이 5개 폼에서 매번 반복(signin·signup·findid·findpw·QuestForm·FindIdForm·FindPwForm).

**작업**: `components/common/Input.tsx` 기본 className에 `is-rounded-form` 내장 → 사용처에서 중복 제거.
**스타일**: 픽셀 (얇게)
**커밋**: `refactor(ui): Input 기본 스타일 내장 (is-rounded-form 중복 제거)`

---

## Phase 3 — Panel / Card 통합

### 3.1 `<Panel variant="pixel" | "soft">`

`pixel-card`(게임 프레임)와 `quest-card`(소프트 양피지)를 하나의 컴포넌트로.

**API:**
```tsx
interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "pixel" | "soft";  // 기본 soft
}
// pixel → .pixel-card / soft → .quest-card
```
**대체 대상:**
- `soft`: `components/quest/DailyQuest.tsx`, `WeeklyQuest.tsx` (카드)
- `pixel`: `app/play/quest/page.tsx`(리스트 프레임), 그 외 `pixel-card` 사용처
**커밋**: `refactor(ui): Panel(pixel|soft) 통합`

### 3.2 (선택) `<StatBar>` / `<HpBar>`

세그먼트 바가 `HudOverlay`(HP)와 `LevelInfo`(`is-rounded-progress`)에 따로 존재. 여유되면 통합.

---

## 파일 구조 제안

```
components/
  common/        # 기존 — 범용 (Button, Input, Tag, Select, Dialog ...)
    PageHeader.tsx      (신규)
    ChoiceButton.tsx    (신규)
    Tabs.tsx            (신규)
    IconButton.tsx      (신규)
    Panel.tsx           (신규)
    index.ts            # 배럴 export 추가
```
> 기존 `components/common/index.ts` 배럴에 신규 컴포넌트 export 추가.

---

## 작업 순서 (권장 커밋 단위)

1. [ ] **Phase 1.1** 스탯색 뮤트 + 토큰
2. [ ] **Phase 1.2** 라운드/그림자 토큰화
3. [ ] **Phase 2.1** `PageHeader` (효과 최대)
4. [ ] **Phase 2.2** `ChoiceButton`
5. [ ] **Phase 2.3** `Tabs`
6. [ ] **Phase 2.4** `IconButton`
7. [ ] **Phase 2.5** `Input` 기본값 정리
8. [ ] **Phase 3.1** `Panel` 통합
9. [ ] (선택) **Phase 3.2** `StatBar`/`HpBar`

> 각 단계는 독립적으로 커밋·검증 가능. **1 → 3(PageHeader) 순서만 지키면** 나머지는 유연하게.

---

## 리스크 / 주의

- **공유 컴포넌트 파급**: `Tag`·`Input`은 여러 화면 공유 → 변경 후 각 화면 `npm run dev`로 확인.
- **`sm`/`lg` 사이즈 분기 유지**: `Tag`의 `sm`(소프트)·`lg`(픽셀) 결정은 이미 반영됨. 뭉개지 말 것.
- **점진 적용**: 컴포넌트 추출 시 한 곳씩 교체하며 확인(한 번에 8곳 교체 후 깨지면 원인 추적 어려움).
- **로컬 확인 필수**: 스타일 변경은 HMR로 안 잡힐 때가 있어 `npm run dev` 재시작 권장.
