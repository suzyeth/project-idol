/* Boot intro 「天降」 — covers the startup gap (WebView warm-up and the login scene loading) and hands off to the
 * login scene. Designed in WebPrototypes/boot-intro (v15); timings and motion measured against the reference video
 * (boot-intro/compare/report.html).
 *
 * On black, a thin iridescent line sweeps the frame top to bottom; light lines extend down from above the camera
 * while the logo, cut into 12 slices, is smashed together pair by pair; the final hit flashes into a glow, the
 * light engulfs the frame, and the real login scene zooms out from behind the white while the logo glides onto
 * the login page's own logo.
 *
 * Startup contract
 *   index.html loads this right after <body>, before anything heavy, so the black first frame paints at once.
 *   window.StarchainBoot = { active, deferCity, loadCity (set by city-host.js), start(), firstFrame, handoff, done }
 *   - First draws happen under the black. Chromium compiles GPU shaders and rasterises a layer the first time it is
 *     drawn — measured ≈2 s on a cold shader cache, ≈150–200 ms warm — and that stall would otherwise land on the
 *     final hit and in the middle of the hand-off. So before the clock starts, our own big layers are drawn once at
 *     0.4% opacity, and the login scene (loaded at once) is drawn once behind a 99.6% black, then paused
 *     ('active' false: its film, optics, flight and SVG animations stop) until the hand-off resumes it.
 *     The clock waits up to CITY_WAIT_MS for the login scene; if it is later, it is warmed in the flare hold instead.
 *     If it is not ready by the white, the flare holds (at most HOLD_MAX).
 *   - Unity (StarchainWebView.cs): the native cover is plain black; on 'intro' it removes the cover and calls
 *     StarchainBoot.start(), so the animation starts on a frame the player can see. 'intro-end' carries stats.
 *   - unity-bridge.js waits for `handoff` instead of revealing the city itself.
 *   - Voice: at the final hit the clock sends 'intro-cue' { name: 'title' } and Unity plays one of the three idols'
 *     title calls (StarchainWebView.TitleCall), so no browser autoplay rule applies.
 *
 * Performance
 *   the logo is a pre-rasterised WebP (boot-logo-cn.webp), not the 1 MB SVG. Light geometry is drawn into two
 *   resolution-bounded canvases, avoiding hundreds of SVG attribute/style updates on every frame. The animation
 *   renders at most 60 times/s even on high-refresh displays; its clock and voice cues still use elapsed time.
 *   The clock only starts once frame times are calm; everything is removed from the page when the intro ends.
 */
(() => {
	const query = new URLSearchParams(location.search);
	if (query.get('intro') === '0' || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
	const inUnity = query.has('unity');
	const send = (type, data = {}) => { try { window.Unity?.call?.(JSON.stringify({ type, ...data })); return typeof window.Unity?.call === 'function'; } catch { return false; } };
	const clamp = v => v < 0 ? 0 : v > 1 ? 1 : v;
	const lerp = (a, b, t) => a + (b - a) * t;
	const seg = (t, a, b) => clamp((t - a) / (b - a));
	const eoutc = t => 1 - Math.pow(1 - t, 3);
	const einc = t => t * t * t;
	const eio = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
	function bezier(x1, y1, x2, y2) {
		const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
		const X = t => ((ax * t + bx) * t + cx) * t, Y = t => ((ay * t + by) * t + cy) * t, dX = t => (3 * ax * t + 2 * bx) * t + cx;
		return x => { if (x <= 0) return 0; if (x >= 1) return 1; let t = x; for (let i = 0; i < 8; i++) { const d = dX(t); if (Math.abs(d) < 1e-6) break; t -= (X(t) - x) / d; } return Y(Math.min(1, Math.max(0, t))); };
	}
	// a stroke: a short build-up, then a visible, even slow-down that actually finishes (peak at ~15% of the move)
	const stroke = bezier(.15, 0, .12, 1), takeoff = bezier(.55, 0, 1, .45);
	let seed = 5;
	const rnd = (a = 0, b = 1) => a + (b - a) * ((seed = (seed * 16807) % 2147483647) / 2147483647);

	/* ---------- Rhythm (tuned in the prototype's 节奏 panel) ---------- */
	const P = { speed: 1, curtainAt: .1, curtainDur: .55, lineDur: .5, firstHit: .95, gapStart: .18, gapEnd: .1, fall: .34, boomGap: .14, flareHold: 1.9, whiteDur: .32, revealDur: .8, glideDur: .68,
		voiceTitle: 0 };   // the title call, offset from the final hit (s)
	const HOLD_MAX = 6;      // never wait on the flare longer than this for the login scene (s)
	const CITY_WAIT_MS = 1500;   // before the clock starts, wait this long for the login scene to load and warm under the black
	const T = {}, HITS = [];
	(function derive() {
		T.curtain = [P.curtainAt, P.curtainAt + P.curtainDur]; T.night = P.curtainAt + P.curtainDur * .5; T.rain = P.curtainAt + P.curtainDur * .6;
		T.fall = P.fall;
		let h = Math.max(P.firstHit, T.rain + .3);
		for (let i = 0; i < 6; i++) { HITS.push(h); h += lerp(P.gapStart, P.gapEnd, i / 4); }
		T.boom = HITS[5] + P.boomGap; T.burst = T.boom + .03; T.flareIn = T.boom + .08;
		T.gleam = [T.boom + .9, T.boom + 1.35];
		T.white = [T.boom + P.flareHold, T.boom + P.flareHold + P.whiteDur]; T.hold = T.white[0] - .03;
		T.city = T.white[1];
		T.fogOut = [T.city + .08, T.city + .08 + P.revealDur];
		T.glide = [T.city + .06, T.city + .06 + P.glideDur]; T.hand = [T.glide[1], T.glide[1] + .26];
		T.end = Math.max(T.hand[1], T.fogOut[1]) + .1;
		// [cue, clock time the clip starts] (the clip opens with 0.1 s of silence)
		T.voice = [['title', T.boom + P.voiceTitle]];   // Unity plays an idol's title call (StarchainWebView.TitleCall)
	})();

	/* ---------- DOM ---------- */
	const root = document.createElement('div');
	// Only the Chinese title is supported.
	root.id = 'starchain-boot';
	root.setAttribute('aria-hidden', 'true');
	root.innerHTML = `<div class="box">
		<div class="layer world">
			<div class="night"></div><i class="edge"></i><div class="dust d1"></div><div class="dust d2"></div>
			<canvas class="draw rings"></canvas><canvas class="draw lines"></canvas>
			<div class="layer slices"></div>
			<div class="logo"><canvas class="sharp"></canvas><canvas class="shine"></canvas></div>
			<div class="flash"></div>
			<div class="layer flare"><i class="g3"></i><i class="g1"></i><i class="g2"></i><i class="core"></i><i class="streak"></i></div>
		</div>
		<div class="layer marks"><i></i><i></i><i></i><i></i><span class="tl">偶像 · 涌现之境</span><span class="tr tc">00:00:00:00</span><span class="bl">SYSTEM BOOT</span><span class="br">STARCHAIN · FROM ABOVE</span></div>
		<div class="fog"></div><div class="cloud"><i></i><i></i><i></i><i></i></div>
	</div>`;
	(document.body || document.documentElement).append(root);
	const q = s => root.querySelector(s);
	const box = q('.box'), el = {
		world: q('.world'), edge: q('.edge'), d1: q('.dust.d1'), d2: q('.dust.d2'), rings: q('.draw.rings'), lines: q('.draw.lines'), night: q('.night'),
		slices: q('.slices'), logo: q('.logo'), sharp: q('.logo .sharp'), shine: q('.logo .shine'), flash: q('.flash'), flare: q('.flare'),
		marks: q('.marks'), tc: q('.tc'), fog: q('.fog'), cloud: q('.cloud'),
		core: q('.flare .core'), streak: q('.flare .streak'), g1: q('.flare .g1'), g2: q('.flare .g2'), g3: q('.flare .g3'),
	};

	/* Match the selected login background so the final logo lands on the login title. */
	let loginAspect = 16 / 9;
	try { if (localStorage.getItem('pidol:login-background:v1') === 'city') loginAspect = 2580 / 1079; } catch {}
	let VW = 1, VH = 1, U = 1;
	const LOGO_CY = () => .45 * VH;
	const centreLogo = () => { const w = Math.min(.44 * VW, 1.05 * VH); return { w, h: w * 811 / 1940 }; };
	function fit() {
		const W = innerWidth, H = innerHeight;
		VW = Math.min(W, H * loginAspect); VH = VW / loginAspect; U = VH / 900;
		Object.assign(box.style, { left: (W - VW) / 2 + 'px', top: (H - VH) / 2 + 'px', width: VW + 'px', height: VH + 'px' });
		// Bound light-buffer uploads independently of monitor resolution / Windows scaling.
		const scale = Math.min(devicePixelRatio || 1, 1440 / VW, 900 / VH);
		for (const cv of [el.rings, el.lines]) {
			const w = Math.max(1, Math.round(VW * scale)), h = Math.max(1, Math.round(VH * scale));
			if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
		}
	}
	fit();

	/* ---------- Bounded canvas light buffers (no per-frame SVG DOM mutations) ---------- */
	function painter(canvas) {
		const ctx = canvas.getContext('2d');
		let dirty = false;
		const alpha = (hex, a) => `rgba(${parseInt(hex.slice(1,3),16)},${parseInt(hex.slice(3,5),16)},${parseInt(hex.slice(5,7),16)},${a})`;
		const path = points => { dirty = true; ctx.beginPath(); points.forEach(([x,y],i) => i ? ctx.lineTo(x,y) : ctx.moveTo(x,y)); ctx.closePath(); };
		const radial = glint => {
			const g = ctx.createRadialGradient(0,0,0,0,0,1);
			g.addColorStop(0,'#fff'); g.addColorStop(glint ? .35 : .25, glint ? 'rgba(244,248,255,.9)' : 'rgba(238,246,255,.8)'); g.addColorStop(1,'rgba(168,200,255,0)'); return g;
		};
		return {
			begin() { if (dirty) { ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,canvas.width,canvas.height); dirty = false; } ctx.setTransform(canvas.width/VW,0,0,canvas.height/VH,0,0); },
			ray3(a,x1,y1,x2,y2,c0,c1,c2,op,hot) {
				const g=ctx.createLinearGradient(x1,y1,x2,y2);
				g.addColorStop(0,alpha(c0,0)); g.addColorStop(.42,alpha(c1,.5)); g.addColorStop(Math.max(.42,hot),c2); g.addColorStop(1,'#fff');
				path(a); ctx.fillStyle=g; ctx.globalAlpha=clamp(op); ctx.fill();
			},
			glow(x,y,rx,ry,deg,fill,op) {
				if(rx<=0||ry<=0)return;
				dirty = true;
				ctx.save(); ctx.translate(x,y); ctx.rotate(deg*Math.PI/180); ctx.scale(rx,ry);
				ctx.fillStyle=radial(false); ctx.globalAlpha=clamp(op); ctx.beginPath(); ctx.arc(0,0,1,0,Math.PI*2); ctx.fill(); ctx.restore();
			},
			star(x,y,R,deg,op) {
				if(R<=0)return;
				ctx.save(); ctx.translate(x,y); ctx.rotate(deg*Math.PI/180); ctx.scale(R,R);
				const points=Array.from({length:8},(_,i)=>{const a=i*Math.PI/4,r=i%2?.11:1;return [Math.cos(a)*r,Math.sin(a)*r];});
				path(points); ctx.fillStyle=radial(true); ctx.globalAlpha=clamp(op); ctx.fill(); ctx.restore();
			},
			dot(x,y,r,fill,op=1) { this.glow(x,y,r,r,0,fill,op); },
			ring(x,y,rx,ry,stroke,w,op) { dirty = true; ctx.beginPath(); ctx.ellipse(x,y,Math.max(0,rx),Math.max(0,ry),0,0,Math.PI*2); ctx.strokeStyle=stroke; ctx.lineWidth=w; ctx.globalAlpha=clamp(op); ctx.stroke(); },
			end() {},
		};
	}
	const PR = painter(el.rings), PL = painter(el.lines);
	const LIGHT = ['#9fe6f5', '#c3b0ff', '#ffc4ec', '#fff3a6', '#ffffff', '#9fc0ff'];
	const FILM = ['#b3ecf4', '#b4c0ea', '#d0c0ee', '#f1d3ec', '#d4d7f2', '#bee2ef'];   // the logo's film colours, lifted toward white so they glow

	/* ---------- The drop: a camera above the stage; x right, y down, z into the screen; the logo stands at z = Z0 ---------- */
	const Z0 = 1000, N = 12;
	const proj = (x, y, z) => { const s = Z0 / z; return [VW / 2 + x * s, LOGO_CY() + y * s, s]; };
	const SLICES = Array.from({ length: N }, (_, i) => ({ i, pair: Math.min(i, N - 1 - i), sx: 1.3 + rnd(0, .25), sy: -(820 + Math.min(i, N - 1 - i) * 60 + rnd(0, 120)), sz: Z0 * rnd(.42, .52) }));
	const LINES = [];
	function line(t0, dur, E, opt = {}) {
		const S = opt.S || { x: E.x * .45 + rnd(-420, 420), y: -rnd(700, 1200), z: Z0 * rnd(.3, .48) };
		LINES.push({ t0, dur, S, E, w: opt.w ?? rnd(1.6, 3), col: opt.col ?? LIGHT[Math.floor(rnd(0, LIGHT.length))], spark: opt.spark ?? true, ph: LINES.length % FILM.length, pair: !!opt.pair });
	}
	function buildLines() {
		const { w: lw, h: lh } = centreLogo();
		LINES.length = 0; seed = 11;
		SLICES.forEach(s => { s.hit = HITS[s.pair]; });
		SLICES.forEach(s => {    // two leaders for every slice, reaching its landing place just before it lands
			const x = (s.i + .5 - N / 2) * lw / N, d = P.lineDur;
			line(s.hit - d * .72 - .04, d, { x: x + rnd(-8, 8), y: -lh * .46, z: Z0 });
			line(s.hit - d * .68, d * .95, { x: x + rnd(-14, 14), y: lh * .5, z: Z0 }, { w: rnd(1.2, 2.2) });
		});
		for (let k = 0; k < 12; k++) {    // more rays reaching the stage around it
			const z = Z0 * rnd(.75, 2.2);
			line(rnd(T.rain, HITS[5]), P.lineDur * rnd(.9, 1.3), { x: rnd(-1.1, 1.1) * lw * (z / Z0) * .7, y: lh * .58, z }, { w: rnd(1, 2.4), pair: k % 3 === 0 });
		}
		for (let k = 0; k < 12; k++) {    // the camera travels: streaks start far ahead and rush outward past it
			const a = rnd(0, Math.PI * 2), r1 = rnd(.08, .35) * lw, zf = Z0 * 2.6, zn = Z0 * .24, r2 = VW * rnd(.75, 1.1) * zn / Z0;
			line(lerp(T.rain, T.boom - .2, k / 11) + rnd(-.05, .05), P.lineDur * 1.1, { x: Math.cos(a) * r2, y: Math.sin(a) * r2 * .62, z: zn },
				{ S: { x: Math.cos(a) * r1 * zf / Z0, y: Math.sin(a) * r1 * .62 * zf / Z0, z: zf }, w: rnd(.8, 1.6), col: k % 3 ? '#ffffff' : '#9fe6f5', spark: false, pair: k % 4 === 1 });
		}
		for (let k = 0; k < 14; k++) {    // the final hit: rays burst out of the logo toward the camera
			const a = -Math.PI * rnd(.05, .95) + (k % 2 ? 0 : Math.PI * .1), r = rnd(.5, 1.1);
			line(T.burst + rnd(0, .05), rnd(.55, .75), { x: Math.cos(a) * lw * 1.4 * r, y: Math.sin(a) * lh * 2.4 * r, z: Z0 * rnd(.3, .45) }, { S: { x: rnd(-.3, .3) * lw, y: rnd(-.2, .2) * lh, z: Z0 }, w: rnd(1.6, 3), spark: false });
		}
	}
	function drawRings(t) {
		const { w: lw, h: lh } = centreLogo(), Yf = lh * .58;
		SLICES.forEach(s => {
			const e = eoutc(seg(t, s.hit, s.hit + .55)); if (e <= 0 || e >= 1) return;
			const c = proj((s.i + .5 - N / 2) * lw / N, Yf, Z0), rx = lerp(12, lw * .22, e);
			PR.ring(c[0], c[1], rx, rx * .14, '#cfe8ff', lerp(2.4, .6, e), (1 - e) * .7);
		});
	}
	// light, not paint: a white-hot core, an iridescent body, a soft bloom; the head burns brighter while it travels;
	// nothing is ever drawn thinner than ~1.1px (distance dims a line instead of thinning it, so it never shimmers)
	const MIN_HALF = .55;
	function drawLine(L, k, h, tl) {
		const dx = h[0] - tl[0], dy = h[1] - tl[1], len = Math.hypot(dx, dy);
		if (len < .5) return;
		const ux = dx / len, uy = dy / len, nx = -uy, ny = ux;
		const energy = clamp((stroke(clamp(k)) - stroke(clamp(k - .02))) / .02 / 2.4);
		const dim = .62 + .38 * clamp((h[2] - .3) / 1.1);
		let bh = L.w * Math.min(h[2], 1.6) * U * .9, op = dim;
		if (bh < MIN_HALF) { op *= .35 + .65 * bh / MIN_HALF; bh = MIN_HALF; }
		const bt = Math.max(L.w * Math.min(tl[2], 1.6) * U * .45, MIN_HALF);
		const quad = (wh, wt, ox = 0, oy = 0) => [[tl[0] + nx * wt + ox, tl[1] + ny * wt + oy], [h[0] + nx * wh + ox, h[1] + ny * wh + oy], [h[0] - nx * wh + ox, h[1] - ny * wh + oy], [tl[0] - nx * wt + ox, tl[1] - ny * wt + oy]];
		const c0 = FILM[L.ph], c1 = FILM[(L.ph + 1) % FILM.length], c2 = L.col === '#ffffff' ? '#eef4ff' : FILM[(L.ph + 2) % FILM.length];
		const hot = clamp(1 - (10 + 70 * energy) * Math.min(h[2], 1.4) * U / len);
		PL.ray3(quad(bh * 5, bt * 3), tl[0], tl[1], h[0], h[1], c0, c1, c2, .2 * op * (.6 + .4 * energy), hot);
		PL.ray3(quad(bh, bt), tl[0], tl[1], h[0], h[1], c0, c1, c2, op, hot);
		PL.ray3(quad(Math.max(.5, bh * .3), .45), tl[0], tl[1], h[0], h[1], '#ffffff', '#ffffff', '#ffffff', (.62 + .38 * energy) * op, hot);
		if (L.pair) {
			const gap = bh * 2 + 2.6 * Math.min(h[2], 1.4) * U, ox = nx * gap, oy = ny * gap;
			PL.ray3(quad(Math.max(MIN_HALF, bh * .55), Math.max(MIN_HALF, bt * .55), ox, oy), tl[0] + ox, tl[1] + oy, h[0] + ox, h[1] + oy, c1, c2, '#ffffff', .6 * op, hot);
		}
		if (energy > .03) {
			const sc = Math.min(h[2], 1.6) * U, rx = (5 + 26 * energy) * sc, ry = (2.4 + 2.6 * energy) * sc;
			PL.glow(h[0] - ux * rx * .35, h[1] - uy * rx * .35, rx, ry, Math.atan2(uy, ux) * 180 / Math.PI, 'url(#sbHead)', Math.min(1, .95 * (.5 + .5 * energy) * (.6 + .4 * dim)));
		}
	}
	function drawLines(t) {
		for (const L of LINES) {
			const k = (t - L.t0) / L.dur;
			if (k <= 0 || k > 1.34) continue;
			// drawn out from its origin: the tip extends and settles on its target, then the line is reeled in from the tail
			const eh = stroke(clamp(k)), et = takeoff(clamp((k - .78) / .55));
			const P3 = e => proj(lerp(L.S.x, L.E.x, e), lerp(L.S.y, L.E.y, e), lerp(L.S.z, L.E.z, e));
			drawLine(L, k, P3(eh), P3(et));
			if (L.spark) { const f = seg(k, .5, 1.2); if (f > 0 && f < 1) { const e = proj(L.E.x, L.E.y, L.E.z), sc = e[2] * U; PL.star(e[0], e[1], lerp(10, 34, eoutc(f)) * sc, 8 * f, Math.pow(1 - f, 1.4)); PL.dot(e[0], e[1], lerp(3, 9, f) * sc, 'url(#sbHead)', .55 * (1 - f)); } }
		}
	}

	/* ---------- The logo: a pre-rasterised bitmap, baked once and cut into slices ---------- */
	const LOGO = new Image();
	LOGO.src = 'boot-logo-cn.webp';
	const logoReady = LOGO.decode().then(() => true, () => false);
	let logoW0 = 0, pad = 0, dpr = 1, logoDecoded = false, resizeRaf = 0;
	function bakeLogo() {
		const cl = centreLogo(); logoW0 = cl.w;
		dpr = Math.min(1.5, devicePixelRatio || 1); pad = Math.round(8 * dpr);
		const w = Math.round(logoW0 * dpr), h = Math.round(w * 811 / 1940);
		[el.sharp, el.shine].forEach(cv => { cv.width = w + pad * 2; cv.height = h + pad * 2; cv.style.margin = `${-pad / dpr}px`; cv.style.width = `calc(100% + ${pad * 2 / dpr}px)`; });
		let ctx = el.sharp.getContext('2d');
		ctx.filter = `drop-shadow(0 ${dpr}px ${dpr}px rgba(6,12,35,.8)) drop-shadow(0 0 ${3 * dpr}px rgba(18,28,57,.42))`;
		ctx.drawImage(LOGO, pad, pad, w, h);
		ctx = el.shine.getContext('2d');
		ctx.drawImage(LOGO, pad, pad, w, h);
		ctx.globalCompositeOperation = 'source-in'; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, el.shine.width, el.shine.height); ctx.globalCompositeOperation = 'source-over';
		el.logo.style.width = logoW0 + 'px';
		el.slices.textContent = '';
		const sw = w / N, lx = VW / 2 - cl.w / 2, ly = LOGO_CY() - cl.h / 2;
		SLICES.forEach(s => {
			const div = document.createElement('div'); div.className = 'slice';
			const cv = document.createElement('canvas'), x0 = Math.floor(pad + s.i * sw), x1 = Math.ceil(pad + (s.i + 1) * sw);
			cv.width = x1 - x0; cv.height = h + pad * 2;
			cv.getContext('2d').drawImage(el.sharp, x0, 0, cv.width, cv.height, 0, 0, cv.width, cv.height);
			div.append(cv); el.slices.append(div);
			s.el = div; s.px0 = (x0 - pad) / dpr; s.pw = cv.width / dpr; s.ph = cv.height / dpr;
			Object.assign(div.style, { left: (lx + s.px0).toFixed(1) + 'px', top: (ly - pad / dpr).toFixed(1) + 'px', width: s.pw.toFixed(1) + 'px', height: s.ph.toFixed(1) + 'px' });
		});
	}
	function drawSlices(t) {
		const cl = centreLogo(), show = t < T.boom + .02;
		for (const s of SLICES) {
			const div = s.el; if (!div) continue;
			const t0 = s.hit - T.fall;
			if (!show || t < t0) { if (div._on !== false) { div.style.opacity = 0; div._on = false; } continue; }
			div._on = true;
			const k = clamp((t - t0) / T.fall), e = Math.pow(k, 2.3);
			const xf = s.px0 + s.pw / 2 - cl.w / 2, yb = cl.h / 2 + pad / dpr;
			const x = lerp(xf * s.sx, xf, e), y = lerp(s.sy * U, 0, e), z = lerp(s.sz, Z0, e), sc = Z0 / z;
			const u = Math.max(0, t - s.hit), wob = k >= 1 ? Math.exp(-u * 13) * Math.cos(u * 30) : 0;
			div.style.transform = `translate(${(x * sc - xf).toFixed(1)}px, ${((y + yb) * sc - yb).toFixed(1)}px) scale(${(sc * (1 + .06 * wob)).toFixed(4)}, ${(sc * (1 - .12 * wob)).toFixed(4)})`;
			div.style.opacity = clamp(k * 3.5).toFixed(3);
		}
	}
	function placeLogo(cx, cy, w, opacity, shade, shine = 0, band = null) {
		const s = w / logoW0, h = w * 811 / 1940;
		el.logo.style.transform = `translate(${(cx - w / 2).toFixed(1)}px, ${(cy - h / 2).toFixed(1)}px) scale(${s.toFixed(4)})`;
		el.logo.style.opacity = opacity.toFixed(3);
		el.logo.style.setProperty('--shade', shade.toFixed(3));
		el.shine.style.opacity = clamp(shine).toFixed(3);
		el.shine.style.clipPath = band == null ? '' : `polygon(${band - 10}% 0, ${band + 4}% 0, ${band - 2}% 100%, ${band - 16}% 100%)`;
	}

	/* ---------- The login scene (city-host.js) ---------- */
	let cityReady = false, cityHooked = false, cityRequested = false;
	const cityConfig = () => window.Starchain?.cityConfig?.() || {};
	// where the login page draws its logo inside this same box (city.css: --left / --top / --size), scaled about the
	// centre by its reveal (city.js: .9 → 1, ease-out cubic over startupDuration × 1.6 ms)
	function loginLogo(ms) {
		const c = cityConfig(), size = (c.size ?? 37.5) / 100, left = (c.left ?? 4) / 100, top = (c.top ?? 1.75) / 100;
		const dur = Math.max(1, (c.startupDuration ?? 900) * 1.6), scale = .9 + .1 * (1 - Math.pow(1 - clamp(ms / dur), 3));
		const w = size * VW, x = left * VW, y = top * VH, h = w * 811 / 1940, cx = VW / 2, cy = VH / 2;
		return { x: cx + (x - cx) * scale, y: cy + (y - cy) * scale, w: w * scale, h: h * scale };
	}

	/* ---------- Frame ---------- */
	function frame(t) {
		PR.begin(); PL.begin();
		const cl = centreLogo();
		const cur = seg(t, T.curtain[0], T.curtain[1]);
		el.edge.style.transform = `translateY(${(VH * 1.02 * stroke(cur)).toFixed(1)}px)`;
		el.edge.style.opacity = (cur > 0 && cur < 1 ? 1 - seg(cur, .75, 1) : 0).toFixed(3);
		const dust = (.7 * seg(t, T.night, T.night + .4) * (1 - seg(t, T.white[0], T.white[1]))).toFixed(3);
		el.d1.style.opacity = el.d2.style.opacity = dust;
		el.d1.style.transform = `translateY(${((t * 30 * U) % 160).toFixed(1)}px)`;
		el.d2.style.transform = `translateY(${((t * 55 * U) % 210).toFixed(1)}px)`;
		const push = t < T.boom ? lerp(.88, 1, eio(seg(t, T.rain, T.boom))) : 1 + .028 * seg(t, T.boom + .3, T.white[1]) * (1 - eio(seg(t, T.white[1], T.glide[0])));
		const u = t - T.boom, kick = u > 0 && u < .6 ? 11 * U * Math.exp(-u * 14) : 0;   // only the final hit shakes the frame
		el.world.style.transform = `translate(${(kick * .4 * Math.sin(u * 47 + 1)).toFixed(2)}px, ${(kick * Math.sin(u * 64)).toFixed(2)}px) scale(${push.toFixed(4)})`;
		if (t > T.night - .1 && t < T.white[1]) { drawRings(t); drawLines(t); }
		drawSlices(t);
		if (t < T.boom + .02) placeLogo(VW / 2, LOGO_CY(), cl.w, 0, 0);
		else if (t < T.city) {
			const g = seg(t, T.gleam[0], T.gleam[1]);
			if (g > 0 && g < 1) placeLogo(VW / 2, LOGO_CY(), cl.w, 1, 0, .75, lerp(-20, 125, eio(g)));
			else placeLogo(VW / 2, LOGO_CY(), cl.w, 1, 0, Math.exp(-(t - T.boom) * 6.5) * .95);
		} else {
			const g = eio(seg(t, T.glide[0], T.glide[1])), L = loginLogo((t - T.city) * 1000);
			placeLogo(lerp(VW / 2, L.x + L.w / 2, g), lerp(LOGO_CY(), L.y + L.h / 2, g), lerp(cl.w, L.w, g), 1 - seg(t, T.hand[0], T.hand[1]), lerp(0, .45, g));
		}
		el.flash.style.opacity = (t >= T.boom ? Math.exp(-(t - T.boom) * 5) * .55 : 0).toFixed(3);
		const white = einc(seg(t, T.white[0], T.white[1]));
		const flareOn = t > T.flareIn && t < T.fogOut[1];
		el.flare.style.visibility = flareOn ? 'visible' : 'hidden';
		if (flareOn) {
			const fl = eio(seg(t, T.flareIn, T.white[0])), fIn = eio(seg(t, T.flareIn, T.flareIn + .45));
			const lx = VW / 2 + lerp(-.04, .14, fl) * cl.w + (hold.on ? Math.sin(hold.t * 1.2) * .03 * cl.w : 0), ly = LOGO_CY() - .3 * cl.h;
			const cx = VW / 2, cy = VH / 2, gx = k => cx + (cx - lx) * k, gy = k => cy + (cy - ly) * k;
			const fade = 1 - eoutc(seg(t, T.city, T.fogOut[1]));
			const set = (e, x, y, s, o) => { e.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(${s.toFixed(3)})`; e.style.opacity = clamp(o).toFixed(3); };
			set(el.core, lx, ly, (.6 + .3 * fl) * U * (1 + 9 * white), (fIn * (.95 + .05 * Math.sin(t * 2.4)) + white) * fade);
			set(el.streak, lx, ly, (.5 + .5 * fIn) * U * (1 + 2 * white), fIn * .85 * fade);
			set(el.g1, gx(.55), gy(.55), U, fIn * .7 * (1 - white) * fade);
			set(el.g2, gx(1.05), gy(1.05), U, fIn * .8 * (1 - white) * fade);
			set(el.g3, gx(1.6), gy(1.6), U, fIn * .6 * (1 - white) * fade);
		}
		const fogOut = eoutc(seg(t, T.fogOut[0], T.fogOut[1]));
		el.fog.style.opacity = (white * (1 - fogOut)).toFixed(3);
		el.cloud.style.opacity = (white * (1 - eoutc(seg(t, T.fogOut[0] + .1, T.fogOut[1] + .25)))).toFixed(3);
		el.cloud.style.transform = `scale(${(1 + .6 * eoutc(seg(t, T.white[0], T.fogOut[1] + .3))).toFixed(3)})`;
		const past = t >= T.city;
		if (past !== frame.past) { frame.past = past; el.night.style.visibility = el.d1.style.visibility = el.d2.style.visibility = el.rings.style.visibility = el.lines.style.visibility = past ? 'hidden' : ''; root.classList.toggle('is-city', past); }
		el.marks.style.opacity = (1 - seg(t, T.white[0], T.white[0] + .2)).toFixed(3);
		PR.end(); PL.end();
		el.tc.textContent = `00:00:${String(Math.floor(t)).padStart(2, '0')}:${String(Math.floor(t * 30) % 30).padStart(2, '0')}`;
	}

	/* ---------- Clock ---------- */
	const hold = { on: false, t: 0, total: 0 };
	let t = 0, last = 0, paintedAt = 0, raf = 0, hurry = false, started = false, finished = false, handedOff = false, clockStart = 0, cueNext = 0;
	const FRAME_MS = 1000 / 60;
	const stats = { frames: 0, dropped: 0, worst: 0, longTasks: 0, longTaskMs: 0, waitedForCity: 0, startDelay: 0, wallMs: 0, at: {}, gaps: [], warm: { city: 'none' } };   // at: intro-clock seconds of each milestone
	let resolveFirst, resolveHandoff, resolveDone;
	const boot = window.StarchainBoot = {
		active: true, deferCity: query.get('defer') === '1', loadCity: null,   // ?defer=1 (testing only): load the login scene at the final hit instead
		firstFrame: new Promise(r => resolveFirst = r),
		handoff: new Promise(r => resolveHandoff = r),
		done: new Promise(r => resolveDone = r),
		start() { startRequested = true; },
	};
	let startRequested = !inUnity, calmFrames = 0, armedAt = 0;
	let longObs = null;
	try { longObs = new PerformanceObserver(list => { if (!started || finished) return; for (const e of list.getEntries()) { stats.longTasks++; stats.longTaskMs += e.duration; } }); longObs.observe({ type: 'longtask', buffered: false }); } catch {}
	/* ---------- First-draw warm-up (see the header) ---------- */
	const cityFrame = () => document.querySelector('.city-frame');
	const postCity = (type, data = {}) => cityFrame()?.contentWindow?.postMessage({ channel: 'starchain-host', type, ...data }, '*');
	let ownWarm = false, ownLeft = 0, cityWarm = false, cityLeft = 0, gateAt = 0;
	function warmOwn(on) {
		if (on) { el.world.style.opacity = '.004'; frame(T.boom + .3); el.fog.style.opacity = el.cloud.style.opacity = '.004'; el.flare.style.visibility = 'visible'; }
		else { el.world.style.opacity = ''; frame(t); }
	}
	function warmCity(on, when) {
		if (on) { root.classList.add('is-warm'); document.documentElement.classList.add('starchain-presented'); stats.warm.city = when; }
		else { root.classList.remove('is-warm'); cityWarm = true; postCity('active', { value: false }); }   // drawn once; now hold it still
	}
	function hookCity(nt) {
		if (!cityHooked && window.StarchainCityReady) { cityHooked = true; window.StarchainCityReady.then(() => { cityReady = true; stats.at.cityReady = started ? +t.toFixed(2) : -Math.round(performance.now() - clockStartFallback()); }); }
		if (!cityRequested && (boot.deferCity ? nt >= T.boom && boot.loadCity : window.Starchain?.setBackground)) {
			cityRequested = true;
			if (boot.deferCity) boot.loadCity();
			stats.at.cityLoad = +nt.toFixed(2);
			if (!inUnity) window.Starchain?.setBackground?.('');   // in a plain browser nobody else asks for the background
		}
	}
	const clockStartFallback = () => clockStart || performance.now();
	function handoff() {
		if (handedOff) return; handedOff = true; stats.at.handoff = +t.toFixed(2);
		// the login scene appears behind the white: show its frame, drop the page's own startup cover, resume it, start its zoom
		root.classList.remove('is-warm');
		document.documentElement.classList.add('starchain-presented');
		postCity('active', { value: true });
		window.Starchain?.revealCity?.(0);
		resolveHandoff();
	}
	function finish() {
		finished = true; boot.active = false;
		cancelAnimationFrame(raf);
		cancelAnimationFrame(resizeRaf);
		removeEventListener('keydown', onKey, true); removeEventListener('resize', onResize);
		try { longObs?.disconnect(); } catch {}
		root.remove();     // free every layer, canvas and pooled shape
		stats.wallMs = Math.round(performance.now() - clockStart); stats.at.end = +t.toFixed(2);
		stats.worst = Math.round(stats.worst); stats.longTaskMs = Math.round(stats.longTaskMs); stats.waitedForCity = +hold.total.toFixed(2);
		send('intro-end', { json: JSON.stringify(stats) });
		resolveDone(stats);
	}
	function tick(now) {
		raf = requestAnimationFrame(tick);
		// WebView rAF follows a 144/165 Hz monitor even when capture presents fewer frames.
		// Advance the timeline by actual elapsed time, but avoid drawing frames capture cannot use.
		if (started) {
			const elapsed = now - paintedAt;
			if (elapsed < FRAME_MS) return;
			paintedAt = now - elapsed % FRAME_MS;
		}
		const dtMs = now - last, dt = Math.min(.05, dtMs / 1000); last = now;
		if (!started) {
			// wait for Unity to lift its cover; draw everything once under the black; then wait for calm frames,
			// so no beat ever plays through a first-draw stall
			if (!startRequested) { if (!armedAt) armedAt = now; if (now - armedAt > 2500) startRequested = true; return; }
			if (!gateAt) gateAt = now;
			hookCity(0);
			if (!ownWarm) { if (!ownLeft) { warmOwn(true); ownLeft = 4; return; } if (--ownLeft) return; warmOwn(false); ownWarm = true; return; }
			if (!cityWarm) {
				if (cityReady) { if (!cityLeft) { warmCity(true, 'before start'); cityLeft = 4; return; } if (--cityLeft) return; warmCity(false); return; }
				if (now - gateAt < CITY_WAIT_MS) return;
			}
			calmFrames = dtMs < 22 ? calmFrames + 1 : 0;
			if (!boot._calmSince) boot._calmSince = now;
			if (calmFrames < 4 && now - boot._calmSince < 1200) return;
			started = true; paintedAt = now; stats.startDelay = Math.round(now - startedAt); clockStart = now; root.classList.add('is-running');
			return;
		}
		stats.frames++; if (dtMs > 25) stats.dropped++; if (dtMs > stats.worst && stats.frames > 1) stats.worst = dtMs;
		if (dtMs > 50 && stats.frames > 1 && stats.gaps.length < 12) stats.gaps.push([+t.toFixed(2), Math.round(dtMs)]);   // [intro time, frame ms]
		let nt = t + dt * P.speed * (hurry ? 2 : 1);
		hookCity(nt);
		// a login scene that arrived after the start is warmed in the flare hold, the calmest beat
		if (cityReady && !cityWarm && !handedOff && nt > T.boom + .45) { if (!cityLeft) { warmCity(true, 'flare hold'); cityLeft = 4; } else if (!--cityLeft) warmCity(false); }
		if (!cityReady && nt > T.hold && hold.total < HOLD_MAX) { nt = T.hold; hold.on = true; hold.t += dt; hold.total += dt; } else hold.on = false;
		if (nt >= T.city) handoff();
		while (cueNext < T.voice.length && nt >= T.voice[cueNext][1]) { const name = T.voice[cueNext++][0]; send('intro-cue', { name }); stats.at['voice-' + name] = +nt.toFixed(2); }
		t = Math.min(T.end, nt);
		frame(t);
		if (t >= T.end) finish();
	}
	function onKey(e) { if (!boot.active) return; e.stopImmediatePropagation(); e.preventDefault(); hurry = true; }
	function onResize() {
		if (resizeRaf) return;
		resizeRaf = requestAnimationFrame(() => {
			resizeRaf = 0;
			if (finished) return;
			fit(); if (logoDecoded) bakeLogo(); buildLines(); frame(t);
		});
	}
	root.addEventListener('pointerdown', () => { hurry = true; });
	addEventListener('keydown', onKey, true);
	addEventListener('resize', onResize);

	const startedAt = performance.now();
	buildLines();
	frame(0);
	// paint the black first frame, tell Unity (it lifts its cover and calls start()), keep the loop alive meanwhile
	requestAnimationFrame(() => requestAnimationFrame(() => {
		resolveFirst();
		let tries = 0;
		const announce = () => { if (send('intro') || ++tries > 40 || !inUnity) return; setTimeout(announce, 50); };
		announce();
	}));
	logoReady.then(ok => {
		if (!ok) { console.warn('boot intro: boot-logo-cn.webp failed, skipping'); handoff(); finish(); return; }
		logoDecoded = true;
		bakeLogo();
		[HITS[2], T.boom + .1, T.boom + .5].forEach(x => frame(x));   // warm the light buffers and composite layers
		frame(0);
		last = performance.now();
		raf = requestAnimationFrame(tick);
	});
})();
