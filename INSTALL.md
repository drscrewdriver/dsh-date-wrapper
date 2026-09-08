# Installation guide (official DSH CLI)

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

## 0. Prerequisites

```powershell
echo $env:DSH_HOME      # usually C:\Users\<you>\.dsh
dsh --version           # this guide was verified on 0.1.1-rc.2
pnpm --version          # `dsh plugin` is a pnpm forwarder, so pnpm must be on PATH
```

## 1. Install

From GitHub (recommended — pnpm copies the package into `node_modules`, and the lockfile pins the exact commit):

```powershell
dsh plugin --profile web add github:drscrewdriver/dsh-date-wrapper
```

Or from a local checkout (development):

```powershell
dsh plugin --profile web add E:\test\rewrite-agently\mine-dsh-plugins\dsh-date-wrapper
```

Or link mode (source edits take effect after a restart, no reinstall):

```powershell
dsh plugin --profile web add link:E:\test\rewrite-agently\mine-dsh-plugins\dsh-date-wrapper
```

> ⚠️ A local `file:` / `link:` install makes the profile depend on that path. Renaming or deleting the directory then breaks **every** pnpm operation in the profile with `ENOENT` until the stale dependency is removed — exactly what happened when this package was renamed from `dsh-time-wrapper`.
> ⚠️ A relative path is only anchored to **your current directory** when it starts with `.` or `..`;
> `mine-dsh-plugins\dsh-date-wrapper` is resolved inside the profile directory and will not be found. Absolute paths are safest.

Signs of a successful install:

1. pnpm exits with code 0;
2. `C:\Users\<you>\.dsh\profiles\web\package.json` lists `dsh-date-wrapper` under `dependencies`;
3. the same file's `dsh.profile.bundles` gains `dsh-date-wrapper` at the end (the package declares `dsh.bundle.patch`, so it is pulled into the layer list automatically).

## 2. Restart

```powershell
# stop the running dsh web process, then start it again
dsh web
```

Then refresh the browser page.

> Bundle patches are **not hot-reloaded**: only the profile / home patch layers are watched. Changing the
> plugin's own `cordis.patch.yml` or upgrading the plugin always requires a restart.

## 3. Verify

Open a new session and send any message. The date hangs on the **runtime-context snapshot** (shown in the session as an injected context row sourced from `system-prompt`), as:

```
Current date: 2026-09-08 Asia/Shanghai Tuesday
```

That is `Current date: ` + `<ISO date> <IANA zone> <English weekday>`, 46 characters (~12 tokens), with **no hour, minute or second**.

You can also exercise the plugin itself from the command line:

```powershell
cd E:\test\rewrite-agently\mine-dsh-plugins\dsh-date-wrapper
node tests/format.test.mjs
node tests/context.test.mjs
```

## 4. Troubleshooting

| Symptom | Cause and fix |
|---------|---------------|
| Startup fails with `date-wrapper: 非法 IANA timeZone` | `timeZone` in `cordis.patch.yml` is wrong. This is **intentional fail-fast**: better to fail at startup than to silently emit a wrong date in UTC |
| Startup fails with `duplicate loader entry id: date-wrapper` | The assembly tree already has a row with that id; delete the duplicate |
| No date after installing | ① confirm `dsh-date-wrapper` is in `dsh.profile.bundles`; ② confirm you restarted and refreshed the page; ③ **confirm the current preset is not a fixed-prompt one** (next row) |
| No date under some presets | That preset's persona sets `includeRuntimeContext: false` (the official `minimal` and the local `simple-reply` both do). Such presets explicitly forbid later listeners from adding prompt content, so this plugin's runtime context is dropped — expected behaviour |
| The date is off by one day | `timeZone` does not match your actual zone; across a zone boundary (e.g. 00:30 Beijing = 16:30 UTC the previous day) that shows up as a one-day difference |
| You also see `Time sampled …` | Some preset mounts `@deepseek-ai/dsh-time-context` explicitly. This plugin neither loads nor filters it; the two should not be used together |
| Any pnpm operation in the profile fails with `ENOENT: no such file or directory, open '…'` | A `file:` / `link:` dependency points at a path that no longer exists (the package was renamed, or its tarball was deleted). Remove the stale dependency with `dsh plugin --profile web remove <name>` and install again; `github:` installs do not have this failure mode |

## 5. On/off (no panel toggle — activation is the switch)

Disable or enable it in your own profile patch layer — `C:\Users\<you>\.dsh\profiles\web\cordis.patch.yml`:

```yaml
- id: date-wrapper
  disabled: true    # disabled; set back to false to restore
```

- **Hot, no restart**: the file is watched by Cordis HMR; `disabled: true` disposes that row's fiber and injection stops immediately.
- DSH's built-in **Settings → Plugins** page shows `enabled / disabled` (read-only).
- The file must be a top-level YAML array; malforming it makes **startup fail** (fail-loud).
- Full removal goes through `dsh plugin remove` (next section) and **requires a restart**.

## 6. Uninstall

```powershell
dsh plugin --profile web remove dsh-date-wrapper
```

Restart dsh web.
