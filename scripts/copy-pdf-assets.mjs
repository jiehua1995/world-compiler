import { cpSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
const source = new URL("../node_modules/pdfjs-dist/", import.meta.url);
const destination = new URL("../public/vendor/pdfjs/", import.meta.url);
mkdirSync(destination, { recursive: true });
for (const directory of ["cmaps", "iccs", "standard_fonts", "wasm"]) {
  cpSync(
    fileURLToPath(new URL(directory, source)),
    fileURLToPath(new URL(directory, destination)),
    { recursive: true },
  );
}
cpSync(new URL("LICENSE", source), new URL("LICENSE", destination));
