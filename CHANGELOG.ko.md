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
