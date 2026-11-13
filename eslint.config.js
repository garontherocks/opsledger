import tseslint from 'typescript-eslint';
export default tseslint.config(
  { ignores: ['**/dist/**', 'lab/**', 'node_modules/**'] },
  ...tseslint.configs.recommended,
  { rules: { '@typescript-eslint/no-explicit-any': 'error' } },
  // Type-aware rules, stage 1: promise handling and redundant assertions. Later stages add the
  // no-unsafe-* family module by module.
  {
    files: ['**/*.ts'],
    languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } },
    rules: {
      '@typescript-eslint/no-floating-promises': [
        'error',
        // node:test registers tests synchronously; their returned promises are handled by the runner.
        {
          allowForKnownSafeCalls: [
            { from: 'package', name: ['test', 'it', 'describe', 'suite'], package: 'node:test' },
          ],
        },
      ],
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
    },
  },
);
