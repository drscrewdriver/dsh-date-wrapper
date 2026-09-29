# 변경 이력

이 프로젝트의 모든 주요 변경 사항을 이 파일에 기록합니다.
형식은 [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)를 따르며, 이 프로젝트는 [Semantic Versioning](https://semver.org/spec/v2.0.0.html)을 준수합니다.

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

## 0.1.5 — 2026-09-29

### 변경

- **DSH 0.1.5 라인 지원(`>=0.1.5-rc.1 <0.1.6-0`).** 전용 아티팩트 0.1.5(브랜치 `compat/0.1.5`,
  dist-tag `dsh-0.1.5`). `dsh-v0.1.5-rc.2` 대비 검증 완료: `systemPrompt.context` 계약 동일,
  order 110/115/120 사용 중이고 116은 비어 있으며, vendor cordis 4.0.2는 peer `^4.0.2`로 충족.

## 0.3.0 — 2026-09-29

### 변경

- **DSH 0.2.0 라인 지원(`>=0.2.0-rc.1 <0.2.1-0`).** `package.json`과 `dsh.plugin.json` 양쪽에서
  `engines.dsh`를 갱신하고 두 매니페스트의 버전을 0.3.0으로 올렸습니다. 코드 변경은 없습니다:
  `dsh-v0.1.7-rc.2`와 `dsh-v0.2.0-rc.1` 사이 `packages/core/system-prompt`의 diff는 버전 1줄뿐이고,
  `order: 116` 슬롯도 충돌 없으며(110/115/120 변화 없음), 플러그인 마이그레이션 가이드에는
  `systemPrompt` 항목이 없습니다. 0.1.x 라인(0.1.0-rc.7 → 0.1.7.x)은 계속 아티팩트 ≤ 0.2.0
  (dist-tag `dsh-0.1.7`)으로 서비스됩니다.

### 수정

- npm에 게시된 0.2.0 버전 bump를 git 히스토리에 반영(이전에는 커밋되지 않은 작업 트리에서
  게시되었었습니다).

## 0.1.0 — 2026-09-08

최초 릴리스.

### 추가

- 현재 날짜를 동적 런타임 컨텍스트(`systemPrompt.context`)로 등록하는 호스트 절반 플러그인으로, `Current date: 2026-09-08 Asia/Shanghai Tuesday` — 46 characters, 대략 12 tokens, 시각 없음 — 로 렌더링됩니다.
- 단일 `insert` 행(`id: date-wrapper`, `config.timeZone: Asia/Shanghai`)을 담은 `cordis.patch.yml` 번들 패치.
- 시작 시 검증되는 `timeZone` 설정: 잘못되었거나 해석할 수 없는 IANA 존은 UTC로 조용히 폴백하는 대신 예외를 던집니다.
- fail-soft 텍스트 프로바이더: 렌더 실패 시 빈 문자열을 반환하므로 프롬프트 조립이 이 플러그인 때문에 예외를 던지는 일이 없습니다.
- `node --test`를 통한 18 assertions: 존 투영, 존 경계를 넘는 요일 정확성, 정확한 형식과 길이, 성능 저하 시 동작, 설정 검증, 가짜 컨텍스트에 대한 등록 계약.
- ESLint 10 flat config; `npm run verify`가 lint + 테스트를 게이트합니다.
- 런타임 의존성 0건, `@deepseek-ai/*` 임포트 0건.

### 문서

- 상호 링크된 언어 전환을 갖춘 `README.{md,zh,ja,ko}`, `INSTALL.{md,zh,ja,ko}`, `CHANGELOG.{md,ja,ko}`.
- 0.1.0-rc.7 → 0.1.3-alpha.2를 포괄하는 버전 호환성 매트릭스.
- `docs/dsh-session-and-context-mechanics.md` — DSH가 세션을 JSONL로 바꾸고 요청을 조립하는 방식(중국어).
- `HANDOVER.md` — 프로젝트 인수인계와 설계 근거(중국어).

### 참고

- `@deepseek-ai/dsh-time-context`와 기능이 중복됩니다: 둘 다 마운트하지 마십시오.
- 설계상 설정 패널이 없습니다 — 플러그인 행을 활성화하거나 비활성화하는 것이 스위치입니다.
- 페르소나가 `includeRuntimeContext: false`를 설정한 고정 프롬프트 프리셋에서는 비활성입니다.
