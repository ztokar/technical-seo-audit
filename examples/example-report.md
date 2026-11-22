> Illustrative example. Harbor Street Dental is a fictional business and these are not client results.

# Technical SEO Audit: https://www.harborstreetdental.example/

Tested as a phone visitor on 2026-11-22 with Lighthouse 13.6.0 (Google PageSpeed). Speed runs: 58, 62, 64.

| Area | Score |
|---|---:|
| Speed | 62 |
| Accessibility | 96 |
| Good practice | 77 |
| Search basics | 100 |

| Measure | Result |
|---|---:|
| Main content appears | 8.6 s |
| Page is busy and cannot respond | 170 ms |
| Layout jumps while loading | 0 |
| First thing appears | 3.3 s |
| Page looks complete | 6.1 s |

## What to fix, in order

### 1. Outside scripts slow the page down (3rd parties)
Speed · 3 outside scripts, 458 KiB · could save about 2.9 s

3rd party code can significantly impact load performance. Reduce and defer loading of 3rd party code to prioritize your page's content.

Google’s guide for the fix:
- `optimize-script-priority`: Optimize the loading priority of scripts so critical code runs first and non-critical code does not delay the page.

### 2. The main image is not loaded first (LCP request discovery)
Speed · fetchpriority=high not applied · could save about 0.6 s

Optimize LCP by making the LCP image discoverable from the HTML immediately, and avoiding lazy-loading.

Google’s guide for the fix:
- `optimize-image-priority`: Optimize the loading priority of Largest Contentful Paint (LCP) candidate images and deprioritize non-critical images to reduce critical resource load delays.

### 3. Scripts load code the page never uses (Reduce unused JavaScript)
Speed · Est savings of 205 KiB · could save about 0.5 s

Reduce unused JavaScript and defer loading scripts until they are required to decrease bytes consumed by network activity.

Google’s guide for the fix:
- `identify-heavy-scripts`: Identify the scripts that cost the most loading and main-thread time so they can be removed, deferred or replaced.

### 4. Images are heavier than they need to be (Improve image delivery)
Speed · Est savings of 66 KiB · could save about 0.3 s

Reducing the download time of images can improve the perceived load time of the page and LCP.

Google’s guide for the fix:
- `deliver-optimized-decorative-images`: Deliver optimized images in modern formats and at several pixel densities so the browser can pick the best file for the device.

### 5. Text waits for fonts before it shows (Font display)
Speed · 2 fonts in TTF format · could save about 0.2 s

Consider setting font-display to swap or optional to ensure text is consistently visible.

Google’s guide for the fix:
- `visually-stable-font-fallbacks`: Load web fonts without layout shift by matching the fallback font's metrics to the web font.

### 6. Returning visitors re-download the same files (Use efficient cache lifetimes)
Speed · Est savings of 118 KiB

A long cache lifetime can speed up repeat visits to your page.

Google’s guide for the fix:
- `performance`: Actionable guidelines for optimizing modern web applications. Use this guide when auditing performance and optimizing Core Web Vitals (LCP, INP, CLS).

### 7. Some text is hard to read against its background (Background and foreground colors do not have a sufficient contrast ratio.)
Accessibility

Low-contrast text is difficult or impossible for many users to read.

Google’s guide for the fix:
- `contrast-color`: Pick a text color that stays readable against any background color.

## Outside scripts

- Google Analytics: 198 KB
- Google Ads: 157 KB
- Facebook: 103 KB
