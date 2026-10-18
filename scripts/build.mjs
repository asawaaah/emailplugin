// Construit l'extension dans le dossier extension/ (le dossier à charger dans Chrome).
import { build, context } from 'esbuild';
import { cp, mkdir, rm } from 'node:fs/promises';

const outdir = 'extension';
const watch = process.argv.includes('--watch');

const options = {
  entryPoints: {
    background: 'src/background.ts',
    popup: 'src/popup/popup.ts',
    options: 'src/options/options.ts',
    notify: 'src/notify/notify.ts',
    bubble: 'src/bubble/bubble.ts',
  },
  outdir,
  bundle: true,
  format: 'esm',
  target: 'chrome120',
  legalComments: 'none',
  logLevel: 'info',
};

await rm(outdir, { recursive: true, force: true });
await mkdir(outdir, { recursive: true });
await cp('static', outdir, { recursive: true });

// Bulle injectée dans les pages : script classique (IIFE), pas un module.
const contentOptions = {
  ...options,
  entryPoints: { 'toast-content': 'src/content/toast.ts' },
  format: 'iife',
};

if (watch) {
  await (await context(options)).watch();
  await (await context(contentOptions)).watch();
} else {
  await build(options);
  await build(contentOptions);
}
