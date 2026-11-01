# aryansatwani.github.io

My portfolio site: **https://aryansatwani.github.io**

A data-themed 3D portfolio. The background is a live Three.js "data terrain", an instanced 3D bar chart that ripples under the cursor, with a scatter-plot point cloud and a regression line. Every section reads like a dashboard: KPI tiles with count-ups and sparklines, a SQL-style career query, and a mini chart on each project card.

## Stack

- Plain HTML, CSS and JavaScript. No build step.
- [Three.js](https://threejs.org) r160 from a CDN for the 3D scene.
- Animation patterns based on [React Bits](https://reactbits.dev), rewritten in vanilla JS: split text, blur text, decrypted text, spotlight cards, tilted cards, magnet buttons, click sparks, count-up and a scroll-velocity marquee.
- A hand-drawn SVG Memoji-style avatar. It waves, blinks and follows the cursor with its eyes.
- Respects `prefers-reduced-motion`.

## Run locally

```bash
python -m http.server 8000
# open http://localhost:8000
```

## Structure

| File | What it does |
|---|---|
| `index.html` | content and the avatar SVG template |
| `style.css` | layout, theme and animations |
| `main.js` | text effects, cards, charts, loader and the avatar's eyes |
| `scene.js` | Three.js data terrain |
| `img/` | photos |
