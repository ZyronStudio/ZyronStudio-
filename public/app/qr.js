/* Minimal QR Code generator (byte mode, ECC level M). Written for Zyron; follows ISO/IEC 18004. */
(function (root) {
'use strict';
var ECC = [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28];
var BLK = [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49];

function rawModules(v) {
  var r = (16 * v + 128) * v + 64;
  if (v >= 2) { var n = Math.floor(v / 7) + 2; r -= (25 * n - 10) * n - 55; if (v >= 7) r -= 36; }
  return r;
}
function dataCodewords(v) { return Math.floor(rawModules(v) / 8) - ECC[v] * BLK[v]; }
function gmul(x, y) { var z = 0; for (var i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11D); z ^= ((y >>> i) & 1) * x; } return z; }
function rsDivisor(n) {
  var r = []; for (var i = 0; i < n - 1; i++) r.push(0); r.push(1); var root = 1;
  for (i = 0; i < n; i++) { for (var j = 0; j < r.length; j++) { r[j] = gmul(r[j], root); if (j + 1 < r.length) r[j] ^= r[j + 1]; } root = gmul(root, 2); }
  return r;
}
function rsRemainder(data, div) {
  var r = div.map(function () { return 0; });
  data.forEach(function (b) { var f = b ^ r.shift(); r.push(0); div.forEach(function (c, i) { r[i] ^= gmul(c, f); }); });
  return r;
}
function utf8(s) {
  var o = [], b = unescape(encodeURIComponent(s)); for (var i = 0; i < b.length; i++) o.push(b.charCodeAt(i)); return o;
}

function encode(text) {
  var bytes = utf8(String(text)), ver = 0, v;
  for (v = 1; v <= 40; v++) { var cc = v <= 9 ? 8 : 16; if (4 + cc + bytes.length * 8 <= dataCodewords(v) * 8) { ver = v; break; } }
  if (!ver) return null;
  var bits = [];
  function put(val, len) { for (var i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1); }
  put(4, 4); put(bytes.length, ver <= 9 ? 8 : 16); bytes.forEach(function (b) { put(b, 8); });
  var cap = dataCodewords(ver) * 8;
  put(0, Math.min(4, cap - bits.length)); put(0, (8 - bits.length % 8) % 8);
  for (var pad = 0xEC; bits.length < cap; pad ^= 0xEC ^ 0x11) put(pad, 8);
  var data = []; for (var i = 0; i < bits.length; i += 8) { var x = 0; for (var k = 0; k < 8; k++) x = (x << 1) | bits[i + k]; data.push(x); }

  // error correction + interleave
  var nb = BLK[ver], el = ECC[ver], raw = Math.floor(rawModules(ver) / 8), nShort = nb - raw % nb, sLen = Math.floor(raw / nb), blocks = [], div = rsDivisor(el), kk = 0;
  for (i = 0; i < nb; i++) {
    var d = data.slice(kk, kk + sLen - el + (i < nShort ? 0 : 1)); kk += d.length;
    var e = rsRemainder(d, div); if (i < nShort) d.push(0); blocks.push(d.concat(e));
  }
  var out = [];
  for (i = 0; i < blocks[0].length; i++) blocks.forEach(function (b, j) { if (i !== sLen - el || j >= nShort) out.push(b[i]); });

  var size = ver * 4 + 17, M = [], F = [];
  for (i = 0; i < size; i++) { M.push(new Array(size).fill(false)); F.push(new Array(size).fill(false)); }
  function setF(x, y, d) { M[y][x] = d; F[y][x] = true; }
  for (i = 0; i < size; i++) { setF(6, i, i % 2 === 0); setF(i, 6, i % 2 === 0); }
  function finder(cx, cy) {
    for (var dy = -4; dy <= 4; dy++) for (var dx = -4; dx <= 4; dx++) {
      var dist = Math.max(Math.abs(dx), Math.abs(dy)), xx = cx + dx, yy = cy + dy;
      if (xx >= 0 && xx < size && yy >= 0 && yy < size) setF(xx, yy, dist !== 2 && dist !== 4);
    }
  }
  finder(3, 3); finder(size - 4, 3); finder(3, size - 4);
  var pos = [];
  if (ver > 1) {
    var na = Math.floor(ver / 7) + 2, step = ver === 32 ? 26 : Math.ceil((ver * 4 + 4) / (na * 2 - 2)) * 2; pos = [6];
    for (var p = size - 7; pos.length < na; p -= step) pos.splice(1, 0, p);
  }
  pos.forEach(function (ax, ia) {
    pos.forEach(function (ay, ib) {
      if ((ia === 0 && ib === 0) || (ia === 0 && ib === pos.length - 1) || (ia === pos.length - 1 && ib === 0)) return;
      for (var dy = -2; dy <= 2; dy++) for (var dx = -2; dx <= 2; dx++) setF(ax + dx, ay + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    });
  });
  function fmt(mask) {
    var dd = (0 << 3) | mask, rem = dd; for (var i2 = 0; i2 < 10; i2++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    var b = ((dd << 10) | rem) ^ 0x5412;
    function bit(n) { return ((b >>> n) & 1) !== 0; }
    for (var j = 0; j <= 5; j++) setF(8, j, bit(j));
    setF(8, 7, bit(6)); setF(8, 8, bit(7)); setF(7, 8, bit(8));
    for (j = 9; j < 15; j++) setF(14 - j, 8, bit(j));
    for (j = 0; j < 8; j++) setF(size - 1 - j, 8, bit(j));
    for (j = 8; j < 15; j++) setF(8, size - 15 + j, bit(j));
    setF(8, size - 8, true);
  }
  fmt(0);
  if (ver >= 7) {
    var rem2 = ver; for (i = 0; i < 12; i++) rem2 = (rem2 << 1) ^ ((rem2 >>> 11) * 0x1F25);
    var vb = (ver << 12) | rem2;
    for (i = 0; i < 18; i++) { var bt = ((vb >>> i) & 1) !== 0, a = size - 11 + i % 3, b2 = Math.floor(i / 3); setF(a, b2, bt); setF(b2, a, bt); }
  }
  // data placement
  var bi = 0;
  for (var right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (var vert = 0; vert < size; vert++) for (var j2 = 0; j2 < 2; j2++) {
      var x2 = right - j2, up = ((right + 1) & 2) === 0, y2 = up ? size - 1 - vert : vert;
      if (!F[y2][x2] && bi < out.length * 8) { M[y2][x2] = ((out[bi >>> 3] >>> (7 - (bi & 7))) & 1) !== 0; bi++; }
    }
  }
  function applyMask(m) {
    for (var y = 0; y < size; y++) for (var x = 0; x < size; x++) {
      var inv;
      switch (m) {
        case 0: inv = (x + y) % 2 === 0; break; case 1: inv = y % 2 === 0; break; case 2: inv = x % 3 === 0; break; case 3: inv = (x + y) % 3 === 0; break;
        case 4: inv = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break; case 5: inv = x * y % 2 + x * y % 3 === 0; break;
        case 6: inv = (x * y % 2 + x * y % 3) % 2 === 0; break; default: inv = ((x + y) % 2 + x * y % 3) % 2 === 0;
      }
      if (!F[y][x] && inv) M[y][x] = !M[y][x];
    }
  }
  function penalty() {
    var s = 0, x, y, run, dark = 0;
    for (y = 0; y < size; y++) { run = 1; for (x = 1; x < size; x++) { if (M[y][x] === M[y][x - 1]) { run++; if (run === 5) s += 3; else if (run > 5) s++; } else run = 1; } }
    for (x = 0; x < size; x++) { run = 1; for (y = 1; y < size; y++) { if (M[y][x] === M[y - 1][x]) { run++; if (run === 5) s += 3; else if (run > 5) s++; } else run = 1; } }
    for (y = 0; y < size - 1; y++) for (x = 0; x < size - 1; x++) { var c = M[y][x]; if (c === M[y][x + 1] && c === M[y + 1][x] && c === M[y + 1][x + 1]) s += 3; }
    var P1 = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0], P2 = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];
    function matchAt(get) { var m1 = true, m2 = true; for (var k = 0; k < 11; k++) { var v2 = get(k) ? 1 : 0; if (v2 !== P1[k]) m1 = false; if (v2 !== P2[k]) m2 = false; } return (m1 ? 1 : 0) + (m2 ? 1 : 0); }
    for (y = 0; y < size; y++) for (x = 0; x + 10 < size; x++) s += 40 * matchAt(function (k) { return M[y][x + k]; });
    for (x = 0; x < size; x++) for (y = 0; y + 10 < size; y++) s += 40 * matchAt(function (k) { return M[y + k][x]; });
    for (y = 0; y < size; y++) for (x = 0; x < size; x++) if (M[y][x]) dark++;
    var tot = size * size; s += (Math.ceil(Math.abs(dark * 20 - tot * 10) / tot) - 1) * 10;
    return s;
  }
  var best = 0, bestP = Infinity;
  for (var m = 0; m < 8; m++) { applyMask(m); fmt(m); var pn = penalty(); if (pn < bestP) { bestP = pn; best = m; } applyMask(m); }
  applyMask(best); fmt(best);
  return { size: size, modules: M, version: ver };
}

function svg(text, opts) {
  opts = opts || {}; var q = encode(text); if (!q) return '';
  var n = q.size, quiet = 3, d = '';
  for (var y = 0; y < n; y++) {
    var x = 0;
    while (x < n) { if (q.modules[y][x]) { var s = x; while (x < n && q.modules[y][x]) x++; d += 'M' + (s + quiet) + ' ' + (y + quiet) + 'h' + (x - s) + 'v1h-' + (x - s) + 'z'; } else x++; }
  }
  var t = n + quiet * 2;
  return '<svg class="qr" viewBox="0 0 ' + t + ' ' + t + '" shape-rendering="crispEdges" role="img" aria-label="' + (opts.label || 'QR code') + '"><rect width="' + t + '" height="' + t + '" fill="#fff"/><path d="' + d + '" fill="#000"/></svg>';
}
root.ZQR = { encode: encode, svg: svg };
})(typeof window !== 'undefined' ? window : globalThis);
