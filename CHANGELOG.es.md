# Changelog

Todos los cambios notables de este proyecto se documentan en este archivo.
El formato sigue [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), y este proyecto se adhiere al [versionado semántico](https://semver.org/spec/v2.0.0.html).

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

## Sin publicar

### Cambiado

- **Soporte de dos versiones de DSH (0.1.0-rc.7 … 0.1.2-rc.1).** Se documentó la matriz de compatibilidad
  en el README (EN/ZH) y se añadió `engines.dsh`. Sin cambios de código: el único contrato del
  plugin con el host, `systemPrompt.context({ name, order, text })`, es idéntico en firma y
  semántica entre `dsh-v0.1.1-rc.2` y `dsh-v0.1.2-rc.1`, y el plugin no registra ningún espacio
  de nombres de ajustes, no lee datos de sesión y no hace llamadas RPC.

## 0.3.0 — 2026-09-29

### Cambiado

- **Soporte de la línea DSH 0.2.0 (`>=0.2.0-rc.1 <0.2.1-0`).** `engines.dsh` actualizado tanto en
  `package.json` como en `dsh.plugin.json`; versión subida a 0.3.0 en ambos manifiestos. Sin cambios
  de código: entre `dsh-v0.1.7-rc.2` y `dsh-v0.2.0-rc.1` el diff de `packages/core/system-prompt`
  es una única línea de versión, el hueco `order: 116` sigue sin colisiones (110/115/120
  sin cambios) y la guía de migración de plugins no tiene ninguna entrada de `systemPrompt`. La línea 0.1.x
  (0.1.0-rc.7 → 0.1.7.x) sigue siendo servida por el artefacto ≤ 0.2.0 (dist-tag `dsh-0.1.7`).

### Corregido

- Conciliado con la historia de git el salto de versión a 0.2.0 publicado en npm (antes había
  sido publicado desde un árbol de trabajo sin commitear).

## 0.1.0 — 2026-09-08

Primera release.

### Añadido

- Plugin de mitad de host que registra la fecha actual como contexto dinámico de ejecución (`systemPrompt.context`), renderizado como `Current date: 2026-09-08 Asia/Shanghai Tuesday` — 46 caracteres, unos 12 tokens, sin hora del día.
- Parche de bundle `cordis.patch.yml` con una única fila `insert` (`id: date-wrapper`, `config.timeZone: Asia/Shanghai`).
- Configuración `timeZone` validada al arrancar: una zona IANA no válida o irresoluble lanza una excepción en lugar de retroceder en silencio a UTC.
- Proveedor de texto fail-soft: un fallo de renderizado devuelve una cadena vacía, así que el ensamblado del prompt nunca lanza por culpa del plugin.
- 18 aserciones vía `node --test`: proyección de zona, corrección del día de la semana a través de límites de zona, formato y longitud exactos, degradación, validación de configuración y el contrato de registro contra un contexto falso.
- Flat config de ESLint 10; `npm run verify` hace de puerta para lint + tests.
- Cero dependencias de ejecución y cero imports de `@deepseek-ai/*`.

### Documentación

- `README.{md,zh,ja,ko}`, `INSTALL.{md,zh,ja,ko}`, `CHANGELOG.{md,ja,ko}` con selectores de idioma cruzados.
- Matriz de compatibilidad de versiones que cubre 0.1.0-rc.7 → 0.1.3-alpha.2.
- `docs/dsh-session-and-context-mechanics.md` — cómo DSH convierte las sesiones en JSONL y ensambla las peticiones (chino).
- `HANDOVER.md` — traspaso del proyecto y razonamiento de diseño (chino).

### Notas

- Solapamiento funcional con `@deepseek-ai/dsh-time-context`: no montar ambos.
- Sin panel de ajustes a propósito — activar o desactivar la fila del plugin es el interruptor.
- Inactivo con presets de prompt fijo cuya persona pone `includeRuntimeContext: false`.
