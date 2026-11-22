---
name: technical-seo-audit
description: Audit any web page's technical SEO health with Google's own tools. Runs Google Lighthouse (speed, search basics, accessibility), then pulls the matching fix guide from Google's Modern Web Guidance for each problem, and writes a plain-language report. Use when someone asks to audit a site's technicals, check page speed or Core Web Vitals, find why a page is slow, run a technical SEO check, or "see what issues this site has".
---

# Technical SEO Audit

Lighthouse finds the problems. Modern Web Guidance names the fix. Both are Google's, both are fetched at their latest version on every run, so this skill never goes stale and holds no copy of either.

## What it covers, and what it does not

Covers one page per run: load speed and Core Web Vitals, the search basics Lighthouse checks (title, description, crawlable links, indexability), accessibility, and outside scripts.

Does not cover: keywords, content quality, internal linking, backlinks, structured data depth, or a crawl of the whole site. Say so if asked. Do not present a clean report as "the SEO is fine".

## Run it

From the repository folder:

```
node audit.mjs <url>
node audit.mjs <url> --desktop
node audit.mjs <url> --runs 5 --out ./audits
```

It prints the path of `report.html`. Beside it are `report.json` (the data) and `report.md`.

Audit the home page and one page that earns money (a service, product or location page). They often fail differently.

## Reading the result

1. Open `report.json`. Work from `findings`, which is already in priority order: speed first, then search basics, then accessibility, largest estimated saving first.
2. For each of the top findings, fetch the full guide named in `guides`:
   `npx -y modern-web-guidance@latest retrieve "<id>,<id>"`
   Read it before recommending anything. If a guide does not fit the problem, search for a better one in plain words: `npx -y modern-web-guidance@latest search "<2 to 5 word task>"`. Never invent a guide id.
3. Look at `thirdParties` before anything else on a slow page. Analytics, ad tags, chat widgets and pixels are the most common cause of a poor phone score, and the cheapest fix is often to remove a tag nobody uses any more.
4. Check `source` and `warnings`. If `source` is `local` and a warning mentions a slow CPU, the speed score is pessimistic. The named causes are still reliable; the score is not. Say this plainly, and recommend a PageSpeed key (see SETUP.md) for a trustworthy number.
5. `spread` shows the speed score of each run. If the runs differ by more than 10 points, report the range, not a single number.

## Writing it up for the site owner

- Lead with what a visitor experiences: "the main photo takes 8.6 seconds to appear on a phone", not "LCP is poor".
- Three to five fixes, most valuable first. For each: what is wrong, why it matters, the fix, and how hard it is.
- Name the evidence for each fix (the audit and the guide). No fix without a finding behind it.
- Never promise a ranking change. Speed is one signal among many. Promise only what the test can show: a faster page.
- After any fix ships, run the audit again and report before and after from the same source.

## Rules

- Read-only. This skill never changes a website. Fixes are a separate step the owner approves.
- Only audit public pages, or pages the user is allowed to test.
- Findings are suggestions. Apply only what a measurement justifies.
