import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
    resolve: {
        alias: {
            '@app/common': fileURLToPath(
                new URL('./libs/common/src', import.meta.url),
            ),
        },
    },

    oxc: {
        decorator: {
            legacy: true,
            emitDecoratorMetadata: true,
        },
        assumptions: {
            setPublicClassFields: true,
        },
        typescript: {
            removeClassFieldsWithoutInitializer: true,
        },
    },

    test: {
        globals: true,
        root: './',
        include: ['**/*.spec.ts'],
    },
});