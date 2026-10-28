/* ZTheme: deterministic palette engine shared by Theme Studio (owner) and the public storefront. No AI, no network. */
(function (root) {
'use strict';
function hex2rgb(h) { h = String(h || '').replace('#', ''); if (h.length !== 6) return [212, 175, 55]; return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
function rgb2hex(r, g, b) { return '#' + [r, g, b].map(function (v) { v = Math.max(0, Math.min(255, Math.round(v))); return (v < 16 ? '0' : '') + v.toString(16); }).join(''); }
function rgb2hsl(r, g, b) { r /= 255; g /= 255; b /= 255; var mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, h = 0, s = 0, d = mx - mn; if (d) { s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; } return [h, s * 100, l * 100]; }
function hsl2hex(h, s, l) { h = ((h % 360) + 360) % 360; s = Math.max(0, Math.min(100, s)) / 100; l = Math.max(0, Math.min(100, l)) / 100; var c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2, r = 0, g = 0, b = 0; if (h < 60) { r = c; g = x; } else if (h < 120) { r = x; g = c; } else if (h < 180) { g = c; b = x; } else if (h < 240) { g = x; b = c; } else if (h < 300) { r = x; b = c; } else { r = c; b = x; } return rgb2hex((r + m) * 255, (g + m) * 255, (b + m) * 255); }
function lum(hex) { var a = hex2rgb(hex).map(function (v) { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * a[0] + .7152 * a[1] + .0722 * a[2]; }
function ratio(a, b) { var x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); }

var PRESETS = [
  { id: 'obsidian-gold', name: 'Obsidian Gold', primary: '#d6b875', mode: 'dark', font: 'modern', radius: 'soft', button: 'solid' },
  { id: 'emerald-luxe', name: 'Emerald Luxe', primary: '#10b981', mode: 'dark', font: 'modern', radius: 'soft', button: 'solid' },
  { id: 'electric-blue', name: 'Electric Blue', primary: '#3b82f6', mode: 'dark', font: 'modern', radius: 'soft', button: 'solid' },
  { id: 'violet-pulse', name: 'Violet Pulse', primary: '#8b5cf6', mode: 'dark', font: 'modern', radius: 'round', button: 'solid' },
  { id: 'rose-modern', name: 'Rose Modern', primary: '#e11d74', mode: 'light', font: 'friendly', radius: 'round', button: 'solid' },
  { id: 'clean-light', name: 'Clean Light', primary: '#1f2937', mode: 'light', font: 'classic', radius: 'sharp', button: 'solid' }
];
var CATEGORY_DEFAULT = { fashion: '#e7c4b0', shoes_accessories: '#7fb2ff', beauty_wigs: '#f0a6ca', perfume_cosmetics: '#c7a8ff', electronics: '#4fe0cf', restaurant: '#ff9f43', rental: '#4fa3ff', services: '#b794f6', general: '#d6b875' };
var FONTS = { modern: "Geist, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif", classic: "Georgia, 'Times New Roman', serif", friendly: "'Trebuchet MS', 'Segoe UI', system-ui, sans-serif" };
var RADII = { sharp: [4, 4], soft: [14, 12], round: [22, 999] };

function defaults(category) { return { preset: '', primary: CATEGORY_DEFAULT[category] || CATEGORY_DEFAULT.general, mode: 'dark', font: 'modern', radius: 'soft', button: 'solid' }; }
var GF = { 'Clean & modern': ['Inter', 'Poppins', 'DM Sans', 'Manrope', 'Plus Jakarta Sans', 'Outfit', 'Urbanist', 'Sora', 'Lexend', 'Montserrat', 'Raleway', 'Nunito Sans', 'Work Sans', 'Figtree', 'Albert Sans'], 'Elegant serif': ['Playfair Display', 'Cormorant Garamond', 'Lora', 'Merriweather', 'DM Serif Display', 'Libre Baskerville', 'Bodoni Moda', 'Cinzel', 'Fraunces', 'EB Garamond', 'Crimson Text'], 'Bold & display': ['Bebas Neue', 'Anton', 'Oswald', 'Archivo Black', 'Syne', 'Unbounded', 'Righteous', 'Abril Fatface', 'Rubik', 'Barlow Condensed', 'Space Grotesk'], 'Friendly & rounded': ['Nunito', 'Quicksand', 'Comfortaa', 'Baloo 2', 'Fredoka', 'Varela Round', 'Mulish'], 'Handwritten & luxe': ['Pacifico', 'Dancing Script', 'Great Vibes', 'Satisfy', 'Caveat', 'Lobster', 'Sacramento', 'Parisienne', 'Allura'], 'Techy & mono': ['JetBrains Mono', 'Space Mono', 'IBM Plex Mono', 'Orbitron', 'Exo 2'] };
function validFont(f) { return !!FONTS[f] || /^g:[A-Za-z0-9 ]{2,40}$/.test(f || ''); }
var _loadedF = {};
function loadFont(f) { if (!/^g:/.test(f || '') || typeof document === 'undefined') return; var n = f.slice(2); if (_loadedF[n] || !validFont(f)) return; _loadedF[n] = 1; var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?family=' + encodeURIComponent(n).replace(/%20/g, '+') + ':wght@400;500;600;700;800&display=swap'; document.head.appendChild(l); }
function fontCss(f) { if (FONTS[f]) return FONTS[f]; if (validFont(f)) return "'" + f.slice(2) + "', system-ui, sans-serif"; return FONTS.modern; }
function normalize(t, category) { var d = defaults(category); t = t || {}; var o = {}; Object.keys(d).forEach(function (k) { o[k] = t[k] || d[k]; }); if (!/^#[0-9a-fA-F]{6}$/.test(o.primary)) o.primary = d.primary; if (!validFont(o.font)) o.font = d.font; return o; }

/* Build every colour from ONE primary colour, then check contrast and fix what fails. */
function build(theme, category) {
  var t = normalize(theme, category), rgb = hex2rgb(t.primary), hsl = rgb2hsl(rgb[0], rgb[1], rgb[2]), h = hsl[0], s = hsl[1], dark = t.mode === 'dark', notes = [], tk = {};
  var ns = Math.min(s, 28);
  tk.bg = dark ? hsl2hex(h, ns * .6, 6) : hsl2hex(h, Math.min(ns, 30), 98);
  tk.surface = dark ? hsl2hex(h, ns * .6, 10.5) : '#ffffff';
  tk.inset = dark ? hsl2hex(h, ns * .6, 8) : hsl2hex(h, Math.min(ns, 30), 95);
  tk.border = dark ? hsl2hex(h, ns * .5, 19) : hsl2hex(h, Math.min(ns, 25), 87);
  tk.text = dark ? hsl2hex(h, 14, 95) : hsl2hex(h, Math.min(ns, 30), 9);
  tk.muted = dark ? hsl2hex(h, 10, 68) : hsl2hex(h, 10, 36);
  var p = t.primary, pl = hsl[2];
  if (ratio(p, tk.bg) < 3) { var step = 0, q = hsl2hex(h, s, pl); while (ratio(q, tk.bg) < 3 && step < 40) { pl += dark ? 2 : -2; q = hsl2hex(h, s, pl); step++; } if (q !== p) { notes.push('Your colour was adjusted slightly so buttons and highlights stay visible on the ' + (dark ? 'dark' : 'light') + ' background.'); p = q; } }
  tk.primary = p;
  tk.onPrimary = ratio('#000000', p) >= ratio('#ffffff', p) ? '#0a0a0a' : '#ffffff';
  tk.accent = hsl2hex(h + 28, Math.min(s + 5, 70), dark ? 66 : 42);
  if (ratio(tk.text, tk.bg) < 4.5) { tk.text = dark ? '#ffffff' : '#000000'; notes.push('Text colour was corrected for readability.'); }
  if (ratio(tk.muted, tk.bg) < 4.5) { tk.muted = dark ? hsl2hex(h, 10, 78) : hsl2hex(h, 10, 28); notes.push('Supporting text was lightened for readability.'); }
  tk.radius = RADII[t.radius][0]; tk.btnRadius = RADII[t.radius][1]; tk.fontId = t.font; tk.font = fontCss(t.font); tk.button = t.button; tk.mode = t.mode;
  tk.notes = notes; tk.contrast = { text: Math.round(ratio(tk.text, tk.bg) * 10) / 10, button: Math.round(ratio(tk.onPrimary, tk.primary) * 10) / 10 };
  return tk;
}
function cssVars(tk) { loadFont(tk.fontId); return { '--bg': tk.bg, '--surface': tk.surface, '--inset': tk.inset, '--line': tk.border, '--tx': tk.text, '--mut': tk.muted, '--acc': tk.primary, '--onacc': tk.onPrimary, '--acc2': tk.accent, '--r': tk.radius + 'px', '--rb': tk.btnRadius + 'px', '--font': tk.font }; }
root.ZTheme = { GF: GF, validFont: validFont, loadFont: loadFont, PRESETS: PRESETS, FONTS: FONTS, defaults: defaults, normalize: normalize, build: build, cssVars: cssVars, ratio: ratio };
})(typeof window !== 'undefined' ? window : this);
