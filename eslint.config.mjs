// @ts-check
/**
 * ESLint flat config for dsh-date-wrapper.
 *
 * Scope: `src/` 与 `tests/`（纯 ESM JavaScript，无构建步骤）。
 * `npm run lint` 是 `npm run verify` 的第一道闸门。
 *
 * 只列真正用到的运行时全局：ES 内建（`Object`/`Array`/`JSON`/`Set`/`Error`/`Date`/`Intl`）
 * 由 ESLint 按 `ecmaVersion` 自动提供；`crypto` / `console` / `process` 是 Node 全局，
 * 必须显式声明，否则 `no-undef` 会误报。
 */
import js from '@eslint/js'

export default [
  { ignores: ['node_modules/', '*.tgz'] },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: {
        crypto: 'readonly',
        console: 'readonly',
        process: 'readonly',
      },
    },
    rules: {
      // 插件代码与测试里用 `_` 前缀表示「有意未使用」。
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // 严格相等、不重新赋值、对象字面量简写 —— 与参考插件保持一致的收紧项。
      eqeqeq: ['error', 'always'],
      'prefer-const': 'error',
      'object-shorthand': 'error',
      // 诊断输出允许 console（宿主端正常用 ctx.logger，测试里允许 console）。
      'no-console': 'off',
    },
  },
]
