import { defineConfig } from 'vite';
import { resolve } from 'path';
import pkg from './package.json' with { type: 'json' };

export default defineConfig({
  define: {
    __WIDGET_VERSION__: JSON.stringify(pkg.version),
  },
  server: {
    port: 4002,
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'SplattieWidget',
      formats: ['es', 'umd'],
      fileName: 'splattie-widget',
    },
    rollupOptions: {
      external: ['three'],
      output: {
        globals: { three: 'THREE' },
      },
    },
  },
});
