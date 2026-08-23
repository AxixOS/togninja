// Keep a floating widget on screen, at whatever size it currently is.
//
// The agent chat widget saved one position and reused it for two very different things.
// The clamp was written against the closed button — 72 by 72 — while the open window is
// 720 by 720. Drag the button to the right-hand edge, which is entirely legal for
// something 72px wide, then open it: the window is drawn from the same left/top and ten
// times the width, so most of it hangs off the screen.
//
// And it could not be dragged back, because only the closed button carried a pointer
// handler. The window inherited the position and no way to change it.
//
// Sizes therefore travel with the clamp, and the clamp is re-applied whenever the widget
// changes size or the viewport does.

export interface Point { x: number; y: number; }
export interface Size { width: number; height: number; }

/** The margin kept between the widget and the edge of the viewport. */
const EDGE = 8;

/**
 * Move a point so a box of this size sits fully on screen.
 *
 * When the viewport is smaller than the widget — a phone against the 720px chat window —
 * the top-left corner wins, because a widget pinned to the bottom-right of a screen it
 * does not fit on shows its bottom-right corner and hides its own header and close button.
 */
export function clampToViewport(
  pos: Point,
  size: Size,
  viewport: Size,
): Point {
  const maxX = Math.max(EDGE, viewport.width - size.width - EDGE);
  const maxY = Math.max(EDGE, viewport.height - size.height - EDGE);
  return {
    x: Math.round(Math.min(Math.max(pos.x, EDGE), maxX)),
    y: Math.round(Math.min(Math.max(pos.y, EDGE), maxY)),
  };
}

/** Did the pointer travel far enough to count as a drag rather than a click? */
export function isDrag(from: Point, to: Point, slop = 4): boolean {
  return Math.abs(to.x - from.x) >= slop || Math.abs(to.y - from.y) >= slop;
}

/**
 * The widget's size for the state it is in.
 *
 * Kept beside the clamp rather than inline at the call site, because the whole defect was
 * a size constant that stopped matching what was on screen.
 */
export function widgetSize(state: 'button' | 'minimized' | 'open'): Size {
  switch (state) {
    case 'open': return { width: 720, height: 720 };
    case 'minimized': return { width: 384, height: 56 };  // w-96 h-14
    default: return { width: 72, height: 72 };
  }
}
