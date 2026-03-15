/**
 * Check that .env exists and expected vars are set (without printing values).
 * Run: node scripts/check-env.cjs
 */
const fs = require("fs");
const path = require("path");

const envPath = path.join(__dirname, "..", ".env");
const vars = [
  "VITE_BRAIN_API_URL",
  "VITE_WORLDLABS_API_KEY",
  "VITE_TTS_API_KEY",
];

function parseEnv(content) {
  const out = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
      val = val.slice(1, -1);
    out[key] = val;
  }
  return out;
}

if (!fs.existsSync(envPath)) {
  console.log(".env not found at", envPath);
  process.exit(1);
}

const env = parseEnv(fs.readFileSync(envPath, "utf8"));
console.log("Checking .env ...\n");

let ok = true;
for (const key of vars) {
  const val = env[key];
  const set = val != null && String(val).trim() !== "";
  const mask = set ? val.substring(0, 6) + "..." + val.substring(val.length - 4) : "(not set)";
  console.log("  %s: %s", key, set ? mask : "(not set)");
  if (key === "VITE_WORLDLABS_API_KEY" && !set) ok = false;
}

console.log("");
if (ok) {
  console.log("VITE_WORLDLABS_API_KEY is set. Restart 'npm run dev' so the app picks it up.");
} else {
  console.log("Add VITE_WORLDLABS_API_KEY=wl_... to .env for World Labs.");
}
process.exit(ok ? 0 : 1);
