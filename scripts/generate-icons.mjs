// Génère les icônes PNG de l'extension à partir d'un SVG (enveloppe sur fond rouge).
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <rect x="4" y="4" width="120" height="120" rx="28" fill="#d93025"/>
  <rect x="22" y="34" width="84" height="60" rx="8" fill="#ffffff"/>
  <path d="M26 40 L64 68 L102 40" fill="none" stroke="#d93025" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

await mkdir('static/icons', { recursive: true });
for (const size of [16, 32, 48, 128]) {
  await sharp(Buffer.from(svg), { density: 384 }).resize(size, size).png().toFile(`static/icons/icon-${size}.png`);
}
console.log('Icônes générées dans static/icons/');
