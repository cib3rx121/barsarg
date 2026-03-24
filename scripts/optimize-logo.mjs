/**
 * Gera public/brand/logo.webp a partir de raster (mais leve no site).
 * Ordem: logo-source.png|jpg → logo.png (útil quando só fazes push do PNG).
 * Corre no build (CI/Vercel) — não precisas de correr localmente.
 * SVG: use logo.svg — este script ignora se não houver raster.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const brand = path.join(root, "public", "brand");

const candidates = [
  "logo-source.png",
  "logo-source.jpg",
  "logo-source.jpeg",
  "logo.png",
];

const input = candidates
  .map((name) => path.join(brand, name))
  .find((p) => fs.existsSync(p));

if (!input) {
  console.log(
    "[brand] Sem logo-source nem logo.png em public/brand/ — a saltar WebP.",
  );
  process.exit(0);
}

let sharp;
try {
  ({ default: sharp } = await import("sharp"));
} catch {
  console.warn(
    "[brand] sharp não disponível — mantém-se logo.png / svg no site.",
  );
  process.exit(0);
}

const out = path.join(brand, "logo.webp");
try {
  await sharp(input)
    .resize(320, 320, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82, effort: 6 })
    .toFile(out);

  const stat = fs.statSync(out);
  console.log(
    `[brand] ${path.relative(root, out)} (${(stat.size / 1024).toFixed(1)} KB)`,
  );
} catch (e) {
  console.warn("[brand] Conversão falhou — usa-se o ficheiro original.", e);
}

process.exit(0);
