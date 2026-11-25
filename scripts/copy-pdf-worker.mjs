/** Copy the pdfjs worker into /public so the browser can load it offline. */
import { copyFileSync, mkdirSync, existsSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(root, "node_modules/pdfjs-dist/build/pdf.worker.min.mjs");
const target = resolve(root, "public/pdfjs-worker.min.mjs");

if (!existsSync(source)) {
  console.error(`pdf worker not found at ${source} — is pdfjs-dist installed?`);
  process.exit(1);
}
mkdirSync(dirname(target), { recursive: true });
copyFileSync(source, target);
console.log("copied pdfjs worker → public/pdfjs-worker.min.mjs");
