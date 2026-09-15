/*
 * Headless page tests.
 *
 * The browser canvas in this environment is unreliable, and the deck is large
 * enough that "it looked fine when I scrolled it" is not verification. This
 * boots every page in jsdom exactly as a browser would -- real script tags,
 * real file:// resolution -- and asserts on the DOM that results.
 *
 *   node tools/test-pages.mjs
 *
 * jsdom is a tools-only dependency. Nothing shipped to attendees needs it.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/* jsdom is a tools-only dependency and node_modules is not committed, so a
   fresh clone hits this first. A raw ERR_MODULE_NOT_FOUND stack trace is a
   poor thing to hand someone who just wants to build the handout. */
let JSDOM, VirtualConsole;
try {
  ({ JSDOM, VirtualConsole } = await import("jsdom"));
} catch (err) {
  if (err?.code !== "ERR_MODULE_NOT_FOUND") throw err;
  console.error("");
  console.error("  jsdom is not installed, so the page tests cannot run.");
  console.error("");
  console.error("  It is a tools-only dependency and node_modules is not committed.");
  console.error("  Install it once, from the repository root:");
  console.error("");
  console.error("      npm install --prefix tools");
  console.error("");
  process.exit(2);
}

/* Defaults to site/, but takes a directory so the standalone bundle in dist/
   can be held to exactly the same standard as the source pages. */
const target = process.argv[2] ? resolve(process.argv[2]) : join(root, "site");
const siteDir = target;

let pass = 0;
const failures = [];

function check(name, condition, detail) {
  if (condition) {
    pass++;
  } else {
    failures.push(detail ? `${name} — ${detail}` : name);
  }
}

function equal(name, actual, expected) {
  check(name, actual === expected, `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

/* Boot one page and hand back the window plus anything the scripts logged. */
async function boot(file) {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on("jsdomError", (e) => errors.push(e.message));
  vc.on("error", (...a) => errors.push(a.join(" ")));

  const dom = await JSDOM.fromFile(join(siteDir, file), {
    runScripts: "dangerously",
    resources: "usable",
    url: pathToFileURL(join(siteDir, file)).href,
    virtualConsole: vc,
    pretendToBeVisual: true,

    /* jsdom implements no layout, so scrollIntoView is simply absent. Real
       browsers have it; stub it rather than let a missing jsdom feature
       masquerade as a page error.

       This must happen in beforeParse, not after construction. In site/ the
       scripts are external and load asynchronously, so a later stub still wins
       the race -- but in dist/ they are inlined and execute during parsing,
       which made the bundled pages fail a check the unbundled ones passed. */
    beforeParse(window) {
      window.Element.prototype.scrollIntoView = function () {};
    }
  });

  /* resources:"usable" fetches the two script tags asynchronously, so wait for
     load rather than guessing with a timer. */
  await new Promise((r) => {
    if (dom.window.document.readyState === "complete") r();
    else dom.window.addEventListener("load", r, { once: true });
  });

  return { dom, window: dom.window, doc: dom.window.document, errors };
}

const pages = readdirSync(siteDir).filter((f) => f.endsWith(".html")).sort();

console.log(`Headless page tests — ${siteDir}\n`);

for (const file of pages) {
  const { dom, window, doc, errors } = await boot(file);

  check(`${file}: no script errors`, errors.length === 0, errors.join(" | "));

  /* --- scripts actually executed ------------------------------------- */
  check(`${file}: sources.js loaded`, typeof window.WORKSHOP_SOURCES === "object" && window.WORKSHOP_SOURCES !== null,
    `WORKSHOP_SOURCES was ${typeof window.WORKSHOP_SOURCES}`);

  const slides = doc.querySelectorAll("main.deck section.slide");
  check(`${file}: has slides`, slides.length > 0, `found ${slides.length}`);

  /* --- every slide has a usable anchor -------------------------------- */
  const ids = [...slides].map((s) => s.id);
  check(`${file}: every slide has an id`, ids.every(Boolean), `${ids.filter((x) => !x).length} missing`);
  equal(`${file}: slide ids unique`, new Set(ids).size, ids.length);

  /* --- TOC was built and matches the slides --------------------------- */
  const tocLinks = doc.querySelectorAll(".toc a");
  equal(`${file}: TOC entry per slide`, tocLinks.length, slides.length);
  const tocTargets = [...tocLinks].map((a) => a.getAttribute("href").slice(1));
  check(`${file}: TOC links resolve to slides`,
    tocTargets.every((t) => doc.getElementById(t)),
    tocTargets.filter((t) => !doc.getElementById(t)).join(", "));

  /* --- code blocks were enhanced -------------------------------------- */
  const codes = doc.querySelectorAll("pre code");
  const copyBtns = doc.querySelectorAll(".code-copy");
  equal(`${file}: copy button per code block`, copyBtns.length, codes.length);
  if (codes.length) {
    const highlighted = [...codes].filter((c) => c.querySelector(".tok-keyword, .tok-type, .tok-string, .tok-comment, .tok-new"));
    check(`${file}: code blocks are highlighted`, highlighted.length > 0,
      `0 of ${codes.length} produced tokens`);
  }

  /* --- further-reading hosts rendered --------------------------------- */
  const furtherHosts = doc.querySelectorAll("[data-further]");
  if (furtherHosts.length) {
    const rendered = [...furtherHosts].filter((h) => h.classList.contains("further") && h.innerHTML.trim());
    equal(`${file}: all data-further hosts rendered`, rendered.length, furtherHosts.length);
  }

  /* --- internal links point at something that exists ------------------- */
  const hashLinks = [...doc.querySelectorAll('a[href^="#"]')].map((a) => a.getAttribute("href").slice(1)).filter(Boolean);
  const deadHash = hashLinks.filter((h) => !doc.getElementById(h));
  check(`${file}: no dead in-page anchors`, deadHash.length === 0, deadHash.join(", "));

  /* Only relative hrefs are page links. Plenty of legitimate external sources
     are Blogspot/WordPress URLs that happen to end in ".html", and those are
     not ours to resolve. */
  const pageLinks = [...doc.querySelectorAll('a[href$=".html"]')]
    .map((a) => a.getAttribute("href"))
    .filter((h) => h && !/^(https?:)?\/\//i.test(h) && !/^[a-z][a-z0-9+.-]*:/i.test(h));
  const deadPage = pageLinks.filter((p) => !pages.includes(p.split("#")[0]));
  check(`${file}: no dead page links`, deadPage.length === 0, deadPage.join(", "));

  /* --- controls work --------------------------------------------------- */
  const modeBtn = doc.querySelector('[data-action="mode"]');
  check(`${file}: has present toggle`, !!modeBtn);
  if (modeBtn) {
    modeBtn.click();
    check(`${file}: present mode engages`, doc.body.classList.contains("mode-present"),
      `body class was "${doc.body.className}"`);
    modeBtn.click();
    check(`${file}: present mode disengages`, doc.body.classList.contains("mode-handout"),
      `body class was "${doc.body.className}"`);
  }

  const themeBtn = doc.querySelector('[data-action="theme"]');
  if (themeBtn) {
    const before = doc.documentElement.getAttribute("data-theme");
    themeBtn.click();
    check(`${file}: theme toggles`, doc.documentElement.getAttribute("data-theme") !== before,
      `stayed on "${before}"`);
    themeBtn.click();
  }

  /* --- nav marks the current page -------------------------------------- */
  const current = doc.querySelector(`.navlinks a[aria-current="page"]`);
  check(`${file}: nav marks current page`, !!current && current.getAttribute("href") === file,
    current ? `marked ${current.getAttribute("href")}` : "nothing marked");

  console.log(
    `  ${file.padEnd(14)} ${String(slides.length).padStart(3)} slides  ` +
    `${String(codes.length).padStart(3)} code  ${String(tocLinks.length).padStart(3)} toc  ` +
    `${String(furtherHosts.length).padStart(2)} further`
  );

  dom.window.close();
}

/* ---------------------------------------------------------------------
   sources.html specifically: the registry must actually reach the page.
   --------------------------------------------------------------------- */
const reg = JSON.parse(readFileSync(join(root, "content", "sources.json"), "utf8"));
{
  const { dom, doc } = await boot("sources.html");
  const host = doc.querySelector("[data-source-index]");
  check("sources.html: has source-index host", !!host);

  const counter = doc.querySelector("[data-source-count]");
  check("sources.html: count is filled in", !!counter && /\d|No sources/.test(counter.textContent),
    counter ? counter.textContent : "no counter");

  if (reg.sources.length === 0) {
    check("sources.html: empty registry shows guidance",
      host.textContent.includes("Registry is empty"),
      host.textContent.slice(0, 80));
  } else {
    /* Every registry entry must be reachable, and every link must be absolute. */
    const rendered = [...host.querySelectorAll("li a[href]")].map((a) => a.getAttribute("href"));
    const missing = reg.sources.filter((s) => !rendered.includes(s.url));
    check("sources.html: every registry source is rendered", missing.length === 0,
      missing.map((s) => s.id).join(", "));
    check("sources.html: source links are absolute",
      rendered.every((h) => /^https?:\/\//.test(h)),
      rendered.filter((h) => !/^https?:\/\//.test(h)).join(", "));

    const statuses = [...host.querySelectorAll(".vstat")];
    check("sources.html: verification badge on every entry",
      statuses.length >= reg.sources.length,
      `${statuses.length} badges for ${reg.sources.length} sources`);
  }
  dom.window.close();
}

console.log("");
if (failures.length) {
  console.error(`${failures.length} failure(s):`);
  for (const f of failures) console.error("  ✗ " + f);
  console.error(`\n${pass} passed, ${failures.length} failed.`);
  process.exit(1);
}
console.log(`${pass}/${pass} checks passed.`);
console.log("All pages boot cleanly.");
