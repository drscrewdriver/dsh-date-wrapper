# Changelog

Tutte le modifiche rilevanti di questo progetto sono documentate in questo file.
Il formato segue [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) e questo progetto aderisce al [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

## Inedito

### Modificato

- **Supporto di due versioni di DSH (0.1.0-rc.7 … 0.1.2-rc.1).** La matrice di compatibilità è stata
  documentata nel README (EN/ZH) ed è stato aggiunto `engines.dsh`. Nessun cambio di codice: l'unico
  contratto lato host del plugin, `systemPrompt.context({ name, order, text })`, è identico in firma
  e semantica tra `dsh-v0.1.1-rc.2` e `dsh-v0.1.2-rc.1`, e il plugin non registra namespace di
  impostazioni, non legge dati di sessione e non effettua chiamate RPC.

## 0.3.0 — 2026-09-29

### Modificato

- **Supporto della linea DSH 0.2.0 (`>=0.2.0-rc.1 <0.2.1-0`).** `engines.dsh` aggiornato sia in
  `package.json` sia in `dsh.plugin.json`; versione portata a 0.3.0 in entrambi i manifesti. Nessun cambio
  di codice: tra `dsh-v0.1.7-rc.2` e `dsh-v0.2.0-rc.1` il diff di `packages/core/system-prompt`
  è una sola riga di versione, lo slot `order: 116` resta senza collisioni (110/115/120
  invariati) e la guida alla migrazione dei plugin non ha alcuna voce `systemPrompt`. La linea 0.1.x
  (0.1.0-rc.7 → 0.1.7.x) continua a essere servita da artifact ≤ 0.2.0 (dist-tag `dsh-0.1.7`).

### Corretto

- Riconciliato nella cronologia git il bump di versione 0.2.0 pubblicato su npm (in precedenza era
  stato pubblicato da un working tree non committato).

## 0.1.0 — 2026-09-08

Prima release.

### Aggiunto

- Plugin lato host che registra la data corrente come contesto di runtime dinamico (`systemPrompt.context`), reso come `Current date: 2026-09-08 Asia/Shanghai Tuesday` — 46 caratteri, circa 12 token, senza orario.
- Patch bundle `cordis.patch.yml` con una sola riga `insert` (`id: date-wrapper`, `config.timeZone: Asia/Shanghai`).
- Configurazione `timeZone` validata all'avvio: una zona IANA non valida o non risolvibile lancia un'eccezione invece di ripiegare in silenzio su UTC.
- Provider di testo fail-soft: un errore di rendering restituisce una stringa vuota, così l'assemblaggio del prompt non lancia mai eccezioni per colpa del plugin.
- 18 asserzioni via `node --test`: proiezione di zona, correttezza del giorno della settimana oltre i confini di zona, formato e lunghezza esatti, degrado, validazione della configurazione e contratto di registrazione contro un contesto finto.
- Flat config ESLint 10; `npm run verify` fa da gate a lint + test.
- Zero dipendenze di runtime e zero import `@deepseek-ai/*`.

### Documentazione

- `README.{md,zh,ja,ko}`, `INSTALL.{md,zh,ja,ko}`, `CHANGELOG.{md,ja,ko}` con selettori di lingua incrociati.
- Matrice di compatibilità delle versioni che copre 0.1.0-rc.7 → 0.1.3-alpha.2.
- `docs/dsh-session-and-context-mechanics.md` — come DSH trasforma le sessioni in JSONL e assembla le richieste (cinese).
- `HANDOVER.md` — handover del progetto e motivazioni di design (cinese).

### Note

- Sovrapposizione funzionale con `@deepseek-ai/dsh-time-context`: non montare entrambi.
- Nessun pannello impostazioni per scelta — attivare o disattivare la riga del plugin è l'interruttore.
- Inattivo con i preset a prompt fisso la cui persona imposta `includeRuntimeContext: false`.
