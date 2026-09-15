/*
 * tools/test-highlighter.mjs
 *
 * Regression test for the zero-dependency syntax highlighter in
 * site/assets/workshop.js.
 *
 * The highlighter functions are pure string -> string and touch no DOM, so we
 * slice them out of the IIFE and evaluate them in isolation. That keeps a
 * single source of truth (workshop.js) while still letting us test headlessly.
 *
 *   node tools/test-highlighter.mjs
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, "..", "site", "assets", "workshop.js"), "utf8");

const start = src.indexOf("  var CS_KEYWORDS");
const endMarker = "  function enhanceCodeBlocks";
const end = src.indexOf(endMarker);
if (start < 0 || end < 0) {
  console.error("FATAL: could not locate highlighter block in workshop.js");
  process.exit(2);
}

const highlight = new Function(src.slice(start, end) + "\n return highlight;")();

let failures = 0;
let checks = 0;

function check(name, condition, detail) {
  checks++;
  if (!condition) {
    failures++;
    console.error(`  FAIL  ${name}${detail ? "\n        " + detail : ""}`);
  }
}

/* Pull the text content of every <span class="tok-X"> out of the output. */
function toks(html, cls) {
  const re = new RegExp(`<span class="tok-${cls}">(.*?)</span>`, "gs");
  return [...html.matchAll(re)].map((m) => m[1]);
}

/* Strip tags and unescape, so we can prove no source text was lost. */
function plain(html) {
  return html
    .replace(/<\/?span[^>]*>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function roundTrip(name, code, lang) {
  const html = highlight(code, lang);
  check(`${name}: round-trips losslessly`, plain(html) === code,
    `expected: ${JSON.stringify(code.slice(0, 120))}\n        actual:   ${JSON.stringify(plain(html).slice(0, 120))}`);
  check(`${name}: no double-escaping`, !html.includes("&amp;lt;") && !html.includes("&amp;amp;"));
  check(`${name}: no unclosed spans`,
    (html.match(/<span/g) || []).length === (html.match(/<\/span>/g) || []).length);
  return html;
}

console.log("Highlighter regression tests\n");

/* ------------------------------------------------------------------ C# --- */
const csharp = `public closed record class GateState;
public union Pet(Cat, Dog, Bird);
// line comment
/* block
   comment */
public string Message
{
    get;
    set => field = value?.Trim() ?? string.Empty;
}
List<string> names = [with(capacity: 4), .. values];
var interpolated = $"count {names.Count} items";
var verbatim = @"C:\\path\\no\\escapes";
int hex = 0x1F_A2;
double sci = 3.14e-2;
decimal money = 19.99m;
[Experimental("SYSLIB5006")]
static class E
{
    extension(IEnumerable<int> q)
    {
        public int this[int i] => q.ElementAt(i);
    }
}`;

const csHtml = roundTrip("csharp", csharp, "csharp");

const csNew = toks(csHtml, "new");
for (const kw of ["closed", "union", "field", "extension"]) {
  check(`csharp: '${kw}' marked as new-in-version`, csNew.includes(kw),
    `tok-new contained: ${JSON.stringify(csNew)}`);
}
check("csharp: 'safe' is a known new keyword", highlight("safe", "csharp").includes('tok-new'));

const csKw = toks(csHtml, "keyword");
for (const kw of ["public", "record", "class", "static", "var", "int", "return".replace("return", "string")]) {
  check(`csharp: '${kw}' is a keyword`, csKw.includes(kw), `tok-keyword: ${JSON.stringify(csKw.slice(0, 30))}`);
}
check("csharp: 'closed' NOT double-classified as keyword", !csKw.includes("closed"));

const csStr = toks(csHtml, "string");
check("csharp: interpolated string captured",
  csStr.some((s) => s.includes("count") && s.startsWith("$\"")), JSON.stringify(csStr));
check("csharp: verbatim string captured",
  csStr.some((s) => s.startsWith("@\"")), JSON.stringify(csStr));

const csCom = toks(csHtml, "comment");
check("csharp: line comment captured", csCom.some((c) => c.startsWith("// line")));
check("csharp: block comment captured", csCom.some((c) => c.startsWith("/* block")));
check("csharp: comment count is 2", csCom.length === 2, `got ${csCom.length}: ${JSON.stringify(csCom)}`);

const csNum = toks(csHtml, "number");
for (const n of ["0x1F_A2", "3.14e-2", "19.99m", "4"]) {
  check(`csharp: number '${n}' captured`, csNum.includes(n), JSON.stringify(csNum));
}

check("csharp: attribute line captured",
  toks(csHtml, "attr").some((a) => a.includes("Experimental")), JSON.stringify(toks(csHtml, "attr")));

/* Angle brackets must be escaped even though the inner type keyword is still
   tokenised, i.e. `List<string>` becomes List &lt; <span>string</span> &gt;. */
check("csharp: generics escape their angle brackets",
  csHtml.includes("&lt;") && csHtml.includes("&gt;") && !/<span[^>]*>string<\/span>\s*>/.test(csHtml));
check("csharp: no raw angle brackets leak into markup",
  !/[^&;]<(?!\/?span)/.test(csHtml.replace(/<\/?span[^>]*>/g, "")));

/* Raw string literals must not swallow the rest of the file. */
const rawHtml = roundTrip("csharp raw string", 'var raw = """no escaping " here""";\nvar after = 1;', "csharp");
check("csharp: code after a raw string still highlights",
  toks(rawHtml, "keyword").includes("var"), JSON.stringify(toks(rawHtml, "keyword")));

/* ----------------------------------------------------------------- XML --- */
const xml = `<Project Sdk="Microsoft.NET.Sdk">
  <!-- comment -->
  <PropertyGroup>
    <TargetFramework>net11.0</TargetFramework>
  </PropertyGroup>
</Project>`;
const xmlHtml = roundTrip("xml", xml, "xml");
check("xml: element names captured",
  toks(xmlHtml, "keyword").includes("PropertyGroup"), JSON.stringify(toks(xmlHtml, "keyword")));
check("xml: attribute name captured", toks(xmlHtml, "attr").includes("Sdk"));
check("xml: attribute value captured",
  toks(xmlHtml, "string").some((s) => s.includes("Microsoft.NET.Sdk")));
check("xml: comment captured", toks(xmlHtml, "comment").some((c) => c.includes("comment")));

/* ---------------------------------------------------------------- JSON --- */
const json = `{
  "id": "medium-unions",
  "usageTier": 1,
  "recommended": true,
  "author": null
}`;
const jsonHtml = roundTrip("json", json, "json");
check("json: keys distinguished from values",
  toks(jsonHtml, "type").includes('"id"'), JSON.stringify(toks(jsonHtml, "type")));
check("json: string value captured",
  toks(jsonHtml, "string").includes('"medium-unions"'), JSON.stringify(toks(jsonHtml, "string")));
check("json: literals captured",
  ["true", "null"].every((l) => toks(jsonHtml, "keyword").includes(l)));
check("json: numbers captured", toks(jsonHtml, "number").includes("1"));

/* ----------------------------------------------------------------- SQL --- */
const sql = `-- vector search
SELECT TOP 5 Id, Name FROM Products
ORDER BY VECTOR_SEARCH(Embedding, @query) DESC;`;
const sqlHtml = roundTrip("sql", sql, "sql");
check("sql: comment captured", toks(sqlHtml, "comment").some((c) => c.startsWith("-- vector")));
check("sql: keywords are case-insensitive",
  ["SELECT", "FROM", "ORDER"].every((k) => toks(sqlHtml, "keyword").includes(k)),
  JSON.stringify(toks(sqlHtml, "keyword")));

/* ---------------------------------------------------------- shell/output - */
const ps = `# install
dotnet build labs/Day2.slnx
Write-Host "done"`;
const psHtml = roundTrip("powershell", ps, "powershell");
check("powershell: comment captured", toks(psHtml, "comment").some((c) => c.startsWith("# install")));
check("powershell: '#' comment does not eat the next line",
  psHtml.includes("dotnet"), psHtml.slice(0, 200));

const outHtml = roundTrip("output", "MLKem.IsSupported  : True\nSlhDsa.IsSupported : False", "output");
check("output: left completely unstyled", !outHtml.includes("<span"));

/* Untrusted input must never become live markup. */
const evil = highlight('var x = "<script>alert(1)</script>";', "csharp");
check("xss: script tags are escaped", !evil.includes("<script>"), evil);
const evilOut = highlight("<img src=x onerror=alert(1)>", "output");
check("xss: output mode escapes markup", !evilOut.includes("<img"), evilOut);

console.log(`\n${checks - failures}/${checks} checks passed.`);
if (failures) {
  console.error(`${failures} FAILED`);
  process.exit(1);
}
console.log("All highlighter checks passed.");
