(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(pointer: fine)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const NS = 'http://www.w3.org/2000/svg';

  $('#yr').textContent = new Date().getFullYear();

  /* ---------- memoji: transparent HEVC for Safari, VP9 WebM elsewhere ---------- */
  const safari = /^((?!chrome|android|crios|fxios|edg).)*safari/i.test(navigator.userAgent);
  // only the hero gets the video (the loader keeps its poster), and only after the intro, so it never competes with first paint
  const startMemoji = () => !reduce && $$('.hero [data-memoji]').forEach(box => {
    const v = document.createElement('video');
    Object.assign(v, { muted: true, defaultMuted: true, loop: true, playsInline: true, autoplay: true, preload: 'auto', disablePictureInPicture: true });
    v.setAttribute('aria-hidden', 'true');
    v.src = safari ? 'character/memoji-hevc.mov' : 'character/memoji.webm';
    v.addEventListener('playing', () => box.classList.add('playing'), { once: true });
    box.appendChild(v);
    v.play().catch(() => {});
  });

  /* ---------- cursor glow + memoji turns toward the cursor ---------- */
  const heroMemoji = $('.hero .memoji');
  addEventListener('pointermove', e => {
    document.body.style.setProperty('--mx', e.clientX + 'px');
    document.body.style.setProperty('--my', e.clientY + 'px');
    if (!heroMemoji || reduce) return;
    const r = heroMemoji.getBoundingClientRect();
    const dx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (innerWidth / 2)));
    const dy = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (innerHeight / 2)));
    heroMemoji.style.transform = `perspective(700px) rotateY(${dx * 22}deg) rotateX(${-dy * 14}deg) translate(${dx * 10}px, ${dy * 6}px)`;
  }, { passive: true });
  // pause the loop while it's off-screen or the tab is hidden
  const vids = () => $$('[data-memoji] video');
  new IntersectionObserver(es => es.forEach(en => {
    const v = en.target.querySelector('video');
    if (v) en.isIntersecting && !document.hidden ? v.play().catch(() => {}) : v.pause();
  })).observe($('.hero .memoji') || document.body);
  document.addEventListener('visibilitychange', () => vids().forEach(v => document.hidden ? v.pause() : v.play().catch(() => {})));

  /* ---------- loader ---------- */
  const loader = $('#loader');
  document.body.classList.add('loading');
  const pct = $('#loadPct'), bar = $('.loader-bar span');
  let p = 0, finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    pct.textContent = 100; bar.style.width = '100%';
    setTimeout(() => {
      loader.classList.add('done');
      startMemoji();
      document.body.classList.remove('loading');
      $$('.hero .split, .hero .blur-text').forEach(el => el.classList.add('in'));
      startDecrypt();
    }, 250);
  };
  const tick = () => {
    if (finished) return;
    p = Math.min(100, p + Math.random() * 7 + 2);
    pct.textContent = Math.floor(p); bar.style.width = p + '%';
    p >= 100 ? finish() : setTimeout(tick, 55);
  };
  setTimeout(tick, reduce ? 0 : 500);
  addEventListener('keydown', finish, { once: true });
  $('.loader-skip').addEventListener('click', finish);

  /* ---------- split + blur text ---------- */
  $$('[data-split]').forEach(el => {
    let i = 0;
    el.innerHTML = el.textContent.trim().split(' ').map(w =>
      `<span class="word">${[...w].map(c => `<span class="ch" style="--i:${i++}">${c}</span>`).join('')}</span>`
    ).join(' ');
    el.setAttribute('aria-label', el.textContent);
  });
  $$('.blur-text').forEach(el => {
    el.innerHTML = el.textContent.trim().split(/\s+/).map((w, i) => `<span class="w" style="--i:${i}">${w}</span>`).join(' ');
  });

  /* ---------- decrypted text ---------- */
  function startDecrypt() {
    const el = $('#decrypt');
    const roles = ['Data Analyst', 'BI Developer', 'ML Builder', 'Insight Hunter'];
    const glyphs = '01#$%&*<>/\\[]{}=+ABCDEFXYZ';
    let r = 0;
    const play = word => {
      let frame = 0;
      const total = word.length * 3 + 6;
      const step = () => {
        el.textContent = [...word].map((c, i) =>
          c === ' ' ? ' ' : i < (frame - 6) / 3 ? c : glyphs[Math.floor(Math.random() * glyphs.length)]
        ).join('');
        if (++frame <= total) requestAnimationFrame(() => setTimeout(step, 30));
      };
      step();
    };
    if (reduce) return;
    setInterval(() => { r = (r + 1) % roles.length; play(roles[r]); }, 3200);
  }

  /* ---------- reveal on scroll ---------- */
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      e.target.querySelectorAll('.count').forEach(countUp);
      io.unobserve(e.target);
    });
  }, { threshold: .18 });
  $$('.reveal, .split, .blur-text, .proj').forEach(el => { if (!el.closest('.hero')) io.observe(el); });

  /* ---------- count up ---------- */
  function countUp(el) {
    if (el.dataset.done) return;
    el.dataset.done = 1;
    const to = parseFloat(el.dataset.to), dec = +(el.dataset.decimals || 0);
    const dur = reduce ? 1 : 1800, t0 = performance.now();
    const fmt = v => dec ? v.toFixed(dec) : Math.round(v).toLocaleString();
    const f = t => {
      const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 4);
      el.textContent = fmt(to * e);
      if (k < 1) requestAnimationFrame(f);
    };
    requestAnimationFrame(f);
  }

  /* ---------- KPI sparklines ---------- */
  const defs = document.createElementNS(NS, 'svg');
  defs.setAttribute('width', 0); defs.setAttribute('height', 0); defs.style.position = 'absolute';
  defs.innerHTML = `<defs>
    <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#22d3ee" stop-opacity=".35"/><stop offset="1" stop-color="#22d3ee" stop-opacity="0"/></linearGradient>
    <linearGradient id="cvFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a78bfa" stop-opacity=".45"/><stop offset="1" stop-color="#22d3ee" stop-opacity="0"/></linearGradient></defs>`;
  document.body.prepend(defs);

  const scale = (s, w, h, pad = 2) => {
    const mn = Math.min(...s), mx = Math.max(...s), r = mx - mn || 1;
    return s.map((v, i) => [i / (s.length - 1) * w, h - pad - (v - mn) / r * (h - pad * 2)]);
  };
  $$('.spark').forEach(svg => {
    const s = svg.dataset.series.split(',').map(Number);
    if (svg.classList.contains('bars')) {
      const mx = Math.max(...s), bw = 120 / s.length;
      svg.innerHTML = s.map((v, i) => `<rect x="${i * bw + 2}" y="${32 - v / mx * 30}" width="${bw - 4}" height="${v / mx * 30}" rx="1.5" style="transition-delay:${i * 60}ms"/>`).join('');
      return;
    }
    const pts = scale(s, 120, 32);
    const d = 'M' + pts.map(p => p.join(',')).join(' L');
    svg.innerHTML = `<path class="a" d="${d} L120,32 L0,32 Z"/><path class="l" d="${d}"/>`;
    svg.style.setProperty('--len', 400);
  });

  /* ---------- project mini charts ---------- */
  const rnd = (seed => () => (seed = (seed * 9301 + 49297) % 233280) / 233280)(42);
  const W = 300, H = 120;
  const charts = {
    line(s) {
      const pts = scale(s, W, H, 6);
      const d = 'M' + pts.map(p => p.join(',')).join(' L');
      const last = pts[pts.length - 1];
      return `<path class="cv-area" d="${d} L${W},${H} L0,${H} Z"/><path class="cv-line draw" d="${d}"/><circle class="cv-dot pop" cx="${last[0]}" cy="${last[1]}" r="4"/>`;
    },
    area(s) { return charts.line(s); },
    bar(s) {
      const mx = Math.max(...s), bw = W / s.length;
      return s.map((v, i) => `<rect class="cv-bar grow ${v === mx ? 'hi' : ''}" x="${i * bw + 3}" y="${H - v / mx * H}" width="${bw - 6}" height="${v / mx * H}" rx="2" style="transition-delay:${i * 40}ms"/>`).join('');
    },
    hbar() {
      const v = [92, 74, 61, 45, 30];
      return v.map((x, i) => `<rect class="cv-bar growx ${i === 0 ? 'hi' : ''}" x="0" y="${i * 24 + 2}" width="${x / 100 * W}" height="16" rx="3" style="transition-delay:${i * 80}ms"/>`).join('');
    },
    scatter() {
      let out = `<line class="cv-edge draw" x1="0" y1="${H - 8}" x2="${W}" y2="10"/>`;
      for (let i = 0; i < 46; i++) {
        const x = rnd() * W, y = H - 8 - x / W * (H - 18) + (rnd() - .5) * 46;
        out += `<circle class="cv-dot pop ${rnd() > .8 ? 'b' : ''}" cx="${x}" cy="${Math.max(4, Math.min(H - 4, y))}" r="${2 + rnd() * 3}" style="transition-delay:${i * 15}ms"/>`;
      }
      return out;
    },
    network() {
      const n = Array.from({ length: 14 }, () => [20 + rnd() * (W - 40), 12 + rnd() * (H - 24)]);
      let out = '';
      n.forEach((a, i) => n.slice(i + 1).forEach(b => { if (Math.hypot(a[0] - b[0], a[1] - b[1]) < 90) out += `<line class="cv-edge draw" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/>`; }));
      n.forEach((a, i) => out += `<rect class="pop" x="${a[0] - 5}" y="${a[1] - 5}" width="10" height="10" rx="2" fill="${i % 3 ? '#22d3ee' : '#a78bfa'}" style="transition-delay:${i * 40}ms"/>`);
      return out;
    },
    treemap() {
      const c = ['#22d3ee', '#67e8f9', '#a78bfa', '#818cf8', '#34d399', '#2dd4bf'];
      const r = [[0, 0, 130, 120], [132, 0, 90, 70], [224, 0, 76, 70], [132, 72, 60, 48], [194, 72, 54, 48], [250, 72, 50, 48]];
      return r.map(([x, y, w, h], i) => `<rect class="pop" x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="${c[i]}" fill-opacity="${.85 - i * .1}" style="transition-delay:${i * 70}ms"/>`).join('');
    },
    donut() {
      const parts = [[44.1, '#34d399'], [34.2, '#8b95a9'], [21.6, '#fb7185']];
      let a = -Math.PI / 2, out = '';
      const cx = 150, cy = 60, R = 50, r0 = 30;
      parts.forEach(([v, col], i) => {
        const a2 = a + v / 100 * Math.PI * 2, big = a2 - a > Math.PI ? 1 : 0;
        const p = (ang, rad) => `${cx + Math.cos(ang) * rad},${cy + Math.sin(ang) * rad}`;
        out += `<path class="pop" style="transition-delay:${i * 120}ms" fill="${col}" d="M${p(a, R)} A${R},${R} 0 ${big} 1 ${p(a2, R)} L${p(a2, r0)} A${r0},${r0} 0 ${big} 0 ${p(a, r0)} Z"/>`;
        a = a2;
      });
      return out + `<text x="150" y="65" text-anchor="middle" fill="#e6ebf5" font-family="JetBrains Mono" font-size="13">44%</text>`;
    },
    heat() {
      let out = '';
      for (let y = 0; y < 6; y++) for (let x = 0; x < 15; x++) {
        const d = Math.hypot(x - 9, (y - 2.5) * 2), v = Math.max(0, 1 - d / 7) + rnd() * .15;
        out += `<rect class="pop" x="${x * 20}" y="${y * 20}" width="18" height="18" rx="3" fill="${v > .55 ? '#a78bfa' : '#22d3ee'}" fill-opacity="${.08 + v * .8}" style="transition-delay:${(x + y) * 25}ms"/>`;
      }
      return out;
    },
    tokens() {
      const w = ['Once', 'upon', 'a', 'time', ',', 'a', 'data', 'analyst', 'found', 'a', 'signal', '…'];
      let x = 0, y = 26, out = '';
      w.forEach((t, i) => {
        const len = t.length * 9 + 14;
        if (x + len > W) { x = 0; y += 34; }
        out += `<g class="pop" style="transition-delay:${i * 90}ms"><rect x="${x}" y="${y - 18}" width="${len}" height="26" rx="6" fill="${i % 2 ? 'rgba(167,139,250,.22)' : 'rgba(34,211,238,.18)'}"/><text x="${x + 7}" y="${y}" fill="#e6ebf5" font-family="JetBrains Mono" font-size="13">${t}</text></g>`;
        x += len + 6;
      });
      return out;
    }
  };
  $$('[data-chart]').forEach(svg => {
    const s = (svg.dataset.series || '').split(',').filter(Boolean).map(Number);
    svg.innerHTML = charts[svg.dataset.chart](s);
  });

  /* ---------- project filters ---------- */
  $$('.filters button').forEach(b => b.addEventListener('click', () => {
    $$('.filters button').forEach(x => x.classList.toggle('active', x === b));
    const f = b.dataset.filter;
    $$('.proj').forEach(p => p.classList.toggle('hide', f !== 'all' && !p.dataset.cat.split(' ').includes(f)));
  }));

  /* ---------- spotlight + tilt + magnet ---------- */
  if (fine && !reduce) {
    $$('.spotlight').forEach(el => el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--x', e.clientX - r.left + 'px');
      el.style.setProperty('--y', e.clientY - r.top + 'px');
    }));
    $$('.tilt').forEach(el => {
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        el.style.transform = `perspective(900px) rotateX(${-y * 7}deg) rotateY(${x * 9}deg) scale(1.015)`;
      });
      el.addEventListener('pointerleave', () => el.style.transform = '');
    });
    $$('.magnet').forEach(el => {
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .3}px, ${(e.clientY - r.top - r.height / 2) * .4}px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transition = 'transform .5s cubic-bezier(.3,1.6,.5,1)'; el.style.transform = ''; setTimeout(() => el.style.transition = '', 500); });
    });
  }

  /* ---------- click sparks ---------- */
  const sc = $('#sparks'), sx = sc.getContext('2d');
  let sparks = [];
  const sizeSparks = () => { sc.width = innerWidth * devicePixelRatio; sc.height = innerHeight * devicePixelRatio; sx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0); };
  sizeSparks(); addEventListener('resize', sizeSparks);
  addEventListener('click', e => {
    if (reduce) return;
    for (let i = 0; i < 10; i++) sparks.push({ x: e.clientX, y: e.clientY, a: i / 10 * Math.PI * 2, t: performance.now() });
    if (sparks.length === 10) requestAnimationFrame(drawSparks);
  });
  function drawSparks(now) {
    sx.clearRect(0, 0, innerWidth, innerHeight);
    sparks = sparks.filter(s => now - s.t < 450);
    sparks.forEach(s => {
      const k = (now - s.t) / 450, e = k * (2 - k), d = e * 34, len = 12 * (1 - e);
      sx.strokeStyle = `rgba(103,232,249,${1 - k})`; sx.lineWidth = 2;
      sx.beginPath();
      sx.moveTo(s.x + Math.cos(s.a) * d, s.y + Math.sin(s.a) * d);
      sx.lineTo(s.x + Math.cos(s.a) * (d + len), s.y + Math.sin(s.a) * (d + len));
      sx.stroke();
    });
    if (sparks.length) requestAnimationFrame(drawSparks);
  }

  /* ---------- nav state, timeline progress, velocity marquee, orbits ---------- */
  const nav = $('.nav'), tl = $('.timeline'), tlp = $('.tl-progress');
  const links = $$('.nav nav a'), secs = links.map(a => $(a.getAttribute('href'))).filter(Boolean);
  const rows = $$('.vel-row').map(r => {
    const t = r.querySelector('.vel-track');
    t.innerHTML = t.innerHTML.repeat(6);
    return { t, dir: +r.dataset.dir, x: 0 };
  });
  const orbits = $$('.orbit').map((o, k) => ({ o, spans: [...o.children], a: 0, speed: k ? -.06 : .09 }));
  let lastY = scrollY, vel = 0;

  const loop = () => {
    const y = scrollY;
    vel += ((y - lastY) - vel) * .1;
    lastY = y;
    nav.classList.toggle('scrolled', y > 30);

    const r = tl.getBoundingClientRect();
    tlp.style.setProperty('--p', Math.max(0, Math.min(100, (innerHeight * .6 - r.top) / r.height * 100)) + '%');

    if (!reduce) {
      rows.forEach(row => {
        row.x -= row.dir * (0.6 + Math.abs(vel) * .35);
        const w = row.t.scrollWidth / 6;
        if (row.x < -w) row.x += w;
        if (row.x > 0) row.x -= w;
        row.t.style.transform = `translateX(${row.x}px)`;
      });
    }
    orbits.forEach(ob => {
      if (!reduce) ob.a += ob.speed;
      const d = ob.o.offsetWidth / 2;
      ob.spans.forEach((s, i) => {
        const ang = (ob.a + i * 360 / ob.spans.length) * Math.PI / 180;
        s.style.transform = `translate(-50%, -50%) translate(${Math.cos(ang) * d}px, ${Math.sin(ang) * d}px)`;
      });
    });

    let cur = secs[0];
    secs.forEach(s => { if (s.getBoundingClientRect().top < innerHeight * .4) cur = s; });
    links.forEach(a => a.classList.toggle('active', $(a.getAttribute('href')) === cur && y > 200));
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
})();
