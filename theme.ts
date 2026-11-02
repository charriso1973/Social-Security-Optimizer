// Color theme and luminance-calibrated heat ramp for Social Security Optimizer

export const HEAT_RAMP = {
  screen: ['#b25349', '#cf8a52', '#d8bf5e', '#8fae5c', '#4f9e6d'],
  print: ['#b0483d', '#cd7f43', '#c2a23a', '#7c9e45', '#3f9160'],
};

const _hex2rgb = (h: string): [number, number, number] => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
];

export const rampAt = (ramp: string[], t: number): [number, number, number] => {
  const n = ramp.length - 1;
  const x = Math.max(0, Math.min(1, t)) * n;
  const i = Math.min(n - 1, Math.floor(x));
  const a = _hex2rgb(ramp[i]);
  const b = _hex2rgb(ramp[i + 1]);
  const f = x - i;
  return [
    Math.round(a[0] + (b[0] - a[0]) * f),
    Math.round(a[1] + (b[1] - a[1]) * f),
    Math.round(a[2] + (b[2] - a[2]) * f),
  ];
};

const _luminance = ([r, g, b]: [number, number, number]): number => {
  const s = (c: number) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * s(r) + 0.7152 * s(g) + 0.0722 * s(b);
};

export const heatLabelColor = (ramp: string[], norm: number): string => {
  const rgb = rampAt(ramp, norm);
  return _luminance(rgb) > 0.22 ? '#1e293b' : '#ffffff';
};

export const heatBgColor = (ramp: string[], norm: number): string => {
  const [r, g, b] = rampAt(ramp, norm);
  return `rgb(${r}, ${g}, ${b})`;
};

