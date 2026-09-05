import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
      // shadcn's "base-nova" style generates `import { cn } from "cn"` — redirect to our own cn().
      cn: path.resolve(import.meta.dirname, './src/shared/lib/utils.ts'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
