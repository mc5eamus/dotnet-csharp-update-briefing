/*
 * tools/merge-sections.mjs
 *
 * Appends the <section class="slide"> elements from one or more fragment pages
 * into a target page, immediately before its closing </main>.
 *
 * Content modules are authored as complete standalone pages so they can be
 * linted individually; this stitches them into the real day pages.
 *
 *   node tools/merge-sections.mjs <target.html> <fragment.html> [...more]
 */

import { readFileSync, writeFileSync } from "node:fs";

const [target, ...fragments] = process.argv.slice(2);
if (!target || fragments.length === 0) {
  console.error("usage: node tools/merge-sections.mjs <target.html> <fragment.html> [...]");
  process.exit(2);
}

/* Depth-aware scan: a slide contains nested <div>s but never a nested
   <section>, so tracking <section> depth is enough to find each slide's end. */
function extractSlides(html) {
  const slides = [];
  const open = /<section class="slide"[^>]*>/g;
  let m;
  while ((m = open.exec(html)) !== null) {
    let depth = 1;
    const tagRe = /<\/?section\b[^>]*>/g;
    tagRe.lastIndex = m.index + m[0].length;
    let t;
    while (depth > 0 && (t = tagRe.exec(html)) !== null) {
      depth += t[0].startsWith("</") ? -1 : 1;
      if (depth === 0) {
        slides.push(html.slice(m.index, t.index + t[0].length));
        open.lastIndex = t.index + t[0].length;
      }
    }
    if (depth !== 0) {
      console.error(`unbalanced <section> starting at offset ${m.index}`);
      process.exit(1);
    }
  }
  return slides;
}

let targetHtml = readFileSync(target, "utf8");
const existing = new Set(
  [...targetHtml.matchAll(/<section class="slide"[^>]*\bid="([^"]+)"/g)].map((m) => m[1]));

const collected = [];
for (const frag of fragments) {
  const slides = extractSlides(readFileSync(frag, "utf8"));
  if (slides.length === 0) {
    console.error(`${frag}: no slides found`);
    process.exit(1);
  }
  for (const s of slides) {
    const id = (s.match(/\bid="([^"]+)"/) || [])[1];
    if (existing.has(id)) {
      console.error(`duplicate slide id "${id}" from ${frag} - refusing to merge`);
      process.exit(1);
    }
    existing.add(id);
    collected.push(s);
  }
  console.log(`  ${frag}: ${slides.length} slide(s)`);
}

const closeMain = targetHtml.lastIndexOf("</main>");
if (closeMain === -1) {
  console.error(`${target}: no closing </main>`);
  process.exit(1);
}

const block = "\n" + collected.map((s) => "    " + s.trim()).join("\n\n") + "\n\n  ";
targetHtml = targetHtml.slice(0, closeMain) + block + targetHtml.slice(closeMain);
writeFileSync(target, targetHtml, "utf8");

console.log(`\nMerged ${collected.length} slide(s) into ${target}.`);
