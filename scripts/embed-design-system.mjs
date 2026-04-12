import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const txtPath = path.join(root, "src/server/prompts/design/design-system.txt");
const outPath = path.join(root, "src/server/prompts/design/design-system.ts");

const b64 = fs.readFileSync(txtPath).toString("base64");

const code = `import { Buffer } from "node:buffer";

/**
 * Prompt text loaded from base64 so the bundler never parses markdown/CSS as TS.
 * Edit design-system.txt then run: node scripts/embed-design-system.mjs
 */
const DESIGN_SYSTEM_B64 = ${JSON.stringify(b64)};

export const DESIGN_SYSTEM = Buffer.from(DESIGN_SYSTEM_B64, "base64").toString("utf8");
`;

fs.writeFileSync(outPath, code, "utf8");
console.log("Wrote", outPath);
