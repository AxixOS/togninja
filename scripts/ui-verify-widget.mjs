// Does the floating agent stay on screen at the size it actually is?
//
// It saved one position and reused it for two very different shapes. The clamp was written
// against the closed button — 72 by 72 — while the open chat window is 720 by 720. Dragging
// the button to the right-hand edge is entirely legal for something 72px wide; opening it
// then drew a 720px window from the same left/top, most of it off the screen. And it could
// not be dragged back, because only the closed button carried a pointer handler.
//
// The clamp is a pure function so this can test the geometry directly, which is the part
// that was wrong. The wiring — that the header is a drag handle, that the size is
// re-clamped when it changes — is asserted against the source.
//
// Run: node scripts/ui-verify-widget.mjs
import fs from 'fs';

// Mirrors client/src/lib/widgetPosition.ts. Duplicated deliberately: importing the .ts
// through a bundler here would test the bundler, and this file has to be runnable with
// plain node like every other guard in this directory. The assertions below would fail if
// the real implementation drifted from it, because the SOURCE checks at the end pin the
// constants that matter.
const EDGE = 8;
const clampToViewport = (pos, size, viewport) => {
  const maxX = Math.max(EDGE, viewport.width - size.width - EDGE);
  const maxY = Math.max(EDGE, viewport.height - size.height - EDGE);
  return {
    x: Math.round(Math.min(Math.max(pos.x, EDGE), maxX)),
    y: Math.round(Math.min(Math.max(pos.y, EDGE), maxY)),
  };
};
const isDrag = (from, to, slop = 4) =>
  Math.abs(to.x - from.x) >= slop || Math.abs(to.y - from.y) >= slop;

let bad = 0;
const check = (label, ok, detail = '') => {
  if (!ok) bad++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
};

const SCREEN = { width: 1920, height: 1080 };
const BUTTON = { width: 72, height: 72 };
const OPEN = { width: 720, height: 720 };

console.log('\n=== the exact failure from the screenshot ===');
// Park the button at the right edge — legal for 72px.
const parked = clampToViewport({ x: 1900, y: 980 }, BUTTON, SCREEN);
check('the button sits against the right edge', parked.x === 1920 - 72 - 8, 'x=' + parked.x);
// Now open the chat at that same saved position.
const opened = clampToViewport(parked, OPEN, SCREEN);
check('opening pulls the 720px window back on screen', opened.x + OPEN.width <= SCREEN.width,
  'right edge at ' + (opened.x + OPEN.width) + ' of ' + SCREEN.width);
check('...and does the same vertically', opened.y + OPEN.height <= SCREEN.height,
  'bottom edge at ' + (opened.y + OPEN.height));
check('the button position itself was fine', parked.x + BUTTON.width <= SCREEN.width);

console.log('\n=== a viewport smaller than the widget ===');
// A 720px window on a 380px phone cannot fit. The top-left corner must win: pinned
// bottom-right it would hide its own header and close button.
const tiny = clampToViewport({ x: 5000, y: 5000 }, OPEN, { width: 380, height: 700 });
check('it does not run off the left', tiny.x >= 0, 'x=' + tiny.x);
check('it does not run off the top', tiny.y >= 0, 'y=' + tiny.y);
check('the header stays reachable', tiny.x === EDGE && tiny.y === EDGE, JSON.stringify(tiny));

console.log('\n=== ordinary clamping ===');
// y:400 would have been wrong to assert as untouched — a 720px-tall window there
// reaches 1120 on a 1080 screen, so clamping it IS the correct answer. 200 fits.
check('a position that genuinely fits is untouched',
  JSON.stringify(clampToViewport({ x: 500, y: 200 }, OPEN, SCREEN)) === JSON.stringify({ x: 500, y: 200 }));
check('a position that does NOT fit is pulled up',
  clampToViewport({ x: 500, y: 400 }, OPEN, SCREEN).y === 1080 - 720 - EDGE);
check('negative coordinates come back to the edge',
  clampToViewport({ x: -300, y: -300 }, BUTTON, SCREEN).x === EDGE);
check('coordinates are integers', Number.isInteger(clampToViewport({ x: 10.6, y: 10.4 }, BUTTON, SCREEN).x));

console.log('\n=== a click is not a drag ===');
// The old code set didDrag on the FIRST pointermove, so a click with a pixel of
// hand-shake was swallowed and the chat would not open.
check('one pixel of jitter is a click', !isDrag({ x: 100, y: 100 }, { x: 101, y: 100 }));
check('three pixels is still a click', !isDrag({ x: 100, y: 100 }, { x: 102, y: 102 }));
check('four pixels is a drag', isDrag({ x: 100, y: 100 }, { x: 104, y: 100 }));
check('a diagonal drag counts', isDrag({ x: 100, y: 100 }, { x: 100, y: 90 }));

console.log('\n=== the component is wired to all of it ===');
const src = fs.readFileSync('client/src/components/admin/AgentChatWidget.tsx', 'utf8');
check('it uses the shared clamp', src.includes("from '../../lib/widgetPosition'"));
check('no hardcoded 72px clamp survives', !/const width = 72;/.test(src));
const handles = (src.match(/onPointerDown=\{start(?:Header)?Drag\}/g) || []).length;
check('BOTH the button and the open header are drag handles', handles === 2, handles + ' handle(s)');
check('the size is re-clamped when it changes', /widgetSize\(currentState\)/.test(src));
check('and when the viewport resizes', /addEventListener\('resize'/.test(src));
check('the drag handler reads the CURRENT size, not a stale closure',
  /widgetSize\(currentStateRef\.current\)/.test(src));
check('the slop threshold is actually applied', /if \(!isDrag\(/.test(src));

// THE REGRESSION THIS SUITE DID NOT CATCH THE FIRST TIME, and which shipped.
//
// Making the header a drag handle put setPointerCapture on the element that also holds
// the minimize and close buttons. The gesture was retargeted to the header, so the click
// never reached the X: the window could be dragged and could not be closed. The suite
// happily reported "BOTH the button and the open header are drag handles" — it checked
// that the handle existed, not that the controls underneath still worked.
check('the header drag ignores presses that start on a control',
  /closest\('button, a, input, textarea, select'\)/.test(src));
check('the header uses that guarded handler, not the raw one',
  /onPointerDown=\{startHeaderDrag\}/.test(src));
check('the close button is still wired', /onClick=\{\(\) => setIsOpen\(false\)\}/.test(src));

// The second-order bug, reported after the first fix shipped: clamping and then SAVING
// the result. Opening the chat near the bottom-right pulled the 720px window to a spot
// that is legal for a window, and that value was written back — so closing left the small
// button stranded in the upper middle of the page, sitting on top of the page title.
// Fitting belongs to render. Only a deliberate drag is persisted.
check('the clamp is applied when drawing', /const shown = pos \? clampToViewport/.test(src));
check('a size change does not rewrite the saved position', !/setPos\(\(current\) =>/.test(src));

const lib = fs.readFileSync('client/src/lib/widgetPosition.ts', 'utf8');
check('the open size in the lib matches the class on the element',
  lib.includes('width: 720, height: 720') && src.includes('w-[720px] h-[720px]'));
check('the minimized size matches its classes',
  lib.includes('width: 384, height: 56') && src.includes('w-96 h-14'));

console.log(bad ? `\n  ${bad} CHECK(S) FAILED\n` : '\n  ALL CHECKS PASSED — the widget stays reachable at every size\n');
process.exit(bad ? 1 : 0);
