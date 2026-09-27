// number formatting helpers

const intFmt = new Intl.NumberFormat("en-US");

export const int = (n: number) => intFmt.format(Math.round(n));

// 0.4521 -> "45.2%"
export const pct = (x: number, digits = 1) => `${(x * 100).toFixed(digits)}%`;

// 0.1092 -> "+10.9" (percentage points)
export const pts = (x: number, digits = 1) => {
  const v = x * 100;
  const s = v.toFixed(digits);
  return v > 0 ? `+${s}` : s.replace("-", "−");
};

export const fixed = (x: number, digits = 3) => x.toFixed(digits);

// real minus sign for negative numbers in display text
export const signed = (x: number, digits = 2) =>
  x > 0 ? `+${x.toFixed(digits)}` : x.toFixed(digits).replace("-", "−");
