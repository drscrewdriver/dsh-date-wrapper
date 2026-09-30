# Changelog

Tous les changements notables de ce projet sont documentés dans ce fichier.
Le format suit [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) et ce projet adhère au [versionnage sémantique](https://semver.org/spec/v2.0.0.html).

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

## Non publié

### Changé

- **Prise en charge de deux versions de DSH (0.1.0-rc.7 … 0.1.2-rc.1).** La matrice de compatibilité a été
  documentée dans le README (EN/ZH) et `engines.dsh` a été ajouté. Aucun changement de code : le seul
  contrat côté hôte du plugin, `systemPrompt.context({ name, order, text })`, est identique en signature
  comme en sémantique entre `dsh-v0.1.1-rc.2` et `dsh-v0.1.2-rc.1`, et le plugin n'enregistre aucun espace
  de noms de réglages, ne lit aucune donnée de session et n'effectue aucun appel RPC.

## 0.3.0 — 2026-09-29

### Changé

- **Prise en charge de la branche DSH 0.2.0 (`>=0.2.0-rc.1 <0.2.1-0`).** `engines.dsh` mis à jour dans
  `package.json` et `dsh.plugin.json` ; version passée à 0.3.0 dans les deux manifestes. Aucun changement
  de code : entre `dsh-v0.1.7-rc.2` et `dsh-v0.2.0-rc.1`, le diff de `packages/core/system-prompt`
  tient en une seule ligne de version, l'emplacement `order: 116` reste sans collision (110/115/120
  inchangés) et le guide de migration des plugins ne mentionne aucun `systemPrompt`. La branche 0.1.x
  (0.1.0-rc.7 → 0.1.7.x) continue d'être servie par un artefact ≤ 0.2.0 (dist-tag `dsh-0.1.7`).

### Corrigé

- Rapprochement dans l'historique git du bump de version 0.2.0 publié sur npm (il avait auparavant
  été publié depuis un arbre de travail non committé).

## 0.1.0 — 2026-09-08

Première publication.

### Ajouté

- Plugin côté hôte qui enregistre la date du jour comme contexte dynamique d'exécution (`systemPrompt.context`), rendue sous la forme `Current date: 2026-09-08 Asia/Shanghai Tuesday` — 46 caractères, environ 12 tokens, sans heure.
- Patch de bundle `cordis.patch.yml` avec une seule ligne `insert` (`id: date-wrapper`, `config.timeZone: Asia/Shanghai`).
- Configuration `timeZone` validée au démarrage : une zone IANA invalide ou irrésoluable lève une exception au lieu de replier silencieusement sur UTC.
- Fournisseur de texte fail-soft : un échec de rendu renvoie une chaîne vide, l'assemblage du prompt n'échoue donc jamais pour cause de plugin.
- 18 assertions via `node --test` : projection de zone, exactitude du jour de semaine à travers les frontières de zone, format et longueur exacts, dégradation, validation de la configuration, et contrat d'enregistrement contre un contexte factice.
- Configuration plate ESLint 10 ; `npm run verify` sert de barrière lint + tests.
- Zéro dépendance d'exécution et zéro import `@deepseek-ai/*`.

### Documentation

- `README.{md,zh,ja,ko}`, `INSTALL.{md,zh,ja,ko}`, `CHANGELOG.{md,ja,ko}` avec des sélecteurs de langue croisés.
- Matrice de compatibilité de versions couvrant 0.1.0-rc.7 → 0.1.3-alpha.2.
- `docs/dsh-session-and-context-mechanics.md` — comment DSH transforme les sessions en JSONL et assemble les requêtes (en chinois).
- `HANDOVER.md` — passation du projet et raisonnement de conception (en chinois).

### Notes

- Chevauchement fonctionnel avec `@deepseek-ai/dsh-time-context` : ne pas monter les deux.
- Pas de panneau de réglages par conception — activer ou désactiver la ligne du plugin est l'interrupteur.
- Inactif sous les presets à prompt fixe dont la persona définit `includeRuntimeContext: false`.
