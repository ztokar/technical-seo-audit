// Rebuilds the illustrative report from example-data.json. The business is fictional.
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderHtml, renderMarkdown } from "../lib/render.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(await readFile(path.join(here, "example-data.json"), "utf8"));
await writeFile(path.join(here, "example-report.html"), await renderHtml(data));
await writeFile(path.join(here, "example-report.md"), `> Illustrative example. Harbor Street Dental is a fictional business and these are not client results.\n\n${renderMarkdown(data)}`);
console.log("Example report rebuilt.");
