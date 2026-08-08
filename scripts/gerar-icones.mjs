import sharp from "sharp";
import { writeFileSync } from "node:fs";

/**
 * Ícone do app: o losango da marca sobre o preto do produto.
 *
 * O fundo é opaco e a margem é generosa porque ícone de PWA é recortado por
 * cada sistema à sua maneira — Android em círculo, iOS em quadrado arredondado.
 * Arte encostada na borda perde pedaço; o `maskable` presume 40% de zona segura.
 */
const marca = (tamanho, margem) => {
  const s = tamanho;
  const m = s * margem;
  const lado = s - 2 * m;
  const cx = s / 2;
  const raio = lado / 2;
  const interno = raio * 0.46;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <defs>
    <linearGradient id="g" x1="${cx}" y1="${cx - raio}" x2="${cx}" y2="${cx + raio}" gradientUnits="userSpaceOnUse">
      <stop stop-color="#4fe0ab"/><stop offset="1" stop-color="#199e70"/>
    </linearGradient>
  </defs>
  <rect width="${s}" height="${s}" fill="#08090a"/>
  <path d="M${cx} ${cx - raio} L${cx + raio} ${cx} L${cx} ${cx + raio} L${cx - raio} ${cx} Z"
        fill="none" stroke="url(#g)" stroke-width="${s * 0.052}" stroke-linejoin="round"/>
  <path d="M${cx} ${cx - interno} L${cx + interno} ${cx} L${cx} ${cx + interno} L${cx - interno} ${cx} Z"
        fill="url(#g)" opacity="0.92"/>
</svg>`);
};

for (const [arquivo, tamanho, margem] of [
  ["public/icone-192.png", 192, 0.16],
  ["public/icone-512.png", 512, 0.16],
  // Maskable: mais margem, porque o sistema recorta as bordas.
  ["public/icone-maskable-512.png", 512, 0.26],
  ["public/apple-touch-icon.png", 180, 0.14],
]) {
  const png = await sharp(marca(tamanho, margem)).png().toBuffer();
  writeFileSync(arquivo, png);
  console.log(`${arquivo} · ${tamanho}px · ${(png.length / 1024).toFixed(1)} KB`);
}
