/*
 * tools/insert-slides.mjs
 *
 * Inserts the <section class="slide"> elements from a fragment into a target
 * page immediately BEFORE a named anchor slide, so new slides land inside
 * their module rather than at the end of the deck.
 *
 *   node tools/insert-slides.mjs <target.html> <anchor-slide-id> <fragment.html> [filter-module-title]
 *
 * If filter-module-title is given, only slides whose data-module-title matches
 * are taken from the fragment; the rest are ignored. That lets one fragment
 * carry slides for two different modules.
 *
 * Refuses to insert a slide whose id already exists in the target.
 */

import { readFileSync, writeFileSync } from "node:fs";

const [target, anchorId, fragment, filterTitle] = process.argv.slice(2);
if (!target || !anchorId || !fragment) {
  console.error(
    "usage: node tools/insert-slides.mjs <target.html> <anchor-slide-id> <fragment.html> [module-title]");
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

let slides = extractSlides(readFileSync(fragment, "utf8"));
if (filterTitle) {
  slides = slides.filter((s) => {
    const m = s.match(/data-module-title="([^"]+)"/);
    return m && m[1] === filterTitle;
  });
}
if (slides.length === 0) {
  console.error(`${fragment}: no slides matched`);
  process.exit(1);
}

for (const s of slides) {
  const id = (s.match(/\bid="([^"]+)"/) || [])[1];
  if (!id) {
    console.error("a slide has no id");
    process.exit(1);
  }
  if (existing.has(id)) {
    console.error(`duplicate slide id would be inserted: ${id}`);
    process.exit(1);
  }
  if (/data-further/.test(s)) {
    console.error(`fragment slide ${id} carries data-further; that belongs on the module's last slide only`);
    process.exit(1);
  }
  existing.add(id);
}

/* Find the anchor slide's opening tag and insert before it, preserving the
   indentation the anchor sits at. */
const anchorRe = new RegExp(`([ \\t]*)<section class="slide" id="${anchorId}"`);
const hit = targetHtml.match(anchorRe);
if (!hit) {
  console.error(`anchor slide not found: ${anchorId}`);
  process.exit(1);
}
const indent = hit[1] ?? "";
const block = slides.map((s) => indent + s.trim()).join("\n\n") + "\n\n";
targetHtml = targetHtml.replace(anchorRe, block + hit[0]);

writeFileSync(target, targetHtml);
console.log(`inserted ${slides.length} slide(s) before ${anchorId}`);
for (const s of slides) {
  console.log(`   ${(s.match(/\bid="([^"]+)"/) || [])[1]}`);
}
