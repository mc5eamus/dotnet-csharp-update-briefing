/* Placeholder hunt: a `language-output` block should look like something a
   console actually printed. `labeled continue: none` shipped in day2.html and
   nobody noticed, so flag the shapes that tend to be unreplaced stubs. */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const siteDir = process.argv[2] || "site";
const pages = readdirSync(siteDir).filter((f) => f.endsWith(".html"));

const suspicious = [];

for (const file of pages) {
  const html = readFileSync(join(siteDir, file), "utf8");
  const re = /<code class="language-(output|text)">([\s\S]*?)<\/code>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const body = m[2].trim();
    const lines = body.split("\n");
    const line = html.slice(0, m.index).split("\n").length;

    const reasons = [];
    if (!body) reasons.push("empty");
    if (/\bTODO\b|\bTBD\b|\bFIXME\b|\bXXX\b/i.test(body)) reasons.push("TODO marker");
    if (/^\.\.\.$|^…$/.test(body)) reasons.push("ellipsis only");
    // Single short line ending in a bare ": none" / ": n/a" reads as a stub,
    // not as console output.
    if (lines.length === 1 && /:\s*(none|n\/?a|\?+)\s*$/i.test(body))
      reasons.push("stub-shaped single line");
    if (lines.length === 1 && body.length < 12) reasons.push("implausibly short");

    if (reasons.length) suspicious.push({ file, line, body, reasons });
  }
}

if (!suspicious.length) {
  console.log("No placeholder-looking output blocks found.");
  process.exit(0);
}

for (const s of suspicious) {
  console.log(`${s.file}:${s.line}  [${s.reasons.join(", ")}]`);
  console.log(`    ${JSON.stringify(s.body.slice(0, 90))}`);
}
console.log(`\n${suspicious.length} suspicious block(s).`);
process.exit(1);
