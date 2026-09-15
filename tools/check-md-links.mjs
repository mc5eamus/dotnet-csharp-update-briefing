/* Relative-link check for the markdown docs. A broken link in a handed-over
   package is the kind of thing nobody notices until the recipient hits it. */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";

const root = process.argv[2] || ".";

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    if ([".git", "node_modules", "bin", "obj", "dist"].includes(e)) continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (e.endsWith(".md")) out.push(p);
  }
  return out;
}

let broken = 0;
let checked = 0;

for (const file of walk(root)) {
  const text = readFileSync(file, "utf8");
  const re = /\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const target = m[2];
    if (/^(https?:|mailto:|#)/.test(target)) continue;

    const [pathPart] = target.split("#");
    if (!pathPart) continue;

    checked++;
    const resolved = resolve(dirname(file), decodeURIComponent(pathPart));
    if (!existsSync(resolved)) {
      broken++;
      console.log(`${file}`);
      console.log(`  x [${m[1]}](${target})`);
    }
  }
}

console.log(`\n${checked} relative link(s) checked — ${broken} broken.`);
process.exit(broken > 0 ? 1 : 0);
