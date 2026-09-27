// chart colors as hex for places css variables can't reach (canvas, interpolation).
// validated with the dataviz palette checker against the dark surface #10141b.
import { interpolateLab, piecewise } from "d3-interpolate";

export const C = {
  surface: "#10141b",
  bg: "#0a0d12",
  ink: "#f2f4f7",
  ink2: "#b4bcc8",
  ink3: "#7c8594",
  accent: "#ea6325",
  cool: "#3a8ce8",
  neutral: "#5c6574",
  grid: "#1f2530",
  axis: "#2d3440",
};

// ordinal ramp for defender distance bands, tight -> open
export const DEFENDER_RAMP = ["#7a3417", "#a8461d", "#d95926", "#f39060"];

// diverging: below league average (blue) -> neutral gray -> above (orange)
const diverging = piecewise(interpolateLab, ["#86b6ef", "#3a8ce8", "#1f4f86", "#2b3038", "#8a3a17", "#ea6325", "#f7a47a"]);

// map a make probability to color, centered on the league average
export function fgColor(p: number, center: number, spread = 0.3) {
  const t = Math.max(0, Math.min(1, 0.5 + (p - center) / (2 * spread)));
  return diverging(t);
}
