# 설치 안내(공식 DSH CLI)

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

## 0. 사전 요구 사항

```powershell
echo $env:DSH_HOME      # usually C:\Users\<you>\.dsh
dsh --version           # this guide was verified on 0.1.1-rc.2
pnpm --version          # `dsh plugin` is a pnpm forwarder, so pnpm must be on PATH
```

## 1. 설치

**GitHub에서 설치**하는 것을 권장합니다(pnpm이 패키지를 `node_modules`로 복사하고, lockfile이 정확한 커밋을 고정합니다):

```powershell
dsh plugin --profile web add github:drscrewdriver/dsh-date-wrapper
```

또는 로컬 디렉터리에서(개발 시):

```powershell
dsh plugin --profile web add E:\test\rewrite-agently\mine-dsh-plugins\dsh-date-wrapper
```

또는 링크 모드(소스 수정은 재시작 후 반영되며 재설치가 필요 없습니다):

```powershell
dsh plugin --profile web add link:E:\test\rewrite-agently\mine-dsh-plugins\dsh-date-wrapper
```

> ⚠️ 로컬 `file:` / `link:` 설치는 프로필이 그 경로에 의존하게 만듭니다. 디렉터리가 이름이 바뀌거나 삭제되면, 만료된 의존성을 제거할 때까지 프로필의 **모든** pnpm 작업이 `ENOENT`로 실패합니다 — 이 패키지가 `dsh-time-wrapper`에서 개명되었을 때 실제로 일어난 일입니다.
> ⚠️ 상대 경로는 `.` 또는 `..`로 시작할 때만 **현재 디렉터리**를 기준으로 삼습니다;
> `mine-dsh-plugins\dsh-date-wrapper`는 프로필 디렉터리 안에서 해석되므로 찾지 못합니다. 절대 경로가 가장 안전합니다.

설치 성공의 징후:

1. pnpm이 코드 0으로 종료됩니다;
2. `C:\Users\<you>\.dsh\profiles\web\package.json`의 `dependencies`에 `dsh-date-wrapper`가 나열됩니다;
3. 같은 파일의 `dsh.profile.bundles` 끝에 `dsh-date-wrapper`가 추가됩니다(패키지가 `dsh.bundle.patch`를 선언하므로 레이어 목록에 자동으로 끌어들여집니다).

## 2. 재시작

```powershell
# stop the running dsh web process, then start it again
dsh web
```

그런 다음 브라우저 페이지를 새로 고치십시오.

> 번들 패치는 **핫 리로드되지 않습니다**: 프로필 / 홈 패치 레이어만 감시됩니다. 플러그인 자체의
> `cordis.patch.yml`을 바꾸거나 플러그인을 업그레이드하려면 항상 재시작이 필요합니다.

## 3. 검증

새 세션을 열고 아무 메시지나 보내십시오. 날짜가 **런타임 컨텍스트 스냅샷**에 얹히며(세션에는 `system-prompt`에서 온 주입된 컨텍스트 행으로 표시됩니다), 다음과 같습니다:

```
Current date: 2026-09-08 Asia/Shanghai Tuesday
```

즉 `Current date: ` + `<ISO date> <IANA zone> <English weekday>`이고, 46 characters (~12 tokens)이며, **시·분·초는 없습니다**.

명령줄에서 플러그인 자체를 실행해 볼 수도 있습니다:

```powershell
cd E:\test\rewrite-agently\mine-dsh-plugins\dsh-date-wrapper
node tests/format.test.mjs
node tests/context.test.mjs
```

## 4. 문제 해결

| 증상 | 원인과 해결 |
|---------|---------------|
| `date-wrapper: 非法 IANA timeZone`과 함께 시작 실패 | `cordis.patch.yml`의 `timeZone`이 잘못되었습니다. 이는 **의도된 fail-fast**입니다: UTC로 조용히 잘못된 날짜를 내보내기보다 시작 시 실패하는 편이 낫습니다 |
| `duplicate loader entry id: date-wrapper`와 함께 시작 실패 | 조립 트리에 이미 그 id를 가진 행이 있습니다; 중복된 것을 삭제하십시오 |
| 설치 후 날짜가 없음 | ① `dsh-date-wrapper`가 `dsh.profile.bundles`에 있는지 확인합니다; ② 재시작하고 페이지를 새로 고쳤는지 확인합니다; ③ **현재 프리셋이 고정 프롬프트 프리셋이 아닌지 확인합니다**(다음 행) |
| 일부 프리셋에서 날짜가 없음 | 그 프리셋의 페르소나가 `includeRuntimeContext: false`를 설정합니다(공식 `minimal`과 로컬 `simple-reply` 모두 그렇게 합니다). 그런 프리셋은 이후 리스너가 프롬프트 콘텐츠를 추가하는 것을 명시적으로 금지하므로 이 플러그인의 런타임 컨텍스트가 버려집니다 — 정상 동작입니다 |
| 날짜가 하루 어긋남 | `timeZone`이 실제 존과 맞지 않습니다; 존 경계를 넘을 때(예: 베이징 00:30 = UTC 전날 16:30) 하루 차이로 나타납니다 |
| `Time sampled …`도 함께 보임 | 어떤 프리셋이 `@deepseek-ai/dsh-time-context`를 명시적으로 마운트한 것입니다. 이 플러그인은 이를 로드하지도 필터링하지도 않으며, 둘은 함께 사용해서는 안 됩니다 |
| 프로필의 모든 pnpm 작업이 `ENOENT: no such file or directory, open '…'`로 실패 | `file:` / `link:` 의존성이 더 이상 존재하지 않는 경로를 가리키고 있습니다(패키지 이름 변경 또는 tarball 삭제). 먼저 `dsh plugin --profile web remove <이름>`으로 만료된 의존성을 제거한 뒤 다시 설치하십시오. `github:` 설치는 이 실패 모드가 없습니다 |

## 5. 켜기/끄기(패널 토글 없음 — 활성화가 스위치)

자신의 프로필 패치 레이어 — `C:\Users\<you>\.dsh\profiles\web\cordis.patch.yml` — 에서 비활성화하거나 활성화하십시오:

```yaml
- id: date-wrapper
  disabled: true    # disabled; set back to false to restore
```

- **핫, 재시작 불필요**: 이 파일은 Cordis HMR이 감시하며, `disabled: true`는 그 행의 파이버를 폐기하고 주입이 즉시 멈춥니다.
- DSH 내장 **Settings → Plugins** 페이지는 `enabled / disabled`를 표시합니다(읽기 전용).
- 파일은 최상위 YAML 배열이어야 합니다; 형식을 망가뜨리면 **시작이 실패합니다**(fail-loud).
- 완전한 제거는 `dsh plugin remove`(다음 절)를 거치며 **재시작이 필요합니다**.

## 6. 제거

```powershell
dsh plugin --profile web remove dsh-date-wrapper
```

dsh web을 재시작하십시오.
