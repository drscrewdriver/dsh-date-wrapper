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

> **▼ DSH-Versionskompatibilität**
>
> | DSH-Version | Laden | Host-Kontrakt | Client-Seite |
> | --- | --- | --- | --- |
> | 0.1.0-rc.7 ~ 0.1.7.x (0.1.x-Linie) | ✅ Artefakt ≤ 0.2.0 | `systemPrompt.context({ name, order, text })` | — (nur Host-Plugin) |
> | 0.2.0-rc.1+ (`>=0.2.0-rc.1 <0.2.1-0`) | ✅ Artefakt ≥ 0.3.0 | gleiche Signatur; der Diff von `packages/core/system-prompt` gegenüber `dsh-v0.1.7-rc.2` besteht nur aus der Versionszeichenkette | — (nur Host-Plugin) |
>
> Ein Kontrakt deckt alle Linien ab: Das Plugin ruft nur `systemPrompt.context` auf, dessen
> Signatur und Semantik sich von `dsh-v0.1.1-rc.2` bis
> `dsh-v0.2.0-rc.1` nicht geändert haben. Es registriert keinen Settings-Namespace, liest keine
> Sitzungsdaten und macht keinen RPC-Aufruf; daher berühren ihn weder die Client-/Sitzungs-/Persistenz-
> Neuschreibungen von 0.1.1 → 0.1.2 noch die Host-Änderungen von 0.1.7 → 0.2.0-rc.1.
> Ältere 0.1.x-Hosts bleiben bei Artefakt ≤ 0.2.0 (dist-tag `dsh-0.1.7`); die 0.2.0-Linie
> wird von Artefakt ≥ 0.3.0 bedient.

> Eine minimale Datumszeile: Sie hängt `Current date: 2026-09-08 Asia/Shanghai Tuesday` (46 Zeichen, ~12 Tokens) an den Laufzeitkontext-Snapshot an, den DSH ohnehin schon sendet.
> Sie lädt `@deepseek-ai/dsh-time-context` **nicht**, fügt **keine** zusätzlichen Sitzungsnachrichten hinzu, patcht den DSH-Quellcode **nicht** und braucht keinen PR.

- [Wie es funktioniert: DSH-Sitzungen, JSONL und Request-Assemblierung](./docs/dsh-session-and-context-mechanics.md) (Chinesisch)
- [HANDOVER.md](./HANDOVER.md) (Chinesisch)

## Was dieses Plugin löst

DSHs eigenes `@deepseek-ai/dsh-time-context` injiziert bei jeder Anfrage etwa **280 Zeichen** Metadaten:

```
Time sampled while preparing turn 3, step 2: 2026-09-08T16:05:36+08:00[Asia/Shanghai]
Browser time zone for this request: Asia/Shanghai. Interpret otherwise-unqualified dates and times in this zone.
Elapsed since the preceding model-visible message: 2m 34s.
```

Dieses Plugin komprimiert dieselbe Information in eine einzige Zeile von **46 Zeichen** und verlegt den Ablageort — sie landet nicht mehr im Nachrichtenstrom:

```
Current date: 2026-09-08 Asia/Shanghai Tuesday
```

| Dimension | `dsh-time-context` | `dsh-date-wrapper` |
|-----------|--------------------|--------------------|
| Injizierter Text | ~280 Zeichen | 46 Zeichen (↓84 %), ~12 Tokens |
| Ablageort | Eine Nachricht pro Pre-Step (`user/message`) | Der Laufzeitkontext-Snapshot der Plattform (`systemPrompt.context`) |
| Häufigkeit | Ein Ereignis pro geeignetem Step | Wird mit dem Snapshot nur erneut gesendet, wenn sich der Text ändert (0 Ereignisse innerhalb eines Tages) |
| Abhängigkeit | Dienst `agents` | Dienst `systemPrompt` |
| Laufzeit-Abhängigkeiten | — | keine |

## Versionskompatibilität

| Punkt | Befund |
|------|---------|
| Ziel-DSH-Versionen | 0.1.0-rc.7 → 0.1.7.x (0.1.x-Linie — Artefakt ≤ 0.2.0) und 0.2.0-rc.1 → 0.2.0.x (0.2.0-Linie, `engines.dsh: >=0.2.0-rc.1 <0.2.1-0` — Artefakt ≥ 0.3.0) |
| Settings-API | **Nicht anwendbar**: Das Plugin registriert keine Settings und exportiert kein schemastery-`Config` |
| Genutzte Kontraktpunkte | Genau einer — `systemPrompt.context()` |
| Konflikt mit nativer Funktion | Überschneidet sich mit `@deepseek-ai/dsh-time-context`; **nicht beide gleichzeitig verwenden**. Nicht standardmäßig installiert = standardmäßig aus |
| Browser-Seite | **Keine**: kein Slot, kein DOM, keine CSS-Semantik-Tokens |
| DSH-Paket-Imports | **Null**: nichts aus `@deepseek-ai/*`, was strenger ist als das Muster „Laufzeiterkennung + doppeltes API-Fallback“ |

| Kontraktpunkt | 0.1.0-rc.7 | 0.1.1-rc.2 | 0.1.2-rc.1 | 0.1.3-alpha.2 | 0.1.7-rc.2 | 0.2.0-rc.1 |
|---|---|---|---|---|---|---|
| `systemPrompt.context(ctx): () => void` | ja | ja (auf diesem Host verifiziert) | ja | ja | ja | ja (Diff gegenüber 0.1.7-rc.2: nur die Versionszeichenkette) |
| `PromptContext = { name, order, text }`, kein `complete`-Feld | ja | ja | ja | ja | ja | ja |
| `includeRuntimeContext` / `suppressRuntimeContext` | ja | ja | ja | ja | ja | ja |
| agent-loop `project()`-Textdeduplizierung und `surfaceOp: "append"` | ja | ja | ja | nicht verglichen | ja | ja |
| `order: 116` kollisionsfrei (110 / 115 / 120 vergeben) | ja | ja | ja | ja | ja | ja |

> Methode: `npm pack @deepseek-ai/dsh-system-prompt@<version>`, entpacken und `lib/types/index.d.ts` sowie `lib/index.js` vergleichen; mit `@deepseek-ai/dsh-agent-loop` ebenso.
> Zwischen `dsh-v0.1.7-rc.2` und `dsh-v0.2.0-rc.1` ist der Diff von `packages/core/system-prompt` eine einzelne Versionszeile, die `systemPrompt.context`-Aufrufstellen bei 110/115/120 sind unverändert, und der Plugin-Migrationsguide enthält keinen `systemPrompt`-Eintrag.
> Nur 0.1.1-rc.2 wurde auf diesem Host **zur Laufzeit** verifiziert; der Laufzeit-Smoketest für 0.2.0-rc.1 ist in `HANDOVER.md` §7 dokumentiert.

## Warum ein Laufzeitkontext-Snapshot statt einer Nachricht

Der erste Versuch kopierte `dsh-time-context` und hängte in `agent/pre-step` ein `user/message` an. Die gemessenen Kosten waren zu hoch: Jedes JSONL-Ereignis wiegt **339 Byte** (der Text macht nur 46 davon aus, weil `content` und `sections` je eine Kopie speichern), und es wurde **bei jedem Zug** eines geschrieben.

Werden stattdessen ein Laufzeitkontext registriert, wird das Datum in die Snapshot-Nachricht eingefaltet, die die Plattform ohnehin schon sendet:

- Die Plattform **dedupliziert Snapshots nach Text** (`RuntimeContextProjection.project()` in `dsh-agent-loop`: `if (this.retained?.text === snapshot) return`); solange sich das Datum nicht ändert, wird **kein einziges zusätzliches Ereignis geschrieben**;
- Snapshots **hängen** eine neue Nachricht an (`surfaceOp: 'append'`), statt sie an Ort und Stelle umzuschreiben; die Anfragesequenz wächst nur → **der Präfix-Cache bleibt erhalten**;
- Unsere Grenzkosten sind diese 46 Byte, und nur wenn der Snapshot erneut gesendet wird, weil sich sein Text geändert hat.

Gemessen auf diesem Host (eine echte Sitzung, 10 Züge / 231 Steps):

| Punkt | Gemessen |
|------|----------|
| Laufzeitkontext-Snapshots der Plattform | 2 Ereignisse, je 1133 B, insgesamt 2,3 KB |
| Echte Nutzernachrichten | 10 Ereignisse, je 396 B |
| Alter Ansatz (eine Nachricht pro Zug) | 10 × 339 B ≈ 3,4 KB |
| Dieser Ansatz | 0 zusätzliche Ereignisse; ~46 B in einen bestehenden Snapshot gefaltet |

## Konfiguration

Wird mit `cordis.patch.yml` ausgeliefert; nach Änderungen neu starten:

```yaml
- insert:
    - id: date-wrapper
      name: dsh-date-wrapper
      config:
        timeZone: Asia/Shanghai   # IANA zone; omit to use the process zone
```

- Ein ungültiger `timeZone` wirft beim Start eine Ausnahme (**kein** stilles Zurückfallen auf UTC).
- Der Zonenname im Text ist der aufgelöste IANA-Name (der Zonenname des Prozesses, wenn `timeZone` weggelassen wird).
- Der Laufzeitkontext-Eintrag heißt `date-wrapper:date` mit der Order `116` (bereits vergeben: 110 sandbox, 115 approval, 120 subagent).
- Das Plugin exportiert **kein schemastery-`Config`**, deshalb überspringt seine Konfiguration die Schemavalidierung des Hosts; alles wird von Hand in `validateConfig()` geprüft. Deshalb hat die Seite Settings → Plugins auch kein Konfigurationsformular dafür.

## An/Aus: Die Aktivierung des Plugins ist der Schalter, es gibt keinen Panel-Umschalter

Das Plugin liefert **weder** einen Settings-Panel-Umschalter **noch** ein `enabled`-Konfigurationsfeld, weil:

- Der Funktionsschalter *ist* die Frage, ob die Plugin-Zeile aktiv ist. Inaktiv → `apply()` läuft nie → der Laufzeitkontext-Eintrag existiert nicht → es wird kein einziges Zeichen injiziert.
- Es gibt keine Browser-Seite (`dsh.client`), also besitzt die UI kein Widget von uns.
- DSHs eingebaute Seite **Settings → Plugins** zeigt jeden Eintrag bereits als `enabled / disabled` (schreibgeschützt).

### So schaltet man es aus

Überschreiben Sie es über die `id` in **Ihrer eigenen** Profil-Patch-Schicht — `C:\Users\<you>\.dsh\profiles\web\cordis.patch.yml`:

```yaml
- id: date-wrapper
  disabled: true    # disabled; set back to false to restore
```

- **Heiß, ohne Neustart**: Diese Datei wird vom Cordis-HMR überwacht, und `disabled: true` entsorgt die Fiber der Zeile direkt.
- Existiert die Zeile `date-wrapper` noch nicht (nicht installiert), schreibt dieser Patch nur eine Warnung `entry "date-wrapper" not found` ins Log; der Start gelingt trotzdem.
- ⚠️ Die Datei muss ein **YAML-Array auf oberster Ebene** sein; ist sie fehlerhaft, **schlägt der Start fehl** (DSH ist bei Nutzer-Patch-Schichten fail-loud).

### So entfernt man es vollständig

```bash
dsh plugin --profile web remove dsh-date-wrapper
```

Die Entfernung läuft über die Bundle-Schicht und **erfordert einen Neustart** von dsh web (Bundle-Patches werden nicht heiß nachgeladen).

## Installation

```bash
dsh plugin --profile web add github:drscrewdriver/dsh-date-wrapper
```

Starten Sie dsh web neu und laden Sie die Seite neu. Lokale Pfade, Link-Modus und Fehlerbehebung: [INSTALL.de.md](./INSTALL.de.md).

## Verifikation

| # | Wie | Erwartet |
|---|-----|----------|
| A1 | Neue Sitzung öffnen und eine Nachricht senden | Der Laufzeitkontext-Snapshot enthält `Current date: YYYY-MM-DD <zone> <weekday>` (angezeigt als injizierte Kontextzeile mit der Quelle `system-prompt`) |
| A2 | Diese Zeile prüfen | ≤50 Zeichen (46 gemessen; der PRD-Grenzwert von 30 wurde für das gewünschte Format gelockert) |
| A3 | Plugin deaktivieren (Profil-Patch `disabled: true`) | Die Zeile erscheint in den Snapshots späterer Sitzungen nicht mehr |
| A4 | Sitzungslog durchsuchen | Kein `Time sampled` / `Elapsed since` / `Browser time zone` |
| A5 | `timeZone` auf `UTC` setzen und neu starten | Das Datum folgt UTC (an Zonengrenzen kann es um einen Tag abweichen) |

## Hinweise zur Implementierung

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

- **Host-Ebenen-Zeile**: `ctx.inject(['systemPrompt'], …)` öffnet eine Kind-Fiber; fehlt der Dienst, registriert das Plugin stillschweigend nichts, statt den gesamten Boot-Vorgang scheitern zu lassen.
- **Fail-soft-Textanbieter**: Ein Wurf während der Prompt-Assemblierung würde **jede** Anfrage scheitern lassen; ein Renderfehler gibt daher eine leere Zeichenkette zurück (die Plattform filtert leeren Text heraus).
- **Kein `complete`**: Es gesetzt würde das gesamte Systemprompt verschatten.
- **Deduplizierung ist Sache der Plattform**: Es wird kein Agent-Zustand gepflegt; über Mitternacht trägt der Snapshot einfach das neue Datum.
- **Lebenszyklus**: Die Registrierung gehört zur Kind-Fiber von `ctx.inject` und wird eingesammelt, wenn das Plugin deaktiviert wird.

## Entwicklung: TDD + Lint

```bash
npm install          # devDependencies only (eslint / @eslint/js); zero runtime dependencies

npm run tdd          # watch mode: rerun on src/ or tests/ changes (node --test --watch)
npm test             # one full run: node --test "tests/*.test.mjs"
node tests/format.test.mjs   # run a single file (most reliable under a sandbox: no child process)

npm run lint         # eslint . (src + tests + eslint.config.mjs)
npm run lint:fix     # auto-fix what can be fixed
npm run verify       # lint + test; run this before committing
```

### Red-Green-Refactor

Testfälle bilden die Akzeptanzkriterien direkt ab: erst eine fehlschlagende Behauptung schreiben, dann sie bestehen lassen.

| Schritt | Aktion | Befehl |
|------|--------|---------|
| 1 rot | In `tests/*.test.mjs` eine nach dem Akzeptanzkriterium benannte Behauptung ergänzen, die ein Verhalten prüft, das Sie **noch nicht** haben | `npm run tdd` |
| 2 grün | In `src/` die minimale Implementierung schreiben, ohne andere Behauptungen anzufassen | `npm run tdd` |
| 3 refactor | Im Grünen umbenennen und reine Funktionen extrahieren; `src/format.js` trägt die gesamte reine Logik, `src/index.js` registriert nur | `npm run tdd` |
| 4 Tor | Vor dem Commit lint + die gesamte Suite laufen lassen | `npm run verify` |

Heute 18 Behauptungen: `format.test.mjs` (11) deckt die reinen Funktionen ab, `context.test.mjs` (7) prüft den Registrierungskontrakt gegen ein falsches ctx.

### Highlights der Lint-Konfiguration

- ESLint 10 Flat Config (`eslint.config.mjs`) mit `@eslint/js` recommended als Basislinie.
- Verschärfte Regeln: `eqeqeq`, `prefer-const`, `object-shorthand`, `no-unused-vars` (`_`-Präfix ausgenommen).
- Die Node-Globals `crypto` / `console` / `process` sind explizit deklariert, sonst meldet `no-undef` Fehlalarme.

## Bekannte Einschränkungen

- **Inaktiv unter Fixed-Prompt-Presets**: Setzt die Persona eines Presets `includeRuntimeContext: false` (das offizielle `minimal` und das lokale `simple-reply` tun beide), gibt `assemble()` `contexts: []` zurück und der Eintrag dieses Plugins wird komplett verworfen. Solche Presets sind darauf ausgelegt, späteren Listeners das Hinzufügen von Prompt-Inhalt zu verbieten.
- **Alte Snapshots bleiben in der Historie**: Ändert sich das Datum, hängt die Plattform einen neuen Snapshot an (der alte bleibt erhalten), und der neue wird über seine eigene Erklärung „This snapshot supersedes earlier runtime-context snapshots“ wirksam — genauso, wie die Plattform Änderungen an cwd / Sandbox / Freigaberichtlinie behandelt.
- **Bundle-Patches werden nicht heiß nachgeladen**: Änderungen an `cordis.patch.yml` oder ein Plugin-Upgrade erfordern einen Neustart von dsh web (das Ändern von `disabled` im Profil-Patch ist heiß).
- **`dsh-time-context` wird weder geladen noch gefiltert**: Montieren Sie es explizit in einem Preset, erscheint sein ausführlicher Text wie üblich. Nicht beide gleichzeitig verwenden.
- **Keine Laufzeitsonde für den Kontraktpunkt**: `systemPrompt.context` wird ungeschützt aufgerufen; eine künftige Umbenennung durch DSH würde sich als Plugin-Ladefehler statt als stille Verschlechterung zeigen (siehe `HANDOVER.md` §7).

## Lizenz

MIT
