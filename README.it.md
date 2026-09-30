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

> **▼ Compatibilità delle versioni di DSH**
>
> | Versione di DSH | Caricamento | Contratto lato host | Metà client |
> | --- | --- | --- | --- |
> | 0.1.0-rc.7 ~ 0.1.7.x (linea 0.1.x) | ✅ artifact ≤ 0.2.0 | `systemPrompt.context({ name, order, text })` | — (plugin solo host) |
> | 0.2.0-rc.1+ (`>=0.2.0-rc.1 <0.2.1-0`) | ✅ artifact ≥ 0.3.0 | stessa firma; il diff di `packages/core/system-prompt` rispetto a `dsh-v0.1.7-rc.2` è solo la stringa di versione | — (plugin solo host) |
>
> Un solo contratto copre tutte le linee: il plugin chiama soltanto `systemPrompt.context`, la cui
> firma e semantica sono invariate da `dsh-v0.1.1-rc.2` a
> `dsh-v0.2.0-rc.1`. Non registra alcun namespace di impostazioni, non legge dati di
> sessione e non effettua chiamate RPC, quindi né le riscritture client/sessione/persistenza di
> 0.1.1 → 0.1.2 né le modifiche lato host di 0.1.7 → 0.2.0-rc.1 lo toccano. Gli host 0.1.x più
> vecchi restano su artifact ≤ 0.2.0 (dist-tag `dsh-0.1.7`); la linea 0.2.0 è servita da
> artifact ≥ 0.3.0.

> Una riga di data minimale: appende `Current date: 2026-09-08 Asia/Shanghai Tuesday` (46 caratteri, ~12 token) allo snapshot del contesto di runtime che DSH invia già di suo.
> **Non** carica `@deepseek-ai/dsh-time-context`, **non** aggiunge messaggi di sessione extra, **non** patcha il sorgente di DSH e non richiede PR.

- [Come funziona: sessioni DSH, JSONL e assemblaggio delle richieste](./docs/dsh-session-and-context-mechanics.md) (cinese)
- [HANDOVER.md](./HANDOVER.md) (cinese)

## Che problema risolve questo plugin

Il `@deepseek-ai/dsh-time-context` di DSH inietta circa **280 caratteri** di metadati a ogni richiesta:

```
Time sampled while preparing turn 3, step 2: 2026-09-08T16:05:36+08:00[Asia/Shanghai]
Browser time zone for this request: Asia/Shanghai. Interpret otherwise-unqualified dates and times in this zone.
Elapsed since the preceding model-visible message: 2m 34s.
```

Questo plugin comprime la stessa informazione in un'unica riga di **46 caratteri** e ne cambia il punto di arrivo — non va più nel flusso dei messaggi:

```
Current date: 2026-09-08 Asia/Shanghai Tuesday
```

| Dimensione | `dsh-time-context` | `dsh-date-wrapper` |
|-----------|--------------------|--------------------|
| Testo iniettato | ~280 caratteri | 46 caratteri (↓84%), ~12 token |
| Punto di arrivo | Un messaggio per ogni pre-step (`user/message`) | Lo snapshot del contesto di runtime della piattaforma (`systemPrompt.context`) |
| Frequenza | Un evento per ogni step idoneo | Reinviate con lo snapshot solo quando il testo cambia (0 eventi nello stesso giorno) |
| Dipendenza | Servizio `agents` | Servizio `systemPrompt` |
| Dipendenze di runtime | — | nessuna |

## Compatibilità delle versioni

| Voce | Verdetto |
|------|---------|
| Versioni DSH target | 0.1.0-rc.7 → 0.1.7.x (linea 0.1.x — artifact ≤ 0.2.0) e 0.2.0-rc.1 → 0.2.0.x (linea 0.2.0, `engines.dsh: >=0.2.0-rc.1 <0.2.1-0` — artifact ≥ 0.3.0) |
| API settings | **Non applicabile**: il plugin non registra impostazioni né esporta un `Config` schemastery |
| Punti di contratto usati | Esattamente uno — `systemPrompt.context()` |
| Conflitto con una funzionalità nativa | Si sovrappone a `@deepseek-ai/dsh-time-context`; **non usare entrambi**. Non installato per default = disattivato per default |
| Metà browser | **Nessuna**: nessuno slot, nessun DOM, nessun token semantico CSS |
| Import di pacchetti DSH | **Zero**: niente da `@deepseek-ai/*`, il che è più rigido del pattern «rilevamento a runtime + fallback su doppia API» |

| Punto di contratto | 0.1.0-rc.7 | 0.1.1-rc.2 | 0.1.2-rc.1 | 0.1.3-alpha.2 | 0.1.7-rc.2 | 0.2.0-rc.1 |
|---|---|---|---|---|---|---|
| `systemPrompt.context(ctx): () => void` | sì | sì (verificato su questo host) | sì | sì | sì | sì (diff rispetto a 0.1.7-rc.2: solo la stringa di versione) |
| `PromptContext = { name, order, text }`, senza campo `complete` | sì | sì | sì | sì | sì | sì |
| `includeRuntimeContext` / `suppressRuntimeContext` | sì | sì | sì | sì | sì | sì |
| deduplica per testo del `project()` di agent-loop e `surfaceOp: "append"` | sì | sì | sì | non confrontato | sì | sì |
| `order: 116` senza collisioni (110 / 115 / 120 occupati) | sì | sì | sì | sì | sì | sì |

> Metodo: `npm pack @deepseek-ai/dsh-system-prompt@<version>`, scompattare e confrontare `lib/types/index.d.ts` e `lib/index.js`; identico per `@deepseek-ai/dsh-agent-loop`.
> Tra `dsh-v0.1.7-rc.2` e `dsh-v0.2.0-rc.1` il diff di `packages/core/system-prompt` è una sola riga di versione, i punti di chiamata `systemPrompt.context` su 110/115/120 sono invariati e la guida alla migrazione dei plugin non ha alcuna voce `systemPrompt`.
> Solo 0.1.1-rc.2 è stata verificata **a runtime** su questo host; lo smoke test a runtime di 0.2.0-rc.1 è tracciato in `HANDOVER.md` §7.

## Perché uno snapshot del contesto di runtime invece di un messaggio

Il primo tentativo copiava `dsh-time-context` e aggiungeva un `user/message` in `agent/pre-step`. Il costo misurato era troppo alto: ogni evento JSONL pesa **339 byte** (il testo ne occupa solo 46, perché `content` e `sections` ne conservano ciascuno una copia) e ne veniva scritto **uno a ogni turno**.

Registrando invece un contesto di runtime, la data si fonde nel messaggio di snapshot che la piattaforma invia già:

- La piattaforma **deduplica gli snapshot per testo** (`RuntimeContextProjection.project()` in `dsh-agent-loop`: `if (this.retained?.text === snapshot) return`), quindi finché la data non cambia **non viene scritto nemmeno un evento extra**;
- Gli snapshot **aggiungono** un nuovo messaggio (`surfaceOp: 'append'`) invece di riscrivere sul posto, quindi la sequenza delle richieste fa solo crescere → **la cache dei prefissi resta preservata**;
- Il nostro costo marginale sono quei 46 byte, e solo quando lo snapshot viene reinvato perché il suo testo è cambiato.

Misurato su questo host (una sessione reale, 10 turni / 231 step):

| Voce | Misurato |
|------|----------|
| Snapshot del contesto di runtime della piattaforma | 2 eventi, 1133 B ciascuno, 2,3 KB in totale |
| Messaggi reali dell'utente | 10 eventi, 396 B ciascuno |
| Approccio vecchio (un messaggio per turno) | 10 × 339 B ≈ 3,4 KB |
| Questo approccio | 0 eventi extra; ~46 B ripiegati in uno snapshot esistente |

## Configurazione

Spedito con `cordis.patch.yml`; riavviare dopo averlo modificato:

```yaml
- insert:
    - id: date-wrapper
      name: dsh-date-wrapper
      config:
        timeZone: Asia/Shanghai   # IANA zone; omit to use the process zone
```

- Un `timeZone` non valido lancia un'eccezione all'avvio (**nessun** fallback silenzioso su UTC).
- Il nome della zona nel testo è il nome IANA risolto (il nome della zona del processo quando `timeZone` è omesso).
- La voce del contesto di runtime si chiama `date-wrapper:date` con order `116` (già occupati: 110 sandbox, 115 approval, 120 subagent).
- Il plugin **non esporta alcun `Config` schemastery**, quindi la sua configurazione salta la validazione dello schema dell'host; tutto è validato a mano in `validateConfig()`. Ecco anche perché la pagina Settings → Plugins non ha un form di configurazione per esso.

## On/off: l'attivazione del plugin è l'interruttore, non esiste un toggle nel pannello

Il plugin non include **né** un toggle nel pannello impostazioni **né** un campo di configurazione `enabled`, perché:

- L'interruttore di funzione *è* lo stato attivo della riga del plugin. Inattiva → `apply()` non viene mai eseguito → la voce del contesto di runtime non esiste → non viene iniettato nemmeno un carattere.
- Non c'è metà browser (`dsh.client`), quindi l'UI non possiede alcun widget nostro.
- La pagina **Settings → Plugins** integrata in DSH mostra già ogni voce come `enabled / disabled` (sola lettura).

### Come disattivarlo

Sovrascrivetelo per `id` nel **vostro** layer di patch del profilo — `C:\Users\<you>\.dsh\profiles\web\cordis.patch.yml`:

```yaml
- id: date-wrapper
  disabled: true    # disabled; set back to false to restore
```

- **A caldo, senza riavvio**: il file è sorvegliato dall'HMR di Cordis e `disabled: true` dispose direttamente la fiber della riga.
- Se la riga `date-wrapper` non esiste ancora (non installato), questa patch si limita a registrare un avviso `entry "date-wrapper" not found`; l'avvio riesce comunque.
- ⚠️ Il file deve essere un **array YAML di primo livello**; se è malformato, **l'avvio fallisce** (DSH è fail-loud per i layer di patch utente).

### Come rimuoverlo completamente

```bash
dsh plugin --profile web remove dsh-date-wrapper
```

La rimozione passa per il layer bundle e **richiede un riavvio** di dsh web (le patch bundle non fanno hot-reload).

## Installazione

```bash
dsh plugin --profile web add github:drscrewdriver/dsh-date-wrapper
```

Riavviate dsh web e ricaricate la pagina. Percorsi locali, modalità link e risoluzione dei problemi: [INSTALL.it.md](./INSTALL.it.md).

## Verifica

| # | Come | Atteso |
|---|-----|----------|
| A1 | Aprire una nuova sessione e inviare un messaggio | Lo snapshot del contesto di runtime contiene `Current date: YYYY-MM-DD <zone> <weekday>` (mostrato come una riga di contesto iniettato proveniente da `system-prompt`) |
| A2 | Controllare quella riga | ≤50 caratteri (46 misurati; la soglia PRD di 30 è stata rilassata per il formato richiesto) |
| A3 | Disattivare il plugin (patch del profilo `disabled: true`) | La riga non compare più negli snapshot delle sessioni successive |
| A4 | Cercare nel log di sessione | Nessun `Time sampled` / `Elapsed since` / `Browser time zone` |
| A5 | Impostare `timeZone` su `UTC` e riavviare | La data segue UTC (può differire di un giorno a cavallo di un confine di zona) |

## Note di implementazione

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

- **Riga lato host**: `ctx.inject(['systemPrompt'], …)` apre una fiber figlia; se il servizio manca, il plugin non registra nulla in silenzio invece di far fallire l'intero boot.
- **Provider di testo fail-soft**: un'eccezione durante l'assemblaggio del prompt farebbe fallire **ogni** richiesta; un errore di rendering restituisce quindi una stringa vuota (la piattaforma filtra il testo vuoto).
- **Niente `complete`**: impostarlo oscurerebbe l'intero system prompt.
- **La deduplica è compito della piattaforma**: non viene mantenuto alcuno stato per agente; a cavallo della mezzanotte lo snapshot porta semplicemente la nuova data.
- **Ciclo di vita**: la registrazione appartiene alla fiber figlia di `ctx.inject` e viene recuperata quando il plugin viene disattivato.

## Sviluppo: TDD + lint

```bash
npm install          # devDependencies only (eslint / @eslint/js); zero runtime dependencies

npm run tdd          # watch mode: rerun on src/ or tests/ changes (node --test --watch)
npm test             # one full run: node --test "tests/*.test.mjs"
node tests/format.test.mjs   # run a single file (most reliable under a sandbox: no child process)

npm run lint         # eslint . (src + tests + eslint.config.mjs)
npm run lint:fix     # auto-fix what can be fixed
npm run verify       # lint + test; run this before committing
```

### Red-green-refactor

I casi di test corrispondono direttamente ai criteri di accettazione: prima si scrive un'asserzione che fallisce, poi la si fa passare.

| Passo | Azione | Comando |
|------|--------|---------|
| 1 rosso | Aggiungere in `tests/*.test.mjs` un'asserzione intitolata al criterio di accettazione, che affermi un comportamento che **non** avete ancora | `npm run tdd` |
| 2 verde | Scrivere in `src/` l'implementazione minima per farla passare, senza toccare le altre asserzioni | `npm run tdd` |
| 3 refactor | Rinominare ed estrarre funzioni pure restando nel verde; `src/format.js` contiene tutta la logica pura, `src/index.js` si limita a registrare | `npm run tdd` |
| 4 gate | Eseguire lint + la suite completa prima di fare commit | `npm run verify` |

Oggi 18 asserzioni: `format.test.mjs` (11) copre le funzioni pure, `context.test.mjs` (7) asserisce il contratto di registrazione contro uno ctx finto.

### Punti salienti della configurazione lint

- ESLint 10 flat config (`eslint.config.mjs`) con `@eslint/js` recommended come baseline.
- Regole inasprite: `eqeqeq`, `prefer-const`, `object-shorthand`, `no-unused-vars` (prefisso `_` esente).
- Le global Node `crypto` / `console` / `process` sono dichiarate esplicitamente, altrimenti `no-undef` dà falsi positivi.

## Limitazioni note

- **Inattivo con i preset a prompt fisso**: se la persona di un preset imposta `includeRuntimeContext: false` (lo fanno sia il `minimal` ufficiale sia il `simple-reply` locale), `assemble()` restituisce `contexts: []` e la voce di questo plugin viene scartata in blocco. Quei preset sono pensati per vietare ai listener successivi di aggiungere qualsiasi cosa al prompt.
- **I vecchi snapshot restano nella cronologia**: quando la data cambia la piattaforma aggiunge un nuovo snapshot (quello vecchio resta) e il nuovo fa effetto tramite la sua dichiarazione "This snapshot supersedes earlier runtime-context snapshots" — allo stesso modo con cui la piattaforma gestisce i cambi di cwd / sandbox / policy di approvazione.
- **Le patch bundle non fanno hot-reload**: modificare `cordis.patch.yml` o aggiornare il plugin richiede un riavvio di dsh web (cambiare `disabled` nella patch del profilo è a caldo).
- **`dsh-time-context` non viene né caricato né filtrato**: se lo montate esplicitamente in un preset, il suo testo verboso appare come al solito. Non usare entrambi.
- **Nessuna sonda a runtime per il punto di contratto**: `systemPrompt.context` è chiamato senza protezioni, quindi un futuro rinomina da parte di DSH si manifesterebbe come un fallimento di caricamento del plugin invece che come un degrado silenzioso (vedi `HANDOVER.md` §7).

## Licenza

MIT
