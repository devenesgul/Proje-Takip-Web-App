// Vite derleme ve Vitest test yapılandırması.
// base './': derlenen dosyalar göreli yollarla bağlanır; GitHub Pages alt klasöründe
// (kullanici.github.io/Proje-Takip-Web-App/) ve Netlify/Cloudflare kökünde aynı derleme çalışır.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

const SW_CACHE_PLACEHOLDER = 'proje-takip-v1';

/**
 * Her derlemede service worker önbellek adını benzersiz yapar; yeni sürüm etkinleşince
 * eski sürümün önbelleği silinir (eski derleme dosyaları birikmez).
 */
function versionServiceWorker(): Plugin {
  let outDir = 'dist';
  return {
    name: 'version-service-worker',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir;
    },
    closeBundle() {
      const file = resolve(outDir, 'sw.js');
      const build = `proje-takip-${Date.now().toString(36)}`;
      writeFileSync(file, readFileSync(file, 'utf8').replace(SW_CACHE_PLACEHOLDER, build));
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), versionServiceWorker()],
  test: {
    include: ['src/**/*.test.ts'],
  },
});
