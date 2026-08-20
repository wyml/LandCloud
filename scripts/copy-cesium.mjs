import { cpSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "node_modules", "cesium", "Build", "Cesium");
const dest = join(root, "public", "cesium");

if (!existsSync(src)) {
  console.warn("[copy-cesium] cesium build directory not found, skip");
  process.exit(0);
}

for (const dir of ["Workers", "Assets", "Widgets", "ThirdParty"]) {
  const s = join(src, dir);
  if (existsSync(s)) {
    cpSync(s, join(dest, dir), { recursive: true });
    console.log(`[copy-cesium] copied ${dir}`);
  }
}
cpSync(join(src, "Cesium.js"), join(dest, "Cesium.js"));
cpSync(join(src, "Widgets", "widgets.css"), join(dest, "widgets.css"));
console.log("[copy-cesium] done");
