# Repository and report presentation

Audience: business owners and marketing leads who want to know what is technically wrong with their site, and consultants who audit sites for them. Job: show the problem and its fix in plain words, make setup approachable, and offer a real contact path.

Visual direction: editorial evidence, shared with the Google Ads Audit repository. Paper #f7f8fb, ink #10213b, blue #2457ff. Score colours follow Lighthouse's own three bands: good #0a7a45, needs work #9a5a00, poor #b3261e. Serif headings (Iowan Old Style, Palatino, Georgia), system sans body. No web fonts and no scripts: the report is one self-contained file.

The report page (`lib/render.mjs`): a dark header with a one-line verdict, four score dials, then the fixes in order. Each fix shows a plain-language name first and Lighthouse's own name beneath it. Colours and fonts are tokens on `:root`. Checked with a pixel contrast test at phone and desktop widths.

Every example number is explicitly fictional. No client names or screenshots, no Google or Anthropic logos, no ranking promises. The cover is built from `assets/cover.html`; the workflow diagram is original SVG.
