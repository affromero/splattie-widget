import { defineConfig } from 'vitest/config';
import pkg from './package.json' with { type: 'json' };

export default defineConfig({
  define: {
    __WIDGET_VERSION__: JSON.stringify(pkg.version),
  },
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      reportsDirectory: 'coverage',
      include: ['src/**/*.ts'],
      exclude: [
        'src/SplatWidget.ts',
        'src/env.d.ts',
        'src/index.ts',
        'src/react.ts',
        'src/renderer/SparkSetup.ts',
        'src/types.ts',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
});
