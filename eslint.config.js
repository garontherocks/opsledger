import tseslint from 'typescript-eslint';
export default tseslint.config({ ignores: ['**/dist/**','lab/**','node_modules/**'] }, ...tseslint.configs.recommended, { rules: { '@typescript-eslint/no-explicit-any': 'error' } });
