import { cpSync, mkdirSync, readdirSync } from "node:fs";
const root = new URL("../node_modules/", import.meta.url),
  dest = new URL("../public/vendor/ocr/", import.meta.url);
mkdirSync(dest, { recursive: true });
cpSync(
  new URL("tesseract.js/dist/worker.min.js", root),
  new URL("worker.min.js", dest),
);
mkdirSync(new URL("core/", dest), { recursive: true });
for (const name of readdirSync(new URL("tesseract.js-core/", root)))
  if (/\.wasm(?:\.js)?$/.test(name))
    cpSync(
      new URL("tesseract.js-core/" + name, root),
      new URL("core/" + name, dest),
    );
for (const lang of ["eng", "deu", "chi_sim"])
  cpSync(
    new URL(
      `@tesseract.js-data/${lang}/4.0.0_best_int/${lang}.traineddata.gz`,
      root,
    ),
    new URL(`${lang}.traineddata.gz`, dest),
  );
for (const [source, target] of [
  ["tesseract.js/LICENSE.md", "LICENSE-tesseract"],
  ["tesseract.js-core/LICENSE", "LICENSE-core"],
  ["tesseract.js/LICENSE.md", "LICENSE-traineddata"],
  ["pdf-lib/LICENSE.md", "LICENSE-pdf-lib"],
])
  cpSync(new URL(source, root), new URL(target, dest));
