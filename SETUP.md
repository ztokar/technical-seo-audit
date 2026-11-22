# Setup

## What you need

- **Node.js 18 or newer.** Check with `node --version`. Install from https://nodejs.org if it is missing.
- **Google Chrome.** Lighthouse drives Chrome to load the page.
- **Git**, to download this repository.

Nothing else is installed. The two Google tools are fetched by `npx` each time the audit runs.

## Install

```
git clone https://github.com/ztokar/technical-seo-audit
cd technical-seo-audit
node audit.mjs https://example.com
```

The first run downloads Lighthouse, so it is slower than later runs. When it finishes it prints the path to `report.html`. Open that file in a browser.

## Use it as a Claude Code skill

Copy the skill folder into your Claude Code skills folder, then start a new session:

- macOS and Linux: `cp -r skills/technical-seo-audit ~/.claude/skills/`
- Windows (PowerShell): `Copy-Item -Recurse skills\technical-seo-audit $HOME\.claude\skills\`

Then ask: "Run a technical SEO audit on https://your-site.com". The skill tells Claude to run `audit.mjs` from this folder, read the result, fetch the full Google guide for each top problem, and explain the fixes in plain words. Keep this repository on your computer; the skill runs the script from it.

## Options

| Option | What it does |
|---|---|
| `--desktop` | Test as a desktop visitor. The default is a phone, which is what Google uses. |
| `--runs 5` | Measure more times. The middle result is reported. |
| `--out ./folder` | Save reports somewhere else. The default is `./audits`. |
| `--local` | Measure on this computer even when a PageSpeed key is set. |
| `--no-guides` | Skip the Modern Web Guidance lookup. |

## Optional: a trustworthy speed score

A speed score measured on your own computer depends on that computer. On a slow or busy laptop the score reads lower than a real visitor would see. The causes it names are still right.

For a score measured on Google's servers, plus 28 days of real-visitor data where Google has it:

1. Create a free API key for the PageSpeed Insights API: https://developers.google.com/speed/docs/insights/v5/get-started
2. Set it before running the audit:
   - macOS and Linux: `export PAGESPEED_API_KEY=your-key`
   - Windows (PowerShell): `$env:PAGESPEED_API_KEY = "your-key"`

Keep the key out of this repository. Do not commit it, and do not paste it into an issue.

## Troubleshooting

| Problem | Fix |
|---|---|
| "No measurement finished" | Check the address opens in Chrome. Some sites block automated tests. |
| "Could not find npx next to Node" | Reinstall Node.js from nodejs.org. |
| Speed score much lower than expected | The computer is slow or busy. Close other programs, or set a PageSpeed key. |
| Scores differ between runs | Normal. Use `--runs 5` and read the range in the report. |
| A guide does not fit the problem | Search for a better one: `npx -y modern-web-guidance@latest search "<plain words>"`. |
