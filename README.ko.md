# dsh-date-wrapper

- [English README](./README.md)
- [中文 README](./README.zh.md)
- [日本語 README](./README.ja.md)
- [한국어 README](./README.ko.md)
- [Installation guide](./INSTALL.md)
- [中文安装指南](./INSTALL.zh.md)
- [日本語インストールガイド](./INSTALL.ja.md)
- [한국어 설치 안내](./INSTALL.ko.md)
- [Changelog](./CHANGELOG.md)
- [日本語 changelog](./CHANGELOG.ja.md)
- [한국어 changelog](./CHANGELOG.ko.md)

> 최소한의 날짜 한 줄: DSH가 이미 전송하고 있는 런타임 컨텍스트 스냅샷에 `Current date: 2026-09-08 Asia/Shanghai Tuesday`(46 characters, ~12 tokens)를 얹습니다.
> `@deepseek-ai/dsh-time-context`를 로드하지 **않고**, 추가 세션 메시지를 넣지 **않으며**, DSH 소스를 패치하지 **않고**, PR도 필요하지 않습니다.

- [동작 원리: DSH 세션, JSONL, 요청 조립](./docs/dsh-session-and-context-mechanics.md) (중국어)
- [HANDOVER.md](./HANDOVER.md) (중국어)

## 이 플러그인이 해결하는 문제

DSH 자체의 `@deepseek-ai/dsh-time-context`는 매 요청마다 약 **280 characters**의 메타데이터를 주입합니다:

```
Time sampled while preparing turn 3, step 2: 2026-09-08T16:05:36+08:00[Asia/Shanghai]
Browser time zone for this request: Asia/Shanghai. Interpret otherwise-unqualified dates and times in this zone.
Elapsed since the preceding model-visible message: 2m 34s.
```

이 플러그인은 같은 정보를 단일 **46 characters** 길이의 한 줄로 압축하고, 그것이 도달하는 위치를 옮깁니다 — 더 이상 메시지 스트림으로 들어가지 않습니다:

```
Current date: 2026-09-08 Asia/Shanghai Tuesday
```

| 항목 | `dsh-time-context` | `dsh-date-wrapper` |
|-----------|--------------------|--------------------|
| 주입되는 텍스트 | ~280 characters | 46 characters (↓84%), ~12 tokens |
| 도달 지점 | 사전 단계마다 메시지 하나(`user/message`) | 플랫폼 런타임 컨텍스트 스냅샷(`systemPrompt.context`) |
| 빈도 | 해당되는 각 단계마다 이벤트 하나 | 텍스트가 바뀔 때만 스냅샷과 함께 재전송됨(하루 동안 0 이벤트) |
| 의존성 | `agents` 서비스 | `systemPrompt` 서비스 |
| 런타임 의존성 | — | 없음 |

## 버전 호환성

| 항목 | 판정 |
|------|---------|
| 대상 DSH 버전 | 0.1.0-rc.7 → 0.1.3-alpha.2 (계약 안정, 아래 표 참조) |
| settings API | **해당 없음**: 이 플러그인은 settings를 등록하지 않고 schemastery `Config`도 내보내지 않습니다 |
| 사용하는 계약 지점 | 정확히 하나 — `systemPrompt.context()` |
| 네이티브 기능과의 충돌 | `@deepseek-ai/dsh-time-context`와 중복됩니다; **둘 다 사용하지 마십시오**. 기본 미설치 = 기본 꺼짐 |
| 브라우저 절반 | **없음**: 슬롯 없음, DOM 없음, CSS 시맨틱 토큰 없음 |
| DSH 패키지 임포트 | **0건**: `@deepseek-ai/*`에서 아무것도 가져오지 않으며, 이는 "런타임 감지 + 이중 API 폴백" 패턴보다 더 엄격합니다 |

| 계약 지점 | 0.1.0-rc.7 | 0.1.1-rc.2 | 0.1.2-rc.1 | 0.1.3-alpha.2 |
|---|---|---|---|---|
| `systemPrompt.context(ctx): () => void` | 예 | 예(이 호스트에서 검증됨) | 예 | 예 |
| `PromptContext = { name, order, text }`, `complete` 필드 없음 | 예 | 예 | 예 | 예 |
| `includeRuntimeContext` / `suppressRuntimeContext` | 예 | 예 | 예 | 예 |
| agent-loop의 `project()` 텍스트 중복 제거와 `surfaceOp: "append"` | 예 | 예 | 예 | 비교하지 않음 |

> 방법: `npm pack @deepseek-ai/dsh-system-prompt@<version>`으로 묶은 뒤 풀고 `lib/types/index.d.ts`와 `lib/index.js`를 비교합니다; `@deepseek-ai/dsh-agent-loop`도 같은 방식입니다.
> 이 호스트에서 **런타임에서** 검증된 것은 0.1.1-rc.2뿐이며, 0.1.2-rc.1 / 0.1.3-alpha.2의 런타임 검증은 아직 대기 중입니다(`HANDOVER.md` §7 참조).

## 메시지가 아니라 런타임 컨텍스트 스냅샷인 이유

첫 번째 시도는 `dsh-time-context`를 복사해 `agent/pre-step`에서 `user/message`를 덧붙이는 방식이었습니다. 측정된 비용이 너무 컸습니다: JSONL 이벤트 하나가 **339 bytes**이고(텍스트는 그중 46밖에 되지 않는데, `content`와 `sections`가 각각 사본을 저장하기 때문입니다) 이를 **매 턴마다** 하나씩 기록했습니다.

대신 런타임 컨텍스트를 등록하면 날짜가 플랫폼이 이미 보내는 스냅샷 메시지에 접혀 들어갑니다:

- 플랫폼은 **텍스트로 스냅샷을 중복 제거**하므로(`dsh-agent-loop`의 `RuntimeContextProjection.project()`: `if (this.retained?.text === snapshot) return`), 날짜가 바뀌지 않은 동안에는 **추가 이벤트가 단 하나도 기록되지 않습니다**;
- 스냅샷은 제자리에서 다시 쓰지 않고 **새 메시지를 추가**(`surfaceOp: 'append'`)하므로 요청 시퀀스는 늘어나기만 합니다 → **프리픽스 캐시가 보존됩니다**;
- 우리의 한계 비용은 그 46 bytes이며, 텍스트가 바뀌어 스냅샷이 재전송될 때만 발생합니다.

이 호스트에서 측정한 값(실제 세션 하나, 10턴 / 231 steps):

| 항목 | 측정값 |
|------|----------|
| 플랫폼 런타임 컨텍스트 스냅샷 | 2 이벤트, 각각 1133 B, 총 2.3 KB |
| 실제 사용자 메시지 | 10 이벤트, 각각 396 B |
| 예전 방식(턴마다 메시지 하나) | 10 × 339 B ≈ 3.4 KB |
| 이 방식 | 추가 이벤트 0건; 기존 스냅샷에 ~46 B가 접혀 들어감 |

## 설정

`cordis.patch.yml`과 함께 배포되며, 변경한 뒤에는 재시작하십시오:

```yaml
- insert:
    - id: date-wrapper
      name: dsh-date-wrapper
      config:
        timeZone: Asia/Shanghai   # IANA zone; omit to use the process zone
```

- 잘못된 `timeZone`은 시작 시 예외를 던집니다(**UTC로의 조용한 폴백은 없습니다**).
- 텍스트에 표시되는 존 이름은 해석된 IANA 이름입니다(`timeZone`을 생략하면 프로세스 존 이름).
- 런타임 컨텍스트 항목의 이름은 `date-wrapper:date`이고 순서는 `116`입니다(이미 사용 중: 110 sandbox, 115 approval, 120 subagent).
- 이 플러그인은 **schemastery `Config`를 내보내지 않으므로** 설정이 호스트 스키마 검증을 건너뜁니다; 모든 것은 `validateConfig()`에서 수동으로 검증됩니다. 그래서 Settings → Plugins 페이지에 이 플러그인의 설정 폼이 없습니다.

## 켜기/끄기: 플러그인의 활성화가 곧 스위치이며, 패널 토글은 없습니다

이 플러그인은 설정 패널 토글이 **없고** `enabled` 설정 필드도 **없습니다**. 이유는 다음과 같습니다:

- 기능 스위치는 *플러그인 행이 활성인지 여부* 그 자체입니다. 비활성 → `apply()`가 실행되지 않음 → 런타임 컨텍스트 항목이 존재하지 않음 → 단 한 글자도 주입되지 않습니다.
- 브라우저 절반(`dsh.client`)이 없으므로 UI가 소유한 우리 위젯도 없습니다.
- DSH 내장 **Settings → Plugins** 페이지가 이미 각 항목을 `enabled / disabled`로 표시합니다(읽기 전용).

### 끄는 방법

**자신의** 프로필 패치 레이어에서 `id`로 재정의하십시오 — `C:\Users\<you>\.dsh\profiles\web\cordis.patch.yml`:

```yaml
- id: date-wrapper
  disabled: true    # disabled; set back to false to restore
```

- **핫, 재시작 불필요**: 해당 파일은 Cordis HMR이 감시하며, `disabled: true`는 그 행의 파이버를 직접 폐기합니다.
- `date-wrapper` 행이 아직 없으면(미설치) 이 패치는 `entry "date-wrapper" not found` 경고만 기록하고 시작은 계속 성공합니다.
- ⚠️ 파일은 반드시 **최상위 YAML 배열**이어야 합니다; 형식이 잘못되면 **시작이 실패합니다**(DSH는 사용자 패치 레이어에 대해 fail-loud입니다).

### 완전히 제거하는 방법

```bash
dsh plugin --profile web remove dsh-date-wrapper
```

제거는 번들 레이어를 거치며 dsh web의 **재시작이 필요합니다**(번들 패치는 핫 리로드되지 않습니다).

## 설치

```bash
dsh plugin --profile web add github:drscrewdriver/dsh-date-wrapper
```

dsh web을 재시작하고 페이지를 새로 고치십시오. 로컬 경로 / 링크 모드 / 문제 해결은 [INSTALL.ko.md](./INSTALL.ko.md)를 참조하십시오.

## 검증

| # | 방법 | 기대 결과 |
|---|-----|----------|
| A1 | 새 세션을 열고 메시지 하나를 전송 | 런타임 컨텍스트 스냅샷에 `Current date: YYYY-MM-DD <zone> <weekday>`가 포함됨(`system-prompt`에서 온 주입된 컨텍스트 행으로 표시됨) |
| A2 | 그 줄을 확인 | ≤50 characters (46 measured; 요청된 형식 때문에 PRD 임계값 30은 완화됨) |
| A3 | 플러그인 비활성화(프로필 패치 `disabled: true`) | 이후 세션의 스냅샷에 그 줄이 더 이상 나타나지 않음 |
| A4 | 세션 로그 검색 | `Time sampled` / `Elapsed since` / `Browser time zone` 없음 |
| A5 | `timeZone`을 `UTC`로 설정하고 재시작 | 날짜가 UTC를 따름(존 경계를 넘을 때 하루 차이가 날 수 있음) |

## 구현 노트

```
dsh-date-wrapper/
├── package.json          # name / type: module / main / exports["."] / dsh.bundle.patch / files
├── cordis.patch.yml      # one insert row (no patch-level id → lands at the profile root = host plane)
├── src/
│   ├── format.js         # pure functions: resolveZone / renderDate / createDateContextText / validateConfig / TEXT_LABEL
│   └── index.js          # apply(ctx, config) → ctx.inject(['systemPrompt'], …) → systemPrompt.context(...)
└── tests/
    ├── format.test.mjs   # 11 cases (zone projection, weekday, format and length, degradation, config validation)
    └── context.test.mjs  # 7 cases (registration contract against a fake ctx)
```

- **호스트 플레인 행**: `ctx.inject(['systemPrompt'], …)`가 자식 파이버를 열고, 서비스가 없으면 이 플러그인은 부팅 전체를 실패시키는 대신 조용히 아무것도 등록하지 않습니다.
- **fail-soft 텍스트 프로바이더**: 프롬프트 조립 중에 예외가 발생하면 **모든** 요청이 실패하므로, 렌더 실패 시 빈 문자열을 반환합니다(플랫폼이 빈 텍스트를 걸러냅니다).
- **`complete` 없음**: 이를 설정하면 전체 시스템 프롬프트를 가리게 됩니다.
- **중복 제거는 플랫폼의 몫**: 에이전트별 상태를 유지하지 않으며, 자정을 넘기면 스냅샷이 그냥 새 날짜를 담습니다.
- **수명 주기**: 등록은 `ctx.inject` 자식 파이버에 속하며 플러그인이 비활성화될 때 회수됩니다.

## 개발: TDD + lint

```bash
npm install          # devDependencies only (eslint / @eslint/js); zero runtime dependencies

npm run tdd          # watch mode: rerun on src/ or tests/ changes (node --test --watch)
npm test             # one full run: node --test "tests/*.test.mjs"
node tests/format.test.mjs   # run a single file (most reliable under a sandbox: no child process)

npm run lint         # eslint . (src + tests + eslint.config.mjs)
npm run lint:fix     # auto-fix what can be fixed
npm run verify       # lint + test; run this before committing
```

### 레드-그린-리팩터

테스트 케이스는 수용 기준에 직접 대응합니다: 실패하는 어서션을 먼저 작성하고, 그다음 통과시키십시오.

| 단계 | 동작 | 명령 |
|------|--------|---------|
| 1 레드 | `tests/*.test.mjs`에 수용 기준의 이름을 딴 어서션을 추가하고, 아직 **없는** 동작을 어서션합니다 | `npm run tdd` |
| 2 그린 | 다른 어서션은 건드리지 않고 통과시키는 최소 구현을 `src/`에 작성합니다 | `npm run tdd` |
| 3 리팩터 | 초록 상태를 유지하면서 순수 함수의 이름을 바꾸고 추출합니다; `src/format.js`가 모든 순수 로직을 담고 `src/index.js`는 등록만 합니다 | `npm run tdd` |
| 4 게이트 | 커밋 전에 lint와 전체 스위트를 실행합니다 | `npm run verify` |

현재 18 assertions: `format.test.mjs`(11)는 순수 함수를 다루고, `context.test.mjs`(7)는 가짜 ctx에 대한 등록 계약을 어서션합니다.

### lint 설정 주요 사항

- ESLint 10 flat config(`eslint.config.mjs`)이며 `@eslint/js` recommended를 기준선으로 사용합니다.
- 강화된 규칙: `eqeqeq`, `prefer-const`, `object-shorthand`, `no-unused-vars`(`_` 접두사는 예외).
- Node 전역 `crypto` / `console` / `process`를 명시적으로 선언합니다. 그렇지 않으면 `no-undef`가 오탐합니다.

## 알려진 제한

- **고정 프롬프트 프리셋에서는 비활성**: 프리셋의 페르소나가 `includeRuntimeContext: false`를 설정하면(공식 `minimal`과 로컬 `simple-reply` 모두 그렇게 합니다), `assemble()`이 `contexts: []`를 반환하고 이 플러그인의 항목은 통째로 버려집니다. 그런 프리셋은 이후 리스너가 프롬프트에 아무것도 추가하지 못하도록 설계된 것입니다.
- **오래된 스냅샷은 히스토리에 남음**: 날짜가 바뀌면 플랫폼은 새 스냅샷을 추가하고(오래된 것은 유지됩니다) 새 스냅샷은 자체적인 "This snapshot supersedes earlier runtime-context snapshots" 선언을 통해 효력을 발휘합니다 — 플랫폼이 cwd / sandbox / approval 정책 변경을 다루는 방식과 같습니다.
- **번들 패치는 핫 리로드되지 않음**: `cordis.patch.yml`을 바꾸거나 플러그인을 업그레이드하려면 dsh web 재시작이 필요합니다(프로필 패치에서 `disabled`를 바꾸는 것은 핫입니다).
- **`dsh-time-context`는 로드되지도, 필터링되지도 않음**: 프리셋에서 이를 명시적으로 마운트하면 장황한 텍스트가 평소처럼 나타납니다. 둘 다 사용하지 마십시오.
- **계약 지점에 대한 런타임 프로브 없음**: `systemPrompt.context`는 가드 없이 호출되므로, 향후 DSH 이름 변경은 조용한 성능 저하 대신 플러그인 로드 실패로 드러납니다(`HANDOVER.md` §7 참조).

## 라이선스

MIT
