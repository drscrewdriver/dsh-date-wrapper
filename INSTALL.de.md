# Installationsanleitung (offizielle DSH-CLI)

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

## 0. Voraussetzungen

```powershell
echo $env:DSH_HOME      # usually C:\Users\<you>\.dsh
dsh --version           # verified on 0.1.1-rc.2 (0.1.x line, plugin <= 0.2.0); 0.2.0-rc.1+ needs plugin >= 0.3.0 (engines >=0.2.0-rc.1 <0.2.1-0)
pnpm --version          # `dsh plugin` is a pnpm forwarder, so pnpm must be on PATH
```

## 1. Installation

Von GitHub (empfohlen — pnpm kopiert das Paket nach `node_modules`, und die Lockfile pinnt den exakten Commit):

```powershell
dsh plugin --profile web add github:drscrewdriver/dsh-date-wrapper
```

Oder aus einem lokalen Checkout (Entwicklung):

```powershell
dsh plugin --profile web add E:\test\rewrite-agently\mine-dsh-plugins\dsh-date-wrapper
```

Oder im Link-Modus (Quellcode-Änderungen wirken nach einem Neustart, ohne Neuinstallation):

```powershell
dsh plugin --profile web add link:E:\test\rewrite-agently\mine-dsh-plugins\dsh-date-wrapper
```

> ⚠️ Eine lokale `file:`-/`link:`-Installation macht das Profil von diesem Pfad abhängig. Wird das Verzeichnis umbenannt oder gelöscht, brechen **alle** pnpm-Operationen im Profil mit `ENOENT`, bis die veraltete Abhängigkeit entfernt ist — genau das geschah, als dieses Paket von `dsh-time-wrapper` umbenannt wurde.
> ⚠️ Ein relativer Pfad ist nur dann an **Ihr aktuelles Verzeichnis** verankert, wenn er mit `.` oder `..` beginnt;
> `mine-dsh-plugins\dsh-date-wrapper` wird innerhalb des Profil-Verzeichnisses aufgelöst und nicht gefunden. Absolute Pfade sind am sichersten.

Zeichen einer erfolgreichen Installation:

1. pnpm beendet sich mit Code 0;
2. `C:\Users\<you>\.dsh\profiles\web\package.json` listet `dsh-date-wrapper` unter `dependencies`;
3. das `dsh.profile.bundles` derselben Datei erhält `dsh-date-wrapper` am Ende (das Paket deklariert `dsh.bundle.patch` und wird deshalb automatisch in die Ebenenliste aufgenommen).

## 2. Neustart

```powershell
# stop the running dsh web process, then start it again
dsh web
```

Dann die Browserseite neu laden.

> Bundle-Patches werden **nicht** heiß nachgeladen: Nur die Profil-/Home-Patch-Ebenen werden überwacht. Änderungen an der
> eigenen `cordis.patch.yml` des Plugins oder ein Plugin-Upgrade erfordern stets einen Neustart.

## 3. Verifikation

Öffnen Sie eine neue Sitzung und senden Sie eine beliebige Nachricht. Das Datum hängt am **Laufzeitkontext-Snapshot** (in der Sitzung als injizierte Kontextzeile mit der Quelle `system-prompt` angezeigt), und zwar als:

```
Current date: 2026-09-08 Asia/Shanghai Tuesday
```

Das ist `Current date: ` + `<ISO date> <IANA zone> <English weekday>`, 46 Zeichen (~12 Tokens), **ohne Stunde, Minute oder Sekunde**.

Sie können das Plugin selbst auch von der Kommandozeile aus üben:

```powershell
cd E:\test\rewrite-agently\mine-dsh-plugins\dsh-date-wrapper
node tests/format.test.mjs
node tests/context.test.mjs
```

## 4. Fehlerbehebung

| Symptom | Ursache und Behebung |
|---------|---------------|
| Start schlägt fehl mit `date-wrapper: 非法 IANA timeZone` | Der `timeZone` in `cordis.patch.yml` ist falsch. Das ist **absichtliches Fail-fast**: Lieber beim Start scheitern, als stillschweigend ein falsches Datum in UTC auszugeben |
| Start schlägt fehl mit `duplicate loader entry id: date-wrapper` | Der Assemblierungsbaum hat bereits eine Zeile mit dieser id; löschen Sie das Duplikat |
| Kein Datum nach der Installation | ① prüfen, dass `dsh-date-wrapper` in `dsh.profile.bundles` steht; ② prüfen, dass Sie neu gestartet und die Seite neu geladen haben; ③ **prüfen, dass das aktuelle Preset kein Fixed-Prompt-Preset ist** (nächste Zeile) |
| Kein Datum unter manchen Presets | Die Persona dieses Presets setzt `includeRuntimeContext: false` (das offizielle `minimal` und das lokale `simple-reply` tun beide). Solche Presets verbieten späteren Listeners ausdrücklich, Prompt-Inhalt hinzuzufügen; der Laufzeitkontext dieses Plugins wird daher verworfen — erwartetes Verhalten |
| Das Datum geht um einen Tag daneben | `timeZone` entspricht nicht Ihrer tatsächlichen Zone; über eine Zonengrenze hinweg (z. B. 00:30 in Peking = 16:30 UTC am Vortag) zeigt sich das als Differenz von einem Tag |
| Sie sehen zusätzlich `Time sampled …` | Ein Preset montiert `@deepseek-ai/dsh-time-context` explizit. Dieses Plugin lädt oder filtert es nicht; beide dürfen nicht zusammen verwendet werden |
| Jede pnpm-Operation im Profil schlägt fehl mit `ENOENT: no such file or directory, open '…'` | Eine `file:`-/`link:`-Abhängigkeit zeigt auf einen nicht mehr existierenden Pfad (das Paket wurde umbenannt oder sein Tarball gelöscht). Entfernen Sie die veraltete Abhängigkeit mit `dsh plugin --profile web remove <name>` und installieren Sie neu; `github:`-Installationen haben diesen Fehlermodus nicht |

## 5. An/Aus (kein Panel-Umschalter — die Aktivierung ist der Schalter)

Deaktivieren oder aktivieren Sie es in Ihrer eigenen Profil-Patch-Schicht — `C:\Users\<you>\.dsh\profiles\web\cordis.patch.yml`:

```yaml
- id: date-wrapper
  disabled: true    # disabled; set back to false to restore
```

- **Heiß, ohne Neustart**: Die Datei wird vom Cordis-HMR überwacht; `disabled: true` entsorgt die Fiber der Zeile, und die Injektion stoppt sofort.
- DSHs eingebaute Seite **Settings → Plugins** zeigt `enabled / disabled` (schreibgeschützt).
- Die Datei muss ein YAML-Array auf oberster Ebene sein; macht man sie fehlerhaft, **schlägt der Start fehl** (fail-loud).
- Die vollständige Entfernung läuft über `dsh plugin remove` (nächster Abschnitt) und **erfordert einen Neustart**.

## 6. Deinstallation

```powershell
dsh plugin --profile web remove dsh-date-wrapper
```

Starten Sie dsh web neu.
