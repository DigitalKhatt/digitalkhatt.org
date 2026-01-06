import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    dts({
      insertTypesEntry: true,
      rollupTypes: false,
    }),
  ],
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        'core/index': resolve(__dirname, 'src/core/index.ts'),
        'canvas/index': resolve(__dirname, 'src/canvas/index.ts'),
        'renderers/index': resolve(__dirname, 'src/renderers/index.ts'),
        'data/index': resolve(__dirname, 'src/data/index.ts'),
        'wrappers/react/index': resolve(__dirname, 'src/wrappers/react/index.ts'),
        'wrappers/angular/index': resolve(__dirname, 'src/wrappers/angular/index.ts'),
      },
      formats: ['es', 'cjs'],
      fileName: (format, entryName) => {
        const ext = format === 'es' ? 'js' : 'cjs';
        return `${entryName}.${ext}`;
      },
    },
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        '@angular/core',
        'rxjs',
        'harfbuzzjs',
      ],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          '@angular/core': 'ng.core',
          rxjs: 'rxjs',
        },
      },
    },
    sourcemap: true,
    minify: false,
  },
});
