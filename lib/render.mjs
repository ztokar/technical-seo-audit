// Turns the audit data into a report page (HTML) and a plain text version (Markdown).
// The page is one self-contained file: no network requests, no scripts.

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const CATEGORY_LABEL = {
  performance: "Speed",
  seo: "Search basics",
  accessibility: "Accessibility",
  "best-practices": "Good practice",
};
const CATEGORY_NOTE = {
  performance: "How fast the page loads and responds",
  seo: "Can Google read and list the page",
  accessibility: "Can everyone use the page",
  "best-practices": "Security and browser hygiene",
};
const FIELD_LABEL = {
  LARGEST_CONTENTFUL_PAINT_MS: ["Main content appears", (v) => `${(v / 1000).toFixed(1)} s`],
  INTERACTION_TO_NEXT_PAINT: ["Responds to a tap", (v) => `${v} ms`],
  CUMULATIVE_LAYOUT_SHIFT_SCORE: ["Layout jumps", (v) => (v / 100).toFixed(2)],
  FIRST_CONTENTFUL_PAINT_MS: ["First thing appears", (v) => `${(v / 1000).toFixed(1)} s`],
  EXPERIMENTAL_TIME_TO_FIRST_BYTE: ["Server answers", (v) => `${(v / 1000).toFixed(1)} s`],
};

// Lighthouse names its checks for developers. These are the same checks in plain words;
// Lighthouse's own name stays underneath so a developer can look it up.
const PLAIN = [
  [/render-blocking/, "Files hold up the first view"],
  [/lcp-discovery|prioritize-lcp/, "The main image is not loaded first"],
  [/image-delivery|optimized-images|modern-image|responsive-images/, "Images are heavier than they need to be"],
  [/unused-javascript/, "Scripts load code the page never uses"],
  [/unused-css/, "Styles load rules the page never uses"],
  [/bootup-time|mainthread/, "Scripts keep the page too busy to respond"],
  [/third-part/, "Outside scripts slow the page down"],
  [/cache/, "Returning visitors re-download the same files"],
  [/font-display/, "Text waits for fonts before it shows"],
  [/modern-http/, "Files travel over an older, slower connection type"],
  [/unminified|minif/, "Code files are not compressed"],
  [/legacy-javascript/, "Scripts carry code for browsers nobody uses"],
  [/layout-shift|cls-culprits|unsized-images/, "The layout jumps while loading"],
  [/color-contrast/, "Some text is hard to read against its background"],
  [/link-text/, "Some links do not say where they go"],
  [/image-alt/, "Some images have no description"],
  [/meta-description/, "The page has no search description"],
  [/document-title/, "The page has no title"],
  [/heading-order/, "Headings are out of order"],
  [/crawlable-anchors|is-crawlable|robots/, "Google may not be able to follow or list this page"],
  [/tap-targets|target-size/, "Buttons and links are too small to tap"],
];
const plainTitle = (f) => (PLAIN.find(([re]) => re.test(f.id)) || [])[1] || "";

const band = (score) => (score === null || score === undefined ? "na" : score >= 90 ? "good" : score >= 50 ? "mid" : "poor");
const bandWord = { good: "Good", mid: "Needs work", poor: "Poor", na: "Not measured" };
const metricBand = (s) => (s === null || s === undefined ? "na" : s >= 0.9 ? "good" : s >= 0.5 ? "mid" : "poor");

function verdict(r) {
  const p = r.scores.performance;
  const n = r.findings.length;
  if (p === null || p === undefined) return `${n} things to fix on this page`;
  if (p >= 90) return n ? `Fast page. ${n} small fixes left.` : "Fast and clean. Nothing to fix.";
  if (p >= 50) return `Slower than Google wants. ${n} fixes.`;
  return `Slow enough to lose visitors. ${n} fixes.`;
}

function dial(key, score) {
  const b = band(score);
  const c = 2 * Math.PI * 52;
  const off = score === null || score === undefined ? c : c * (1 - score / 100);
  return `<li class="dial ${b}">
  <div class="ring"><svg viewBox="0 0 120 120" aria-hidden="true">
    <circle class="track" cx="60" cy="60" r="52"/>
    <circle class="arc" cx="60" cy="60" r="52" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}" transform="rotate(-90 60 60)"/>
  </svg><b>${score ?? "n/a"}<span class="sr"> out of 100</span></b></div>
  <div><strong>${esc(CATEGORY_LABEL[key])}</strong><span>${esc(CATEGORY_NOTE[key])}</span><em>${bandWord[b]}</em></div>
</li>`;
}

function findingCard(f, i) {
  const guides = (f.guides || []).map((g) => `<li><code>${esc(g.id)}</code><span>${esc(g.description)}</span></li>`).join("");
  const examples = (f.examples || []).map((e) => `<li>${esc(e)}</li>`).join("");
  const saving = f.savingMs >= 50 ? `<span class="chip save">Could save about ${(f.savingMs / 1000).toFixed(1)} s</span>` : "";
  return `<li class="finding">
  <div class="num" aria-hidden="true">${String(i + 1).padStart(2, "0")}</div>
  <div class="body">
    <p class="tags"><span class="chip">${esc(CATEGORY_LABEL[f.category])}</span>${saving}${f.detail ? `<span class="chip quiet">${esc(f.detail)}</span>` : ""}</p>
    <h3>${esc(plainTitle(f) || f.title)}</h3>
    ${plainTitle(f) ? `<p class="lh-name">Lighthouse calls this: ${esc(f.title)}</p>` : ""}
    <p class="why">${esc(f.description.split(/(?<=\.)\s/)[0] || "")}</p>
    ${examples ? `<details><summary>Where it happens</summary><ul class="examples">${examples}</ul></details>` : ""}
    ${guides ? `<div class="fix"><p class="fix-h">Google’s guide for the fix</p><ul>${guides}</ul></div>` : ""}
  </div>
</li>`;
}

const STYLE = `
:root{--head:#10213b;--head-ink:#10213b;--paper:#f7f8fb;--card:#fdfdff;--on-ink:#f9faff;--on-ink-soft:#dbe3f5;--on-ink-meta:#b9c5dd;--chip:#e9eeff;--note-ink:#5c3600;--shadow:rgba(16,33,59,.35);--serif:"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif;--sans:"Segoe UI",system-ui,-apple-system,"Helvetica Neue",Arial,sans-serif;--mono:ui-monospace,"Cascadia Mono",Consolas,monospace;--ink:#10213b;--soft:#44536b;--line:#dfe4ee;--blue:#2457ff;--blue-ink:#1a3fc4;--good:#0a7a45;--mid:#9a5a00;--poor:#b3261e;--good-bg:#e4f5ec;--mid-bg:#fdf0d9;--poor-bg:#fbe6e4}
@media (prefers-color-scheme:dark){:root{--head:#070d19;--paper:#0b1220;--card:#111a2e;--ink:#e8edf8;--soft:#9fb0cc;--line:#22304d;--blue:#6f8fff;--blue-ink:#9db3ff;--chip:#1a2748;--good:#3ddc97;--mid:#f0b24a;--poor:#ff7a70;--good-bg:#0f2e23;--mid-bg:#33260d;--poor-bg:#3a1614;--note-ink:#f6d9a0;--shadow:rgba(0,0,0,.6);color-scheme:dark}}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
html,body{overflow-x:clip}
body{margin:0;background:var(--paper);color:var(--ink);font:17px/1.6 var(--sans);print-color-adjust:exact;-webkit-print-color-adjust:exact}
.wrap{max-width:1040px;margin:0 auto;padding:0 24px}
h1,h2,h3{font-family:var(--serif);font-weight:600;letter-spacing:-.01em;margin:0;text-wrap:balance}
code{font:600 .82em/1.4 var(--mono)}
header.top{background:var(--head);color:var(--on-ink);padding:56px 0 64px}
header.top h1{font-size:clamp(2rem,5.2vw,3.5rem);line-height:1.08;max-width:19ch}
.site{margin:24px 0 0;font-size:1.05rem;color:var(--on-ink-soft);overflow-wrap:anywhere}
.site b{color:var(--on-ink);font-weight:600}
.meta{margin:8px 0 0;font-size:.9rem;color:var(--on-ink-meta)}
.dials{list-style:none;margin:-36px 0 0;padding:0;display:grid;grid-template-columns:repeat(4,1fr);gap:16px}
.dial{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:20px;display:flex;gap:16px;align-items:center;box-shadow:0 10px 30px -18px var(--shadow)}
.ring{position:relative;width:84px;height:84px;flex:none}.ring svg{width:84px;height:84px;display:block}.ring b{position:absolute;inset:0;display:grid;place-items:center;font:700 1.5rem/1 var(--sans);color:var(--ink);font-variant-numeric:tabular-nums}.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}
.dial .track{fill:none;stroke:var(--line);stroke-width:10}
.dial .arc{fill:none;stroke-width:10;stroke-linecap:round}
.dial strong{display:block;font-size:1.02rem}
.dial div>span{display:block;font-size:.84rem;color:var(--soft);line-height:1.35}
.dial em{display:inline-block;margin-top:8px;font-style:normal;font-weight:700;font-size:.78rem;padding:2px 9px;border-radius:99px}
.good .arc{stroke:var(--good)} .mid .arc{stroke:var(--mid)} .poor .arc{stroke:var(--poor)} .na .arc{stroke:var(--line)}
.good em,.good.pill{background:var(--good-bg);color:var(--good)} .mid em,.mid.pill{background:var(--mid-bg);color:var(--mid)} .poor em,.poor.pill{background:var(--poor-bg);color:var(--poor)} .na em,.na.pill{background:var(--line);color:var(--soft)}
section{padding:56px 0 0}
section>h2{font-size:clamp(1.5rem,3.2vw,2.1rem);margin-bottom:6px}
.lede{color:var(--soft);margin:0 0 24px;max-width:62ch}
.findings{list-style:none;margin:0;padding:0;display:grid;gap:14px}
.finding{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:24px;display:grid;grid-template-columns:56px 1fr;gap:8px 18px}
.num{font:600 2rem/1 var(--serif);color:var(--blue);font-variant-numeric:tabular-nums}
.finding h3{font-size:1.25rem;line-height:1.3;margin:8px 0 6px}
.tags{margin:0;display:flex;flex-wrap:wrap;gap:6px}
.chip{font-size:.76rem;font-weight:700;padding:3px 10px;border-radius:99px;background:var(--chip);color:var(--blue-ink)}
.chip.save{background:var(--good-bg);color:var(--good)} .chip.quiet{background:var(--paper);color:var(--soft);border:1px solid var(--line)}
.why{margin:0;color:var(--soft)}
.lh-name{margin:0 0 4px;font-size:.84rem;color:var(--soft)}
details{margin-top:10px;font-size:.9rem} summary{cursor:pointer;color:var(--blue-ink);font-weight:600;padding:6px 0}
.examples{margin:8px 0 0;padding-left:20px;color:var(--soft);overflow-wrap:anywhere;font:500 .84rem/1.5 var(--mono)}
.fix{margin-top:16px;background:var(--paper);border:1px solid var(--line);border-radius:10px;padding:12px 16px}
.fix-h{margin:0 0 4px;font-size:.84rem;font-weight:700;color:var(--blue-ink)}
.fix ul{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.fix li{display:grid;gap:2px} .fix code{color:var(--ink)} .fix span{font-size:.9rem;color:var(--soft)}
.more{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:12px 24px;margin-top:16px}.more ul{margin:4px 0 12px;padding-left:20px;color:var(--soft)}.more li{margin:4px 0}
.two{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.panel{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:24px}
.panel h3{font-size:1.15rem;margin-bottom:12px}
table{width:100%;border-collapse:collapse;font-size:.95rem;font-variant-numeric:tabular-nums}
th,td{text-align:left;padding:12px 0;border-top:1px solid var(--line);vertical-align:top}
tr:first-child th,tr:first-child td{border-top:0}
th{font-weight:600} th small{display:block;font-weight:400;color:var(--soft);font-size:.8rem;line-height:1.35}
td.v{text-align:right;white-space:nowrap;font-weight:700;font-variant-numeric:tabular-nums}
.pill{display:inline-block;font-size:.72rem;font-weight:700;padding:2px 8px;border-radius:99px;margin-left:8px}
.bars{list-style:none;margin:0;padding:0;display:grid;gap:12px}
.bars li{display:grid;grid-template-columns:1fr auto;gap:4px 12px;font-size:.95rem}
.bars i{grid-column:1/-1;height:8px;border-radius:99px;background:var(--line);overflow:hidden;display:block}
.bars i b{display:block;height:100%;background:var(--blue);border-radius:99px}
.bars span{font-weight:700;font-variant-numeric:tabular-nums}
.note{background:var(--mid-bg);color:var(--note-ink);border-radius:12px;padding:16px 20px;font-size:.92rem;margin-top:16px}
.how{color:var(--soft);font-size:.92rem;max-width:70ch}
footer{margin-top:64px;background:var(--head);color:var(--on-ink-soft);padding:40px 0}
footer .wrap{display:flex;flex-wrap:wrap;gap:16px 32px;align-items:center;justify-content:space-between}
footer p{margin:0;max-width:52ch} footer strong{color:var(--on-ink)}
footer a{display:inline-flex;align-items:center;min-height:48px;padding:0 24px;border-radius:8px;background:var(--on-ink);color:var(--head-ink);font-weight:700;text-decoration:none}
footer a:hover{background:var(--chip)} footer a:active{transform:translateY(1px)}
a:focus-visible,summary:focus-visible{outline:3px solid var(--blue);outline-offset:3px}
@media (max-width:860px){.dials{grid-template-columns:1fr 1fr}.two{grid-template-columns:1fr}}
@media (max-width:520px){body{font-size:16px}.wrap{padding:0 16px}.dials{grid-template-columns:1fr}.finding{grid-template-columns:1fr;padding:20px}.num{font-size:1.5rem}header.top{padding:40px 0 56px}}
`;

export async function renderHtml(r) {
  const host = new URL(r.url).hostname;
  const date = new Date(r.measuredAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const where = r.source === "pagespeed" ? "Google’s PageSpeed servers" : "Lighthouse on this computer";
  const maxKb = Math.max(1, ...r.thirdParties.map((t) => t.kb));
  const metrics = r.metrics.map((m) => `<tr><th>${esc(m.label)}<small>${esc(m.note)}</small></th><td class="v">${esc(m.value)}<span class="pill ${metricBand(m.score)}">${bandWord[metricBand(m.score)]}</span></td></tr>`).join("");
  const field = r.realVisitors
    ? `<div class="panel"><h3>What real visitors got (last 28 days)</h3><table>${r.realVisitors.metrics.filter((m) => FIELD_LABEL[m.id]).map((m) => {
        const [label, fmt] = FIELD_LABEL[m.id];
        const b = m.category === "FAST" ? "good" : m.category === "AVERAGE" ? "mid" : "poor";
        return `<tr><th>${label}</th><td class="v">${fmt(m.percentile)}<span class="pill ${b}">${bandWord[b]}</span></td></tr>`;
      }).join("")}</table></div>`
    : "";
  const third = r.thirdParties.length
    ? `<div class="panel"><h3>Outside scripts on this page</h3><ul class="bars">${r.thirdParties.map((t) => `<li>${esc(t.name)}<span>${t.kb} KB</span><i><b style="width:${Math.max(4, Math.round((t.kb / maxKb) * 100))}%"></b></i></li>`).join("")}</ul></div>`
    : "";
  const main = r.findings.slice(0, 8);
  const rest = r.findings.slice(8);
  const findings = r.findings.length
    ? `<ol class="findings">${main.map(findingCard).join("")}</ol>${rest.length ? `<details class="more"><summary>${rest.length} smaller items</summary><ul>${rest.map((f) => `<li><strong>${esc(CATEGORY_LABEL[f.category])}:</strong> ${esc(plainTitle(f) || f.title)}${f.detail ? ` (${esc(f.detail)})` : ""}</li>`).join("")}</ul></details>` : ""}`
    : `<div class="panel"><p class="why">Nothing failed. This page passed every check.</p></div>`;
  const warn = r.warnings.length ? `<p class="note"><strong>Read the speed score with care.</strong> ${esc(r.warnings[0])}</p>` : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Technical SEO Audit: ${esc(host)}</title>
<meta name="robots" content="noindex">
<meta name="description" content="Technical SEO audit of ${esc(host)}: speed, search basics and accessibility, with the fix for each problem from Google’s own guides.">
<style>${STYLE}</style>
</head>
<body>
<header class="top"><div class="wrap">
  <h1>${esc(verdict(r))}</h1>
  <p class="site"><b>${esc(r.url)}</b></p>
  <p class="meta">Technical SEO audit. Tested as a ${r.strategy === "mobile" ? "phone" : "desktop"} visitor on ${esc(date)}. Measured ${r.spread.length} time${r.spread.length === 1 ? "" : "s"}, middle result shown.</p>
</div></header>
<main class="wrap">
  <ul class="dials">${["performance", "seo", "accessibility", "best-practices"].map((k) => dial(k, r.scores[k])).join("")}</ul>

  <section>
    <h2>What to fix, in order</h2>
    <p class="lede">Each problem was found by Google Lighthouse. Under each one is the matching guide from Google’s Modern Web Guidance, so the fix comes from the same people who run the test.</p>
    ${findings}
  </section>

  <section>
    <h2>The numbers behind the score</h2>
    <p class="lede">Lab numbers from this test${r.realVisitors ? ", next to what real visitors experienced" : ""}.</p>
    <div class="two">
      <div class="panel"><h3>This test</h3><table>${metrics}</table></div>
      ${field || third}
    </div>
    ${field && third ? `<div class="two" style="margin-top:16px">${third}<div class="panel"><h3>Page weight</h3><p class="why">The whole page is <strong>${r.totalKb.toLocaleString("en-US")} KB</strong>. Lighter pages load faster on phones and slow connections.</p></div></div>` : ""}
    ${warn}
  </section>

  <section>
    <h2>How this was measured</h2>
    <p class="how">Measured with Google Lighthouse ${esc(r.lighthouseVersion)} from ${where}. Speed scores on separate runs were ${r.spread.join(", ")}. Fix guidance comes from Google’s Modern Web Guidance${r.guidanceVersion ? ` ${esc(r.guidanceVersion)}` : ""}. Both tools are fetched fresh on every run, so this audit follows Google’s own updates. A lab test is one visit on one connection. It does not replace Search Console or real-visitor data.</p>
  </section>
</main>
<footer><div class="wrap">
  <p><strong>Want these fixed for you?</strong> This audit is free and open source, built by Zechariah Tokar, an independent SEO consultant.</p>
  <a href="https://israelseofreelancer.com/">Work with Zechariah</a>
</div></footer>
</body>
</html>`;
}

export function renderMarkdown(r) {
  const lines = [
    `# Technical SEO Audit: ${r.url}`,
    "",
    `Tested as a ${r.strategy === "mobile" ? "phone" : "desktop"} visitor on ${r.measuredAt.slice(0, 10)} with Lighthouse ${r.lighthouseVersion} (${r.source === "pagespeed" ? "Google PageSpeed" : "local"}). Speed runs: ${r.spread.join(", ")}.`,
    "",
    "| Area | Score |", "|---|---:|",
    ...Object.entries(r.scores).map(([k, v]) => `| ${CATEGORY_LABEL[k]} | ${v ?? "n/a"} |`),
    "",
    "| Measure | Result |", "|---|---:|",
    ...r.metrics.map((m) => `| ${m.label} | ${m.value} |`),
    "",
    "## What to fix, in order",
    "",
    ...r.findings.flatMap((f, i) => [
      `### ${i + 1}. ${plainTitle(f) ? `${plainTitle(f)} (${f.title})` : f.title}`,
      `${CATEGORY_LABEL[f.category]}${f.detail ? ` · ${f.detail}` : ""}${f.savingMs >= 50 ? ` · could save about ${(f.savingMs / 1000).toFixed(1)} s` : ""}`,
      "",
      f.description,
      ...(f.guides?.length ? ["", "Google’s guide for the fix:", ...f.guides.map((g) => `- \`${g.id}\`: ${g.description}`)] : []),
      "",
    ]),
    ...(r.thirdParties.length ? ["## Outside scripts", "", ...r.thirdParties.map((t) => `- ${t.name}: ${t.kb} KB`), ""] : []),
    ...(r.warnings.length ? [`> ${r.warnings[0]}`, ""] : []),
  ];
  return lines.join("\n");
}
