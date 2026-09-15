# Authoring guide — workshop content pages

How to write a content module so it matches the rest of the site. `site/day1.html`
(modules 1 and 2) is the reference implementation — when in doubt, copy its shape.

## Page skeleton

Every content page is one HTML file with this structure:

```
<header class="topbar">        topbar + nav + Notes/Present/Theme buttons
<div class="layout">
  <nav class="toc" data-title="Day 1"></nav>     empty — JS fills it
  <main class="deck">
    <section class="slide" id="..." data-module-title="...">  one per slide
  </main>
</div>
<div class="deck-nav">         prev / next
<script src="assets/sources.js"></script>
<script src="assets/workshop.js"></script>       must be last, in this order
```

Nothing is fetched at runtime and there are no external assets, because the site has
to work from `file://` and from a USB stick.

## Slides

```html
<section class="slide" id="d1-cs14-field" data-module-title="2 &middot; C# 14">
  <h2 data-toc="The field keyword">The <code>field</code> keyword <span class="badge badge-cs14">C# 14</span></h2>
  <p class="slide-lead">One-sentence framing. Optional.</p>
  ...
  <div data-further="day1-m2"></div>   <!-- last slide of the module only -->
</section>
```

- `id` — stable, kebab-case, `d{day}-{topic}`. Used as the URL fragment, so don't churn it.
- `data-module-title` — groups slides under a heading in the sidebar. Identical string
  for every slide in a module.
- `data-toc` — short sidebar label. **Always set it when the `<h2>` contains badges or
  `<code>`**, otherwise the badge text leaks into the sidebar.
- One idea per slide. If a slide needs three `<h3>`s it is probably two slides.

## Code blocks

````html
<pre><code class="language-csharp">var x = 1;</code></pre>
````

Supported languages: `csharp`, `json`, `xml` (also `csproj`, `html`), `sql`,
`powershell` (also `bash`, `sh`), `output`/`text` (no highlighting — use it for
console output so it isn't mis-coloured as code).

**Escaping is mandatory and easy to get wrong.** Inside `<pre><code>` you must write
`&lt;` for `<`, `&gt;` for `>`, `&amp;` for `&`:

```html
<pre><code class="language-csharp">List&lt;string&gt; names = [];
if (a &amp;&amp; b) { }</code></pre>
```

Generic types are the usual casualty. `List<string>` unescaped silently swallows the
rest of the block.

Do not add a copy button, a language label, or a wrapper `div` — `workshop.js` adds
those. Don't indent the opening `<pre><code>` content, since leading whitespace is
preserved verbatim.

C# 14/15 keywords (`field`, `extension`, `union`, `closed`, `safe`) are highlighted
in a distinct colour automatically. That contrast is the point of the workshop, so
prefer showing a new keyword in context over describing it in prose.

## Callouts

```html
<div class="callout callout-gotcha">
  <div class="callout-title">Short, specific title</div>
  <p>Body.</p>
</div>
```

| Class | Use for |
|---|---|
| `callout-note` | Context or background worth pulling out |
| `callout-focus` | "This is the bit that matters to you" |
| `callout-gotcha` | Sharp edges, surprising behaviour, things that bite |
| `callout-breaking` | Actual breaking changes — behaviour that differs on upgrade |
| `callout-preview` | Preview/RC-only behaviour that may still change |
| `callout-verified` | **Something we measured that contradicts what's published** |

Use `callout-breaking` sparingly and only for genuine breaks, or it stops meaning anything.

`callout-verified` is the workshop's signature treatment and carries a promise: everything
inside it was compiled and run on the presenter's machine, and it corrects something a
doc, a blog post, or an earlier version of this deck got wrong. Never use it to decorate
a claim you merely believe. If you can't point at the code you ran, use `callout-note`.
`FACILITATOR.md` §3 is the running list of these corrections; add yours there too.

## Badges

`badge-net10`, `badge-net11`, `badge-cs14`, `badge-cs15`, `badge-preview`,
`badge-breaking`, `badge-focus`, `badge-verified`, or a bare `badge`.

```html
<span class="badge badge-net11">RC</span>
```

`badge-verified` is applied automatically by `workshop.js` to further-reading entries
whose `kind` is `docs`, so attendees can tell first-party documentation from community
commentary at a glance. Don't hand-write it onto a slide.

## Layout pieces

- `<div class="grid grid-2">` / `grid-3` with `<div class="card">` children.
  `<div class="card-kicker">LABEL</div>` gives a card an uppercase kicker.
  Two `<div>`s inside a `grid-2` is the standard before/after pattern.
- `<div class="table-wrap"><table>…</table></div>` — the wrapper gives horizontal
  scrolling on narrow screens. Always use it.
- `<div class="agenda card">` with `<div class="agenda-row">` rows; add `is-lab` for
  lab rows and `is-break` for breaks.

## Speaker notes

```html
<div class="notes"><p>…</p></div>
```

Hidden until the presenter presses `N`; always printed. Write them for the person
delivering the module, not the attendee: what to ask the room, what usually goes wrong,
what to demo live. Don't restate the slide.

## Further reading

End the **last slide of each module** with:

```html
<div data-further="day1-m2"></div>
```

`workshop.js` fills it from `window.WORKSHOP_SOURCES` (generated from
`content/sources.json`). An empty module renders a neutral placeholder, so it is safe
to add the div before any sources exist. Module IDs are `day1-m1`…`day1-m5` and
`day2-m1`…`day2-m6`; run `pwsh tools/validate-sources.ps1` to list them.

Never hand-write a further-reading list — it would bypass the vetting pipeline.

## House style

- British-neutral English, second person, plain sentences.
- Lead with what it replaces or why it exists, then show the code.
- Be concrete about versions: "requires .NET 10", "RC 1 behaviour, may change".
- Say when something doesn't work. Unqualified enthusiasm reads as marketing and the
  room stops believing the rest.
- Every claim must be traceable to Microsoft Learn or to something actually compiled
  and run on this machine. If it was only read about, say so.
- No em-dash-free prose rules, no word counts — just don't pad.

## Checking your work

```powershell
node tools/test-highlighter.mjs          # highlighter regression tests
pwsh tools/validate-sources.ps1          # source registry rules
pwsh tools/build-sources.ps1             # regenerate assets/sources.js
node tools/check-pages.mjs               # structural lint for the HTML pages
node tools/find-placeholder-output.mjs   # un-replaced expected-output stubs
pwsh tools/check-links.ps1               # registry URLs still resolve (needs network)
```

If a slide shows a `language-output` block, that block is a promise that someone ran the
snippet. Paste real console output or delete the block —
`find-placeholder-output.mjs` fails the build on stub shapes, and it exists because
`labeled continue: none` shipped as "expected output" and nobody noticed.
