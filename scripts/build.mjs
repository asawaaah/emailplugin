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

if (watch) {
  const ctx = await context(options);
  await ctx.watch();
} else {
  await build(options);
}
