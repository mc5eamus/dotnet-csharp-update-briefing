/*
 * tools/check-pages.mjs
 *
 * Structural lint for the workshop HTML pages. Catches the authoring mistakes
 * that are easy to make and hard to see:
 *
 *   - unescaped '<' inside <pre><code> (a stray List<string> eats the rest of
 *     the block, and the page still "looks fine" until you read it closely)
 *   - unknown language classes, which silently fall back to C# highlighting
 *   - <h2> containing badges or <code> but no data-toc, which leaks markup
 *     text into the sidebar
 *   - duplicate or missing slide ids (they are URL fragments)
 *   - data-further ids that don't exist in content/sources.json
 *   - missing or misordered script tags
 *   - unknown callout / badge modifier classes (typos render unstyled)
 *
 *   node tools/check-pages.mjs
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, basename } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const siteDir = join(root, "site");

const KNOWN_LANGS = new Set([
  "csharp", "cs", "c#", "json", "xml", "csproj", "html",
  "sql", "bash", "sh", "shell", "powershell", "ps1", "text", "output",
]);

/* Callout and badge modifiers are read out of the stylesheet rather than
   listed here. Hard-coding them meant adding a variant to the CSS and having
   the linter reject it as a typo -- the same schema-vs-code drift that let 25
   unreadable source records through the sources validator. If it is styled,
   it is known; if it is not styled, it renders unstyled and should fail. */
function classesFromCss(css, prefix) {
  const re = new RegExp("\\." + prefix + "-([\\w-]+)\\s*(?:,|\\{|::)", "g");
  const found = new Set();
  let m;
  while ((m = re.exec(css)) !== null) found.add(m[1]);
  return found;
}

const cssText = readFileSync(join(siteDir, "assets", "workshop.css"), "utf8");
const KNOWN_CALLOUTS = classesFromCss(cssText, "callout");
const KNOWN_BADGES = classesFromCss(cssText, "badge");

/* `.callout-title` is structural, not a variant. */
KNOWN_CALLOUTS.delete("title");

if (KNOWN_CALLOUTS.size === 0 || KNOWN_BADGES.size === 0) {
  console.error("could not read callout/badge variants from workshop.css — check the selectors");
  process.exit(2);
}

let errors = 0;
let warnings = 0;
const problems = [];

function record(level, file, msg, detail) {
  problems.push({ level, file, msg, detail });
  if (level === "error") errors++; else warnings++;
}

/* Line number of a character offset, for readable messages. */
function lineOf(text, index) {
  return text.slice(0, index).split("\n").length;
}

let validModules = new Set();
try {
  const reg = JSON.parse(readFileSync(join(root, "content", "sources.json"), "utf8"));
  validModules = new Set((reg.modules || []).map((m) => m.id));
} catch {
  record("warn", "content/sources.json", "could not read module registry; skipping data-further checks");
}

const pages = process.argv.length > 2
  ? process.argv.slice(2)
  : readdirSync(siteDir).filter((f) => f.endsWith(".html")).map((f) => join(siteDir, f));

if (pages.length === 0) {
  console.error("No HTML pages found in site/");
  process.exit(2);
}

for (const pagePath of pages) {
  const file = basename(pagePath);
  const html = readFileSync(pagePath, "utf8");

  /* ---------------------------------------------------- code blocks ---- */
  const codeRe = /<pre><code(?:\s+class="language-([\w#+-]+)")?\s*>([\s\S]*?)<\/code><\/pre>/g;
  let m;
  let codeCount = 0;
  while ((m = codeRe.exec(html)) !== null) {
    codeCount++;
    const [, lang, body] = m;
    const line = lineOf(html, m.index);

    if (!lang) {
      record("warn", file, `line ${line}: <pre><code> has no language- class (falls back to C#)`);
    } else if (!KNOWN_LANGS.has(lang.toLowerCase())) {
      record("error", file, `line ${line}: unknown language "${lang}"`,
        `known: ${[...KNOWN_LANGS].join(", ")}`);
    }

    /* Any raw '<' or '>' inside a code block should have been escaped. The
       body is already-escaped source, so a literal '<' means a real bug. */
    const rawLt = body.indexOf("<");
    if (rawLt !== -1) {
      const snippet = body.slice(Math.max(0, rawLt - 40), rawLt + 40).replace(/\n/g, "\\n");
      record("error", file, `line ${line}: unescaped '<' inside code block (use &lt;)`, `…${snippet}…`);
    }
    const rawGt = body.indexOf(">");
    if (rawGt !== -1) {
      const snippet = body.slice(Math.max(0, rawGt - 40), rawGt + 40).replace(/\n/g, "\\n");
      record("error", file, `line ${line}: unescaped '>' inside code block (use &gt;)`, `…${snippet}…`);
    }
    /* A bare '&' that isn't the start of an entity is almost always a mistake. */
    const badAmp = body.match(/&(?!amp;|lt;|gt;|quot;|#\d+;|#x[0-9a-f]+;|nbsp;|mdash;|rarr;|larr;|hellip;|middot;)/i);
    if (badAmp) {
      record("error", file, `line ${line}: unescaped '&' inside code block (use &amp;)`,
        body.slice(Math.max(0, badAmp.index - 30), badAmp.index + 30).replace(/\n/g, "\\n"));
    }
  }

  /* --------------------------------------------------------- slides ---- */
  const slideRe = /<section class="slide"([^>]*)>/g;
  const ids = new Map();
  let slideCount = 0;
  while ((m = slideRe.exec(html)) !== null) {
    slideCount++;
    const attrs = m[1];
    const line = lineOf(html, m.index);
    const id = (attrs.match(/\bid="([^"]+)"/) || [])[1];
    if (!id) {
      record("error", file, `line ${line}: <section class="slide"> without an id`);
    } else if (ids.has(id)) {
      record("error", file, `line ${line}: duplicate slide id "${id}" (also line ${ids.get(id)})`);
    } else {
      ids.set(id, line);
    }
  }
  if (slideCount === 0) {
    record("error", file, "page contains no slides");
  }

  /* ------------------------------------------------------- headings ---- */
  const h2Re = /<h2([^>]*)>([\s\S]*?)<\/h2>/g;
  while ((m = h2Re.exec(html)) !== null) {
    const [, attrs, inner] = m;
    const line = lineOf(html, m.index);
    const hasMarkup = /<(span|code|em|strong)\b/.test(inner);
    const hasToc = /\bdata-toc="/.test(attrs);
    if (hasMarkup && !hasToc) {
      const text = inner.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
      record("error", file, `line ${line}: <h2> contains markup but has no data-toc`,
        `sidebar would read: "${text}"`);
    }
    if (hasToc) {
      const toc = attrs.match(/\bdata-toc="([^"]*)"/)[1];
      if (!toc.trim()) record("error", file, `line ${line}: empty data-toc`);
      if (toc.length > 32) {
        record("warn", file, `line ${line}: data-toc is ${toc.length} chars; sidebar will truncate`, toc);
      }
    }
  }

  /* -------------------------------------------------- further reading -- */
  const furtherRe = /data-further="([^"]*)"/g;
  const seenFurther = new Set();
  while ((m = furtherRe.exec(html)) !== null) {
    const id = m[1];
    const line = lineOf(html, m.index);
    if (validModules.size && !validModules.has(id)) {
      record("error", file, `line ${line}: data-further="${id}" is not a known module`,
        `valid: ${[...validModules].join(", ")}`);
    }
    if (seenFurther.has(id)) {
      record("warn", file, `line ${line}: data-further="${id}" appears more than once on this page`);
    }
    seenFurther.add(id);
  }

  /* ------------------------------------------------------- modifiers --- */
  const calloutRe = /class="callout callout-([\w-]+)"/g;
  while ((m = calloutRe.exec(html)) !== null) {
    if (!KNOWN_CALLOUTS.has(m[1])) {
      record("error", file, `line ${lineOf(html, m.index)}: unknown callout type "callout-${m[1]}"`,
        `known: ${[...KNOWN_CALLOUTS].join(", ")}`);
    }
  }
  const badgeRe = /class="badge badge-([\w-]+)"/g;
  while ((m = badgeRe.exec(html)) !== null) {
    if (!KNOWN_BADGES.has(m[1])) {
      record("error", file, `line ${lineOf(html, m.index)}: unknown badge "badge-${m[1]}"`,
        `known: ${[...KNOWN_BADGES].join(", ")}`);
    }
  }
  /* A callout without its title div renders as an unlabelled coloured box. */
  const calloutBlocks = html.match(/<div class="callout callout-[\w-]+">([\s\S]*?)<\/div>\s*<\/div>|<div class="callout callout-[\w-]+">([\s\S]{0,200})/g) || [];
  for (const block of calloutBlocks) {
    if (!block.includes("callout-title")) {
      record("warn", file, `callout without a callout-title`, block.slice(0, 80).replace(/\n/g, " "));
    }
  }

  /* --------------------------------------------------------- wiring ---- */
  const sourcesIdx = html.indexOf('src="assets/sources.js"');
  const jsIdx = html.indexOf('src="assets/workshop.js"');
  const cssIdx = html.indexOf('href="assets/workshop.css"');
  if (cssIdx === -1) record("error", file, "missing <link> to assets/workshop.css");
  if (jsIdx === -1) record("error", file, "missing <script> for assets/workshop.js");
  if (sourcesIdx === -1) {
    record("error", file, "missing <script> for assets/sources.js");
  } else if (jsIdx !== -1 && sourcesIdx > jsIdx) {
    record("error", file, "assets/sources.js must be loaded before assets/workshop.js");
  }

  if (!/<nav class="toc"/.test(html)) record("error", file, 'missing <nav class="toc">');
  if (!/<main class="deck"/.test(html)) record("error", file, 'missing <main class="deck">');

  /* Absolute/CDN references break the offline requirement. */
  const ext = html.match(/(?:src|href)="(https?:)?\/\/[^"]+"/g) || [];
  const extAssets = ext.filter((e) => /\.(js|css|woff2?|png|svg|jpg)"/.test(e));
  for (const e of extAssets) {
    record("error", file, "external asset reference breaks offline use", e);
  }

  /* Tables need the scroll wrapper. */
  const tableRe = /<table>/g;
  while ((m = tableRe.exec(html)) !== null) {
    const before = html.slice(Math.max(0, m.index - 200), m.index);
    if (!before.includes('class="table-wrap"')) {
      record("warn", file, `line ${lineOf(html, m.index)}: <table> not wrapped in <div class="table-wrap">`);
    }
  }

  console.log(`  ${file.padEnd(22)} ${String(slideCount).padStart(2)} slides, ${String(codeCount).padStart(2)} code blocks`);
}

/* ----------------------------------------------- authoring-guide drift ---
   AUTHORING.md hand-lists the callout and badge variants an author may use.
   That list is a copy of what workshop.css actually defines, and copies rot:
   `callout-verified` and `badge-verified` both shipped and went undocumented.
   Derive the expectation from the CSS instead of trusting the prose.        */
const authoringPath = join(siteDir, "..", "content", "AUTHORING.md");
if (existsSync(authoringPath)) {
  const guide = readFileSync(authoringPath, "utf8");
  const undocumented = [
    ...[...KNOWN_CALLOUTS].map((c) => `callout-${c}`),
    ...[...KNOWN_BADGES].map((b) => `badge-${b}`),
  ].filter((cls) => !guide.includes(cls));

  for (const cls of undocumented) {
    record("error", "content/AUTHORING.md", `\`${cls}\` is defined in workshop.css but not documented in the authoring guide`);
  }
} else {
  record("warn", "content/AUTHORING.md", "authoring guide not found — cannot check for undocumented callout/badge variants");
}

/* ------------------------------------------------------------- report -- */
console.log("");
const byFile = {};
for (const p of problems) (byFile[p.file] ||= []).push(p);

for (const [file, list] of Object.entries(byFile)) {
  console.log(file);
  for (const p of list) {
    const mark = p.level === "error" ? "  x" : "  !";
    console.log(`${mark} ${p.msg}`);
    if (p.detail) console.log(`      ${p.detail}`);
  }
  console.log("");
}

console.log(`${pages.length} page(s) checked — ${errors} error(s), ${warnings} warning(s).`);
process.exit(errors > 0 ? 1 : 0);
