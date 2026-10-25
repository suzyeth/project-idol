/* =========================================================================
   STARCHAIN — ANCHOR PROTOCOL  /  anchor-overlay.js
   登录载入 · 身份锚定序列。

   用法（宿主页面）：
     <link rel="stylesheet" href="starchain-anchor.css">
     <script src="starchain-anchor.js"></script>
     const anchor = await StarchainAnchor.play({ name, gender });
     // … loading the next scene …
     await StarchainAnchor.finish();

   设计目标：沿用登记页的城市/轨道线/玫红玻璃/荧光黄绿/雾蓝语言，
   把“进入游戏”这一个点击，接成“神经链路 → 记忆缓存 → 意识涌现 → 锚点确认”。
   ========================================================================= */
(() => {
  'use strict';
  if (window.StarchainAnchor) return;

  const script = document.currentScript;
  let baseURL;
  try { baseURL = new URL('.', script?.src || location.href); } catch { baseURL = new URL('./', location.href); }

  /* ---------- 1. style / font bootstrap ---------- */
  try {
    if (!document.querySelector('link[data-sca-style], link[href*="starchain-anchor.css"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = new URL('starchain-anchor.css', baseURL).href;
      link.dataset.scaStyle = '';
      document.head.appendChild(link);
    }
    if (!window.SCA_SKIP_FONT && !document.querySelector('style[data-sca-font]')) {
      const style = document.createElement('style');
      style.dataset.scaFont = '';
      style.textContent = `@font-face{font-family:'Fusion Pixel';src:url("${new URL('anchor-fusion-pixel.woff2', baseURL).href}") format('woff2');font-weight:400;font-style:normal;font-display:swap}`;
      document.head.prepend(style);
    }
  } catch (error) {
    console.warn('[anchor] style bootstrap', error);
  }

  /* ---------- 2. constants ---------- */
  const T = { boot: 0, link: 380, memory: 1730, emerge: 3080, lock: 4430, ready: 4780 };
  const TARGET = { boot: 4, link: 34, memory: 67, emerge: 91, lock: 100 };
  const COPY = {
    link: {
      no: 'PHASE 01 / 03', en: 'SYNAPTIC HANDSHAKE', text: "Neural link connected.", em: 4,
      sub: 'NEURAL LINK ESTABLISHED // 04 NODES'
    },
    memory: {
      no: 'PHASE 02 / 03', en: 'MNEMOSYNE BUFFER', text: "Memory cache loaded.", em: 4,
      sub: 'MEMORY CACHE SYNCHRONIZED // 100%'
    },
    emerge: {
      no: 'PHASE 03 / 03', en: 'EGO EMERGENCE', text: "Neural consciousness is emerging.", hot: 4,
      sub: 'CONSCIOUSNESS SIGNAL DETECTED // 0x03'
    },
    lock: {
      no: 'PHASE 04 / 04', en: 'IDENTITY LOCK', text: "Anchor Confirmed", hot: 2,
      sub: 'IDENTITY ANCHOR CONFIRMED'
    }
  };
  const LOGS = [
    ['boot', "Carrier Handshake / CARRIER", 'OK'],
    ['link', "Neural link connected", 'LINK'],
    ['memory', "Memory cache loaded", '100%'],
    ['emerge', "Neural consciousness is emerging", 'EGO'],
    ['lock', "Anchor Confirmed / ANCHOR", 'LOCK']
  ];
  const SYS = [
    ['NEURAL_LINK', "Neural Link", 'STABLE'],
    ['MEMORY_CACHE', "Memory Cache", '100%'],
    ['EGO_SIGNAL', "Neural Consciousness", 'SURGING'],
    ['IDENTITY_ANCHOR', "Identity Anchor", 'LOCKED']
  ];
  const GLYPHS = '01<>/#*+=:◇▮▯星链竞技信息神经锚点记忆意识';
  const RING_GLYPHS = '01<>/#*+=:◇▮▯';
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const pad = (n, l = 2) => String(n).padStart(l, '0');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- 3. state ---------- */
  let overlay = null;
  let nodes = null;
  let built = false;
  let active = false;
  let locked = false;
  let readyDone = false;
  let frozen = false;
  let finishing = false;
  let closing = false;
  let elapsed = 0;
  let lastFrame = 0;
  let raf = 0;
  let stage = 'boot';
  let progress = 0;
  let targetProgress = 0;
  let eventIndex = 0;
  let anchor = null;
  let playOpts = {};
  let resolveReady = null;
  let playPromise = null;
  let lastFocus = null;
  let savedOverflow = '';
  let clockTimer = 0;
  let packetTimer = 0;
  let decodeTimer = 0;
  let freezeTimer = 0;
  let autoFinishTimer = 0;
  let stageAt = { boot: 0 };
  let readyAt = 0;
  let resolveFinish = null;
  let phraseToken = 0;
  let inerted = [];

  /* ---------- 4. helpers ---------- */
  function hash32(value) {
    const str = String(value);
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function hex(n) { return (n >>> 0).toString(16).toUpperCase().padStart(4, '0'); }
  function makeAnchor(profile) {
    const name = (String(profile?.name || '').trim() || "Unnamed").slice(0, 20);
    const gender = profile?.gender === 'female' ? 'female' : 'male';
    const h = hash32(name + '|' + gender);
    const h2 = hash32(gender + '|' + name + '|' + (h % 997));
    const id = 'SC-' + hex(h >>> 16) + '-' + hex(h & 0xffff);
    const lat = 31.2304 + ((h % 47) / 10000);
    const lng = 121.4737 + ((h2 % 47) / 10000);
    const date = new Date();
    const time = `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    const day = `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`;
    const energy = (97 + (h % 29) / 10).toFixed(1);
    return {
      name,
      gender,
      genderLabel: gender === 'female' ? "FEMALE / Female" : "MALE / Male",
      genderShort: gender === 'female' ? 'FEMALE' : 'MALE',
      id,
      lat, lng,
      latText: lat.toFixed(4) + '°N',
      lngText: lng.toFixed(4) + '°E',
      coord: `${lat.toFixed(4)}N / ${lng.toFixed(4)}E`,
      date, time, day,
      energy,
      serial: '0x' + (h >>> 0).toString(16).toUpperCase().padStart(8, '0'),
      genderCode: gender === 'female' ? 'F' : 'M'
    };
  }
  function formatElapsed(ms) {
    const total = Math.max(0, ms) / 1000;
    const s = Math.floor(total);
    const tenth = Math.floor((total - s) * 10);
    return `${pad(Math.floor(s / 60))}:${pad(s % 60)}.${tenth}`;
  }
  function formatClock() {
    const d = new Date();
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
  }
  function randomGlyph() { return GLYPHS[(Math.random() * GLYPHS.length) | 0]; }
  function cancelDecode() { if (decodeTimer) { clearInterval(decodeTimer); decodeTimer = 0; } }
  function later(fn, ms) { return setTimeout(fn, ms); }

  function nameSize(name) {
    const length = [...name].length;
    if (length <= 3) return 108;
    if (length <= 4) return 84;
    if (length <= 6) return 58;
    if (length <= 8) return 44;
    if (length <= 10) return 38;
    if (length <= 14) return 30;
    return 24;
  }

  function buildRing() {
    let ticks = '';
    for (let i = 0; i < 72; i++) {
      const major = i % 6 === 0;
      const a = i * 5 * Math.PI / 180;
      const r1 = major ? 364 : 372;
      const r2 = major ? 386 : 378;
      const x1 = (400 + Math.cos(a) * r1).toFixed(2);
      const y1 = (400 + Math.sin(a) * r1).toFixed(2);
      const x2 = (400 + Math.cos(a) * r2).toFixed(2);
      const y2 = (400 + Math.sin(a) * r2).toFixed(2);
      ticks += `<line class="tick" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${major ? 'rgba(231,238,16,.82)' : 'rgba(255,186,211,.42)'}" stroke-width="${major ? 1.35 : .7}"/>`;
    }
    const nodesMarkup = [-38, 142, 251].map((deg, i) => {
      const a = deg * Math.PI / 180;
      const x = (400 + Math.cos(a) * 344).toFixed(1);
      const y = (400 + Math.sin(a) * 344).toFixed(1);
      return `<g><circle class="sa-node" cx="${x}" cy="${y}" r="${i === 0 ? 4.2 : 3}" />
        <circle cx="${x}" cy="${y}" r="12" fill="none" stroke="rgba(255,150,188,.22)" stroke-width=".8"/></g>`;
    }).join('');

    return `<svg viewBox="0 0 800 800" aria-hidden="true">
      <circle cx="400" cy="400" r="394" fill="none" stroke="rgba(255,255,255,.07)" stroke-width=".8"/>
      <g class="sa-rot slow">
        ${ticks}
        <circle cx="400" cy="400" r="386" pathLength="360" fill="none" class="arc sa-arc-secondary" stroke-width="5" stroke-dasharray="14 36 70 22 40 30 50 98" opacity=".5"/>
        <circle cx="400" cy="400" r="344" fill="none" stroke="rgba(255,120,160,.34)" stroke-width="1"/>
        <circle cx="400" cy="400" r="344" pathLength="360" fill="none" class="arc sa-arc-primary" stroke-width="2.6"
          stroke-dasharray="96 12 42 10 54 146" transform="rotate(-90 400 400)"/>
        <circle cx="400" cy="400" r="358" pathLength="360" fill="none" class="arc sa-arc-secondary" stroke-width="1.1"
          stroke-dasharray="18 14 6 12 70 10 28 12 80 14 40 56" transform="rotate(48 400 400)"/>
      </g>
      <g class="sa-rot rev">
        <circle cx="400" cy="400" r="316" pathLength="360" fill="none" class="arc sa-arc-primary" stroke-width="1.3"
          stroke-dasharray="6 12 78 14 22 10 60 14 40 12 92" transform="rotate(18 400 400)" opacity=".72"/>
        <circle cx="400" cy="400" r="290" fill="none" stroke="rgba(201,182,255,.46)" stroke-width=".9" stroke-dasharray="1 8"/>
        <circle cx="400" cy="400" r="274" pathLength="360" fill="none" stroke="rgba(211,221,247,.42)" stroke-width=".85"
          stroke-dasharray="2 16 110 18 34 12 60 108" transform="rotate(-46 400 400)"/>
        <circle cx="400" cy="400" r="252" pathLength="360" fill="none" class="arc sa-arc-secondary" stroke-width="4"
          stroke-dasharray="60 14 20 10 90 18 80 68" opacity=".65"/>
      </g>
      <g class="sa-rot fast">
        ${nodesMarkup}
        <circle cx="400" cy="400" r="228" fill="none" stroke="rgba(255,45,142,.48)" stroke-width="1" stroke-dasharray="34 12 4 12"/>
        <path d="M400 146v26M400 628v26M146 400h26M628 400h26" stroke="rgba(231,238,16,.45)" stroke-width="4"/>
      </g>
      <g fill="none" stroke="rgba(228,218,242,.28)" stroke-width=".9">
        <path d="M400 105V330M400 470V695M105 400H330M470 400H695"/>
        <path d="M400 30V66M400 734V770M30 400H66M734 400H770" stroke="rgba(231,238,16,.62)" stroke-width="1.5"/>
        <rect x="386" y="386" width="28" height="28" transform="rotate(45 400 400)" stroke="rgba(255,138,177,.55)"/>
        <circle cx="400" cy="400" r="104" stroke="rgba(211,221,247,.34)" stroke-dasharray="1 7"/>
        <circle cx="400" cy="400" r="86" stroke="rgba(201,182,255,.4)" stroke-dasharray="24 10 4 10"/>
        <path d="M400 286v34M400 480v34M286 400h34M480 400h34" stroke="rgba(211,221,247,.4)"/>
      </g>
      <circle cx="400" cy="400" r="2.4" fill="#e7ee10" opacity=".9"/>
      <g fill="rgba(231,238,16,.75)">
        <rect x="396" y="18" width="8" height="3"/>
        <rect x="396" y="779" width="8" height="3"/>
        <rect x="18" y="396" width="3" height="8"/>
        <rect x="779" y="396" width="3" height="8"/>
      </g>
      <g fill="rgba(255,170,199,.58)" font-family="'Fusion Pixel',monospace" font-size="9" letter-spacing="3">
        <text x="400" y="54" text-anchor="middle">ANCHOR / 00</text>
        <text x="400" y="754" text-anchor="middle">STARCHAIN IDENTITY PROTOCOL</text>
      </g>
      <g fill="rgba(255,170,199,.38)" font-family="'Fusion Pixel',monospace" font-size="7" letter-spacing="2">
        <text x="400" y="214" text-anchor="middle">SYNC PLANE</text>
        <text x="400" y="598" text-anchor="middle">LOCK PLANE</text>
      </g>
    </svg>`;
  }

  /* ---------- 5. build markup ---------- */
  function build() {
    if (built) return;
    built = true;

    const logRows = LOGS.map(([key, label, code], i) =>
      `<li data-log="${key}"><span class="t">00:00.0</span><span class="m">${label}</span><span class="s">${code}</span></li>`
    ).join('');
    const sysRows = SYS.map(([code, zh, state], i) =>
      `<div class="sa-sys-row" data-sys="${i}"><span class="code">${code}</span><span class="zh">${zh}</span><span class="st">STANDBY</span></div>`
    ).join('');
    const wave = Array.from({ length: 27 }, (_, i) =>
      `<i style="--d:${(-0.09 * i).toFixed(2)}s;height:${20 + ((i * 37) % 70)}%"></i>`
    ).join('');
    const barcode = Array.from({ length: 25 }, (_, i) => {
      const o = .25 + ((i * 13) % 65) / 100;
      return `<i style="--o:${o.toFixed(2)};height:${40 + ((i * 17) % 55)}%"></i>`;
    }).join('');

    overlay = document.createElement('div');
    overlay.id = 'sca';
    overlay.className = 'sa';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', "Loading Starchain Identity Anchor");
    overlay.innerHTML = `
      <div class="sa-veil" aria-hidden="true"></div>
      <div class="sa-bg" aria-hidden="true">
        <div class="sa-haze"></div>
        <svg class="sa-orbit-bg" viewBox="0 0 1694 1003" preserveAspectRatio="xMidYMid slice">
          <g class="long" style="transform-origin:847px 527px" fill="none" stroke="#ff4a86" opacity=".19">
            <circle cx="847" cy="527" r="410" stroke-width=".8"/>
            <circle cx="847" cy="527" r="470" stroke-width=".55" stroke-dasharray="2 18"/>
            <circle cx="847" cy="527" r="620" stroke-width=".5" stroke-dasharray="80 40 2 30"/>
            <path d="M70 527H1624M847 40V990"/>
          </g>
          <g class="long rev" style="transform-origin:847px 527px" fill="none" stroke="#c9b6ff" opacity=".12">
            <circle cx="847" cy="527" r="290" stroke-width=".8"/>
            <circle cx="847" cy="527" r="730" stroke-width=".5" stroke-dasharray="140 60 3 90"/>
            <path d="M240 1000C370 740 570 600 847 560S1320 420 1480 120"/>
          </g>
          <g fill="#ff8fb9">
            <circle cx="230" cy="220" r="2" opacity=".5"/>
            <circle cx="1420" cy="190" r="2.4" opacity=".4"/>
            <circle cx="1240" cy="820" r="1.7" opacity=".55"/>
            <circle cx="390" cy="830" r="1.4" opacity=".4"/>
          </g>
          <g fill="none" stroke="#e7ee10" opacity=".20">
            <path d="M110 760H270M110 776H210M1370 700H1560M1370 716H1480"/>
            <path d="M1560 90V280" stroke-dasharray="3 7"/>
          </g>
        </svg>
        <div class="sa-grid"></div>
        <div class="sa-dots"></div>
        <div class="sa-scanlines"></div>
        <div class="sa-grain"></div>
        <div class="sa-vignette"></div>
      </div>
      <canvas class="sa-fx" aria-hidden="true"></canvas>

      <header class="sa-top">
        <div class="sa-brand">
          <button class="sa-back" data-back type="button" aria-label="Back to Registration">↖</button>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.6 22.4 12 12 22.4 1.6 12Z" fill="none" stroke="#ff2d8e" stroke-width="1"/><path d="M12 6.4 17.6 12 12 17.6 6.4 12Z" fill="#ff2d8e" opacity=".28"/><path d="M12 9.4 14.6 12 12 14.6 9.4 12Z" fill="#e7ee10"/></svg>
          <span class="sa-wordmark">STARCHAIN</span>
          <span class="sa-brand-sub">// IDENTITY ANCHOR PROTOCOL</span>
        </div>
        <div class="sa-top-right">
          <span class="sa-live"><i></i>LIVE</span>
          <span class="sa-clock" data-clock>00:00:00.000</span>
          <button class="sa-btn sa-skip" data-skip type="button">SKIP</button>
        </div>
      </header>

      <div class="sa-frame" aria-hidden="true">
        <i class="sa-corner c1"></i><i class="sa-corner c2"></i><i class="sa-corner c3"></i><i class="sa-corner c4"></i>
        <i class="sa-rail l"></i><i class="sa-rail r"></i>
        <span class="sa-vert">ANCHOR PROTOCOL / 214.09 / NEURAL INTERFACE</span>
      </div>

      <aside class="sa-log-wrap" aria-hidden="true">
        <div class="sa-label"><span>NEURAL LOG</span><span class="rec"><i></i>REC</span></div>
        <ol class="sa-log" data-log-list>${logRows}</ol>
        <div class="sa-wave">${wave}</div>
        <div class="sa-log-foot"><span>PACKET <b data-packet>0x0000</b></span><span>LOSS 0.00%</span></div>
      </aside>

      <aside class="sa-sys" aria-hidden="true">
        <div class="sa-label"><span>SUBSYSTEM</span><span>04 / 04</span></div>
        ${sysRows}
        <div class="sa-gauge">
          <div class="sa-gauge-head"><span>ANCHOR STRENGTH</span><b data-strength>00%</b></div>
          <div class="sa-gauge-track"><i data-gauge></i></div>
        </div>
        <div class="sa-coords">
          NODE / SH-09<br>
          <b data-coord>31.2304N / 121.4737E</b><br>
          SECTOR / LATTICE-9
        </div>
      </aside>

      <main class="sa-main">
        <div class="sa-phase">
          <div class="sa-phase-head">
            <span class="num" data-phase-no>PHASE 00 / 03</span>
            <span class="bar" aria-hidden="true"></span>
            <span data-phase-en>CARRIER HANDSHAKE</span>
          </div>
          <h1 class="sa-sentence" data-sentence aria-hidden="true"></h1>
          <div class="sa-lock-underline" aria-hidden="true"></div>
          <p class="sa-sub" data-sub>WAITING FOR IDENTITY SIGNAL</p>
        </div>

        <div class="sa-anchor" data-anchor>
          <div class="sa-bloom" aria-hidden="true"></div>
          <div class="sa-ring" data-ring>${buildRing()}</div>
          <div class="sa-sweep" aria-hidden="true"></div>
          <div class="sa-iris" aria-hidden="true"></div>
          <div class="sa-brackets" aria-hidden="true">
            <i class="sa-bracket b1"></i><i class="sa-bracket b2"></i>
            <i class="sa-bracket b3"></i><i class="sa-bracket b4"></i>
          </div>
          <div class="sa-core">
            <div class="sa-core-orb" aria-hidden="true"></div>
            <div class="sa-core-seed" aria-hidden="true"></div>
            <div class="sa-core-mark" aria-hidden="true"></div>
            <div class="sa-core-status" data-core-status>STANDBY</div>
            <div class="sa-core-name" data-core-name></div>
            <div class="sa-core-sub" data-core-sub>IDENTITY ANCHOR</div>
            <div class="sa-core-pct" data-core-pct>00.0%</div>
            <div class="sa-core-coord" data-core-coord>31.2304N / 121.4737E</div>
          </div>
          <div class="sa-seal" aria-hidden="true"><i></i><b>CONFIRMED</b></div>
        </div>

        <div class="sa-idcard">
          <div class="sa-id"><span>SUBJECT / Identity</span><strong class="name" data-id-name>—</strong></div>
          <div class="sa-id"><span>GENDER / Gender</span><strong data-id-gender>—</strong></div>
          <div class="sa-id"><span>ANCHOR ID</span><strong class="lime" data-id-code>—</strong></div>
          <div class="sa-id"><span>LOCKED AT</span><strong data-id-time>—</strong></div>
          <div class="sa-barcode" aria-hidden="true">${barcode}</div>
        </div>
      </main>

      <footer class="sa-foot">
        <div class="sa-foot-left"><span class="lime-bar"></span><span>SCN-07</span><span><b>SHANGHAI NODE</b></span><span>ANCHOR PROTOCOL v3.1</span></div>
        <div class="sa-progress">
          <div class="sa-progress-head"><span>SYNC / Sync Rate</span><b data-pct>000.0<span>%</span></b></div>
          <div class="sa-bar">
            <i class="sa-fill" data-bar-fill></i>
            <i class="sa-head" data-bar-head></i>
            <i class="sa-seg" style="left:25%"></i><i class="sa-seg" style="left:50%"></i><i class="sa-seg" style="left:75%"></i>
          </div>
          <div class="sa-stages"><span data-stage-label="link">LINK</span><span data-stage-label="memory">MEM</span><span data-stage-label="emerge">EGO</span><span data-stage-label="anchor">ANCHOR</span></div>
        </div>
        <div class="sa-foot-right"><span>SEQ <b data-seq>0x0000</b></span><span>ERR 0.00%</span></div>
      </footer>

      <button class="sa-cta" data-cta type="button"><i>◆</i>Enter Starchain <span>ENTER STARCHAIN</span></button>

      <div class="sa-seam" data-seam aria-hidden="true"></div>
      <div class="sa-boot" data-boot aria-hidden="true"></div>
      <div class="sa-flash" data-flash aria-hidden="true"></div>
      <div class="sa-morph" data-morph aria-hidden="true"></div>
      <div class="sa-sr" data-live role="status" aria-live="polite"></div>
    `;
    document.body.appendChild(overlay);

    nodes = {
      boot: overlay.querySelector('[data-boot]'),
      seam: overlay.querySelector('[data-seam]'),
      flash: overlay.querySelector('[data-flash]'),
      morph: overlay.querySelector('[data-morph]'),
      anchor: overlay.querySelector('[data-anchor]'),
      ring: overlay.querySelector('[data-ring]'),
      sentence: overlay.querySelector('[data-sentence]'),
      phaseNo: overlay.querySelector('[data-phase-no]'),
      phaseEn: overlay.querySelector('[data-phase-en]'),
      sub: overlay.querySelector('[data-sub]'),
      coreName: overlay.querySelector('[data-core-name]'),
      coreStatus: overlay.querySelector('[data-core-status]'),
      coreSub: overlay.querySelector('[data-core-sub]'),
      corePct: overlay.querySelector('[data-core-pct]'),
      coreCoord: overlay.querySelector('[data-core-coord]'),
      name: overlay.querySelector('[data-id-name]'),
      gender: overlay.querySelector('[data-id-gender]'),
      idCode: overlay.querySelector('[data-id-code]'),
      idTime: overlay.querySelector('[data-id-time]'),
      barFill: overlay.querySelector('[data-bar-fill]'),
      barHead: overlay.querySelector('[data-bar-head]'),
      pct: overlay.querySelector('[data-pct]'),
      gauge: overlay.querySelector('[data-gauge]'),
      strength: overlay.querySelector('[data-strength]'),
      coord: overlay.querySelector('[data-coord]'),
      clock: overlay.querySelector('[data-clock]'),
      packet: overlay.querySelector('[data-packet]'),
      seq: overlay.querySelector('[data-seq]'),
      log: overlay.querySelector('[data-log-list]'),
      skip: overlay.querySelector('[data-skip]'),
      back: overlay.querySelector('[data-back]'),
      cta: overlay.querySelector('[data-cta]'),
      live: overlay.querySelector('[data-live]'),
      canvas: overlay.querySelector('canvas'),
      stageLabels: [...overlay.querySelectorAll('[data-stage-label]')],
      sysRows: [...overlay.querySelectorAll('[data-sys]')]
    };
    nodes.logRows = [...nodes.log.querySelectorAll('li')];

    bindEvents();
    FX.init(nodes.canvas);
  }

  /* ---------- 6. canvas effects ---------- */
  const FX = {
    cv: null, ctx: null, w: 0, h: 0, dpr: 1, cx: 0, cy: 0, r: 240,
    dust: [], beams: [], glyphs: [], rings: [], sparks: [], embers: [],
    mode: 'boot', lockAt: 0,
    glowCache: new Map(),
    init(canvas) {
      this.cv = canvas;
      try { this.ctx = canvas.getContext('2d', { alpha: true }); } catch { this.ctx = null; }
      this.resize();
    },
    resize() {
      if (!this.cv || !this.ctx) return;
      const w = window.innerWidth, h = window.innerHeight;
      // The full-screen FX layer is soft; keep high-DPI buffers within a pixel budget.
      const dpr = Math.min(window.devicePixelRatio || 1, 1.25, Math.sqrt(1500000 / (w * h)));
      this.w = w; this.h = h; this.dpr = dpr;
      this.cv.width = Math.max(1, Math.round(w * dpr));
      this.cv.height = Math.max(1, Math.round(h * dpr));
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      this.glowCache.clear();
      this.measure();
      this.seed();
    },
    measure() {
      if (!nodes?.anchor) return;
      const rect = nodes.anchor.getBoundingClientRect();
      if (rect.width > 10) {
        this.cx = rect.left + rect.width / 2;
        this.cy = rect.top + rect.height / 2;
        this.r = rect.width / 2;
      } else {
        this.cx = this.w / 2;
        this.cy = this.h * 0.524;
        this.r = Math.min(this.h * 0.27, this.w * 0.18);
      }
    },
    seed() {
      const w = this.w || window.innerWidth, h = this.h || window.innerHeight;
      this.dust = Array.from({ length: 76 }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.25 + .35,
        a: Math.random() * .42 + .12,
        vx: (Math.random() - .5) * .05,
        vy: -.015 - Math.random() * .06,
        ph: Math.random() * Math.PI * 2,
        gold: Math.random() < .1
      }));
    },
    reset() {
      this.beams = []; this.glyphs = []; this.rings = []; this.sparks = []; this.embers = [];
      this.mode = 'boot'; this.lockAt = 0;
      this.glowCache.clear();
      this.measure();
    },
    glow(key, radius, stops, alpha = 1) {
      const id = key + ':' + radius.toFixed(2);
      let sprite = this.glowCache.get(id);
      if (!sprite) {
        const image = document.createElement('canvas'), size = Math.max(2, Math.ceil(radius * 2 * this.dpr));
        image.width = image.height = size;
        const c = image.getContext('2d'), r = size / 2, gradient = c.createRadialGradient(r, r, 0, r, r, r);
        stops.forEach(([at, color]) => gradient.addColorStop(at, color));
        c.fillStyle = gradient; c.fillRect(0, 0, size, size);
        this.glowCache.set(id, sprite = image);
      }
      this.ctx.globalAlpha = alpha;
      this.ctx.drawImage(sprite, this.cx - radius, this.cy - radius, radius * 2, radius * 2);
      this.ctx.globalAlpha = 1;
    },
    stage(name) {
      if (!this.ctx || reduced.matches || playOpts.theme === 'light') return;
      this.measure();
      this.mode = name;
      const now = performance.now();
      if (name === 'link') {
        const W = this.w, H = this.h;
        const points = [
          [0, H * .20], [0, H * .52], [0, H * .82],
          [W * .22, 0], [W * .74, 0],
          [W, H * .27], [W, H * .72], [W * .43, H]
        ];
        this.beams = points.map((p, i) => ({
          x1: p[0], y1: p[1], x2: this.cx, y2: this.cy,
          cx: (p[0] + this.cx) / 2 + (Math.random() - .5) * 160,
          cy: (p[1] + this.cy) / 2 + (Math.random() - .5) * 120,
          t0: now + i * 72,
          dur: 620 + Math.random() * 260,
          color: i % 3 === 0 ? '#e7ee10' : i % 3 === 1 ? '#ff5b98' : '#9fc5ee',
          done: false
        }));
        this.rings.push({ t0: now, dur: 1000, r0: this.r * .22, r1: this.r * 1.24, color: '#ff5b98', w: 1.6 });
        this.rings.push({ t0: now + 140, dur: 1200, r0: this.r * .3, r1: this.r * 1.05, color: '#9fc5ee', w: .8 });
      }
      if (name === 'memory') {
        this.beams = [];
        this.glyphs = Array.from({ length: 64 }, (_, i) => this.newGlyph(i));
        this.rings.push({ t0: now, dur: 1300, r0: this.r * .28, r1: this.r * 1.1, color: '#c9b6ff', w: 1 });
      }
      if (name === 'emerge') {
        this.glyphs = [];
        this.rings.push({ t0: now, dur: 1500, r0: this.r * .18, r1: this.r * 1.45, color: '#ff7bb1', w: 2 });
        this.rings.push({ t0: now + 180, dur: 1700, r0: this.r * .26, r1: this.r * 1.8, color: '#c9b6ff', w: 1 });
        for (let i = 0; i < 34; i++) {
          this.embers.push({
            x: this.cx + (Math.random() - .5) * this.r * 1.1,
            y: this.cy + (Math.random() - .3) * this.r,
            vx: (Math.random() - .5) * .25,
            vy: -.15 - Math.random() * .35,
            life: 1.2 + Math.random() * 1.6,
            max: 2.8,
            r: Math.random() * 1.5 + .5,
            gold: Math.random() < .28
          });
        }
      }
      if (name === 'lock') {
        this.lockAt = now;
        this.rings.push({ t0: now, dur: 900, r0: this.r * .35, r1: this.r * 2.1, color: '#ffffff', w: 2.4 });
        this.rings.push({ t0: now, dur: 1150, r0: this.r * .2, r1: this.r * 1.7, color: '#e7ee10', w: 1.2 });
        this.rings.push({ t0: now + 160, dur: 1350, r0: this.r * .5, r1: this.r * 1.35, color: '#ff5b98', w: 1 });
        for (let i = 0; i < 80; i++) {
          const a = Math.random() * Math.PI * 2, sp = 30 + Math.random() * 190;
          this.sparks.push({
            x: this.cx, y: this.cy,
            vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
            life: .5 + Math.random() * .9, max: 1.4,
            color: i % 5 === 0 ? '#e7ee10' : i % 3 === 0 ? '#9fc5ee' : '#ff7bb1'
          });
        }
      }
    },
    newGlyph(i) {
      const a = Math.random() * Math.PI * 2;
      const nameChars = [...(anchor?.name || '')];
      const useName = i < Math.min(6, nameChars.length);
      return {
        a,
        r: this.r * (1.15 + Math.random() * .8),
        va: (Math.random() < .5 ? -1 : 1) * (.18 + Math.random() * .55),
        vr: this.r * (.20 + Math.random() * .42),
        ch: useName ? nameChars[i] : GLYPHS[(Math.random() * GLYPHS.length) | 0],
        size: useName ? 13 + Math.random() * 5 : 8 + Math.random() * 8,
        hot: useName || Math.random() < .12,
        alpha: .4 + Math.random() * .5
      };
    },
    draw(now, dt) {
      const ctx = this.ctx;
      if (!ctx || !this.w) return;
      if (!this.cx) this.measure();
      const cx = this.cx, cy = this.cy, r = this.r;
      ctx.clearRect(0, 0, this.w, this.h);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      const glow = this.mode === 'emerge' ? .16 : this.mode === 'lock' ? .22 : this.mode === 'memory' ? .09 : .055;
      this.glow('halo', r * 1.75, [[0, 'rgb(255,105,160)'], [.45, 'rgba(255,45,142,.32)'], [1, 'rgba(255,45,142,0)']], glow);

      // drifting dust
      for (const d of this.dust) {
        d.x += d.vx * dt * 60;
        d.y += d.vy * dt * 60;
        if (d.y < -8) { d.y = this.h + 8; d.x = Math.random() * this.w; }
        if (d.x < -8) d.x = this.w + 8;
        if (d.x > this.w + 8) d.x = -8;
        const tw = .55 + .45 * Math.sin(now * .0017 + d.ph);
        ctx.globalAlpha = d.a * tw;
        ctx.fillStyle = d.gold ? '#e7ee10' : d.r > 1.1 ? '#ffb3c8' : '#dbe6ff';
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      const pulse = .5 + .5 * Math.sin(now * .0021);
      this.glow('core', r * .62, [[0, 'rgba(255,232,242,.10)'], [.28, 'rgba(255,90,150,.08)'], [1, 'rgba(255,45,142,0)']]);
      this.glow('core-pulse', r * .62, [[0, 'rgba(255,232,242,.06)'], [.28, 'rgba(255,90,150,.04)'], [1, 'rgba(255,45,142,0)']], pulse);
      if (this.mode === 'emerge') {
        this.glow('bloom', r * 1.65, [[0, 'rgba(255,245,250,.15)'], [.18, 'rgba(255,120,175,.16)'], [.48, 'rgba(255,45,142,.09)'], [1, 'rgba(255,45,142,0)']]);
        this.glow('bloom-pulse', r * 1.65, [[0, 'rgba(255,245,250,.05)'], [.18, 'rgba(255,120,175,.05)'], [.48, 'rgba(255,45,142,0)'], [1, 'rgba(255,45,142,0)']], pulse);
      }

      // neural beams
      for (const b of this.beams) {
        const p = clamp((now - b.t0) / b.dur, 0, 1);
        if (p <= 0) continue;
        const hx = this.q(b.x1, b.cx, b.x2, p);
        const hy = this.q(b.y1, b.cy, b.y2, p);
        const tp = Math.max(0, p - .17);
        const tx = this.q(b.x1, b.cx, b.x2, tp);
        const ty = this.q(b.y1, b.cy, b.y2, tp);
        ctx.globalAlpha = .10 * (1 - p * .3);
        ctx.strokeStyle = b.color;
        ctx.lineWidth = .8;
        ctx.beginPath();
        ctx.moveTo(b.x1, b.y1);
        ctx.quadraticCurveTo(b.cx, b.cy, b.x2, b.y2);
        ctx.stroke();
        if (p > .02) {
          const grad = ctx.createLinearGradient(tx, ty, hx, hy);
          grad.addColorStop(0, 'rgba(255,255,255,0)');
          grad.addColorStop(.7, b.color);
          grad.addColorStop(1, '#ffffff');
          ctx.globalAlpha = .75;
          ctx.strokeStyle = grad;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(tx, ty);
          ctx.quadraticCurveTo(
            this.q(b.x1, b.cx, b.x2, (tp + p) / 2),
            this.q(b.y1, b.cy, b.y2, (tp + p) / 2),
            hx, hy
          );
          ctx.stroke();
          ctx.globalAlpha = .9;
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.arc(hx, hy, 2, 0, Math.PI * 2);
          ctx.fill();
        }
        if (p >= 1 && !b.done) {
          b.done = true;
          this.rings.push({ t0: now, dur: 700, r0: r * .18, r1: r * .62, color: b.color, w: .9 });
          for (let k = 0; k < 5; k++) {
            const a = Math.random() * Math.PI * 2, sp = 20 + Math.random() * 55;
            this.sparks.push({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: .35 + Math.random() * .3, max: .65, color: b.color });
          }
        }
      }
      this.beams = this.beams.filter(b => now - b.t0 < b.dur + 850);
      ctx.globalAlpha = 1;

      // persistent signal filaments during the link phase
      if (this.mode === 'link') {
        const W = this.w, H = this.h;
        const filaments = [
          [0, H * .24, W * .18, H * .40, '#ff5b98', .02],
          [0, H * .66, W * .26, H * .58, '#9fc5ee', .27],
          [W, H * .30, W * .78, H * .42, '#e7ee10', .48],
          [W * .44, H, W * .50, H * .76, '#ff5b98', .66],
          [W * .36, 0, W * .42, H * .24, '#9fc5ee', .84]
        ];
        for (const [x1, y1, cx0, cy0, color, off] of filaments) {
          ctx.globalAlpha = .11;
          ctx.strokeStyle = color;
          ctx.lineWidth = .8;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.quadraticCurveTo(cx0, cy0, cx, cy);
          ctx.stroke();
          const t = ((now * .00032 + off) % 1);
          const tp = Math.max(0, t - .16);
          const hx = this.q(x1, cx0, cx, t), hy = this.q(y1, cy0, cy, t);
          const tx = this.q(x1, cx0, cx, tp), ty = this.q(y1, cy0, cy, tp);
          const grad = ctx.createLinearGradient(tx, ty, hx, hy);
          grad.addColorStop(0, 'rgba(255,255,255,0)');
          grad.addColorStop(.72, color);
          grad.addColorStop(1, '#ffffff');
          ctx.globalAlpha = .55;
          ctx.strokeStyle = grad;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(tx, ty);
          ctx.quadraticCurveTo(this.q(x1, cx0, cx, (tp + t) / 2), this.q(y1, cy0, cy, (tp + t) / 2), hx, hy);
          ctx.stroke();
          ctx.globalAlpha = .8;
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.arc(hx, hy, 1.7, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      // memory glyph spiral
      if (this.mode === 'memory' && this.glyphs.length) {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (const g of this.glyphs) {
          g.a += g.va * dt;
          g.r -= g.vr * dt;
          if (g.r < r * .16) Object.assign(g, this.newGlyph(99));
          const x = cx + Math.cos(g.a) * g.r;
          const y = cy + Math.sin(g.a) * g.r * .74;
          const near = clamp((g.r - r * .16) / (r * .8), 0, 1);
          ctx.globalAlpha = g.alpha * (.25 + (1 - near) * .75);
          ctx.fillStyle = g.hot ? '#e7ee10' : '#cfdcf9';
          ctx.font = `${Math.round(g.size)}px "Fusion Pixel", monospace`;
          ctx.fillText(g.ch, x, y);
        }
        ctx.globalAlpha = 1;
      }

      // emerging consciousness rays
      if (this.mode === 'emerge' || (this.mode === 'lock' && now - this.lockAt < 1500)) {
        const strength = this.mode === 'emerge' ? 1 : clamp(1 - (now - this.lockAt) / 1500, 0, 1);
        for (let i = 0; i < 56; i++) {
          const a = (i / 56) * Math.PI * 2 + Math.sin(now * .0004 + i) * .02;
          const len = r * (.46 + .24 * Math.sin(i * 2.13 + now * .0018));
          ctx.strokeStyle = i % 4 === 0 ? 'rgba(231,238,16,.28)' : i % 3 === 0 ? 'rgba(159,197,238,.22)' : 'rgba(255,105,160,.20)';
          ctx.globalAlpha = .55 * strength;
          ctx.lineWidth = i % 5 === 0 ? 1.2 : .65;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(a) * r * .2, cy + Math.sin(a) * r * .2);
          ctx.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len * .92);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }

      // rings
      for (const ring of this.rings) {
        const p = clamp((now - ring.t0) / ring.dur, 0, 1);
        if (p >= 1) continue;
        ctx.globalAlpha = Math.pow(1 - p, 1.6);
        ctx.strokeStyle = ring.color;
        ctx.lineWidth = ring.w * (1 - p * .5);
        ctx.beginPath();
        ctx.arc(cx, cy, lerp(ring.r0, ring.r1, 1 - Math.pow(1 - p, 2)), 0, Math.PI * 2);
        ctx.stroke();
      }
      this.rings = this.rings.filter(rg => now - rg.t0 < rg.dur);
      ctx.globalAlpha = 1;

      // sparks
      for (const s of this.sparks) {
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.vx *= .975;
        s.vy *= .975;
        s.life -= dt;
        if (s.life <= 0) continue;
        ctx.globalAlpha = clamp(s.life / s.max, 0, 1) * .9;
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x - s.vx * .025, s.y - s.vy * .025);
        ctx.stroke();
      }
      this.sparks = this.sparks.filter(s => s.life > 0);

      // embers
      for (const e of this.embers) {
        e.x += e.vx * dt * 60;
        e.y += e.vy * dt * 60;
        e.life -= dt;
        if (e.life <= 0) continue;
        ctx.globalAlpha = clamp(e.life / e.max, 0, 1) * .55;
        ctx.fillStyle = e.gold ? '#e7ee10' : '#ff9fc0';
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
        ctx.fill();
      }
      this.embers = this.embers.filter(e => e.life > 0);
      ctx.globalAlpha = 1;

      // lock streak
      if (this.lockAt) {
        const age = (now - this.lockAt) / 1000;
        if (age < 1.15) {
          const a = clamp(1 - age / 1.15, 0, 1);
          const lg = ctx.createLinearGradient(cx - this.w * .45, 0, cx + this.w * .45, 0);
          lg.addColorStop(0, 'rgba(255,255,255,0)');
          lg.addColorStop(.44, 'rgba(255,255,255,.85)');
          lg.addColorStop(.5, '#ffffff');
          lg.addColorStop(.56, 'rgba(231,238,16,.8)');
          lg.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.globalAlpha = a * .7;
          ctx.fillStyle = lg;
          ctx.fillRect(cx - this.w * .45, cy - 1, this.w * .9, 2);
          ctx.globalAlpha = a * .3;
          ctx.fillRect(cx - 1, cy - r * .8, 2, r * 1.6);
        }
      }
      ctx.restore();
    },
    q(a, b, c, t) {
      const u = 1 - t;
      return u * u * a + 2 * u * t * b + t * t * c;
    }
  };

  /* ---------- 8. phase copy / log / system rendering ---------- */
  function renderSentence(copy, instant) {
    cancelDecode();
    const sentence = nodes.sentence;
    sentence.replaceChildren();
    sentence.setAttribute('aria-label', copy.text);
    const chars = [...copy.text];
    const spans = [];
    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i];
      if (ch === '。') {
        const sq = document.createElement('i');
        sq.className = 'sq';
        sq.setAttribute('aria-hidden', 'true');
        sentence.appendChild(sq);
        continue;
      }
      const span = document.createElement('span');
      const classes = ['ch'];
      if (copy.em != null && i >= copy.em) classes.push('em');
      if (copy.hot != null && i >= copy.hot) classes.push('hot');
      span.className = classes.join(' ');
      span.dataset.c = ch;
      span.textContent = ch;
      sentence.appendChild(span);
      spans.push(span);
    }
    const animate = !instant && !reduced.matches;
    if (animate) {
      spans.forEach((span, i) => {
        span.animate([
          { opacity: 0, transform: 'translateY(16px)', filter: 'blur(7px)' },
          { opacity: 1, transform: 'none', filter: 'blur(0)' }
        ], { duration: 520, delay: i * 34, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'both' });
      });
      if (stage !== 'lock' || true) {
        let started = performance.now();
        const glyphs = stage === 'lock' ? RING_GLYPHS : GLYPHS;
        decodeTimer = setInterval(() => {
          const age = performance.now() - started;
          let done = true;
          spans.forEach((span, i) => {
            const at = i * 26;
            if (age < at + 160) {
              done = false;
              if (age >= at) span.textContent = glyphs[(Math.random() * glyphs.length) | 0];
            } else {
              span.textContent = span.dataset.c;
            }
          });
          if (done && age > spans.length * 26 + 230) {
            clearInterval(decodeTimer);
            decodeTimer = 0;
            spans.forEach(span => { span.textContent = span.dataset.c; });
          }
        }, 38);
      }
    } else {
      spans.forEach(span => { span.textContent = span.dataset.c; });
    }
    if (stage === 'lock') {
      nodes.sentence.animate([
        { opacity: 0, transform: 'translateY(18px) scale(1.04)', filter: 'blur(8px)' },
        { opacity: 1, transform: 'none', filter: 'blur(0)' }
      ], { duration: 620, easing: 'cubic-bezier(.16,1.2,.3,1)', fill: 'both' });
    }
  }

  function updateLogs(index, instant) {
    nodes.logRows.forEach((row, i) => {
      const key = LOGS[i][0];
      const on = i <= index;
      row.classList.toggle('on', on);
      row.classList.toggle('ok', i < index || (index === 4 && on));
      const time = row.querySelector('.t');
      if (on) time.textContent = formatElapsed(stageAt[key] ?? 0);
      else time.textContent = '--:--.-';
    });
    if (instant) {
      nodes.logRows.forEach(row => { row.style.transition = 'none'; });
      requestAnimationFrame(() => nodes.logRows.forEach(row => { row.style.transition = ''; }));
    }
  }

  function updateSys(index, instant) {
    nodes.sysRows.forEach((row, i) => {
      const on = i <= index;
      row.classList.toggle('on', on);
      row.classList.toggle('lock', index === 3 && i === 3);
      row.querySelector('.st').textContent = on ? SYS[i][2] : 'STANDBY';
    });
    const strengths = [18, 48, 76, 100];
    const strength = strengths[clamp(index, 0, 3)];
    nodes.gauge.style.width = strength + '%';
    nodes.strength.textContent = pad(strength, 2) + '%';
    if (instant) {
      nodes.sysRows.forEach(row => { row.style.transition = 'none'; });
      requestAnimationFrame(() => nodes.sysRows.forEach(row => { row.style.transition = ''; }));
    }
  }

  function updateStageLabels(index) {
    const order = ['link', 'memory', 'emerge', 'lock'];
    nodes.stageLabels.forEach((label, i) => {
      label.classList.toggle('on', i === index - 1);
      label.classList.toggle('done', i < index - 1);
    });
  }

  function swapPhaseCopy(copy, instant) {
    const token = ++phraseToken;
    const apply = () => {
      if (token !== phraseToken) return;
      nodes.phaseNo.textContent = copy.no;
      nodes.phaseEn.textContent = copy.en;
      nodes.sub.textContent = copy.sub;
      renderSentence(copy, instant);
    };
    if (instant || reduced.matches || !nodes.sentence.childElementCount) {
      apply();
      return;
    }
    const outSentence = nodes.sentence.animate([
      { opacity: 1, transform: 'translateY(0)' },
      { opacity: 0, transform: 'translateY(-9px)' }
    ], { duration: 150, easing: 'ease-in', fill: 'both' });
    const outSub = nodes.sub.animate([
      { opacity: 1 },
      { opacity: 0 }
    ], { duration: 150, easing: 'ease-in', fill: 'both' });
    Promise.all([outSentence.finished, outSub.finished]).then(() => {
      if (token !== phraseToken) return;
      apply();
      nodes.sentence.animate([
        { opacity: 0, transform: 'translateY(10px)' },
        { opacity: 1, transform: 'none' }
      ], { duration: 320, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'both' });
      nodes.sub.animate([
        { opacity: 0 },
        { opacity: 1 }
      ], { duration: 260, easing: 'ease-out', fill: 'both' });
    }).catch(() => {});
  }

  function applyStage(name, instant = false) {
    if (!active || stage === 'lock') return;
    stage = name;
    stageAt[name] = elapsed;
    overlay.classList.add('is-' + name);
    const copy = COPY[name];
    swapPhaseCopy(copy, instant);
    const index = { link: 1, memory: 2, emerge: 3 }[name];
    updateLogs(index, instant);
    updateSys(index - 1, instant);
    updateStageLabels(index);
    targetProgress = TARGET[name];
    nodes.coreStatus.textContent = name === 'link' ? 'LINKING / 04' : name === 'memory' ? 'BUFFERING / 64' : 'EMERGING / 03';
    nodes.coreSub.textContent = name === 'emerge' ? 'EGO SIGNAL' : 'IDENTITY ANCHOR';
    nodes.live.textContent = copy.text + ' ' + copy.sub;
    if (!instant) {
      FX.stage(name);
      addPulse();
      if (name === 'link') {
        nodes.boot.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, easing: 'ease-out', fill: 'forwards' });
      }
    }
    if (playOpts.freezeAt === name) scheduleFreeze(name);
  }

  function lockStage() {
    if (!active || locked) return;
    locked = true;
    stage = 'lock';
    stageAt.lock = elapsed;
    overlay.classList.add('is-lock');
    overlay.classList.remove('is-booting');
    const copy = COPY.lock;
    nodes.phaseNo.textContent = copy.no;
    nodes.phaseEn.textContent = copy.en;
    nodes.sub.textContent = copy.sub;
    renderSentence(copy, false);
    updateLogs(4, false);
    updateSys(3, false);
    updateStageLabels(4);
    targetProgress = 100;
    nodes.coreName.textContent = anchor.name;
    nodes.coreName.style.setProperty('--name-size', nameSize(anchor.name) + 'px');
    nodes.coreStatus.textContent = 'ANCHOR LOCKED';
    nodes.coreSub.textContent = 'IDENTITY ANCHOR';
    nodes.coreCoord.textContent = anchor.coord;
    nodes.name.textContent = anchor.name;
    nodes.gender.textContent = anchor.genderLabel;
    nodes.idCode.textContent = anchor.id;
    nodes.idTime.textContent = anchor.time;
    nodes.coord.textContent = anchor.coord;
    nodes.skip.hidden = true;
    nodes.cta.hidden = playOpts.cta === false;
    nodes.live.textContent = "Anchor confirmed. Identity anchor locked.";
    FX.stage('lock');
    addPulse();
    addPulse(180);
    setTimeout(() => {
      if (!active) return;
      const target = playOpts.cta === false
        ? (!nodes.back.hidden ? nodes.back : overlay)
        : nodes.cta;
      if (target === overlay) overlay.tabIndex = -1;
      try { target?.focus?.({ preventScroll: true }); } catch { /* noop */ }
    }, 560);
    if (playOpts.freezeAt === 'lock') scheduleFreeze('lock');
  }

  function scheduleFreeze(name) {
    clearTimeout(freezeTimer);
    const delay = playOpts.freezeDelay ?? (name === 'lock' ? 900 : 650);
    freezeTimer = setTimeout(() => {
      if (!active) return;
      frozen = true;
      overlay.classList.add('is-still');
      if (typeof playOpts.onFreeze === 'function') playOpts.onFreeze(name);
    }, delay);
  }

  function addPulse(delay = 0) {
    const pulse = document.createElement('i');
    pulse.className = 'sa-pulse';
    if (delay) pulse.style.animationDelay = delay + 'ms';
    nodes.anchor.appendChild(pulse);
    setTimeout(() => pulse.remove(), 1500 + delay);
  }

  function bootStage() {
    stage = 'boot';
    stageAt.boot = 0;
    targetProgress = TARGET.boot;
    nodes.phaseNo.textContent = 'PHASE 00 / 03';
    nodes.phaseEn.textContent = 'CARRIER HANDSHAKE';
    nodes.sub.textContent = 'AWAITING IDENTITY SIGNAL';
    nodes.coreStatus.textContent = 'SYNC / 00';
    nodes.live.textContent = "Connecting identity signal.";
    updateLogs(0, false);
    updateSys(0, false);
    updateStageLabels(0);
  }

  function readyStage() {
    if (!active || readyDone) return;
    readyDone = true;
    readyAt = elapsed;
    nodes.skip.hidden = true;
    const result = {
      ...anchor,
      confirmed: true,
      at: new Date().toISOString(),
      elapsed: Math.round(elapsed)
    };
    try {
      resolveReady?.(result);
    } catch (error) {
      console.warn('[anchor] resolve', error);
    }
    if (typeof playOpts.onReady === 'function') {
      try { playOpts.onReady(result, api); } catch (error) { console.warn('[anchor] onReady', error); }
    }
    const auto = playOpts.autoFinish;
    if (auto) {
      const hold = typeof auto === 'number' ? Math.max(0, auto) : 2300;
      clearTimeout(autoFinishTimer);
      autoFinishTimer = setTimeout(() => { if (active) finish(); }, hold);
    }
  }

  let progressTextAt = 0;
  function renderProgress() {
    const pct = clamp(progress, 0, 100);
    nodes.barFill.style.transform = `scaleX(${pct / 100})`;
    nodes.barHead.style.transform = `translateX(${pct}%)`;
    const now = performance.now();
    if (pct === 0 || pct === 100 || now - progressTextAt >= 100) {
      progressTextAt = now;
      const text = pct.toFixed(1).padStart(4, '0') + '%';
      if (nodes.pct.textContent !== text) nodes.pct.textContent = text;
      if (nodes.corePct && nodes.corePct.textContent !== text) nodes.corePct.textContent = text;
    }
  }

  /* ---------- 9. timeline ---------- */
  const EVENTS = [
    { at: T.boot, run: bootStage },
    { at: T.link, run: () => applyStage('link') },
    { at: T.memory, run: () => applyStage('memory') },
    { at: T.emerge, run: () => applyStage('emerge') },
    { at: T.lock, run: lockStage },
    { at: T.ready, run: readyStage }
  ];

  const FRAME_MS = 1000 / 60;
  let nextFrameAt = 0;
  function frame(now) {
    if (!active) return;
    raf = requestAnimationFrame(frame);
    if (document.hidden || frozen) { lastFrame = now; nextFrameAt = now; return; }
    // High-refresh monitors should not redraw the full overlay 120–240 times per second.
    if (now < nextFrameAt - .5) return;
    nextFrameAt = now - nextFrameAt > FRAME_MS ? now + FRAME_MS : nextFrameAt + FRAME_MS;
    const dt = Math.min(100, Math.max(0, now - (lastFrame || now)));
    lastFrame = now;
    elapsed += dt;
    while (eventIndex < EVENTS.length && elapsed >= EVENTS[eventIndex].at) {
      const event = EVENTS[eventIndex++];
      try { event.run(); } catch (error) { console.warn('[anchor] event', error); }
    }
    const k = 1 - Math.exp(-dt / 230);
    progress += (targetProgress - progress) * k;
    if (locked) progress += (100 - progress) * Math.min(1, dt / 140);
    renderProgress();
    if (!reduced.matches && playOpts.theme !== 'light') {
      try { FX.draw(now, dt / 1000); } catch (error) { /* keep the overlay alive */ }
    }
  }

  /* ---------- 10. boot / morph transition ---------- */
  function buildMorph(data) {
    const layer = nodes?.morph;
    if (!layer) return;
    layer.replaceChildren();
    if (!data || reduced.matches) return;

    const anchorRect = nodes.anchor.getBoundingClientRect();
    const phaseHead = overlay.querySelector('.sa-phase-head')?.getBoundingClientRect();
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const make = (className, styles, text) => {
      const element = document.createElement('div');
      element.className = 'sa-morph-el ' + className;
      element.textContent = text || '';
      element.style.cssText = styles + 'transform-origin:0 0;will-change:transform,opacity;';
      layer.appendChild(element);
      return element;
    };

    if (data.panel && data.panel.width > 20) {
      const p = data.panel;
      const panel = make('sa-morph-panel', `left:${p.left}px;top:${p.top}px;width:${p.width}px;height:${p.height}px;border-color:${p.border || 'rgba(255,255,255,.18)'};`);
      panel.animate([
        { transform: 'none', opacity: .55 },
        { transform: `translate(${20 - p.left}px,${16 - p.top}px) scale(${(viewportW - 40) / p.width},${(viewportH - 32) / p.height})`, opacity: 0 }
      ], { duration: 820, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'forwards' });
    }

    if (data.button && data.button.width > 20) {
      const b = data.button;
      const button = make('sa-morph-button', `left:${b.left}px;top:${b.top}px;width:${b.width}px;height:${b.height}px;border:1.5px solid ${b.background};background:${b.background}22;`);
      const destination = `translate(${anchorRect.left - b.left}px,${anchorRect.top - b.top}px) scale(${anchorRect.width / b.width},${anchorRect.height / b.height})`;
      button.animate([
        { transform: 'none', borderRadius: '0px', opacity: .55 },
        { transform: destination, borderRadius: '50%', opacity: .10, offset: .72 },
        { transform: destination, borderRadius: '50%', opacity: 0 }
      ], { duration: 940, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'forwards' });
    }

    if (data.name && data.name.text) {
      const n = data.name;
      const name = make('sa-morph-name', `left:${n.left}px;top:${n.top}px;font-family:${n.font};font-size:${n.size}px;color:${n.color};letter-spacing:${n.spacing};`, n.text);
      name.animate([
        { transform: 'none', opacity: .95 },
        { transform: `translate(${anchorRect.left + anchorRect.width / 2 - 20 - n.left}px,${anchorRect.top + anchorRect.height / 2 - 10 - n.top}px) scale(${10 / n.size})`, opacity: 0 }
      ], { duration: 760, easing: 'cubic-bezier(.2,.9,.2,1)', fill: 'forwards' });
    }

    if (data.title && data.title.text && phaseHead) {
      const t = data.title;
      const title = make('sa-morph-title', `left:${t.left}px;top:${t.top}px;font-family:${t.font};font-size:${t.size}px;font-weight:${t.weight};color:${t.color};letter-spacing:${t.spacing};`, t.text);
      title.animate([
        { transform: 'none', opacity: 1 },
        { transform: `translate(${phaseHead.left + phaseHead.width * .5 - t.left}px,${phaseHead.top - 2 - t.top}px) scale(${11 / t.size})`, opacity: 0 }
      ], { duration: 900, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'forwards' });
    }

    setTimeout(() => { if (layer) layer.replaceChildren(); }, 1450);
  }

  function playBoot(origin) {
    const W = window.innerWidth, H = window.innerHeight;
    const top = origin && Number.isFinite(origin.top) ? clamp(origin.top, 40, H - 40) : H * .52;
    nodes.boot.style.transformOrigin = `50% ${top / H * 100}%`;
    try {
      nodes.boot.animate([
        { transform: 'scaleY(0)', opacity: 1 },
        { transform: 'scaleY(1)', opacity: 1, offset: .54 },
        { transform: 'scaleY(1)', opacity: 0 }
      ], { duration: reduced.matches ? 1 : 1050, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'both' });
    } catch { /* older engines */ }

    if (!reduced.matches) nodes.flash.animate([
      { opacity: 0 },
      { opacity: .18, offset: .08 },
      { opacity: 0, offset: .26 }
    ], { duration: 520, easing: 'ease-out' });

    const rect = nodes.anchor.getBoundingClientRect();
    if (origin && rect.width > 10) {
      const sx = origin.left + origin.width / 2;
      const sy = origin.top + origin.height / 2;
      const ex = rect.left + rect.width / 2;
      const ey = rect.top + rect.height / 2;
      const width = Math.max(24, origin.width);
      nodes.seam.style.left = sx + 'px'; nodes.seam.style.top = sy + 'px'; nodes.seam.style.width = width + 'px';
      const destination = `translate(${ex - sx}px,${ey - sy}px) translateX(-50%) scaleX(${rect.width * .82 / width})`;
      nodes.seam.animate([
        { transform: 'translateX(-50%)', opacity: 1 },
        { transform: destination, opacity: 1, offset: .7 },
        { transform: destination, opacity: 0 }
      ], { duration: reduced.matches ? 1 : 900, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'both' });
    }
  }

  /* ---------- 11. lifecycle ---------- */
  function resetUI() {
    overlay.className = 'sa';
    overlay.removeAttribute('style');
    overlay.setAttribute('aria-hidden', 'true');
    nodes.boot.style.cssText = '';
    nodes.seam.style.cssText = '';
    nodes.flash.style.cssText = '';
    nodes.morph.replaceChildren();
    nodes.skip.hidden = false;
    nodes.back.hidden = false;
    nodes.cta.hidden = false;
    nodes.cta.blur?.();
    nodes.logRows.forEach(row => {
      row.classList.remove('on', 'ok');
      row.querySelector('.t').textContent = '--:--.-';
    });
    nodes.sysRows.forEach(row => {
      row.classList.remove('on', 'lock');
      row.querySelector('.st').textContent = 'STANDBY';
    });
    nodes.stageLabels.forEach(label => label.classList.remove('on', 'done'));
    [nodes.sentence, nodes.sub, nodes.flash, nodes.boot, nodes.seam].forEach(element => {
      try { element.getAnimations().forEach(animation => animation.cancel()); } catch { /* noop */ }
    });
    nodes.sentence.replaceChildren();
    nodes.sentence.removeAttribute('aria-label');
    nodes.phaseNo.textContent = 'PHASE 00 / 03';
    nodes.phaseEn.textContent = 'CARRIER HANDSHAKE';
    nodes.sub.textContent = 'AWAITING IDENTITY SIGNAL';
    nodes.coreStatus.textContent = 'SYNC / 00';
    nodes.coreName.textContent = '';
    nodes.coreName.style.removeProperty('--name-size');
    nodes.coreSub.textContent = 'IDENTITY ANCHOR';
    nodes.corePct.textContent = '00.0%';
    nodes.coreCoord.textContent = '—';
    nodes.name.textContent = '—';
    nodes.gender.textContent = '—';
    nodes.idCode.textContent = '—';
    nodes.idTime.textContent = '—';
    nodes.coord.textContent = '—';
    nodes.barFill.style.transform = 'scaleX(0)';
    nodes.barHead.style.transform = 'translateX(0%)';
    nodes.pct.textContent = '000.0%';
    nodes.gauge.style.width = '0%';
    nodes.strength.textContent = '00%';
    nodes.clock.textContent = formatClock();
    nodes.live.textContent = '';
    nodes.packet.textContent = '0x0000';
    nodes.seq.textContent = '0x0000';
    progress = 0; targetProgress = 0;
    renderProgress();
  }

  function restorePage() {
    if (savedOverflow) document.body.style.overflow = savedOverflow;
    else document.body.style.removeProperty('overflow');
    savedOverflow = '';
    inerted.forEach(([element, value]) => { try { element.inert = value; } catch { /* noop */ } });
    inerted = [];
    if (lastFocus && typeof lastFocus.focus === 'function' && document.contains(lastFocus)) {
      try { lastFocus.focus({ preventScroll: true }); } catch { /* noop */ }
    }
  }

  function inertSiblings() {
    inerted = [];
    [...document.body.children].forEach(element => {
      if (element === overlay) return;
      if (/^(SCRIPT|STYLE|LINK|NOSCRIPT|TEMPLATE)$/.test(element.tagName)) return;
      inerted.push([element, element.inert]);
      try { element.inert = true; } catch { /* noop */ }
    });
  }

  function hideOverlay() {
    phraseToken++;
    cancelAnimationFrame(raf);
    raf = 0;
    clearInterval(clockTimer); clockTimer = 0;
    clearInterval(packetTimer); packetTimer = 0;
    clearTimeout(freezeTimer); freezeTimer = 0;
    clearTimeout(autoFinishTimer); autoFinishTimer = 0;
    cancelDecode();
    overlay.classList.remove('is-live', 'is-booting', 'is-link', 'is-memory', 'is-emerge', 'is-lock', 'is-exiting', 'is-still', 'is-closing');
    overlay.setAttribute('aria-hidden', 'true');
    // Cancel the finish fade (fill:forwards) so the next play can fade in.
    try { overlay.getAnimations().forEach(animation => animation.cancel()); } catch { /* noop */ }
    FX.reset();
    active = false; locked = false; readyDone = false; frozen = false;
    finishing = false; closing = false;
    stage = 'boot'; eventIndex = 0; elapsed = 0; progress = 0; targetProgress = 0;
    restorePage();
  }

  function startTimers() {
    clearInterval(clockTimer);
    clockTimer = setInterval(() => {
      if (!active) return;
      nodes.clock.textContent = formatClock();
    }, 80);
    clearInterval(packetTimer);
    packetTimer = setInterval(() => {
      if (!active) return;
      const n = (Math.random() * 0xffff) | 0;
      nodes.packet.textContent = '0x' + n.toString(16).toUpperCase().padStart(4, '0');
      nodes.seq.textContent = '0x' + ((n * 13) & 0xffff).toString(16).toUpperCase().padStart(4, '0');
    }, 120);
  }

  function play(profile, options = {}) {
    build();
    if (active) {
      return Promise.reject(Object.assign(new Error('anchor already active'), { code: 'SCA_ACTIVE' }));
    }
    active = true;
    locked = false; readyDone = false; frozen = false; finishing = false; closing = false;
    phraseToken = 0;
    resolveFinish = null;
    anchor = makeAnchor(profile);
    playOpts = options || {};
    lastFocus = document.activeElement;
    savedOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    resetUI();
    overlay.classList.add(options.theme === 'light' ? 'sa-light' : 'sa-dark');
    overlay.classList.toggle('sa-simple', !!options.simplified);
    let device = 'auto';
    try { device = JSON.parse(localStorage.getItem('pidol:layout:v1') || '{}')?.device || 'auto'; } catch {}
    const phone = device === 'phone' || (device !== 'desktop' && (matchMedia('(pointer:coarse)').matches || Math.min(innerWidth / 1600, innerHeight / 900) < .62));
    overlay.classList.toggle('sa-phone', phone);
    overlay.classList.toggle('is-morphing', !!options.morph);
    nodes.back.hidden = options.allowCancel === false;
    nodes.cta.hidden = options.cta === false;
    inertSiblings();
    overlay.classList.add('is-live', 'is-booting');
    overlay.setAttribute('aria-hidden', 'false');
    elapsed = 0; lastFrame = performance.now(); nextFrameAt = lastFrame; eventIndex = 0; stage = 'boot'; stageAt = { boot: 0 };
    progress = 0; targetProgress = 0; readyAt = 0;
    renderProgress();
    playPromise = new Promise((resolve) => {
      resolveReady = resolve;
    });
    requestAnimationFrame(() => {
      FX.measure();
      buildMorph(options.morph);
      // The simplified repeat flow starts directly on the light HUD; the full
      // flow keeps the name-line wipe, with the real page morphing underneath.
      if (!options.simplified) playBoot(options.origin);
    });
    if (options.morph) {
      setTimeout(() => { if (active) overlay.classList.add('is-morph-settled'); }, 220);
    }
    startTimers();
    raf = requestAnimationFrame(frame);
    if (options.freezeAt === 'boot') scheduleFreeze('boot');
    return playPromise;
  }

  function skip() {
    if (!active || locked) return;
    clearTimeout(freezeTimer); freezeTimer = 0;
    cancelDecode();
    elapsed = T.lock + 40;
    eventIndex = EVENTS.length;
    ['link', 'memory', 'emerge'].forEach(name => {
      if (!overlay.classList.contains('is-' + name)) applyStage(name, true);
    });
    targetProgress = 100;
    progress = 100;
    renderProgress();
    lockStage();
    readyStage();
    overlay.classList.remove('is-booting');
  }

  function finish() {
    if (!active) return Promise.resolve(anchor);
    if (!locked) {
      skip();
    }
    if (finishing) return Promise.resolve(anchor);
    finishing = true;
    clearTimeout(autoFinishTimer); autoFinishTimer = 0;
    clearTimeout(freezeTimer); freezeTimer = 0;
    if (typeof playOpts.onExit === 'function') {
      try { playOpts.onExit(anchor, api); } catch (error) { console.warn('[anchor] onExit', error); }
    }
    overlay.classList.add('is-exiting');
    const duration = reduced.matches ? 1 : 560;
    let anim = null;
    try {
      anim = overlay.animate([
        { opacity: 1 },
        { opacity: 0 }
      ], { duration, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' });
    } catch { /* noop */ }
    const done = () => {
      if (!active) return;
      const result = anchor;
      hideOverlay();
      if (typeof playOpts.onComplete === 'function') {
        try { playOpts.onComplete(result, api); } catch (error) { console.warn('[anchor] onComplete', error); }
      }
      resolveFinish?.(result);
    };
    let settled = false;
    const settle = () => { if (settled) return; settled = true; done(); };
    if (anim) {
      anim.finished.then(settle).catch(settle);
      setTimeout(settle, (reduced.matches ? 80 : 720));
    } else {
      setTimeout(settle, 60);
    }
    return new Promise(resolve => { resolveFinish = resolve; });
  }

  function close(options = {}) {
    if (!active) return Promise.resolve(false);
    if (closing) return Promise.resolve(false);
    closing = true;
    clearTimeout(autoFinishTimer); autoFinishTimer = 0;
    clearTimeout(freezeTimer); freezeTimer = 0;
    cancelDecode();
    if (!readyDone) {
      // Resolve (rather than reject) on cancel: hosts that close the overlay
      // from a back button should not get an unhandled rejection.
      try { resolveReady?.(null); } catch { /* noop */ }
    }
    const opts = playOpts;
    const done = () => {
      hideOverlay();
      if (!options.silent && typeof opts.onCancel === 'function') {
        try { opts.onCancel(anchor, api); } catch (error) { console.warn('[anchor] onCancel', error); }
      }
    };
    if (options.instant || reduced.matches) {
      done();
      return Promise.resolve(true);
    }
    overlay.classList.add('is-closing');
    setTimeout(done, 360);
    return Promise.resolve(true);
  }

  async function replay(profile, options = {}) {
    await close({ instant: true, silent: true });
    await new Promise(resolve => setTimeout(resolve, 80));
    return play(profile || { name: anchor?.name || "Unnamed", gender: anchor?.gender }, options);
  }

  function enterFromCTA() {
    if (!locked) return;
    if (typeof playOpts.onEnter === 'function') {
      try {
        const value = playOpts.onEnter(anchor, api);
        if (value && typeof value.catch === 'function') value.catch(error => console.warn('[anchor] onEnter', error));
      } catch (error) { console.warn('[anchor] onEnter', error); }
    } else {
      finish();
    }
  }

  function onKeydown(event) {
    if (!active) return;
    if (event.key === 'Escape') {
      if (playOpts.allowCancel === false) return;
      event.preventDefault();
      close();
      return;
    }
    if (event.key === 's' || event.key === 'S') {
      if (!locked) { event.preventDefault(); skip(); }
      return;
    }
    if (event.key !== 'Tab') return;
    const focusables = [nodes.back, nodes.skip, nodes.cta].filter(el => el && !el.hidden && el.offsetParent !== null);
    if (!focusables.length) {
      event.preventDefault();
      overlay.tabIndex = -1;
      try { overlay.focus({ preventScroll: true }); } catch { /* noop */ }
      return;
    }
    const current = document.activeElement;
    const index = focusables.indexOf(current);
    if (event.shiftKey) {
      event.preventDefault();
      focusables[(index <= 0 ? focusables.length : index) - 1].focus();
    } else {
      event.preventDefault();
      focusables[(index + 1) % focusables.length].focus();
    }
  }

  function bindEvents() {
    nodes.skip.addEventListener('click', () => skip());
    nodes.back.addEventListener('click', () => close());
    nodes.cta.addEventListener('click', () => enterFromCTA());
    overlay.addEventListener('keydown', onKeydown);
    // Keep keyboard events inside the modal: the host page has global
    // shortcuts (e.g. "any key enters the city") that must not fire while
    // the anchor sequence is running.
    overlay.addEventListener('keydown', event => { event.stopPropagation(); });
    let resizeTimer = 0;
    window.addEventListener('resize', () => {
      if (!active) return;
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => { FX.resize(); FX.measure(); }, 120);
    }, { passive: true });
    document.addEventListener('visibilitychange', () => {
      if (!active) return;
      if (!document.hidden) { lastFrame = performance.now(); }
    });
    overlay.addEventListener('pointerdown', event => {
      if (event.target === overlay) event.preventDefault();
    }, { passive: false });
  }

  function debugStage(name) {
    if (!active) return false;
    if (name === 'lock' || name === 'anchor') { skip(); return true; }
    const order = ['link', 'memory', 'emerge'];
    const target = order.indexOf(name);
    if (target < 0) return false;
    clearTimeout(freezeTimer); freezeTimer = 0;
    cancelDecode();
    for (let i = 0; i <= target; i++) {
      if (stage !== order[i]) applyStage(order[i], true);
    }
    targetProgress = TARGET[name] || targetProgress;
    progress = Math.max(progress, targetProgress - 2);
    renderProgress();
    try {
      FX.measure();
      FX.stage(name);
      if (name === 'link') FX.beams.forEach(b => { b.t0 -= 260; });
      FX.draw(performance.now(), 1 / 60);
    } catch (error) { console.warn('[anchor] debug fx', error); }
    addPulse();
    frozen = true;
    overlay.classList.add('is-still');
    return true;
  }

  /* ---------- 12. public API ---------- */
  const api = {
    version: '1.0.0',
    play,
    finish,
    close,
    skip,
    replay,
    debugStage,
    isActive: () => active,
    isLocked: () => locked,
    get state() { return { active, locked, readyDone, frozen, finishing, stage, elapsed: Math.round(elapsed), progress: Math.round(progress * 10) / 10, target: targetProgress, eventIndex, hidden: document.hidden, visibility: document.visibilityState }; },
    get profile() { return anchor ? { ...anchor } : null; }
  };

  window.StarchainAnchor = api;
})();
