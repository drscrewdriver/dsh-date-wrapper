# Guía de instalación (CLI oficial de DSH)

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

## 0. Requisitos previos

```powershell
echo $env:DSH_HOME      # usually C:\Users\<you>\.dsh
dsh --version           # verified on 0.1.1-rc.2 (0.1.x line, plugin <= 0.2.0); 0.2.0-rc.1+ needs plugin >= 0.3.0 (engines >=0.2.0-rc.1 <0.2.1-0)
pnpm --version          # `dsh plugin` is a pnpm forwarder, so pnpm must be on PATH
```

## 1. Instalación

Desde GitHub (recomendado — pnpm copia el paquete a `node_modules`, y la lockfile fija el commit exacto):

```powershell
dsh plugin --profile web add github:drscrewdriver/dsh-date-wrapper
```

O desde una copia local (desarrollo):

```powershell
dsh plugin --profile web add E:\test\rewrite-agently\mine-dsh-plugins\dsh-date-wrapper
```

O en modo link (los cambios en el código fuente surten efecto tras un reinicio, sin reinstalar):

```powershell
dsh plugin --profile web add link:E:\test\rewrite-agently\mine-dsh-plugins\dsh-date-wrapper
```

> ⚠️ Una instalación local `file:` / `link:` hace que el perfil dependa de esa ruta. Renombrar o borrar el directorio rompe entonces **todas** las operaciones de pnpm en el perfil con `ENOENT` hasta que se elimine la dependencia obsoleta — exactamente lo que ocurrió cuando este paquete fue renombrado desde `dsh-time-wrapper`.
> ⚠️ Una ruta relativa solo se ancla a **tu directorio actual** cuando empieza por `.` o `..`;
> `mine-dsh-plugins\dsh-date-wrapper` se resuelve dentro del directorio del perfil y no se encontrará. Las rutas absolutas son lo más seguro.

Señales de una instalación exitosa:

1. pnpm termina con código 0;
2. `C:\Users\<you>\.dsh\profiles\web\package.json` lista `dsh-date-wrapper` bajo `dependencies`;
3. el `dsh.profile.bundles` del mismo archivo gana `dsh-date-wrapper` al final (el paquete declara `dsh.bundle.patch`, así que entra automáticamente en la lista de capas).

## 2. Reinicio

```powershell
# stop the running dsh web process, then start it again
dsh web
```

Luego recarga la página del navegador.

> Los parches de bundle **no** se recargan en caliente: solo se vigilan las capas de parche del perfil / del home. Cambiar el
> `cordis.patch.yml` del propio plugin o actualizar el plugin siempre exige un reinicio.

## 3. Verificación

Abre una sesión nueva y envía cualquier mensaje. La fecha cuelga de la **instantánea del contexto de ejecución** (se muestra en la sesión como una fila de contexto inyectado procedente de `system-prompt`), así:

```
Current date: 2026-09-08 Asia/Shanghai Tuesday
```

Es `Current date: ` + `<ISO date> <IANA zone> <English weekday>`, 46 caracteres (~12 tokens), **sin hora, minuto ni segundo**.

También puedes ejercitar el propio plugin desde la línea de comandos:

```powershell
cd E:\test\rewrite-agently\mine-dsh-plugins\dsh-date-wrapper
node tests/format.test.mjs
node tests/context.test.mjs
```

## 4. Resolución de problemas

| Síntoma | Causa y solución |
|---------|---------------|
| El arranque falla con `date-wrapper: 非法 IANA timeZone` | El `timeZone` de `cordis.patch.yml` es incorrecto. Es un **fail-fast intencionado**: mejor fallar al arrancar que emitir en silencio una fecha errónea en UTC |
| El arranque falla con `duplicate loader entry id: date-wrapper` | El árbol de ensamblado ya tiene una fila con ese id; borra el duplicado |
| No hay fecha tras instalar | ① confirma que `dsh-date-wrapper` está en `dsh.profile.bundles`; ② confirma que reiniciaste y recargaste la página; ③ **confirma que el preset actual no es de prompt fijo** (siguiente fila) |
| No hay fecha con algunos presets | La persona de ese preset pone `includeRuntimeContext: false` (lo hacen el `minimal` oficial y el `simple-reply` local). Tales presets prohíben explícitamente que listeners posteriores añadan contenido al prompt, así que el contexto de ejecución de este plugin se descarta — comportamiento esperado |
| La fecha está desfasada un día | `timeZone` no coincide con tu zona real; al cruzar un límite de zona (p. ej. 00:30 en Pekín = 16:30 UTC del día anterior) se manifiesta como una diferencia de un día |
| También ves `Time sampled …` | Algún preset monta `@deepseek-ai/dsh-time-context` explícitamente. Este plugin no lo carga ni lo filtra; no deben usarse juntos |
| Cualquier operación de pnpm en el perfil falla con `ENOENT: no such file or directory, open '…'` | Una dependencia `file:` / `link:` apunta a una ruta que ya no existe (el paquete fue renombrado o se borró su tarball). Elimina la dependencia obsoleta con `dsh plugin --profile web remove <name>` e instala de nuevo; las instalaciones `github:` no tienen este modo de fallo |

## 5. Activar/desactivar (sin toggle en el panel — la activación es el interruptor)

Desactívalo o actívalo en tu propia capa de parche de perfil — `C:\Users\<you>\.dsh\profiles\web\cordis.patch.yml`:

```yaml
- id: date-wrapper
  disabled: true    # disabled; set back to false to restore
```

- **En caliente, sin reinicio**: el archivo está vigilado por el HMR de Cordis; `disabled: true` dispone la fiber de la fila y la inyección se detiene de inmediato.
- La página **Settings → Plugins** integrada en DSH muestra `enabled / disabled` (solo lectura).
- El archivo debe ser un array YAML de nivel superior; si se estropea, **el arranque falla** (fail-loud).
- La eliminación completa pasa por `dsh plugin remove` (sección siguiente) y **requiere un reinicio**.

## 6. Desinstalación

```powershell
dsh plugin --profile web remove dsh-date-wrapper
```

Reinicia dsh web.
