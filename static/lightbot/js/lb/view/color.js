import { clip, invariant } from "../../../../optdisco/js/utils";

export function parseHexColor(color) {
  invariant(color.length == 7, color);
  invariant(color);
  return [
    parseInt(color.slice(1, 3), 16),
    parseInt(color.slice(3, 5), 16),
    parseInt(color.slice(5, 7), 16),
  ];
}

export function colorToHex([r, g, b]) {
  function toHex(i) {
    return Math.round(clip(i, 0, 255)).toString(16).padStart(2, '0');
  }
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function rgbBlend(a, b, alpha) {
  invariant(0 <= alpha && alpha <= 1, alpha)
  a = Array.isArray(a) ? a : parseHexColor(a);
  b = Array.isArray(b) ? b : parseHexColor(b);
  return [
    alpha * a[0] + (1 - alpha) * b[0],
    alpha * a[1] + (1 - alpha) * b[1],
    alpha * a[2] + (1 - alpha) * b[2],
  ];
}
