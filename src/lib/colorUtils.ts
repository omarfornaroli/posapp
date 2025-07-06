
// src/lib/colorUtils.ts

export interface HslColor {
  h: number;
  s: number;
  l: number;
}

/**
 * Converts a HEX color string to an HSL object.
 * Supports formats like #RRGGBB, #RGB.
 */
export function hexToHsl(hex: string): HslColor | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex) || /^#?([a-f\d])([a-f\d])([a-f\d])$/i.exec(hex);
  if (!result) return null;

  let rStr, gStr, bStr;
  if (result[0].length <= 4) { // #RGB format
    rStr = result[1] + result[1];
    gStr = result[2] + result[2];
    bStr = result[3] + result[3];
  } else { // #RRGGBB format
    rStr = result[1];
    gStr = result[2];
    bStr = result[3];
  }

  let r = parseInt(rStr, 16) / 255;
  let g = parseInt(gStr, 16) / 255;
  let b = parseInt(bStr, 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max === min) {
    h = s = 0; // achromatic
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: parseFloat((s * 100).toFixed(1)),
    l: parseFloat((l * 100).toFixed(1)),
  };
}

/**
 * Converts an HSL color object to a HEX string.
 */
export function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));

  const toHex = (x: number) => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

/**
 * Parses an HSL string (e.g., "H S% L%") into an HSL object.
 * Allows for float values for S and L, and rounds H.
 */
export function parseHslString(hslString: string): HslColor | null {
  if (!hslString || typeof hslString !== 'string') return null;
  const match = hslString.match(/^(\d{1,3})\s+(\d{1,3}(?:\.\d+)?)%\s+(\d{1,3}(?:\.\d+)?)%$/);
  if (!match) return null;
  
  const h = parseInt(match[1], 10);
  const s = parseFloat(match[2]);
  const l = parseFloat(match[3]);

  if (isNaN(h) || isNaN(s) || isNaN(l) || 
      h < 0 || h > 360 || s < 0 || s > 100 || l < 0 || l > 100) {
    return null; // Basic validation for HSL ranges
  }

  return {
    h: Math.round(h),
    s: parseFloat(s.toFixed(1)),
    l: parseFloat(l.toFixed(1)),
  };
}

/**
 * Formats an HSL color object into an HSL string (e.g., "H S% L%").
 * Ensures S and L are formatted with one decimal place if not whole numbers.
 */
export function formatHslToString(hsl: HslColor): string {
  const formatVal = (val: number) => (val % 1 === 0 ? val.toString() : val.toFixed(1));
  return `${Math.round(hsl.h)} ${formatVal(hsl.s)}% ${formatVal(hsl.l)}%`;
}
