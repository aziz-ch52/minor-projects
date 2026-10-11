# DataLens — Turn Raw Data Into Clear Decisions

An interactive analytics dashboard built with **HTML5, CSS3 and vanilla JavaScript**. It runs entirely in the browser: no backend, no build step, no data leaves your device.

## Features
- Responsive SaaS-style UI with dark/light theme (saved in localStorage)
- Dashboard with sidebar views, KPI cards + sparklines, 4 Chart.js charts, filters (date range, category, search), refresh/reset
- Data Explorer: CSV upload (click or drag-and-drop), types, missing values, duplicates, search, sort, column selection, numeric summary
- Rule-based insights (period comparison, IQR outliers, rankings) — not AI
- Export filtered records (CSV) and a text summary report

## Tech
HTML5 · 
CSS3 · 
JavaScript (ES6+) 
· [Chart.js 4.4.1](https://www.chartjs.org/) 
· [Lucide](https://lucide.dev/) 
· Inter (Google Fonts) — all via CDN.

## Structure
```
datalens/
├── index.html
├── style.css
├── script.js
├── favicon.svg
└── README.md
```

## Run locally
Open `index.html` in a browser, or in VS Code install **Live Server**, right-click `index.html` → *Open with Live Server*. An internet connection is needed for the CDN libraries and font.

## How CSV upload works
The File API reads the file as text in your browser; a small state-machine parser handles quoted fields, commas and escaped quotes. Values are rendered with `textContent` (never `innerHTML`), and exported cells starting with `=`, `+`, `-`, `@` are prefixed to prevent spreadsheet-formula injection. Only the first 100 rows are displayed; files over 25 MB are rejected.

## Known limitations
- Dashboard charts/KPIs use the synthetic e-commerce dataset; imported CSVs are analysed in the Data Explorer only.
- CSV only (no Excel). Parsing is on the main thread, so very large files may feel slow.
- Insights are simple statistical rules; explanations are hypotheses.

  

## Future improvements
Column mapping so imported CSVs can drive the dashboard, Excel support, Web Worker parsing, chart-type switching, unit tests.

## Links
· LinkedIn: www.linkedin.com/in/aziz-chharchhodawala
