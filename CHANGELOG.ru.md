# Список изменений

Все заметные изменения этого проекта документируются в этом файле.
Формат соответствует [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), а проект придерживается [семантического версионирования](https://semver.org/spec/v2.0.0.html).

- [English README](./README.md)
- [中文 README](./README.zh.md)
- [日本語 README](./README.ja.md)
- [한국어 README](./README.ko.md)
- [Français README](./README.fr.md)
- [Deutsch README](./README.de.md)
- [Italiano README](./README.it.md)
- [Русский README](./README.ru.md)
- [Español README](./README.es.md)
- [Installation guide](./INSTALL.md)
- [中文安装指南](./INSTALL.zh.md)
- [日本語インストールガイド](./INSTALL.ja.md)
- [한국어 설치 안내](./INSTALL.ko.md)
- [Guide d'installation](./INSTALL.fr.md)
- [Installationsanleitung](./INSTALL.de.md)
- [Guida all'installazione](./INSTALL.it.md)
- [Руководство по установке](./INSTALL.ru.md)
- [Guía de instalación](./INSTALL.es.md)
- [Changelog](./CHANGELOG.md)
- [日本語 changelog](./CHANGELOG.ja.md)
- [한국어 changelog](./CHANGELOG.ko.md)
- [Français changelog](./CHANGELOG.fr.md)
- [Deutsch changelog](./CHANGELOG.de.md)
- [Italiano changelog](./CHANGELOG.it.md)
- [Русский changelog](./CHANGELOG.ru.md)
- [Español changelog](./CHANGELOG.es.md)

## Не выпущено

### Изменено

- **Поддержка двух версий DSH (0.1.0-rc.7 … 0.1.2-rc.1).** Матрица совместимости документирована
  в README (EN/ZH) и добавлен `engines.dsh`. Изменений кода нет: единственный контракт плагина
  с хостом, `systemPrompt.context({ name, order, text })`, идентичен по сигнатуре и семантике между
  `dsh-v0.1.1-rc.2` и `dsh-v0.1.2-rc.1`, а плагин не регистрирует пространство имён настроек,
  не читает данные сессии и не делает RPC-вызовов.

## 0.3.0 — 2026-09-29

### Изменено

- **Поддержка линии DSH 0.2.0 (`>=0.2.0-rc.1 <0.2.1-0`).** `engines.dsh` обновлён в обоих
  манифестах, `package.json` и `dsh.plugin.json`; версия поднята до 0.3.0 в обоих манифестах. Изменений
  кода нет: между `dsh-v0.1.7-rc.2` и `dsh-v0.2.0-rc.1` diff `packages/core/system-prompt`
  состоит из одной строки версии, слот `order: 116` остаётся без коллизий (110/115/120
  не изменились), а в гайде по миграции плагинов нет пункта про `systemPrompt`. Линия 0.1.x
  (0.1.0-rc.7 → 0.1.7.x) по-прежнему обслуживается артефактом ≤ 0.2.0 (dist-tag `dsh-0.1.7`).

### Исправлено

- Согласовано с историей git повышение версии до 0.2.0, опубликованное в npm (ранее оно
  было опубликовано из незакоммиченного рабочего дерева).

## 0.1.0 — 2026-09-08

Первый релиз.

### Добавлено

- Плагин хост-половины, регистрирующий текущую дату как динамический контекст времени выполнения (`systemPrompt.context`), отображаемый как `Current date: 2026-09-08 Asia/Shanghai Tuesday` — 46 символов, примерно 12 токенов, без времени суток.
- Bundle-patch `cordis.patch.yml` с единственной строкой `insert` (`id: date-wrapper`, `config.timeZone: Asia/Shanghai`).
- Конфигурация `timeZone` проверяется на старте: некорректная или неразрешимая зона IANA бросает исключение вместо тихого фолбэка на UTC.
- Fail-soft провайдер текста: ошибка рендера возвращает пустую строку, поэтому сборка промпта никогда не падает из-за плагина.
- 18 проверок через `node --test`: проекция зоны, корректность дня недели через границы зон, точный формат и длина, деградация, валидация конфигурации и контракт регистрации против фейкового контекста.
- Flat config ESLint 10; `npm run verify` служит шлюзом lint + тесты.
- Ноль зависимостей времени выполнения и ноль импортов `@deepseek-ai/*`.

### Документация

- `README.{md,zh,ja,ko}`, `INSTALL.{md,zh,ja,ko}`, `CHANGELOG.{md,ja,ko}` с перекрёстными переключателями языка.
- Матрица совместимости версий, покрывающая 0.1.0-rc.7 → 0.1.3-alpha.2.
- `docs/dsh-session-and-context-mechanics.md` — как DSH превращает сессии в JSONL и собирает запросы (китайский).
- `HANDOVER.md` — передача проекта и обоснование проектных решений (китайский).

### Примечания

- Функциональное пересечение с `@deepseek-ai/dsh-time-context`: не монтировать оба.
- Панели настроек нет намеренно — включение или отключение строки плагина и есть переключатель.
- Не работает с fixed-prompt-пресетами, чья persona задаёт `includeRuntimeContext: false`.
