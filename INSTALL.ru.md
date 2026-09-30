# Руководство по установке (официальный DSH CLI)

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

## 0. Предварительные требования

```powershell
echo $env:DSH_HOME      # usually C:\Users\<you>\.dsh
dsh --version           # verified on 0.1.1-rc.2 (0.1.x line, plugin <= 0.2.0); 0.2.0-rc.1+ needs plugin >= 0.3.0 (engines >=0.2.0-rc.1 <0.2.1-0)
pnpm --version          # `dsh plugin` is a pnpm forwarder, so pnpm must be on PATH
```

## 1. Установка

Из GitHub (рекомендуется — pnpm копирует пакет в `node_modules`, а lockfile закрепляет точный коммит):

```powershell
dsh plugin --profile web add github:drscrewdriver/dsh-date-wrapper
```

Или из локальной копии (разработка):

```powershell
dsh plugin --profile web add E:\test\rewrite-agently\mine-dsh-plugins\dsh-date-wrapper
```

Или в режиме link (правки исходников вступают в силу после перезапуска, без переустановки):

```powershell
dsh plugin --profile web add link:E:\test\rewrite-agently\mine-dsh-plugins\dsh-date-wrapper
```

> ⚠️ Локальная установка через `file:` / `link:` делает профиль зависимым от этого пути. Переименование или удаление каталога затем ломает **все** pnpm-операции в профиле с ошибкой `ENOENT`, пока устаревшая зависимость не будет удалена — ровно это произошло, когда пакет переименовали из `dsh-time-wrapper`.
> ⚠️ Относительный путь привязывается к **вашему текущему каталогу**, только если он начинается с `.` или `..`;
> `mine-dsh-plugins\dsh-date-wrapper` разрешается внутри каталога профиля и найден не будет. Абсолютные пути надёжнее всего.

Признаки успешной установки:

1. pnpm завершается с кодом 0;
2. `C:\Users\<you>\.dsh\profiles\web\package.json` перечисляет `dsh-date-wrapper` в `dependencies`;
3. в `dsh.profile.bundles` того же файла в конце появляется `dsh-date-wrapper` (пакет объявляет `dsh.bundle.patch`, поэтому автоматически попадает в список слоёв).

## 2. Перезапуск

```powershell
# stop the running dsh web process, then start it again
dsh web
```

Затем обновите страницу в браузере.

> Bundle-patch **не** перезагружаются на лету: наблюдению подлежат только слои patch профиля / домашнего каталога. Изменение
> собственного `cordis.patch.yml` плагина или обновление плагина всегда требуют перезапуска.

## 3. Проверка

Откройте новую сессию и отправьте любое сообщение. Дата подвешивается к **снимку контекста времени выполнения** (в сессии показывается как строка внедрённого контекста с источником `system-prompt`):

```
Current date: 2026-09-08 Asia/Shanghai Tuesday
```

Это `Current date: ` + `<ISO date> <IANA zone> <English weekday>`, 46 символов (~12 токенов), **без часов, минут и секунд**.

Также можно потренировать сам плагин из командной строки:

```powershell
cd E:\test\rewrite-agently\mine-dsh-plugins\dsh-date-wrapper
node tests/format.test.mjs
node tests/context.test.mjs
```

## 4. Устранение неполадок

| Симптом | Причина и решение |
|---------|---------------|
| Старт падает с `date-wrapper: 非法 IANA timeZone` | Неверный `timeZone` в `cordis.patch.yml`. Это **намеренный fail-fast**: лучше упасть на старте, чем молча выдавать неверную дату в UTC |
| Старт падает с `duplicate loader entry id: date-wrapper` | В дереве сборки уже есть строка с таким id; удалите дубликат |
| Даты нет после установки | ① убедитесь, что `dsh-date-wrapper` есть в `dsh.profile.bundles`; ② убедитесь, что вы перезапустили и обновили страницу; ③ **убедитесь, что текущий пресет не fixed-prompt** (следующая строка) |
| Даты нет с некоторыми пресетами | Persona этого пресета задаёт `includeRuntimeContext: false` (так делают и официальный `minimal`, и локальный `simple-reply`). Такие пресеты явно запрещают последующим listener'ам добавлять содержимое в промпт, поэтому контекст времени выполнения этого плагина отбрасывается — ожидаемое поведение |
| Дата сдвинута на один день | `timeZone` не совпадает с вашей реальной зоной; через границу зон (например, 00:30 в Пекине = 16:30 UTC предыдущего дня) это проявляется как разница в один день |
| Вы также видите `Time sampled …` | Какой-то пресет явно монтирует `@deepseek-ai/dsh-time-context`. Этот плагин не загружает и не фильтрует его; вместе их использовать нельзя |
| Любая pnpm-операция в профиле падает с `ENOENT: no such file or directory, open '…'` | Зависимость `file:` / `link:` указывает на путь, которого больше не существует (пакет переименовали или удалили его tarball). Удалите устаревшую зависимость командой `dsh plugin --profile web remove <name>` и установите заново; установки через `github:` таким сбоем не страдают |

## 5. Включение/выключение (панели-переключателя нет — переключатель это активация)

Отключите или включите его в своём слое profile patch — `C:\Users\<you>\.dsh\profiles\web\cordis.patch.yml`:

```yaml
- id: date-wrapper
  disabled: true    # disabled; set back to false to restore
```

- **Горячо, без перезапуска**: файл наблюдается Cordis HMR; `disabled: true` уничтожает fiber строки, и внедрение прекращается немедленно.
- Встроенная страница DSH **Settings → Plugins** показывает `enabled / disabled` (только для чтения).
- Файл должен быть YAML-массивом верхнего уровня; если его повредить, **старт упадёт** (fail-loud).
- Полное удаление идёт через `dsh plugin remove` (следующий раздел) и **требует перезапуска**.

## 6. Удаление

```powershell
dsh plugin --profile web remove dsh-date-wrapper
```

Перезапустите dsh web.
