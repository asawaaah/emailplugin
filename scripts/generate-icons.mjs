// Génère les icônes PNG de l'extension : le « M » multicolore de Gmail, sur fond
// transparent. Usage personnel : une publication sur le Chrome Web Store
// exigerait une icône propre (le logo Gmail est une marque de Google).
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

// Logo dessiné sur une zone de 88 × 66 (repère 52,42), centré dans un carré.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="48 30 96 96">
  <path fill="#4285f4" d="M58 108h14V74L52 59v43c0 3.32 2.69 6 6 6"/>
  <path fill="#34a853" d="M120 108h14c3.32 0 6-2.69 6-6V59l-20 15"/>
  <path fill="#fbbc04" d="M120 48v26l20-15v-8c0-7.42-8.47-11.65-14.4-7.2"/>
  <path fill="#ea4335" d="M72 74V48l24 18 24-18v26L96 92"/>
  <path fill="#c5221f" d="M52 51v8l20 15V48l-5.6-4.2c-5.94-4.45-14.4-.22-14.4 7.2"/>
</svg>`;

await mkdir('static/icons', { recursive: true });
for (const size of [16, 32, 48, 128]) {
  await sharp(Buffer.from(svg), { density: 384 }).resize(size, size).png().toFile(`static/icons/icon-${size}.png`);
}
console.log('Icônes générées dans static/icons/');
