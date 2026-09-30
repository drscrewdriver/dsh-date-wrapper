# Guide d'installation (CLI DSH officiel)

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

## 0. Prérequis

```powershell
echo $env:DSH_HOME      # usually C:\Users\<you>\.dsh
dsh --version           # verified on 0.1.1-rc.2 (0.1.x line, plugin <= 0.2.0); 0.2.0-rc.1+ needs plugin >= 0.3.0 (engines >=0.2.0-rc.1 <0.2.1-0)
pnpm --version          # `dsh plugin` is a pnpm forwarder, so pnpm must be on PATH
```

## 1. Installation

Depuis GitHub (recommandé — pnpm copie le paquet dans `node_modules`, et le lockfile épingle le commit exact) :

```powershell
dsh plugin --profile web add github:drscrewdriver/dsh-date-wrapper
```

Ou depuis une copie locale (développement) :

```powershell
dsh plugin --profile web add E:\test\rewrite-agently\mine-dsh-plugins\dsh-date-wrapper
```

Ou en mode link (les modifications du source prennent effet après un redémarrage, sans réinstallation) :

```powershell
dsh plugin --profile web add link:E:\test\rewrite-agently\mine-dsh-plugins\dsh-date-wrapper
```

> ⚠️ Une installation locale `file:` / `link:` rend le profil dépendant de ce chemin. Renommer ou supprimer le répertoire casse alors **toutes** les opérations pnpm du profil avec `ENOENT`, jusqu'à suppression de la dépendance devenue obsolète — c'est exactement ce qui s'est produit quand ce paquet a été renommé depuis `dsh-time-wrapper`.
> ⚠️ Un chemin relatif n'est ancré à **votre répertoire courant** que s'il commence par `.` ou `..` ;
> `mine-dsh-plugins\dsh-date-wrapper` est résolu à l'intérieur du répertoire du profil et ne sera pas trouvé. Les chemins absolus sont les plus sûrs.

Signes d'une installation réussie :

1. pnpm sort avec le code 0 ;
2. `C:\Users\<you>\.dsh\profiles\web\package.json` liste `dsh-date-wrapper` sous `dependencies` ;
3. le `dsh.profile.bundles` du même fichier gagne `dsh-date-wrapper` à la fin (le paquet déclare `dsh.bundle.patch`, il est donc tiré automatiquement dans la liste des couches).

## 2. Redémarrage

```powershell
# stop the running dsh web process, then start it again
dsh web
```

Puis rafraîchissez la page dans le navigateur.

> Les patches de bundle ne sont **pas** rechargés à chaud : seules les couches de patch du profil / du home sont surveillées. Modifier le
> `cordis.patch.yml` du plugin lui-même ou mettre à jour le plugin exige toujours un redémarrage.

## 3. Vérification

Ouvrez une nouvelle session et envoyez n'importe quel message. La date est suspendue à l'**instantané du contexte d'exécution** (affiché dans la session comme une ligne de contexte injecté provenant de `system-prompt`), sous la forme :

```
Current date: 2026-09-08 Asia/Shanghai Tuesday
```

C'est `Current date: ` + `<ISO date> <IANA zone> <English weekday>`, 46 caractères (~12 tokens), **sans heure, minute ni seconde**.

Vous pouvez aussi exercer le plugin lui-même depuis la ligne de commande :

```powershell
cd E:\test\rewrite-agently\mine-dsh-plugins\dsh-date-wrapper
node tests/format.test.mjs
node tests/context.test.mjs
```

## 4. Dépannage

| Symptôme | Cause et correction |
|---------|---------------|
| Le démarrage échoue avec `date-wrapper: 非法 IANA timeZone` | Le `timeZone` de `cordis.patch.yml` est incorrect. C'est un **fail-fast volontaire** : mieux vaut échouer au démarrage que d'émettre silencieusement une date fausse en UTC |
| Le démarrage échoue avec `duplicate loader entry id: date-wrapper` | L'arbre d'assemblage contient déjà une ligne avec cet id ; supprimez le doublon |
| Pas de date après l'installation | ① vérifiez que `dsh-date-wrapper` figure dans `dsh.profile.bundles` ; ② vérifiez que vous avez redémarré et rafraîchi la page ; ③ **vérifiez que le preset courant n'est pas à prompt fixe** (ligne suivante) |
| Pas de date sous certains presets | La persona de ce preset définit `includeRuntimeContext: false` (c'est le cas du `minimal` officiel et du `simple-reply` local). De tels presets interdisent explicitement aux listeners ultérieurs d'ajouter du contenu au prompt, donc le contexte d'exécution de ce plugin est abandonné — comportement attendu |
| La date est décalée d'un jour | `timeZone` ne correspond pas à votre zone réelle ; à cheval sur une frontière de zone (par ex. 00:30 à Pékin = 16:30 UTC la veille), cela se traduit par un écart d'un jour |
| Vous voyez aussi `Time sampled …` | Un preset monte `@deepseek-ai/dsh-time-context` explicitement. Ce plugin ne le charge ni ne le filtre ; les deux ne doivent pas être utilisés ensemble |
| Toute opération pnpm du profil échoue avec `ENOENT: no such file or directory, open '…'` | Une dépendance `file:` / `link:` pointe vers un chemin qui n'existe plus (le paquet a été renommé ou son tarball supprimé). Supprimez la dépendance obsolète avec `dsh plugin --profile web remove <name>` puis réinstallez ; les installations `github:` n'ont pas ce mode de défaillance |

## 5. Marche/arrêt (pas de bouton dans un panneau — l'activation est l'interrupteur)

Désactivez-le ou réactivez-le dans votre propre couche de patch de profil — `C:\Users\<you>\.dsh\profiles\web\cordis.patch.yml` :

```yaml
- id: date-wrapper
  disabled: true    # disabled; set back to false to restore
```

- **À chaud, sans redémarrage** : le fichier est surveillé par le HMR de Cordis ; `disabled: true` détruit la fiber de la ligne et l'injection s'arrête immédiatement.
- La page **Settings → Plugins** intégrée à DSH affiche `enabled / disabled` (en lecture seule).
- Le fichier doit être un tableau YAML de premier niveau ; le rendre mal formé fait **échouer le démarrage** (fail-loud).
- La suppression complète passe par `dsh plugin remove` (section suivante) et **nécessite un redémarrage**.

## 6. Désinstallation

```powershell
dsh plugin --profile web remove dsh-date-wrapper
```

Redémarrez dsh web.
