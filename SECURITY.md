# Security

This workflow reads public web pages and writes report files to your computer. It has no server, stores no credentials, and changes no website.

- Audit reports can reveal details about a site. They are saved under `audits/`, which Git ignores. Do not attach a client report to a public issue.
- The optional `PAGESPEED_API_KEY` belongs in your shell environment, never in this repository.
- `npx` downloads `lighthouse` and `modern-web-guidance` from the npm registry at their latest version each run. If you need fixed versions, pin them in `audit.mjs` and review upgrades yourself.

To report a security problem, use GitHub's private vulnerability reporting on this repository. Please do not open a public issue containing a key or private data.
