# dsh-date-wrapper

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

> **▼ Совместимость с версиями DSH**
>
> | Версия DSH | Загрузка | Контракт хоста | Клиентская половина |
> | --- | --- | --- | --- |
> | 0.1.0-rc.7 ~ 0.1.7.x (линия 0.1.x) | ✅ артефакт ≤ 0.2.0 | `systemPrompt.context({ name, order, text })` | — (плагин только для хоста) |
> | 0.2.0-rc.1+ (`>=0.2.0-rc.1 <0.2.1-0`) | ✅ артефакт ≥ 0.3.0 | та же сигнатура; diff `packages/core/system-prompt` относительно `dsh-v0.1.7-rc.2` сводится к строке версии | — (плагин только для хоста) |
>
> Один контракт покрывает все линии: плагин вызывает только `systemPrompt.context`, чья
> сигнатура и семантика не менялись с `dsh-v0.1.1-rc.2` до
> `dsh-v0.2.0-rc.1`. Он не регистрирует пространство имён настроек, не читает данные
> сессии и не делает RPC-вызовов, поэтому ни переписывания клиента/сессии/хранилища в
> 0.1.1 → 0.1.2, ни изменения хоста в 0.1.7 → 0.2.0-rc.1 его не затрагивают. Старые хосты 0.1.x
> остаются на артефакте ≤ 0.2.0 (dist-tag `dsh-0.1.7`); линию 0.2.0 обслуживает
> артефакт ≥ 0.3.0.

> Минималистичная строка с датой: она подвешивает `Current date: 2026-09-08 Asia/Shanghai Tuesday` (46 символов, ~12 токенов) к снимку контекста времени выполнения, который DSH и так уже отправляет.
> Она **не** загружает `@deepseek-ai/dsh-time-context`, **не** добавляет лишних сообщений в сессию, **не** патчит исходники DSH и не требует PR.

- [Как это работает: сессии DSH, JSONL и сборка запроса](./docs/dsh-session-and-context-mechanics.md) (китайский)
- [HANDOVER.md](./HANDOVER.md) (китайский)

## Какую задачу решает этот плагин

Собственный `@deepseek-ai/dsh-time-context` в DSH внедряет при каждом запросе около **280 символов** метаданных:

```
Time sampled while preparing turn 3, step 2: 2026-09-08T16:05:36+08:00[Asia/Shanghai]
Browser time zone for this request: Asia/Shanghai. Interpret otherwise-unqualified dates and times in this zone.
Elapsed since the preceding model-visible message: 2m 34s.
```

Этот плагин сжимает ту же информацию в одну строку из **46 символов** и меняет место её назначения — она больше не попадает в поток сообщений:

```
Current date: 2026-09-08 Asia/Shanghai Tuesday
```

| Измерение | `dsh-time-context` | `dsh-date-wrapper` |
|-----------|--------------------|--------------------|
| Внедряемый текст | ~280 символов | 46 символов (↓84%), ~12 токенов |
| Место назначения | Одно сообщение на каждый pre-step (`user/message`) | Снимок контекста времени выполнения платформы (`systemPrompt.context`) |
| Частота | Одно событие на каждый подходящий step | Повторно отправляется со снимком только при изменении текста (0 событий в течение суток) |
| Зависимость | Сервис `agents` | Сервис `systemPrompt` |
| Зависимости времени выполнения | — | нет |

## Совместимость версий

| Пункт | Вердикт |
|------|---------|
| Целевые версии DSH | 0.1.0-rc.7 → 0.1.7.x (линия 0.1.x — артефакт ≤ 0.2.0) и 0.2.0-rc.1 → 0.2.0.x (линия 0.2.0, `engines.dsh: >=0.2.0-rc.1 <0.2.1-0` — артефакт ≥ 0.3.0) |
| settings API | **Неприменимо**: плагин не регистрирует настройки и не экспортирует schemastery-`Config` |
| Используемые точки контракта | Ровно одна — `systemPrompt.context()` |
| Конфликт со встроенной функцией | Пересекается с `@deepseek-ai/dsh-time-context`; **не использовать оба сразу**. Не установлен по умолчанию = выключен по умолчанию |
| Браузерная половина | **Отсутствует**: ни slot, ни DOM, ни CSS-семантических токенов |
| Импорты пакетов DSH | **Ноль**: ничего из `@deepseek-ai/*`, что строже паттерна «определение в рантайме + двойной API-фолбэк» |

| Точка контракта | 0.1.0-rc.7 | 0.1.1-rc.2 | 0.1.2-rc.1 | 0.1.3-alpha.2 | 0.1.7-rc.2 | 0.2.0-rc.1 |
|---|---|---|---|---|---|---|
| `systemPrompt.context(ctx): () => void` | да | да (проверено на этом хосте) | да | да | да | да (diff относительно 0.1.7-rc.2: только строка версии) |
| `PromptContext = { name, order, text }`, без поля `complete` | да | да | да | да | да | да |
| `includeRuntimeContext` / `suppressRuntimeContext` | да | да | да | да | да | да |
| дедупликация по тексту в `project()` agent-loop и `surfaceOp: "append"` | да | да | да | не сравнивалось | да | да |
| `order: 116` без коллизий (110 / 115 / 120 заняты) | да | да | да | да | да | да |

> Метод: `npm pack @deepseek-ai/dsh-system-prompt@<version>`, распаковать и сравнить `lib/types/index.d.ts` и `lib/index.js`; то же для `@deepseek-ai/dsh-agent-loop`.
> Между `dsh-v0.1.7-rc.2` и `dsh-v0.2.0-rc.1` diff `packages/core/system-prompt` — одна строка версии, точки вызова `systemPrompt.context` на 110/115/120 не тронуты, а в гайде по миграции плагинов нет ни одного упоминания `systemPrompt`.
> **В рантайме** проверена только 0.1.1-rc.2 на этом хосте; runtime-смоук 0.2.0-rc.1 отслеживается в `HANDOVER.md` §7.

## Почему снимок контекста времени выполнения, а не сообщение

Первая попытка копировала `dsh-time-context` и добавляла `user/message` в `agent/pre-step`. Измеренные затраты оказались слишком велики: каждое JSONL-событие весит **339 байт** (на текст приходится лишь 46, потому что `content` и `sections` хранят по копии), и такое событие писалось **каждый ход**.

При регистрации контекста времени выполнения вместо этого дата складывается в то сообщение-снимок, которое платформа уже отправляет:

- Платформа **дедуплицирует снимки по тексту** (`RuntimeContextProjection.project()` в `dsh-agent-loop`: `if (this.retained?.text === snapshot) return`), поэтому пока дата не меняется, **не пишется ни одного лишнего события**;
- Снимки **дописывают** новое сообщение (`surfaceOp: 'append'`), а не переписывают существующее, поэтому последовательность запроса только растёт → **префиксный кэш сохраняется**;
- Наши предельные затраты — те самые 46 байт, и только когда снимок переотправляется из-за изменения текста.

Измерено на этом хосте (одна реальная сессия, 10 ходов / 231 шаг):

| Пункт | Измерено |
|------|----------|
| Снимки контекста времени выполнения платформы | 2 события, по 1133 Б, всего 2,3 КБ |
| Реальные сообщения пользователя | 10 событий, по 396 Б |
| Старый подход (одно сообщение на ход) | 10 × 339 Б ≈ 3,4 КБ |
| Этот подход | 0 лишних событий; ~46 Б складываются в существующий снимок |

## Конфигурация

Поставляется в `cordis.patch.yml`; после изменения требуется перезапуск:

```yaml
- insert:
    - id: date-wrapper
      name: dsh-date-wrapper
      config:
        timeZone: Asia/Shanghai   # IANA zone; omit to use the process zone
```

- Некорректный `timeZone` бросает исключение при старте (**никакого** тихого фолбэка на UTC).
- Имя зоны в тексте — это разрешённое имя IANA (имя зоны процесса, если `timeZone` не указан).
- Запись контекста времени выполнения называется `date-wrapper:date` с order `116` (занято: 110 sandbox, 115 approval, 120 subagent).
- Плагин **не экспортирует schemastery-`Config`**, поэтому его конфигурация не проходит схемную валидацию хоста; всё проверяется вручную в `validateConfig()`. Именно поэтому на странице Settings → Plugins для него нет формы конфигурации.

## Включение/выключение: переключатель — это активация плагина, отдельной панели нет

Плагин не содержит **ни** переключателя в панели настроек, **ни** поля конфигурации `enabled`, потому что:

- Переключатель функции — это и есть *активность строки плагина*. Неактивна → `apply()` не выполняется → записи контекста времени выполнения не существует → не внедряется ни одного символа.
- Браузерной половины нет (`dsh.client`), поэтому в UI нет ни одного нашего виджета.
- Встроенная страница DSH **Settings → Plugins** уже показывает статус каждой записи как `enabled / disabled` (только для чтения).

### Как выключить

Переопределите её по `id` в **своём собственном** слое profile patch — `C:\Users\<you>\.dsh\profiles\web\cordis.patch.yml`:

```yaml
- id: date-wrapper
  disabled: true    # disabled; set back to false to restore
```

- **Горячо, без перезапуска**: файл наблюдается Cordis HMR, и `disabled: true` немедленно уничтожает fiber этой строки.
- Если строки `date-wrapper` ещё нет (не установлен), этот patch лишь запишет предупреждение `entry "date-wrapper" not found`; старт всё равно пройдёт успешно.
- ⚠️ Файл должен быть **YAML-массивом верхнего уровня**; если он повреждён, **старт падает** (DSH для пользовательских слоёв patch работает по принципу fail-loud).

### Как удалить полностью

```bash
dsh plugin --profile web remove dsh-date-wrapper
```

Удаление идёт через слой bundle и **требует перезапуска** dsh web (bundle-patch не перезагружаются на лету).

## Установка

```bash
dsh plugin --profile web add github:drscrewdriver/dsh-date-wrapper
```

Перезапустите dsh web и обновите страницу. Локальные пути, режим link и устранение неполадок: [INSTALL.ru.md](./INSTALL.ru.md).

## Проверка

| # | Как | Ожидается |
|---|-----|----------|
| A1 | Открыть новую сессию и отправить одно сообщение | В снимке контекста времени выполнения появляется `Current date: YYYY-MM-DD <zone> <weekday>` (показывается как строка внедрённого контекста с источником `system-prompt`) |
| A2 | Проверить эту строку | ≤50 символов (измерено 46; порог PRD в 30 был смягчён ради запрошенного формата) |
| A3 | Отключить плагин (profile patch `disabled: true`) | Строка больше не появляется в снимках последующих сессий |
| A4 | Поискать в журнале сессии | Нет `Time sampled` / `Elapsed since` / `Browser time zone` |
| A5 | Поставить `timeZone` в `UTC` и перезапустить | Дата следует UTC (на границе зон возможен сдвиг в один день) |

## Примечания по реализации

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

- **Строка на плоскости хоста**: `ctx.inject(['systemPrompt'], …)` открывает дочернюю fiber; если сервиса нет, плагин молча ничего не регистрирует, вместо того чтобы уронить всю загрузку.
- **Fail-soft провайдер текста**: исключение во время сборки промпта уронило бы **каждый** запрос, поэтому при ошибке рендера возвращается пустая строка (платформа отфильтровывает пустой текст).
- **Без `complete`**: если его задать, он затрёт весь системный промпт.
- **Дедупликация — задача платформы**: никакого состояния per-agent не хранится; после полуночи снимок просто несёт новую дату.
- **Жизненный цикл**: регистрация принадлежит дочерней fiber `ctx.inject` и освобождается при деактивации плагина.

## Разработка: TDD + lint

```bash
npm install          # devDependencies only (eslint / @eslint/js); zero runtime dependencies

npm run tdd          # watch mode: rerun on src/ or tests/ changes (node --test --watch)
npm test             # one full run: node --test "tests/*.test.mjs"
node tests/format.test.mjs   # run a single file (most reliable under a sandbox: no child process)

npm run lint         # eslint . (src + tests + eslint.config.mjs)
npm run lint:fix     # auto-fix what can be fixed
npm run verify       # lint + test; run this before committing
```

### Красный-зелёный-рефакторинг

Тест-кейсы напрямую соответствуют критериям приёмки: сначала пишется падающая проверка, затем её доводят до зелёной.

| Шаг | Действие | Команда |
|------|--------|---------|
| 1 красный | Добавить в `tests/*.test.mjs` проверку, названную по критерию приёмки, которая проверяет поведение, которого у вас **ещё нет** | `npm run tdd` |
| 2 зелёный | Написать в `src/` минимальную реализацию, чтобы она прошла, не трогая другие проверки | `npm run tdd` |
| 3 рефакторинг | Оставаясь в зелёном, переименовывать и выделять чистые функции; вся чистая логика живёт в `src/format.js`, `src/index.js` только регистрирует | `npm run tdd` |
| 4 шлюз | Перед коммитом прогнать lint + весь набор тестов | `npm run verify` |

Сегодня 18 проверок: `format.test.mjs` (11) покрывает чистые функции, `context.test.mjs` (7) проверяет контракт регистрации против фейкового ctx.

### Особенности конфигурации lint

- ESLint 10 flat config (`eslint.config.mjs`) с `@eslint/js` recommended в качестве базовой линии.
- Ужесточённые правила: `eqeqeq`, `prefer-const`, `object-shorthand`, `no-unused-vars` (префикс `_` освобождён).
- Глобальные объекты Node `crypto` / `console` / `process` объявлены явно, иначе `no-undef` даёт ложные срабатывания.

## Известные ограничения

- **Не работает с fixed-prompt-пресетами**: если persona пресета задаёт `includeRuntimeContext: false` (так делают и официальный `minimal`, и локальный `simple-reply`), `assemble()` возвращает `contexts: []`, и запись этого плагина отбрасывается целиком. Такие пресеты специально запрещают последующим listener'ам добавлять что-либо в промпт.
- **Старые снимки остаются в истории**: при смене даты платформа дописывает новый снимок (старый сохраняется), а новый вступает в силу благодаря собственному объявлению "This snapshot supersedes earlier runtime-context snapshots" — точно так же платформа обрабатывает смены cwd / sandbox / политики одобрения.
- **Bundle-patch не перезагружаются на лету**: изменение `cordis.patch.yml` или обновление плагина требует перезапуска dsh web (изменение `disabled` в profile patch срабатывает горячо).
- **`dsh-time-context` не загружается и не фильтруется**: если вы явно смонтируете его в пресете, его подробный текст появится как обычно. Не использовать оба.
- **Нет runtime-пробы точки контракта**: `systemPrompt.context` вызывается без защиты, поэтому будущее переименование со стороны DSH проявится как ошибка загрузки плагина, а не как тихая деградация (см. `HANDOVER.md` §7).

## Лицензия

MIT
