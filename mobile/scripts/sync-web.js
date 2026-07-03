// Stages a copy of the real static site (../ from mobile/) into mobile/www/
// so Capacitor's webDir can point at a real subfolder (it rejects ".." path
// traversal). www/ is gitignored and always regenerated from the site root
// — never hand-edited.
const fs = require("fs");
const path = require("path");

const SITE_ROOT = path.join(__dirname, "..", "..");
const WWW_DIR = path.join(__dirname, "..", "www");
const INCLUDE = ["index.html", "css", "js", "assets", "manifest.json", "version.json"];

fs.rmSync(WWW_DIR, { recursive: true, force: true });
fs.mkdirSync(WWW_DIR, { recursive: true });

for (const name of INCLUDE) {
  const src = path.join(SITE_ROOT, name);
  const dest = path.join(WWW_DIR, name);
  if (fs.existsSync(src)) {
    fs.cpSync(src, dest, { recursive: true });
  }
}

console.log("Synced web assets into", WWW_DIR);
