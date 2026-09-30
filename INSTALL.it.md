# Guida all'installazione (CLI DSH ufficiale)

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

## 0. Prerequisiti

```powershell
echo $env:DSH_HOME      # usually C:\Users\<you>\.dsh
dsh --version           # verified on 0.1.1-rc.2 (0.1.x line, plugin <= 0.2.0); 0.2.0-rc.1+ needs plugin >= 0.3.0 (engines >=0.2.0-rc.1 <0.2.1-0)
pnpm --version          # `dsh plugin` is a pnpm forwarder, so pnpm must be on PATH
```

## 1. Installazione

Da GitHub (consigliato — pnpm copia il pacchetto in `node_modules` e la lockfile fissa il commit esatto):

```powershell
dsh plugin --profile web add github:drscrewdriver/dsh-date-wrapper
```

Oppure da una copia locale (sviluppo):

```powershell
dsh plugin --profile web add E:\test\rewrite-agently\mine-dsh-plugins\dsh-date-wrapper
```

Oppure in modalità link (le modifiche al sorgente fanno effetto dopo un riavvio, senza reinstallare):

```powershell
dsh plugin --profile web add link:E:\test\rewrite-agently\mine-dsh-plugins\dsh-date-wrapper
```

> ⚠️ Un'installazione locale `file:` / `link:` rende il profilo dipendente da quel percorso. Rinominare o eliminare la directory rompe poi **ogni** operazione pnpm nel profilo con `ENOENT`, finché la dipendenza obsoleta non viene rimossa — è esattamente ciò che è successo quando questo pacchetto è stato rinominato da `dsh-time-wrapper`.
> ⚠️ Un percorso relativo è ancorato alla **directory corrente** solo se inizia con `.` o `..`;
> `mine-dsh-plugins\dsh-date-wrapper` viene risolto dentro la directory del profilo e non sarà trovato. I percorsi assoluti sono i più sicuri.

Segnali di un'installazione riuscita:

1. pnpm esce con codice 0;
2. `C:\Users\<you>\.dsh\profiles\web\package.json` elenca `dsh-date-wrapper` sotto `dependencies`;
3. il `dsh.profile.bundles` dello stesso file guadagna `dsh-date-wrapper` in coda (il pacchetto dichiara `dsh.bundle.patch`, quindi viene tirato automaticamente nell'elenco dei layer).

## 2. Riavvio

```powershell
# stop the running dsh web process, then start it again
dsh web
```

Poi ricaricate la pagina nel browser.

> Le patch bundle **non** fanno hot-reload: vengono sorvegliati solo i layer di patch del profilo / della home. Modificare il
> `cordis.patch.yml` del plugin stesso o aggiornare il plugin richiede sempre un riavvio.

## 3. Verifica

Aprite una nuova sessione e inviate un messaggio qualsiasi. La data è appesa allo **snapshot del contesto di runtime** (mostrata in sessione come una riga di contesto iniettato proveniente da `system-prompt`), così:

```
Current date: 2026-09-08 Asia/Shanghai Tuesday
```

È `Current date: ` + `<ISO date> <IANA zone> <English weekday>`, 46 caratteri (~12 token), **senza ora, minuto o secondo**.

Potete anche esercitare il plugin stesso dalla riga di comando:

```powershell
cd E:\test\rewrite-agently\mine-dsh-plugins\dsh-date-wrapper
node tests/format.test.mjs
node tests/context.test.mjs
```

## 4. Risoluzione dei problemi

| Sintomo | Causa e rimedio |
|---------|---------------|
| L'avvio fallisce con `date-wrapper: 非法 IANA timeZone` | Il `timeZone` in `cordis.patch.yml` è sbagliato. È un **fail-fast voluto**: meglio fallire all'avvio che emettere silenziosamente una data sbagliata in UTC |
| L'avvio fallisce con `duplicate loader entry id: date-wrapper` | L'albero di assemblaggio ha già una riga con quell'id; eliminate il duplicato |
| Nessuna data dopo l'installazione | ① confermate che `dsh-date-wrapper` è in `dsh.profile.bundles`; ② confermate di aver riavviato e ricaricato la pagina; ③ **confermate che il preset corrente non è a prompt fisso** (riga successiva) |
| Nessuna data con alcuni preset | La persona di quel preset imposta `includeRuntimeContext: false` (lo fanno sia il `minimal` ufficiale sia il `simple-reply` locale). Tali preset vietano esplicitamente ai listener successivi di aggiungere contenuto al prompt, quindi il contesto di runtime di questo plugin viene scartato — comportamento atteso |
| La data è sfasata di un giorno | `timeZone` non corrisponde alla vostra zona reale; a cavallo di un confine di zona (es. 00:30 a Pechino = 16:30 UTC del giorno prima) questo si manifesta come una differenza di un giorno |
| Vedete anche `Time sampled …` | Qualche preset monta `@deepseek-ai/dsh-time-context` esplicitamente. Questo plugin non lo carica né lo filtra; i due non vanno usati insieme |
| Qualsiasi operazione pnpm nel profilo fallisce con `ENOENT: no such file or directory, open '…'` | Una dipendenza `file:` / `link:` punta a un percorso che non esiste più (il pacchetto è stato rinominato o il suo tarball eliminato). Rimuovete la dipendenza obsoleta con `dsh plugin --profile web remove <name>` e reinstallate; le installazioni `github:` non hanno questa modalità di guasto |

## 5. On/off (nessun toggle nel pannello — l'attivazione è l'interruttore)

Disattivatelo o riattivatelo nel vostro layer di patch del profilo — `C:\Users\<you>\.dsh\profiles\web\cordis.patch.yml`:

```yaml
- id: date-wrapper
  disabled: true    # disabled; set back to false to restore
```

- **A caldo, senza riavvio**: il file è sorvegliato dall'HMR di Cordis; `disabled: true` dispose la fiber della riga e l'iniezione si ferma subito.
- La pagina **Settings → Plugins** integrata in DSH mostra `enabled / disabled` (sola lettura).
- Il file deve essere un array YAML di primo livello; renderlo malformato fa **fallire l'avvio** (fail-loud).
- La rimozione completa passa per `dsh plugin remove` (sezione seguente) e **richiede un riavvio**.

## 6. Disinstallazione

```powershell
dsh plugin --profile web remove dsh-date-wrapper
```

Riavviate dsh web.
