import { defineConfig } from 'vite';
import { resolve } from 'path';
import pkg from './package.json' with { type: 'json' };

export default defineConfig({
  define: {
    __WIDGET_VERSION__: JSON.stringify(pkg.version),
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'SplattieWidget',
      formats: ['iife'],
      fileName: () => 'splattie-widget.cdn.js',
    },
    outDir: 'dist',
    emptyOutDir: false,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
});
