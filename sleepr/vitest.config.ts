import {defineConfig} from 'vitest/config';

export default defineConfig({
    resolve: {
        tsconfigPaths: true,
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
