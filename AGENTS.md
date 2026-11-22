# Instructions for coding agents

This repository audits one web page with Google Lighthouse and matches each problem to Google Chrome's Modern Web Guidance. Read `skills/technical-seo-audit/SKILL.md` for how to run it and how to read the result. Read `SETUP.md` before installing anything.

Rules:

- Read-only. Never change the user's website as part of an audit. Propose fixes and wait for approval.
- Do not vendor or copy Lighthouse or Modern Web Guidance into this repository. Both are fetched at `@latest` on every run on purpose.
- Do not hard-code Modern Web Guidance guide ids. Guides are found by a live search so the audit follows Google's updates.
- Never commit reports, API keys or anything under `audits/`.
- Report measured numbers only. If a speed run was local and Lighthouse warned about a slow CPU, say the score is pessimistic.
- Never promise a ranking change from a technical fix.
