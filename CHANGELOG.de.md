# Änderungsprotokoll (Changelog)

Alle bemerkenswerten Änderungen an diesem Projekt werden in dieser Datei dokumentiert.
Das Format folgt [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), und dieses Projekt hält sich an [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

## Unveröffentlicht

### Geändert

- **Unterstützung von zwei DSH-Versionen (0.1.0-rc.7 … 0.1.2-rc.1).** Die Kompatibilitätsmatrix ist
  im README (EN/ZH) dokumentiert, und `engines.dsh` wurde ergänzt. Keine Codeänderung: Der einzige
  Host-Kontrakt des Plugins, `systemPrompt.context({ name, order, text })`, ist zwischen
  `dsh-v0.1.1-rc.2` und `dsh-v0.1.2-rc.1` in Signatur und Semantik identisch, und das Plugin
  registriert keinen Settings-Namespace, liest keine Sitzungsdaten und macht keinen RPC-Aufruf.

## 0.3.0 — 2026-09-29

### Geändert

- **Unterstützung der DSH-0.2.0-Linie (`>=0.2.0-rc.1 <0.2.1-0`).** `engines.dsh` sowohl in
  `package.json` als auch in `dsh.plugin.json` aktualisiert; Version in beiden Manifesten auf 0.3.0 angehoben. Keine
  Codeänderung: Zwischen `dsh-v0.1.7-rc.2` und `dsh-v0.2.0-rc.1` ist der Diff von `packages/core/system-prompt`
  eine einzelne Versionszeile, der `order: 116`-Platz bleibt kollisionsfrei (110/115/120
  unverändert), und der Plugin-Migrationsguide enthält keinen `systemPrompt`-Eintrag. Die 0.1.x-Linie
  (0.1.0-rc.7 → 0.1.7.x) wird weiterhin von Artefakt ≤ 0.2.0 bedient (dist-tag `dsh-0.1.7`).

### Behoben

- Den npm-veröffentlichten Versionssprung auf 0.2.0 in die Git-Historie eingearbeitet (er war zuvor
  aus einem nicht committeten Arbeitsbaum veröffentlicht worden).

## 0.1.0 — 2026-09-08

Erste Veröffentlichung.

### Hinzugefügt

- Host-seitiges Plugin, das das aktuelle Datum als dynamischen Laufzeitkontext registriert (`systemPrompt.context`), gerendert als `Current date: 2026-09-08 Asia/Shanghai Tuesday` — 46 Zeichen, rund 12 Tokens, ohne Tageszeit.
- `cordis.patch.yml`-Bundle-Patch mit einer einzigen `insert`-Zeile (`id: date-wrapper`, `config.timeZone: Asia/Shanghai`).
- `timeZone`-Konfiguration wird beim Start validiert: eine ungültige oder nicht auflösbare IANA-Zone wirft, statt still auf UTC zurückzufallen.
- Fail-soft-Textanbieter: Ein Renderfehler gibt eine leere Zeichenkette zurück, sodass die Prompt-Assemblierung nie wegen des Plugins wirft.
- 18 Behauptungen via `node --test`: Zonenprojektion, Wochentagskorrektheit über Zonengrenzen hinweg, exaktes Format und Länge, Degradierung, Konfigurationsvalidierung und der Registrierungskontrakt gegen einen falschen Kontext.
- ESLint 10 Flat Config; `npm run verify` als Tor für lint + Tests.
- Null Laufzeit-Abhängigkeiten und null `@deepseek-ai/*`-Imports.

### Dokumentation

- `README.{md,zh,ja,ko}`, `INSTALL.{md,zh,ja,ko}`, `CHANGELOG.{md,ja,ko}` mit kreuzverlinkten Sprachumschaltern.
- Versionskompatibilitätsmatrix für 0.1.0-rc.7 → 0.1.3-alpha.2.
- `docs/dsh-session-and-context-mechanics.md` — wie DSH Sitzungen in JSONL verwandelt und Anfragen assembliert (Chinesisch).
- `HANDOVER.md` — Projektübergabe und Designbegründung (Chinesisch).

### Hinweise

- Funktionale Überschneidung mit `@deepseek-ai/dsh-time-context`: nicht beide montieren.
- Kein Settings-Panel by design — das Aktivieren oder Deaktivieren der Plugin-Zeile ist der Schalter.
- Inaktiv unter Fixed-Prompt-Presets, deren Persona `includeRuntimeContext: false` setzt.
