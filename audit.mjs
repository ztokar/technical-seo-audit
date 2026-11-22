#!/usr/bin/env node
// Technical SEO Audit: Google Lighthouse finds the problems, Google's Modern Web
// Guidance names the fix. No dependencies to install. Node 18 or newer.
//
//   node audit.mjs https://example.com
//   node audit.mjs https://example.com --desktop --runs 5 --out ./audits
//
// Both Google tools are fetched at their latest version on every run, so the audit
// follows Google's own updates with nothing to maintain here.

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderHtml, renderMarkdown } from "./lib/render.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i > -1 && args[i + 1] ? args[i + 1] : fallback;
};
const target = args.find((a) => /^https?:\/\//i.test(a));

if (!target || flag("help")) {
  console.log(`Technical SEO Audit

Usage:  node audit.mjs <url> [options]

  --desktop        Test as a desktop visitor (default is a phone)
  --runs <n>       How many times to measure (default 3, the middle run is used)
  --out <folder>   Where to save the report (default ./audits)
  --local          Measure on this computer even if a PageSpeed key is set
  --no-guides      Skip the Modern Web Guidance lookup

Optional: set PAGESPEED_API_KEY to measure from Google's servers and to include
real-visitor data. Without it the audit measures with Lighthouse on this computer.`);
  process.exit(target ? 0 : 1);
}

const strategy = flag("desktop") ? "desktop" : "mobile";
const runs = Math.max(1, Math.min(9, Number(opt("runs", 3)) || 3));
const outRoot = path.resolve(opt("out", "audits"));
const apiKey = flag("local") ? "" : process.env.PAGESPEED_API_KEY || "";
const CATEGORIES = ["performance", "accessibility", "best-practices", "seo"];
const log = (m) => console.error(m);

if (/["'`$\s]/.test(target)) {
  console.error("That address contains characters this tool does not accept.");
  process.exit(1);
}
// Windows ships npx as a .cmd file, which Node can only start through a shell. To keep the
// address out of any shell, run npm's own npx script with this same Node instead.
const npxCliPath = path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npx-cli.js");
const npxCli = process.platform === "win32" && existsSync(npxCliPath) ? npxCliPath : "";
if (process.platform === "win32" && !npxCli) {
  console.error("Could not find npx next to Node. Reinstall Node.js from nodejs.org and try again.");
  process.exit(1);
}
function run(cmd, cmdArgs, timeoutMs = 240000) {
  return new Promise((resolve) => {
    const clean = cmdArgs.map((a) => a.replace(/^"|"$/g, ""));
    const child = npxCli
      ? spawn(process.execPath, [npxCli, ...clean], { windowsHide: true })
      : spawn(cmd, clean, { windowsHide: true });
    let out = "";
    let err = "";
    const timer = setTimeout(() => child.kill(), timeoutMs);
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code, out, err });
    });
    child.on("error", (e) => {
      clearTimeout(timer);
      resolve({ code: 1, out, err: String(e) });
    });
  });
}

async function measureWithPageSpeed() {
  const q = new URLSearchParams({ url: target, strategy, key: apiKey });
  for (const c of CATEGORIES) q.append("category", c);
  const res = await fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${q}`);
  const body = await res.json();
  if (!res.ok) throw new Error(body?.error?.message || `PageSpeed answered ${res.status}`);
  return { lhr: body.lighthouseResult, field: body.loadingExperience, origin: body.originLoadingExperience };
}

async function measureLocally(i) {
  const file = path.join(tmpdir(), `tsa-${process.pid}-${i}.json`);
  const a = ["-y", "lighthouse@latest", target, "--quiet", "--output=json", `--output-path=${file}`,
    `--only-categories=${CATEGORIES.join(",")}`, "--chrome-flags=--headless=new"];
  if (strategy === "desktop") a.push("--preset=desktop");
  const r = await run("npx", a);
  try {
    const lhr = JSON.parse(await readFile(file, "utf8"));
    await rm(file, { force: true });
    if (lhr.runtimeError?.code && lhr.runtimeError.code !== "NO_ERROR") throw new Error(lhr.runtimeError.message);
    return { lhr };
  } catch (e) {
    if (e.message && !/JSON|ENOENT/.test(e.message)) throw e;
    throw new Error(`Lighthouse did not finish. ${r.err.trim().split("\n").pop() || ""}`.trim());
  }
}

async function measure() {
  const results = [];
  let source = apiKey ? "pagespeed" : "local";
  for (let i = 1; i <= runs; i++) {
    log(`Measuring ${i} of ${runs} (${source === "pagespeed" ? "Google PageSpeed" : "Lighthouse on this computer"})...`);
    try {
      results.push(source === "pagespeed" ? await measureWithPageSpeed() : await measureLocally(i));
    } catch (e) {
      if (source === "pagespeed" && results.length === 0) {
        log(`PageSpeed was not available (${e.message}). Measuring on this computer instead.`);
        source = "local";
        i--;
        continue;
      }
      log(`Run ${i} failed: ${e.message}`);
    }
  }
  if (!results.length) throw new Error("No measurement finished. Check the address and that Chrome is installed.");
  const perf = (r) => r.lhr.categories.performance?.score ?? 0;
  const sorted = [...results].sort((a, b) => perf(a) - perf(b));
  const median = sorted[Math.floor((sorted.length - 1) / 2)];
  return { median, source, spread: results.map((r) => Math.round(perf(r) * 100)) };
}

const METRICS = [
  ["largest-contentful-paint", "Main content appears", "Largest Contentful Paint. Google's line for good is 2.5 seconds."],
  ["total-blocking-time", "Page is busy and cannot respond", "Total Blocking Time. Under 200 ms is good."],
  ["cumulative-layout-shift", "Layout jumps while loading", "Cumulative Layout Shift. Under 0.1 is good."],
  ["first-contentful-paint", "First thing appears", "First Contentful Paint. Under 1.8 seconds is good."],
  ["speed-index", "Page looks complete", "Speed Index. Under 3.4 seconds is good."],
];

function summarise({ median, source, spread }) {
  const lhr = median.lhr;
  const scores = {};
  for (const c of CATEGORIES) {
    const cat = lhr.categories[c];
    if (cat) scores[c] = cat.score === null ? null : Math.round(cat.score * 100);
  }
  const metrics = METRICS.filter(([id]) => lhr.audits[id]).map(([id, label, note]) => ({
    id, label, note, value: lhr.audits[id].displayValue || "", score: lhr.audits[id].score,
  }));

  const findings = [];
  for (const c of CATEGORIES) {
    const cat = lhr.categories[c];
    if (!cat) continue;
    for (const ref of cat.auditRefs) {
      if (ref.group === "metrics" || ref.group === "hidden") continue;
      const a = lhr.audits[ref.id];
      if (!a || a.score === null || a.score >= 0.9) continue;
      if (["informative", "notApplicable", "manual", "error"].includes(a.scoreDisplayMode)) continue;
      const s = a.metricSavings || {};
      const savingMs = Math.max(s.LCP || 0, s.FCP || 0) + (s.TBT || 0) + (s.INP || 0);
      const items = (Array.isArray(a.details?.items) ? a.details.items : []).slice(0, 3).map((it) => {
        const u = it.url || it.node?.snippet || it.source?.url || it.entity || "";
        return typeof u === "string" ? u.slice(0, 160) : "";
      }).filter(Boolean);
      findings.push({
        id: a.id, category: c, title: a.title,
        description: (a.description || "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").trim(),
        detail: /^Est savings of [\d,.]+\s*m?s$/i.test(a.displayValue || "") ? "" : a.displayValue || "", score: a.score, savingMs: Math.round(savingMs), examples: items,
      });
    }
  }
  // Speed items with no saving and no measured detail are background notes, not fixes.
  for (let i = findings.length - 1; i >= 0; i--) {
    const f = findings[i];
    if (f.category === "performance" && !f.savingMs && !f.detail) findings.splice(i, 1);
  }
  const weight = { performance: 0, seo: 1, accessibility: 2, "best-practices": 3 };
  findings.sort((a, b) => weight[a.category] - weight[b.category] || b.savingMs - a.savingMs || a.score - b.score);

  // Outside companies' scripts (analytics, ads, chat widgets) are often the heaviest thing on a page.
  const tp = lhr.audits["third-parties-insight"] || lhr.audits["third-party-summary"];
  const thirdParties = (Array.isArray(tp?.details?.items) ? tp.details.items : [])
    .map((it) => ({
      name: typeof it.entity === "string" ? it.entity : it.entity?.text || "Unknown",
      kb: Math.round((it.transferSize || 0) / 1024),
      busyMs: Math.round(it.mainThreadTime || it.blockingTime || 0),
    }))
    .filter((t) => t.kb > 0)
    .sort((a, b) => b.kb - a.kb)
    .slice(0, 6);

  const fieldMetrics = median.field?.metrics
    ? Object.entries(median.field.metrics).map(([k, v]) => ({ id: k, percentile: v.percentile, category: v.category }))
    : [];

  return {
    url: lhr.finalDisplayedUrl || target, strategy, source, spread,
    measuredAt: new Date().toISOString(), lighthouseVersion: lhr.lighthouseVersion,
    scores, metrics, findings, thirdParties,
    totalKb: Math.round((lhr.audits["total-byte-weight"]?.numericValue || 0) / 1024),
    realVisitors: fieldMetrics.length ? { overall: median.field.overall_category, metrics: fieldMetrics } : null,
    warnings: (lhr.runWarnings || []).map((w) => w.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")),
  };
}

// Each kind of problem is described in plain words, and Google's Modern Web Guidance is
// searched live for the guide that covers it. Only the wording lives here, never a guide
// name, so new or renamed guides are picked up as Google publishes them.
const TOPICS = [
  [/lcp-discovery|prioritize-lcp|largest-contentful|lcp-lazy/, "prioritize hero image loading"],
  [/image-delivery|optimized-images|modern-image|responsive-images|image-size/, "serve optimized responsive images"],
  [/render-blocking|preconnect|preload|network-dependency/, "preload critical resources"],
  [/unused-javascript|bootup-time|legacy-javascript|third-part|unminified-javascript|duplicated-javascript/, "reduce unused javascript heavy scripts"],
  [/mainthread|total-blocking|long-tasks|interactive|max-potential-fid|forced-reflow|dom-size/, "break up long tasks main thread"],
  [/font-display|font-size/, "font loading without layout shift"],
  [/offscreen|lazy/, "lazy load offscreen images and video"],
  [/layout-shift|cls-culprits|unsized-images/, "layout shift stable images dimensions"],
  [/color-contrast/, "color contrast accessible text"],
];
const BROAD = { performance: "performance", accessibility: "accessibility" };

async function searchGuides(query) {
  const r = await run("npx", ["-y", "modern-web-guidance@latest", "search", query], 90000);
  try {
    return JSON.parse(r.out.slice(r.out.indexOf("["), r.out.lastIndexOf("]") + 1));
  } catch {
    return [];
  }
}

async function attachGuides(report) {
  const queryFor = (f) => (TOPICS.find(([re]) => re.test(f.id)) || [])[1] || BROAD[f.category] || "";
  const queries = [...new Set(report.findings.map(queryFor).filter(Boolean))];
  const answers = new Map();
  await Promise.all(queries.map(async (q) => answers.set(q, await searchGuides(q))));
  for (const f of report.findings) {
    const q = queryFor(f);
    const hits = answers.get(q) || [];
    const broad = BROAD[f.category];
    const specific = hits.filter((h) => h.id !== broad);
    // A specific topic keeps its best match; a general one keeps only the broad guide.
    const pick = q === broad ? hits.filter((h) => h.id === broad).slice(0, 1) : specific.slice(0, 1);
    f.guides = pick.map((h) => ({ id: h.id, description: h.description }));
  }
  const v = await run("npx", ["-y", "modern-web-guidance@latest", "--version"], 60000);
  report.guidanceVersion = v.out.trim().split("\n").pop() || "";
}

try {
  const measured = await measure();
  const report = summarise(measured);
  if (!flag("no-guides") && report.findings.length) {
    log("Matching each problem to Google's Modern Web Guidance...");
    await attachGuides(report);
  }
  const host = new URL(report.url).hostname.replace(/^www\./, "");
  const dir = path.join(outRoot, `${host}-${report.measuredAt.slice(0, 10)}-${strategy}`);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "report.json"), JSON.stringify(report, null, 2));
  await writeFile(path.join(dir, "report.md"), renderMarkdown(report));
  await writeFile(path.join(dir, "report.html"), await renderHtml(report, here));
  log(`\nDone. Speed ${report.scores.performance ?? "n/a"}, SEO ${report.scores.seo ?? "n/a"}, ${report.findings.length} things to fix.`);
  console.log(path.join(dir, "report.html"));
} catch (e) {
  console.error(`\nThe audit could not finish: ${e.message}`);
  process.exit(1);
}
