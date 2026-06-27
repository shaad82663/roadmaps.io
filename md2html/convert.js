#!/usr/bin/env node
/**
 * convert.js
 * ---------------------------------------------------------------------------
 * Converts one or many Markdown (.md) files into polished, self-contained
 * HTML files (CSS + syntax highlighting inlined, no internet connection
 * needed to view the result).
 *
 * USAGE
 * -----
 *   Single file, auto output name (same folder, .html extension):
 *     node convert.js guide.md
 *
 *   Single file, custom output path:
 *     node convert.js guide.md out/guide.html
 *
 *   Whole folder of .md files -> folder of .html files (+ an index.html):
 *     node convert.js --dir ./guides --out ./html
 *
 *   Recurse into subfolders too:
 *     node convert.js --dir ./guides --out ./html --recursive
 *
 * INSTALL
 * -------
 *   npm install
 *
 * This script is written so it keeps working as you add more guides with the
 * same general structure (headings, TOC, tables, code blocks, blockquotes,
 * nested lists, etc.) - nothing here is hard-coded to one specific document.
 * ---------------------------------------------------------------------------
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { marked } = require("marked");
const hljs = require("highlight.js");
const GithubSlugger = require("github-slugger").default;

// ============================================================================
// 1. MARKDOWN -> HTML RENDERING SETUP
// ============================================================================

// Map a few language aliases people commonly write in fenced code blocks
// onto the language names highlight.js actually knows about.
const LANG_ALIASES = {
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  jsx: "javascript",
  sh: "bash",
  shell: "bash",
  zsh: "bash",
  yml: "yaml",
  txt: "plaintext",
  text: "plaintext",
  "": "plaintext",
};

function highlightCode(code, lang) {
  const normalized =
    LANG_ALIASES[(lang || "").toLowerCase()] || (lang || "").toLowerCase();

  try {
    if (normalized && hljs.getLanguage(normalized)) {
      return hljs.highlight(code, {
        language: normalized,
        ignoreIllegals: true,
      }).value;
    }
    // No usable language hint -> let highlight.js guess.
    return hljs.highlightAuto(code).value;
  } catch (err) {
    // Never let a highlighting failure break the whole build - fall back to
    // a plain, escaped code block instead.
    return escapeHtml(code);
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function stripHtmlTags(str) {
  return String(str).replace(/<[^>]*>/g, "");
}

/**
 * Scopes a flat CSS stylesheet (no @media/@keyframes - which is true of the
 * highlight.js theme files we use) under a prefix selector, e.g. turns
 *   .hljs-comment{color:red}
 * into
 *   [data-theme="dark"] .hljs-comment{color:red}
 * This lets us ship both a light and a dark highlight.js theme in the same
 * page and switch between them purely with the data-theme attribute.
 */
function scopeCss(css, scopeSelector) {
  // Strip block comments first - if left in, a comment sitting directly
  // before a bare rule (no comma) gets swallowed into the "selector" text
  // by the regex below, which can corrupt the scoping.
  const noComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
  return noComments.replace(
    /([^{}]+)\{([^{}]*)\}/g,
    (match, selectors, body) => {
      const scoped = selectors
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => `${scopeSelector} ${s}`)
        .join(", ");
      return scoped ? `${scoped}{${body}}` : "";
    },
  );
}

// Callout keywords we recognise inside blockquotes, e.g.:
//   > **Why:** because reasons.
//   > **Important:** don't forget your .env file.
// Each gets its own colour + icon so they pop visually instead of looking
// like a plain quote.
const CALLOUT_STYLES = {
  why: { icon: "&#128161;", label: "Why" }, // bulb
  important: { icon: "&#9888;", label: "Important" }, // warning triangle
  note: { icon: "&#128221;", label: "Note" }, // memo
  warning: { icon: "&#9888;", label: "Warning" },
  tip: { icon: "&#10024;", label: "Tip" }, // sparkles
  analogy: { icon: "&#127919;", label: "Analogy" }, // target
  "key insight": { icon: "&#128270;", label: "Key Insight" }, // magnifier
  "real-world analogy": { icon: "&#127919;", label: "Analogy" },
};

function classifyCallout(keyword) {
  const k = keyword.trim().toLowerCase();
  for (const key of Object.keys(CALLOUT_STYLES)) {
    if (k === key || k.startsWith(key)) return CALLOUT_STYLES[key];
  }
  return null;
}

/**
 * Builds a fresh marked Renderer + slugger for one document.
 * A new slugger per document means heading ids restart cleanly per file.
 */
function buildRenderer() {
  const renderer = new marked.Renderer();
  const slugger = new GithubSlugger();

  renderer.heading = function (text, level, raw) {
    const plain = stripHtmlTags(text).trim();
    const id = slugger.slug(plain);
    return `<h${level} id="${id}"><a class="heading-anchor" href="#${id}" aria-hidden="true">#</a>${text}</h${level}>\n`;
  };

  renderer.code = function (code, infostring) {
    const lang = (infostring || "").trim().split(/\s+/)[0];
    const highlighted = highlightCode(code, lang);
    const langLabel = lang ? escapeHtml(lang) : "text";
    return (
      `<div class="code-block">` +
      `<div class="code-block-header"><span class="code-lang">${langLabel}</span></div>` +
      `<pre><code class="hljs language-${escapeHtml(langLabel)}">${highlighted}</code></pre>` +
      `</div>\n`
    );
  };

  renderer.codespan = function (code) {
    return `<code class="inline-code">${code}</code>`;
  };

  renderer.blockquote = function (quote) {
    const match = quote.match(/<p>\s*<strong>([^<]+?):?<\/strong>/i);
    const callout = match ? classifyCallout(match[1]) : null;

    if (callout) {
      return (
        `<div class="callout callout-${escapeHtml(callout.label.toLowerCase().replace(/\s+/g, "-"))}">` +
        `<div class="callout-title"><span class="callout-icon">${callout.icon}</span>${callout.label}</div>` +
        `<div class="callout-body">${quote}</div>` +
        `</div>\n`
      );
    }

    return `<blockquote class="quote-plain">${quote}</blockquote>\n`;
  };

  renderer.table = function (header, body) {
    return (
      `<div class="table-wrap"><table>\n<thead>\n${header}</thead>\n` +
      `<tbody>\n${body}</tbody>\n</table></div>\n`
    );
  };

  return renderer;
}

function markdownToBodyHtml(markdownSource) {
  const renderer = buildRenderer();
  marked.setOptions({
    renderer,
    gfm: true,
    breaks: false,
    headerIds: false, // we generate ids ourselves, above
    mangle: false,
    smartypants: false,
  });
  return marked.parse(markdownSource);
}

/** Pull a reasonable <title> from the first H1, else fall back to filename. */
function extractTitle(markdownSource, fallback) {
  const m = markdownSource.match(/^#\s+(.+)$/m);
  if (m) return stripHtmlTags(m[1]).replace(/[`*_]/g, "").trim();
  return fallback;
}

// ============================================================================
// 2. PAGE TEMPLATE (CSS is inlined so the .html file is fully self-contained)
// ============================================================================

function pageTemplate({ title, bodyHtml }) {
  const darkHljsRaw = fs.readFileSync(
    require.resolve("highlight.js/styles/atom-one-dark.css"),
    "utf8",
  );
  const lightHljsRaw = fs.readFileSync(
    require.resolve("highlight.js/styles/atom-one-light.css"),
    "utf8",
  );

  // Each theme is namespaced so only the active one applies. The light
  // theme's selector also matches when data-theme isn't set yet (e.g. a
  // no-JS context), so the page never renders fully unstyled.
  const hljsCss =
    scopeCss(lightHljsRaw, 'html:not([data-theme="dark"])') +
    "\n" +
    scopeCss(darkHljsRaw, 'html[data-theme="dark"]');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(title)}</title>
<script>
// Runs before first paint so there is no flash of the wrong theme.
(function () {
  try {
    var stored = localStorage.getItem("md2html-theme");
    var theme = stored || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", theme);
  } catch (e) {
    document.documentElement.setAttribute("data-theme", "light");
  }
})();
</script>
<style>
/* ---------- highlight.js themes (light: atom-one-light, dark: atom-one-dark) ---------- */
${hljsCss}

/* ---------- color tokens: light theme (default) ---------- */
:root{
  --page-bg:#fbfbfd;
  --card-bg:#ffffff;
  --text:#1c1f26;
  --heading:#15161c;
  --muted:#5b6472;
  --accent:#6d5ef9;
  --accent-dark:#4a3fd6;
  --accent-soft:#efeaff;
  --border:#e6e7ee;
  --row-hover:#fafaff;
  --quote-bg:#f7f7fb;
  --code-bg:#f6f7fb;
  --code-header-bg:#ebebf3;
  --code-header-text:#5b6472;
  --code-border:rgba(0,0,0,0.06);
  --shadow-card:0 10px 40px rgba(20,20,50,0.08);
  --shadow-code:0 6px 20px rgba(15,17,23,0.10);
  --banner-grad:linear-gradient(120deg,#4a3fd6 0%,#6d5ef9 45%,#9b8cff 100%);
  --toggle-bg:#ffffff;
  --toggle-border:#e6e7ee;
  --radius:10px;
  --max-width:880px;
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
}

/* ---------- color tokens: dark theme ---------- */
[data-theme="dark"]{
  --page-bg:#0b0d12;
  --card-bg:#15171f;
  --text:#dde0e8;
  --heading:#f2f3f8;
  --muted:#9aa0b4;
  --accent:#a89bff;
  --accent-dark:#c3b8ff;
  --accent-soft:rgba(109,94,249,0.16);
  --border:#2a2d3a;
  --row-hover:#1b1d28;
  --quote-bg:#1a1c26;
  --code-bg:#0f1117;
  --code-header-bg:#1b1d27;
  --code-header-text:#9aa0b4;
  --code-border:rgba(255,255,255,0.06);
  --shadow-card:0 10px 40px rgba(0,0,0,0.45);
  --shadow-code:0 6px 20px rgba(0,0,0,0.35);
  --banner-grad:linear-gradient(120deg,#211c4a 0%,#3c2f8a 45%,#5b4bb8 100%);
  --toggle-bg:#1b1d28;
  --toggle-border:#33374a;
}

/* All color changes animate smoothly when the toggle is pressed. */
*{box-sizing:border-box;}
html,body{margin:0;padding:0;}
body{
  background:var(--page-bg);
  color:var(--text);
  line-height:1.7;
  font-size:17px;
  -webkit-font-smoothing:antialiased;
  transition:background-color .25s ease, color .25s ease;
}
body, .article-wrap, .code-block pre, .code-block-header, table, .callout,
.quote-plain, .top-banner{
  transition:background-color .25s ease, color .25s ease, border-color .25s ease, box-shadow .25s ease;
}

/* ---------- theme toggle button ---------- */
.theme-toggle{
  position:fixed;
  top:18px;
  right:18px;
  z-index:50;
  width:44px;
  height:44px;
  border-radius:50%;
  border:1px solid var(--toggle-border);
  background:var(--toggle-bg);
  color:var(--text);
  display:flex;
  align-items:center;
  justify-content:center;
  cursor:pointer;
  font-size:1.2rem;
  box-shadow:0 4px 14px rgba(0,0,0,0.18);
  transition:transform .15s ease, background-color .25s ease, border-color .25s ease;
}
.theme-toggle:hover{transform:translateY(-1px) scale(1.05);}
.theme-toggle:active{transform:scale(0.95);}
.theme-toggle .icon-moon{display:none;}
[data-theme="dark"] .theme-toggle .icon-sun{display:none;}
[data-theme="dark"] .theme-toggle .icon-moon{display:inline;}
@media (max-width:600px){
  .theme-toggle{top:12px;right:12px;width:40px;height:40px;font-size:1.05rem;}
}

/* ---------- top banner ---------- */
.top-banner{
  background:var(--banner-grad);
  color:#fff;
  padding:56px 24px 64px;
  text-align:center;
}
.top-banner h1{
  margin:0 auto;
  max-width:var(--max-width);
  font-size:2.1rem;
  font-weight:800;
  letter-spacing:-0.01em;
}
.top-banner .subtitle{
  margin-top:10px;
  opacity:0.92;
  font-size:1rem;
}

/* ---------- article shell ---------- */
.article-wrap{
  max-width:var(--max-width);
  margin:-32px auto 80px;
  background:var(--card-bg);
  border-radius:16px;
  box-shadow:var(--shadow-card);
  padding:48px 56px 64px;
  position:relative;
}
@media (max-width:600px){
  .article-wrap{padding:28px 20px 40px;}
  .top-banner{padding:40px 16px 48px;}
  .top-banner h1{font-size:1.5rem;}
}

/* ---------- headings ---------- */
h1,h2,h3,h4,h5,h6{
  font-weight:700;
  line-height:1.25;
  scroll-margin-top:24px;
  position:relative;
  color:var(--heading);
}
.article-wrap h1{
  font-size:1.9rem;
  margin:2.4em 0 0.7em;
  padding-bottom:0.4em;
  border-bottom:3px solid var(--accent);
}
.article-wrap h1:first-child{margin-top:0;}
h2{
  font-size:1.5rem;
  margin:2.6em 0 0.8em;
  padding-left:14px;
  border-left:5px solid var(--accent);
}
h3{
  font-size:1.2rem;
  margin:2em 0 0.6em;
  color:var(--accent-dark);
}
h4{
  font-size:1.02rem;
  margin:1.6em 0 0.5em;
  color:var(--muted);
  text-transform:uppercase;
  letter-spacing:0.03em;
}
.heading-anchor{
  position:absolute;
  left:-1.1em;
  opacity:0;
  text-decoration:none;
  color:var(--accent);
  font-weight:400;
  transition:opacity .15s;
}
h1:hover .heading-anchor,h2:hover .heading-anchor,h3:hover .heading-anchor,
h4:hover .heading-anchor{opacity:1;}

/* ---------- paragraphs / text ---------- */
p{margin:1em 0;}
strong{color:var(--heading);}
a{color:var(--accent-dark);text-decoration:none;border-bottom:1px solid rgba(125,107,255,0.35);}
a:hover{border-bottom-color:var(--accent-dark);}
hr{border:none;border-top:1px solid var(--border);margin:2.5em 0;}

/* ---------- lists ---------- */
ul,ol{padding-left:1.4em;margin:1em 0;}
li{margin:0.35em 0;}
li::marker{color:var(--accent);}

/* ---------- inline code ---------- */
code.inline-code{
  background:var(--accent-soft);
  color:var(--accent-dark);
  padding:0.15em 0.45em;
  border-radius:5px;
  font-size:0.88em;
  font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace;
}

/* ---------- fenced code blocks ---------- */
.code-block{
  margin:1.6em 0;
  border-radius:var(--radius);
  overflow:hidden;
  box-shadow:var(--shadow-code);
  border:1px solid var(--code-border);
}
.code-block-header{
  background:var(--code-header-bg);
  color:var(--code-header-text);
  font-size:0.75rem;
  font-weight:600;
  letter-spacing:0.06em;
  text-transform:uppercase;
  padding:8px 16px;
  border-bottom:1px solid var(--code-border);
}
.code-block-header::before{
  content:"";
  display:inline-block;
  width:8px;height:8px;border-radius:50%;
  background:#ff5f56;
  box-shadow:16px 0 0 #ffbd2e, 32px 0 0 #27c93f;
  margin-right:48px;
  vertical-align:middle;
}
.code-block pre{
  margin:0;
  padding:18px 20px;
  overflow-x:auto;
  background:var(--code-bg);
}
.code-block code{
  font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,"Liberation Mono",monospace;
  font-size:0.88rem;
  line-height:1.6;
  background:transparent;
}

/* ---------- tables ---------- */
.table-wrap{
  overflow-x:auto;
  margin:1.6em 0;
  border-radius:var(--radius);
  border:1px solid var(--border);
}
table{
  width:100%;
  border-collapse:collapse;
  font-size:0.93rem;
}
thead th{
  background:var(--accent-soft);
  color:var(--accent-dark);
  text-align:left;
  font-weight:700;
  padding:10px 14px;
  border-bottom:2px solid var(--border);
  white-space:nowrap;
}
tbody td{
  padding:10px 14px;
  border-bottom:1px solid var(--border);
  vertical-align:top;
  color:var(--text);
}
tbody tr:last-child td{border-bottom:none;}
tbody tr:hover{background:var(--row-hover);}
table code.inline-code{white-space:nowrap;}

/* ---------- blockquotes / callouts ---------- */
.quote-plain{
  margin:1.4em 0;
  padding:0.8em 1.2em;
  border-left:4px solid var(--border);
  background:var(--quote-bg);
  color:var(--muted);
  border-radius:0 8px 8px 0;
}
.callout{
  margin:1.6em 0;
  border-radius:10px;
  border:1px solid var(--border);
  overflow:hidden;
  background:var(--card-bg);
}
.callout-title{
  display:flex;align-items:center;gap:8px;
  font-weight:700;
  padding:10px 16px;
  font-size:0.92rem;
}
.callout-icon{font-size:1.05em;}
.callout-body{padding:2px 16px 14px;color:var(--text);}
.callout-body p{margin:0.6em 0;}

.callout-why{border-color:#ffd97a;}
.callout-why .callout-title{background:#fff8e6;color:#8a6400;}
.callout-important{border-color:#ff9f9f;}
.callout-important .callout-title{background:#fff0f0;color:#b3261e;}
.callout-note{border-color:#9cc4ff;}
.callout-note .callout-title{background:#eef5ff;color:#1457b8;}
.callout-warning{border-color:#ff9f9f;}
.callout-warning .callout-title{background:#fff0f0;color:#b3261e;}
.callout-tip{border-color:#9be3b8;}
.callout-tip .callout-title{background:#eafff3;color:#0c7a43;}
.callout-analogy{border-color:#c8b8ff;}
.callout-analogy .callout-title{background:#f4f0ff;color:#5b3fd6;}
.callout-key-insight{border-color:#c8b8ff;}
.callout-key-insight .callout-title{background:#f4f0ff;color:#5b3fd6;}

/* Dark-mode callouts: darker, desaturated fills with light text so they
   don't glare against a dark page - same hue family per type for instant
   recognition, just recalibrated for dark backgrounds. */
[data-theme="dark"] .callout-why{border-color:#6b5a22;}
[data-theme="dark"] .callout-why .callout-title{background:rgba(255,217,122,0.12);color:#ffd97a;}
[data-theme="dark"] .callout-important{border-color:#7a3535;}
[data-theme="dark"] .callout-important .callout-title{background:rgba(255,90,90,0.12);color:#ff9b9b;}
[data-theme="dark"] .callout-note{border-color:#2f4f7a;}
[data-theme="dark"] .callout-note .callout-title{background:rgba(120,170,255,0.12);color:#9cc4ff;}
[data-theme="dark"] .callout-warning{border-color:#7a3535;}
[data-theme="dark"] .callout-warning .callout-title{background:rgba(255,90,90,0.12);color:#ff9b9b;}
[data-theme="dark"] .callout-tip{border-color:#2f6b4d;}
[data-theme="dark"] .callout-tip .callout-title{background:rgba(120,220,160,0.12);color:#9be3b8;}
[data-theme="dark"] .callout-analogy{border-color:#4f3f8a;}
[data-theme="dark"] .callout-analogy .callout-title{background:rgba(160,140,255,0.14);color:#c8b8ff;}
[data-theme="dark"] .callout-key-insight{border-color:#4f3f8a;}
[data-theme="dark"] .callout-key-insight .callout-title{background:rgba(160,140,255,0.14);color:#c8b8ff;}


/* ---------- footer ---------- */
.doc-footer{
  text-align:center;
  color:var(--muted);
  font-size:0.85rem;
  margin-top:48px;
  padding-top:18px;
  border-top:1px solid var(--border);
}

/* ---------- scroll progress bar ---------- */
.scroll-progress-container {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 4px;
  background: rgba(0, 0, 0, 0.05);
  z-index: 100;
}
[data-theme="dark"] .scroll-progress-container {
  background: rgba(255, 255, 255, 0.05);
}
.scroll-progress-bar {
  height: 100%;
  width: 0%;
  background: var(--accent);
  transition: width 0.08s ease-out;
}
</style>
</head>
<body>
<button class="theme-toggle" type="button" aria-label="Toggle dark mode" title="Toggle light / dark mode" onclick="
  (function(){
    var html = document.documentElement;
    var next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    try { localStorage.setItem('md2html-theme', next); } catch (e) {}
  })();
">
  <span class="icon-sun">&#9728;&#65039;</span>
  <span class="icon-moon">&#127769;</span>
</button>
<header class="top-banner">
  <h1>${escapeHtml(title)}</h1>
  <div class="subtitle">Generated reference guide</div>
</header>
<main class="article-wrap">
${bodyHtml}
<div class="doc-footer">Converted from Markdown &middot; ${new Date().toISOString().slice(0, 10)}</div>
</main>
<div class="scroll-progress-container">
  <div class="scroll-progress-bar" id="scroll-bar"></div>
</div>
<script>
  (function() {
    var bar = null;
    var ticking = false;
    function updateProgress() {
      var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      var docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      var scrollPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      if (bar) {
        bar.style.width = scrollPercent + '%';
      }
      ticking = false;
    }
    window.addEventListener('scroll', function() {
      if (!bar) { bar = document.getElementById('scroll-bar'); }
      if (!ticking) {
        window.requestAnimationFrame(updateProgress);
        ticking = true;
      }
    });
  })();
</script>
</body>
</html>
`;
}

// ============================================================================
// 3. FILE-LEVEL CONVERSION HELPERS
// ============================================================================

function convertFile(inputPath, outputPath) {
  const markdownSource = fs.readFileSync(inputPath, "utf8");
  const title = extractTitle(markdownSource, path.basename(inputPath, ".md"));
  const bodyHtml = markdownToBodyHtml(markdownSource);
  const html = pageTemplate({ title, bodyHtml });

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, html, "utf8");
  return { title, outputPath };
}

function findMarkdownFiles(dir, recursive) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (recursive) results.push(...findMarkdownFiles(full, recursive));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
      results.push(full);
    }
  }
  return results;
}

function buildIndex(outDir, converted) {
  const items = converted
    .map(
      (c) =>
        `<li><a href="${path.basename(c.outputPath)}">${escapeHtml(c.title)}</a></li>`,
    )
    .join("\n");

  const bodyHtml = `<h1>Guides</h1><ul>${items}</ul>`;
  const html = pageTemplate({ title: "Guide Index", bodyHtml });
  fs.writeFileSync(path.join(outDir, "index.html"), html, "utf8");
}

// ============================================================================
// 4. CLI
// ============================================================================

function parseArgs(argv) {
  const args = { positional: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dir") args.dir = argv[++i];
    else if (a === "--out") args.out = argv[++i];
    else if (a === "--recursive") args.recursive = true;
    else args.positional.push(a);
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  // If no arguments provided, default to converting all files in the "temp" directory
  if (!args.dir && args.positional.length === 0) {
    let tempDir = path.resolve("temp");
    if (!fs.existsSync(tempDir)) {
      tempDir = path.resolve(__dirname, "temp");
    }
    if (fs.existsSync(tempDir)) {
      args.dir = tempDir;
      args.out = path.join(tempDir, "output");
    }
  }

  if (args.dir) {
    const outDir = args.out || path.join(args.dir, "html");
    const files = findMarkdownFiles(args.dir, !!args.recursive);

    if (files.length === 0) {
      console.error(`No .md files found in ${args.dir}`);
      process.exit(1);
    }

    const converted = files.map((file) => {
      const rel = path.relative(args.dir, file);
      const outPath = path.join(outDir, rel.replace(/\.md$/i, ".html"));
      const result = convertFile(file, outPath);
      console.log(`Converted: ${file} -> ${outPath}`);
      return result;
    });

    console.log(`\nDone. ${converted.length} file(s) converted into ${outDir}`);
    return;
  }

  const [inputArg, outputArg] = args.positional;
  if (!inputArg) {
    console.error(
      "Usage:\n" +
        "  node convert.js <input.md> [output.html]\n" +
        "  node convert.js --dir <folder> --out <outFolder> [--recursive]",
    );
    process.exit(1);
  }

  const inputPath = path.resolve(inputArg);
  const outputPath = path.resolve(
    outputArg || inputPath.replace(/\.md$/i, ".html"),
  );

  const { title } = convertFile(inputPath, outputPath);
  console.log(`Converted "${title}" -> ${outputPath}`);
}

main();
