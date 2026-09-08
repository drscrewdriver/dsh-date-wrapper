# 安装指南（官方 DSH CLI）

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

## 0. 前置条件

```powershell
echo $env:DSH_HOME      # 通常是 C:\Users\<你>\.dsh
dsh --version           # 本指南验证于 0.1.1-rc.2
pnpm --version          # dsh plugin 是 pnpm 转发器，pnpm 必须在 PATH 上
```

## 1. 安装

用**绝对路径**（推荐，路径原样传给 pnpm）：

```powershell
dsh plugin --profile web add E:\test\rewrite-agently\mine-dsh-plugins\dsh-date-wrapper
```

或开发期用软链（改源码立即生效，无需重装）：

```powershell
dsh plugin --profile web add link:E:\test\rewrite-agently\mine-dsh-plugins\dsh-date-wrapper
```

> ⚠️ 相对路径只有以 `.` 或 `..` 开头才会被锚定到**你当前所在目录**；
> 写成 `mine-dsh-plugins\dsh-date-wrapper` 会在 profile 目录里找不到。用绝对路径最稳。

安装成功的判据：

1. pnpm 退出码为 0；
2. `C:\Users\<你>\.dsh\profiles\web\package.json` 的 `dependencies` 里出现 `dsh-date-wrapper`；
3. 同一文件的 `dsh.profile.bundles` 末尾出现 `dsh-date-wrapper`（包声明了 `dsh.bundle.patch`，会被自动纳入 layer 列表）。

## 2. 重启

```powershell
# 停掉当前 dsh web 进程后重新启动
dsh web
```

然后刷新浏览器页面。

> bundle patch **不热重载**：只改 profile / home 层的 patch 才会被监听。改插件自己的
> `cordis.patch.yml` 或换版本，都必须重启。

## 3. 验证

新开一个会话，随便发一句话。日期会挂在**运行上下文快照**里（会话中显示为一条注入上下文行，来源是 `system-prompt`），文本是：

```
Current date: 2026-09-08 Asia/Shanghai Tuesday
```

即 `Current date: ` + `<ISO 日期> <IANA 时区> <英文星期>`，46 字符（约 12 token），**不含时分秒**。

命令行侧可自测插件本身：

```powershell
cd E:\test\rewrite-agently\mine-dsh-plugins\dsh-date-wrapper
node tests/format.test.mjs
node tests/context.test.mjs
```

## 4. 排错

| 现象 | 原因与处理 |
|------|-----------|
| 启动失败，报 `date-wrapper: 非法 IANA timeZone` | `cordis.patch.yml` 里的 `timeZone` 写错了。这是**有意的 fail-fast**：宁可启动失败，也不静默按 UTC 出错误的日期 |
| 启动失败，报 `duplicate loader entry id: date-wrapper` | 装配树里已有同名行，删掉重复的一行 |
| 装完没有日期 | ① 确认 `dsh.profile.bundles` 里有 `dsh-date-wrapper`；② 确认已重启 + 刷新页面；③ **确认当前 preset 不是 fixed-prompt 类型**（见下一行） |
| 某些 preset 下没有日期 | 该 preset 的 persona 设了 `includeRuntimeContext: false`（官方 `minimal`、本地 `simple-reply` 都是）。这类 preset 明确禁止后续 listener 往提示词加内容，本插件的运行上下文会被丢掉 —— 属预期行为 |
| 日期差一天 | `timeZone` 与你的实际时区不一致；跨时区边界（如北京 00:30 = UTC 前一日 16:30）会表现为差一天 |
| 同时看到 `Time sampled …` | 某个 preset 里显式挂载了 `@deepseek-ai/dsh-time-context`。本插件不加载也不过滤它，两者不该同时使用 |

## 5. 开关（不装面板开关，靠插件激活）

停用/启用直接改你自己的 profile patch 层 —— `C:\Users\<你>\.dsh\profiles\web\cordis.patch.yml`：

```yaml
- id: date-wrapper
  disabled: true    # 停用；改回 false 即恢复
```

- **热生效，无需重启**：该文件被 Cordis HMR 监听，`disabled: true` 会 dispose 该行的 fiber，注入立即停止。
- DSH 自带的 **设置 → 插件** 页面会显示 `已启用 / 已停用`（只读）。
- 该文件必须是顶层 YAML 数组；写坏会导致**启动失败**（fail-loud）。
- 彻底移除走 `dsh plugin remove`（见下节），**需要重启**。

## 6. 卸载

```powershell
dsh plugin --profile web remove dsh-date-wrapper
```

重启 dsh web。
