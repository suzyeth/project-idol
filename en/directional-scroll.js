// Generated from js/drag-scroll.js by export-standalone.cjs.
(()=>{
/* One direction-locked gesture owner for native touch and WebView-injected
 * pointer/touch/mouse streams. CSS declares each panel's --scroll-axis. */
let installed = false, drag = null, blocked = null;
const editableText = node => {
 const el = node instanceof Element ? node : node?.parentElement;
 return !!el && (el.isContentEditable || !!el.closest('textarea,input:not([type=button],[type=submit],[type=reset],[type=checkbox],[type=radio],[type=range],[type=color],[type=file],[type=image])'));
};
function preventPageSelection() {
 // Leave pointer/touch presses untouched: scrolling, card holds and text editing own those gestures.
 document.addEventListener('selectstart', e => { if (!editableText(e.target)) e.preventDefault(); });
 document.addEventListener('contextmenu', e => { if (!editableText(e.target)) e.preventDefault(); });
 document.addEventListener('selectionchange', () => {
  const selection = document.getSelection();
  if (!selection || selection.isCollapsed || editableText(selection.anchorNode) && editableText(selection.focusNode)) return;
  selection.removeAllRanges();
 });
}
const overflow = value => /^(auto|scroll)$/.test(value);
function panelsAt(target) {
 const out = [];
 for (let el = target instanceof Element ? target : null; el; el = el.parentElement) {
  if (el.matches('textarea, input, select, [contenteditable="true"], .ls-frame')) return out;
  const css = getComputedStyle(el), axis = css.getPropertyValue('--scroll-axis').trim();
  if (axis === 'x' && overflow(css.overflowX) || axis === 'y' && overflow(css.overflowY)) out.push({ el, axis });
 }
 return out;
}
const extent = ({el, axis}) => axis === 'x' ? el.scrollWidth - el.clientWidth : el.scrollHeight - el.clientHeight;
function finish(cancelled = false) {
 if (!drag) return;
 const last = drag; drag = null;
 if (last.moved || cancelled) blocked = { panel: last.panel || last.panels[0].el, until: performance.now() + 500 };
 last.panel?.classList.remove('is-dragging');
 if (last.kind === 'pointer' && last.panel?.hasPointerCapture?.(last.id)) {
  try { last.panel.releasePointerCapture(last.id); } catch {}
 }
}
function start(kind, id, x, y, event) {
 if (drag || event.defaultPrevented) return;
 const editor = event.target.closest?.('textarea, [contenteditable="true"]');
 // Keep mouse text selection native; touch can still pan an editable area
 // inside a custom-scrolling dialog (whose touch-action blocks native panning).
 const touchEditor = editor && (kind === 'touch' || kind === 'pointer' && event.pointerType === 'touch');
 const panels = touchEditor ? ['x', 'y'].map(axis => ({ el: editor, axis })) : panelsAt(event.target);
 if (!panels.length) return;
 // Leave native scrollbars and editable controls to the browser.
 const first = panels[0].el, rect = first.getBoundingClientRect();
 const sx = rect.width / first.offsetWidth || 1, sy = rect.height / first.offsetHeight || 1;
 if (x >= rect.left + first.clientWidth * sx || y >= rect.top + first.clientHeight * sy) return;
 drag = { kind, id, x, y, panels, moved: false, panel: null };
 blocked = null;
 // No capture/preventDefault here: a stationary tap still activates its button.
}
function move(x, y, event) {
 if (!drag) return;
 const dx = x - drag.x, dy = y - drag.y;
 if (!drag.moved) {
  if (Math.hypot(dx, dy) < 5) return;
  drag.moved = true;
  const axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
  const choice = drag.panels.find(p => p.axis === axis && extent(p) > 1);
  if (choice) {
   drag.panel = choice.el; drag.axis = axis;
   const rect = choice.el.getBoundingClientRect();
   drag.scale = axis === 'x' ? rect.width / choice.el.offsetWidth : rect.height / choice.el.offsetHeight;
   drag.origin = axis === 'x' ? choice.el.scrollLeft : choice.el.scrollTop;
   choice.el.classList.add('is-dragging');
   if (drag.kind === 'pointer') { try { choice.el.setPointerCapture(drag.id); } catch {} }
  }
 }
 if (drag.panel) {
  if (drag.axis === 'x') drag.panel.scrollLeft = drag.origin - dx / (drag.scale || 1);
  else drag.panel.scrollTop = drag.origin - dy / (drag.scale || 1);
 }
 if (event.cancelable) event.preventDefault();
}
function installDirectionalScroll() {
 if (installed) return;
 installed = true;
 preventPageSelection();
 document.addEventListener('pointerdown', e => {
  if (e.isPrimary === false) { finish(true); return; }
  if (e.button === 0) start('pointer', e.pointerId, e.clientX, e.clientY, e);
 }, { passive: false });
 window.addEventListener('pointermove', e => { if (drag?.kind === 'pointer' && drag.id === e.pointerId) move(e.clientX, e.clientY, e); }, { passive: false });
 window.addEventListener('pointerup', e => { if (drag?.kind === 'pointer' && drag.id === e.pointerId) finish(); });
 window.addEventListener('pointercancel', e => { if (drag?.kind === 'pointer' && drag.id === e.pointerId) finish(true); });
 document.addEventListener('touchstart', e => {
  if (e.touches.length !== 1) { finish(true); return; }
  const t = e.touches[0]; start('touch', t.identifier, t.clientX, t.clientY, e);
 }, { passive: false });
 window.addEventListener('touchmove', e => {
  if (drag?.kind !== 'touch') return;
  if (e.touches.length !== 1) { finish(true); return; }
  const t = [...e.touches].find(t => t.identifier === drag.id);
  if (t) move(t.clientX, t.clientY, e);
 }, { passive: false });
 for (const type of ['touchend', 'touchcancel']) window.addEventListener(type, e => {
  if (drag?.kind === 'touch' && ![...e.touches].some(t => t.identifier === drag.id)) finish(type === 'touchcancel');
 });
 document.addEventListener('mousedown', e => { if (e.button === 0) start('mouse', 0, e.clientX, e.clientY, e); });
 window.addEventListener('mousemove', e => { if (drag?.kind === 'mouse') move(e.clientX, e.clientY, e); });
 window.addEventListener('mouseup', () => { if (drag?.kind === 'mouse') finish(); });
 document.addEventListener('click', e => {
  if (!blocked || performance.now() >= blocked.until || !blocked.panel.contains(e.target)) return;
  e.preventDefault(); e.stopImmediatePropagation(); blocked = null;
 }, true);
 document.addEventListener('keydown', () => { blocked = null; }, true);
 document.addEventListener('wheel', e => {
  if (e.defaultPrevented || e.ctrlKey) return;
  const p = panelsAt(e.target)[0];
  if (!p) return;
  const delta = p.axis === 'x' ? (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) : e.deltaY;
  const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? (p.axis === 'x' ? p.el.clientWidth : p.el.clientHeight) : 1;
  if (p.axis === 'x') p.el.scrollLeft += delta * unit; else p.el.scrollTop += delta * unit;
  if (e.cancelable) e.preventDefault();
 }, { passive: false });
 // Focus and animated/transformed children must never scroll a panel on its other axis.
 document.addEventListener('scroll', e => {
  const el = e.target;
  if (!(el instanceof Element) || el.matches('textarea, input, [contenteditable="true"]')) return;
  const axis = getComputedStyle(el).getPropertyValue('--scroll-axis').trim();
  if (axis === 'x' && el.scrollTop) el.scrollTop = 0;
  if (axis === 'y' && el.scrollLeft) el.scrollLeft = 0;
 }, true);
 window.addEventListener('blur', () => finish(true));
 document.addEventListener('visibilitychange', () => { if (document.hidden) finish(true); });
}
/** Existing dynamic viewers can also register a panel explicitly. */
function bindDragScroll(panel, { axis = 'y' } = {}) {
 installDirectionalScroll();
 const old = panel.style.getPropertyValue('--scroll-axis');
 panel.style.setProperty('--scroll-axis', axis);
 return () => {
  if (drag?.panels.some(p => p.el === panel)) finish(true);
  if (old) panel.style.setProperty('--scroll-axis', old); else panel.style.removeProperty('--scroll-axis');
 };
}

installDirectionalScroll();
})();
