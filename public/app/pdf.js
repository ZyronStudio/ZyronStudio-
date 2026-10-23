/* Zyron v7: one-tap PDF download (built in the browser, no libraries) + log out of all devices */
(function () {
'use strict';
var Z = window.Z, ACT = window.ZA && window.ZA.ACT;
if (!Z || !ACT) return;
var S = Z.S, SCR = Z.SCR, esc = Z.esc, num = Z.num, money = Z.money;
var W1 = [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584,556,556,556,222,556,333,1000,556,556,333,1000,667,333,1000,556,611,556,556,222,222,333,333,350,556,1000,333,1000,500,333,944,556,500,667,278,333,556,556,556,556,260,556,333,737,370,556,584,333,737,333,400,584,333,333,333,556,537,278,333,333,365,556,834,834,834,611,667,667,667,667,667,667,1000,722,667,667,667,667,278,278,278,278,722,722,778,778,778,778,778,584,778,722,722,722,722,667,667,611,556,556,556,556,556,556,889,500,556,556,556,556,278,278,278,278,556,556,556,556,556,556,556,584,611,556,556,556,556,500,556,500];
var W2 = [278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584,556,556,556,278,556,500,1000,556,556,333,1000,667,333,1000,556,611,556,556,278,278,500,500,350,556,1000,333,1000,556,333,944,556,500,667,278,333,556,556,556,556,280,556,333,737,370,556,584,333,737,333,400,584,333,333,333,611,556,278,333,333,365,556,834,834,834,611,722,722,722,722,722,722,1000,722,667,667,667,667,278,278,278,278,722,722,778,778,778,778,778,584,778,722,722,722,722,667,667,611,556,556,556,556,556,556,889,556,556,556,556,556,278,278,278,278,611,611,611,611,611,611,611,584,611,611,611,611,611,556,611,556];
var PW = 595.28, PH = 841.89, M = 42, CW = PW - 2 * M;
var MAP = { 8364: 128, 8218: 130, 402: 131, 8222: 132, 8230: 133, 8224: 134, 8225: 135, 710: 136, 8240: 137, 352: 138, 8249: 139, 338: 140, 381: 142, 8216: 145, 8217: 146, 8220: 147, 8221: 148, 8226: 149, 8211: 150, 8212: 151, 732: 152, 8482: 153, 353: 154, 8250: 155, 339: 156, 382: 158, 376: 159, 8722: 45, 8203: 32 };

/* ---------- text helpers (WinAnsi, standard Helvetica) ---------- */
var WIN = {}; Object.keys(MAP).forEach(function (k) { WIN[MAP[k]] = 1; });
function enc(s) {
  s = String(s == null ? '' : s).replace(/₦/g, 'NGN ').replace(/[\r\n\t]+/g, ' ');
  var o = '', ch, c, d;
  for (ch of s.normalize('NFC')) {
    c = ch.codePointAt(0);
    if (c > 65535 || (c >= 768 && c <= 879) || c === 8205 || (c >= 65024 && c <= 65039)) continue;
    if (MAP[c]) c = MAP[c];
    else if (c < 32 || c === 127) c = 32;
    else if (c >= 128 && c < 160) c = WIN[c] ? c : 32;
    else if (c > 255) { d = ch.normalize('NFD').charCodeAt(0); c = (d >= 32 && d < 127) ? d : 63; }
    o += String.fromCharCode(c);
  }
  return o;
}
function tw(s, size, bold) { var W = bold ? W2 : W1, t = 0, i; for (i = 0; i < s.length; i++) t += (W[s.charCodeAt(i) - 32] || 556); return t * size / 1000; }
function wrap(raw, size, bold, maxW) {
  var words = enc(raw).split(' '), out = [], line = '';
  words.forEach(function (w) {
    var k, t;
    if (!w) return;
    while (tw(w, size, bold) > maxW && w.length > 1) {
      k = w.length; while (k > 1 && tw(w.slice(0, k), size, bold) > maxW) k--;
      if (line) { out.push(line); line = ''; }
      out.push(w.slice(0, k)); w = w.slice(k);
    }
    t = line ? line + ' ' + w : w;
    if (tw(t, size, bold) <= maxW) line = t; else { if (line) out.push(line); line = w; }
  });
  if (line) out.push(line);
  return out.length ? out : [''];
}
function ps(s) { var o = '', i, c; for (i = 0; i < s.length; i++) { c = s.charCodeAt(i); if (c === 40 || c === 41 || c === 92) o += '\\' + s.charAt(i); else if (c < 32 || c > 126) o += '\\' + ('00' + c.toString(8)).slice(-3); else o += s.charAt(i); } return o; }
function hex(c) { c = c.replace('#', ''); return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)]; }
function mix(a, b, t) { var x = hex(a), y = hex(b); return '#' + [0, 1, 2].map(function (i) { return ('0' + Math.round(x[i] + (y[i] - x[i]) * t).toString(16)).slice(-2); }).join(''); }
function col(c) { var h = hex(c); return (h[0] / 255).toFixed(3) + ' ' + (h[1] / 255).toFixed(3) + ' ' + (h[2] / 255).toFixed(3); }
function n(x) { return String(Math.round(x * 100) / 100); }
function bytes(s) { var a = new Uint8Array(s.length), i; for (i = 0; i < s.length; i++) a[i] = s.charCodeAt(i) & 255; return a; }

/* ---------- logo (optional) ---------- */
function loadLogo(url, bg) {
  return new Promise(function (res) {
    var img = new Image(), done = false;
    function fin(v) { if (!done) { done = true; res(v); } }
    if (!url) { res(null); return; }
    setTimeout(function () { fin(null); }, 6000);
    img.crossOrigin = 'anonymous';
    img.onload = function () {
      try {
        var w = img.naturalWidth, h = img.naturalHeight, s, cv, x;
        if (!w || !h) { fin(null); return; }
        s = Math.min(1, 400 / Math.max(w, h)); w = Math.max(1, Math.round(w * s)); h = Math.max(1, Math.round(h * s));
        cv = document.createElement('canvas'); cv.width = w; cv.height = h; x = cv.getContext('2d'); x.fillStyle = bg; x.fillRect(0, 0, w, h); x.drawImage(img, 0, 0, w, h);
        cv.toBlob(function (bl) {
          if (!bl) { fin(null); return; }
          bl.arrayBuffer().then(function (ab) { fin({ w: w, h: h, data: new Uint8Array(ab) }); }, function () { fin(null); });
        }, 'image/jpeg', 0.9);
      } catch (e) { fin(null); }
    };
    img.onerror = function () { fin(null); };
    img.src = url;
  });
}

/* ---------- the PDF ---------- */
async function buildPdf(d, opt) {
  opt = opt || {};
  var inv = d.invoice, b = d.business || {}, cur = inv.currency, white = !!opt.white, th = Z.themeOf(inv.theme), trial = !!(opt.trial || inv.trial);
  var P = white ? { bg: '#ffffff', card: '#f4f4f1', line: '#dcdcd6', tx: '#15151b', mu: '#6d6d75', ac: mix(th.a, '#000000', 0.42) }
    : { bg: th.b, card: mix(th.b, '#ffffff', 0.07), line: mix(th.b, '#ffffff', 0.16), tx: '#f3efe4', mu: mix(th.b, '#ffffff', 0.58), ac: th.a };
  var logoUrl = Z.safeLogo(b.logo_url), logo = await loadLogo(logoUrl, P.bg);
  var pages = [], c = null, y = M;
  var due = Math.max(Z.r2(Number(inv.total) - Number(inv.amount_paid || 0)), 0);

  function Y(t) { return PH - t; }
  function fill(x, top, w, h, color) { c.push(col(color) + ' rg ' + n(x) + ' ' + n(Y(top + h)) + ' ' + n(w) + ' ' + n(h) + ' re f'); }
  function hline(x1, x2, top, color, w) { c.push(col(color) + ' RG ' + n(w || 0.7) + ' w ' + n(x1) + ' ' + n(Y(top)) + ' m ' + n(x2) + ' ' + n(Y(top)) + ' l S'); }
  function rr(x, top, w, h, r, f, s) {
    var y0 = Y(top + h), y1 = y0 + h, x1 = x + w, k = r * 0.5523, p;
    p = n(x + r) + ' ' + n(y0) + ' m ' + n(x1 - r) + ' ' + n(y0) + ' l ' +
      n(x1 - r + k) + ' ' + n(y0) + ' ' + n(x1) + ' ' + n(y0 + r - k) + ' ' + n(x1) + ' ' + n(y0 + r) + ' c ' + n(x1) + ' ' + n(y1 - r) + ' l ' +
      n(x1) + ' ' + n(y1 - r + k) + ' ' + n(x1 - r + k) + ' ' + n(y1) + ' ' + n(x1 - r) + ' ' + n(y1) + ' c ' + n(x + r) + ' ' + n(y1) + ' l ' +
      n(x + r - k) + ' ' + n(y1) + ' ' + n(x) + ' ' + n(y1 - r + k) + ' ' + n(x) + ' ' + n(y1 - r) + ' c ' + n(x) + ' ' + n(y0 + r) + ' l ' +
      n(x) + ' ' + n(y0 + r - k) + ' ' + n(x + r - k) + ' ' + n(y0) + ' ' + n(x + r) + ' ' + n(y0) + ' c h';
    c.push((f ? col(f) + ' rg ' : '') + (s ? col(s) + ' RG 0.8 w ' : '') + p + (f && s ? ' B' : f ? ' f' : ' S'));
  }
  function text(x, base, str, size, bold, color, al, ls) {
    var s = enc(str), w = tw(s, size, bold) + (ls ? ls * s.length : 0);
    if (al === 'r') x -= w; else if (al === 'c') x -= w / 2;
    c.push('BT /' + (bold ? 'F2' : 'F1') + ' ' + n(size) + ' Tf ' + (ls ? n(ls) + ' Tc ' : '') + col(color) + ' rg ' + n(x) + ' ' + n(Y(base)) + ' Td (' + ps(s) + ') Tj ' + (ls ? '0 Tc ' : '') + 'ET');
  }
  function mark(x, top, size) {
    var pts = [[9, 8], [58, 8], [58, 18], [25, 45], [58, 45], [58, 56], [6, 56], [6, 46], [39, 19], [9, 19]], k = size / 64, p = '';
    pts.forEach(function (q, i) { p += n(x + q[0] * k) + ' ' + n(Y(top + q[1] * k)) + (i ? ' l ' : ' m '); });
    c.push(col(white ? mix(th.a, '#000000', 0.25) : th.a) + ' rg ' + p + 'h f');
  }
  function watermark() {
    [0.2, 0.5, 0.8].forEach(function (f) {
      var s = 'ZYRON TRIAL', w = tw(s, 54, true), cx = PW / 2, cy = PH * (1 - f), co = 0.866, si = 0.5;
      c.push('q /GS1 gs ' + col(white ? '#000000' : th.a) + ' rg BT /F2 54 Tf ' + co + ' ' + si + ' ' + (-si) + ' ' + co + ' ' + n(cx - (w / 2) * co) + ' ' + n(cy - (w / 2) * si) + ' Tm (' + s + ') Tj ET Q');
    });
  }
  function newPage() { c = []; pages.push(c); fill(0, 0, PW, PH, P.bg); if (trial) watermark(); y = M; }
  function need(h) { if (y + h > PH - 58) newPage(); }

  newPage();
  /* header */
  var tx0 = M, hh = 44, nl, cl, yy;
  if (logo) {
    var sc = Math.min(44 / logo.w, 44 / logo.h), lw = logo.w * sc, lh = logo.h * sc;
    c.push('q ' + n(lw) + ' 0 0 ' + n(lh) + ' ' + n(M) + ' ' + n(Y(y + lh)) + ' cm /Im1 Do Q');
  } else mark(M, y + 2, 40);
  tx0 = M + 56;
  nl = wrap(b.business_name || b.full_name || 'Your business', 16, true, 270).slice(0, 2);
  yy = y + 14; nl.forEach(function (l) { text(tx0, yy, l, 16, true, P.tx); yy += 19; });
  cl = wrap([b.address, b.phone, b.email, b.website].filter(Boolean).join(' · '), 8.5, false, 270).slice(0, 3);
  if (cl[0]) { yy -= 5; cl.forEach(function (l) { text(tx0, yy, l, 8.5, false, P.mu); yy += 11; }); }
  hh = Math.max(hh, yy - y);
  text(PW - M, y + 10, 'INVOICE', 7.5, true, P.mu, 'r', 1.4);
  text(PW - M, y + 30, inv.invoice_number || 'Draft', 16, true, P.ac, 'r');
  y += hh + 14; hline(M, PW - M, y, P.line); y += 20;

  /* meta */
  var bl = wrap((d.client && d.client.name) || '-', 11, true, 230).slice(0, 2);
  text(M, y + 8, 'BILLED TO', 7.5, true, P.mu, 'l', 1); text(M + 250, y + 8, 'ISSUED', 7.5, true, P.mu, 'l', 1); text(M + 380, y + 8, 'DUE', 7.5, true, P.mu, 'l', 1);
  bl.forEach(function (l, i) { text(M, y + 24 + i * 14, l, 11, true, P.tx); });
  text(M + 250, y + 24, Z.fmtDate(inv.issue_date), 11, true, P.tx); text(M + 380, y + 24, Z.fmtDate(inv.due_date), 11, true, P.tx);
  y += 30 + (bl.length - 1) * 14 + 14;

  /* status pill */
  var st = enc(Z.statusLine(inv)), pw = tw(st, 8.5, true) + 24;
  rr(M, y, pw, 20, 10, P.card, P.ac); text(M + 12, y + 13.5, st, 8.5, true, P.ac); y += 20 + 20;

  /* lines */
  text(M, y + 8, 'ITEM', 7.5, true, P.mu, 'l', 1); text(M + 395, y + 8, 'QTY × PRICE', 7.5, true, P.mu, 'r', 1); text(PW - M, y + 8, 'AMOUNT', 7.5, true, P.mu, 'r', 1);
  y += 16; hline(M, PW - M, y, P.line); y += 4;
  var items = d.items || [];
  if (!items.length) { need(30); text(M, y + 18, 'No items yet', 10, false, P.mu); y += 30; }
  items.forEach(function (it) {
    var dl = wrap(it.description || 'Item', 10.5, true, 250), rh = dl.length * 13 + 14, qt, amt, qs;
    need(rh);
    dl.forEach(function (l, i) { text(M, y + 16 + i * 13, l, 10.5, true, P.tx); });
    qt = num(it.quantity) + ' × ' + money(it.unit_price, cur); qs = tw(enc(qt), 9.5, false) > 130 ? 8 : 9.5;
    text(M + 395, y + 16, qt, qs, false, P.mu, 'r');
    amt = money(it.line_total != null ? it.line_total : Z.r2(num(it.quantity) * num(it.unit_price)), cur);
    text(PW - M, y + 16, amt, 10.5, true, P.tx, 'r');
    y += rh; hline(M, PW - M, y, P.line, 0.4);
  });
  y += 12;

  /* totals */
  var tx = PW - M - 240;
  function trow(label, val, bold, color) { need(20); text(tx, y + 13, label, bold ? 11 : 9.5, bold, bold ? P.tx : P.mu); text(PW - M, y + 13, val, bold ? 11 : 9.5, bold, color || P.tx, 'r'); y += 19; }
  trow('Subtotal', money(inv.subtotal, cur));
  if (Number(inv.discount) > 0) trow('Discount', '-' + money(inv.discount, cur));
  if (Number(inv.vat_rate) > 0) trow((cur === 'NGN' ? 'VAT' : 'Tax') + ' (' + num(inv.vat_rate) + '%)', money(inv.vat_amount, cur));
  need(8); hline(tx, PW - M, y + 2, P.line); y += 6;
  trow('Total', money(inv.total, cur), true);
  (d.payments || []).forEach(function (p) { trow('Paid ' + Z.fmtDate(p.paid_on) + ' · ' + (Z.METHODS[p.method] || p.method), '-' + money(p.amount, cur)); });
  y += 8;

  /* amount due */
  need(76);
  rr(M, y, CW, 58, 12, P.card, P.ac);
  text(M + 20, y + 25, inv.status === 'paid' ? 'PAID' : 'AMOUNT DUE', 8.5, true, P.mu, 'l', 1.4);
  text(M + 20, y + 42, Z.statusLine(inv), 8.5, false, P.mu);
  text(PW - M - 20, y + 38, money(inv.status === 'paid' ? inv.total : due, cur), 24, true, P.ac, 'r');
  y += 58 + 18;

  /* payment details + QR */
  var showPay = inv.status !== 'draft' && inv.status !== 'void' && inv.status !== 'paid' && (b.account_number || b.bank_name || b.intl_bank);
  var payUrl = (inv.pay_link && /^https:\/\/\S+$/.test(inv.pay_link)) ? inv.pay_link : '';
  var qrTarget = payUrl || opt.shareUrl || '', qr = null;
  if (inv.status !== 'void' && inv.status !== 'paid' && qrTarget && window.ZQR) { try { qr = window.ZQR.encode(qrTarget); } catch (e) { qr = null; } }
  if (showPay || qr) {
    var rows = [];
    if (b.bank_name) rows.push(['Bank', b.bank_name]);
    if (b.account_name) rows.push(['Account name', b.account_name]);
    if (b.account_number) rows.push(['Account number', b.account_number]);
    if (b.intl_bank) rows.push(['International', String(b.intl_bank).replace(/\s*\n\s*/g, ' · ')]);
    rows.push(['Reference', inv.invoice_number || '']);
    var qw = 138, gap = 12, lw2 = (showPay && qr) ? CW - qw - gap : CW, rh2 = 34, wr = [];
    if (showPay) rows.forEach(function (r) { var ls = wrap(r[1], 10, true, lw2 - 130).slice(0, r[0] === 'International' ? 4 : 2); wr.push(ls); rh2 += ls.length * 13 + 5; });
    var boxH = Math.max(showPay ? rh2 + 8 : 0, qr ? 140 : 0);
    need(boxH + 14);
    var top0 = y;
    if (showPay) {
      rr(M, top0, lw2, boxH, 12, P.card, P.line);
      text(M + 16, top0 + 22, 'PAY BY BANK TRANSFER', 7.5, true, P.ac, 'l', 1.2);
      var ry = top0 + 40;
      rows.forEach(function (r, i) {
        text(M + 16, ry, r[0], 8.5, false, P.mu);
        wr[i].forEach(function (l, k) { text(M + 114, ry + k * 13, l, r[0] === 'Account number' ? 12 : 10, true, P.tx); });
        ry += wr[i].length * 13 + 5;
      });
    }
    if (qr) {
      var qx = (showPay ? M + lw2 + gap : M), qwid = showPay ? qw : 138;
      rr(qx, top0, qwid, boxH, 12, P.card, P.line);
      var tot = qr.size + 8, ms = 86 / tot, ox = qx + (qwid - 86) / 2, oy = top0 + 12;
      fill(ox - 4, oy - 4, 94, 94, '#ffffff');
      var run, sx, yq, xq, qs2 = [];
      for (yq = 0; yq < qr.size; yq++) {
        xq = 0;
        while (xq < qr.size) {
          if (qr.modules[yq][xq]) { sx = xq; while (xq < qr.size && qr.modules[yq][xq]) xq++; run = xq - sx; qs2.push(n(ox + (sx + 4) * ms) + ' ' + n(Y(oy + (yq + 4) * ms + ms)) + ' ' + n(run * ms + 0.15) + ' ' + n(ms + 0.15) + ' re'); } else xq++;
        }
      }
      c.push('0 0 0 rg ' + qs2.join(' ') + ' f');
      text(qx + qwid / 2, oy + 108, payUrl ? 'Scan to pay' : 'Scan to view online', 8.5, true, P.tx, 'c');
      text(qx + qwid / 2, oy + 120, payUrl ? 'Opens your payment page' : 'Opens this invoice', 7.5, false, P.mu, 'c');
    }
    y = top0 + boxH + 18;
  }

  /* notes and terms */
  function para(label, str) {
    var ls = wrap(str, 9, false, CW);
    need(30); text(M, y + 8, label, 7.5, true, P.mu, 'l', 1); y += 16;
    ls.forEach(function (l) { need(13); text(M, y + 9, l, 9, false, P.tx); y += 12.5; });
    y += 8;
  }
  if (inv.notes) para('NOTES', inv.notes);
  if (inv.terms) para('TERMS', inv.terms);

  /* footer on every page */
  pages.forEach(function (pg, i) {
    c = pg;
    hline(M, PW - M, PH - 40, P.line, 0.5);
    text(M, PH - 26, 'Secure invoice', 7.5, false, P.mu);
    if (pages.length > 1) text(PW / 2, PH - 26, 'Page ' + (i + 1) + ' of ' + pages.length, 7.5, false, P.mu, 'c');
    text(PW - M, PH - 26, opt.growth ? 'Sent with Zyron' : 'Zyron', 7.5, true, P.ac, 'r');
  });

  /* assemble the file */
  var parts = [], len = 0, offs = [];
  function push(u) { parts.push(u); len += u.length; }
  function obj(num2, dict, stream) {
    offs[num2] = len;
    push(bytes(num2 + ' 0 obj\n' + dict + (stream ? '\nstream\n' : '\n')));
    if (stream) { push(stream); push(bytes('\nendstream')); }
    push(bytes('\nendobj\n'));
  }
  var base = logo ? 7 : 6, kids = [], total = base + pages.length * 2 - 1;
  push(bytes('%PDF-1.4\n%âãÏÓ\n'));
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  pages.forEach(function (pg, i) { kids.push((base + i * 2 + 1) + ' 0 R'); });
  obj(2, '<< /Type /Pages /Count ' + pages.length + ' /Kids [' + kids.join(' ') + '] >>');
  obj(3, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  obj(4, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  obj(5, '<< /Type /ExtGState /ca ' + (white ? '0.07' : '0.08') + ' /CA ' + (white ? '0.07' : '0.08') + ' >>');
  if (logo) obj(6, '<< /Type /XObject /Subtype /Image /Width ' + logo.w + ' /Height ' + logo.h + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + logo.data.length + ' >>', logo.data);
  pages.forEach(function (pg, i) {
    var cs = bytes(pg.join('\n'));
    obj(base + i * 2, '<< /Length ' + cs.length + ' >>', cs);
    obj(base + i * 2 + 1, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + PW + ' ' + PH + '] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> /ExtGState << /GS1 5 0 R >>' + (logo ? ' /XObject << /Im1 6 0 R >>' : '') + ' >> /Contents ' + (base + i * 2) + ' 0 R >>');
  });
  var xr = len, xs = 'xref\n0 ' + (total + 1) + '\n0000000000 65535 f \n', i2;
  for (i2 = 1; i2 <= total; i2++) xs += ('0000000000' + offs[i2]).slice(-10) + ' 00000 n \n';
  push(bytes(xs + 'trailer\n<< /Size ' + (total + 1) + ' /Root 1 0 R >>\nstartxref\n' + xr + '\n%%EOF\n'));
  return new Blob(parts, { type: 'application/pdf' });
}

function saveBlob(blob, name) {
  var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
}
function fileName(inv) { return 'Invoice-' + String(inv.invoice_number || 'draft').replace(/[^A-Za-z0-9._-]+/g, '-') + '.pdf'; }

/* ---------- wiring ---------- */
var lastPub = null, ctx = null;
var basePub = SCR.publicInvoice;
SCR.publicInvoice = function (d, tok) { lastPub = { d: d, token: tok }; return basePub.apply(this, arguments); };

function ownerData(id) {
  var inv = Z.invById(id), det = S.detail[id], c, pays, o, owner;
  if (!inv || !det) return null;
  c = Z.clientById(inv.client_id) || { name: '-' };
  pays = S.payments.filter(function (p) { return p.invoice_id === id; }).slice().reverse();
  o = { growth: true, trial: S.cap ? (S.cap.plan || 'trial') === 'trial' : true };
  if (inv.share_token && inv.status !== 'draft') o.shareUrl = Z.shareUrl(inv.share_token);
  owner = Object.assign({}, inv, { pay_link: inv.pay_link || (S.profile && S.profile.pay_link) || '' });
  return { d: { invoice: owner, client: c, business: S.profile, items: det.items || [], payments: pays }, opt: o };
}
function pubData() {
  if (!lastPub) return null;
  return { d: lastPub.d, opt: { growth: true, shareUrl: Z.shareUrl(lastPub.token) } };
}
function pdfSheet(c) {
  ctx = c;
  Z.openSheet('Download PDF', '<p class="hint" style="margin:0 0 14px">Pick a look. The PDF saves straight to your phone.</p><div style="display:flex;flex-direction:column;gap:10px"><button class="btn btn-gold btn-block" data-act="pdf-dl" data-w="0">Elite dark (recommended)</button><button class="btn btn-block" data-act="pdf-dl" data-w="1">Print-friendly white</button><button class="link-btn" data-act="pdf-print" style="align-self:center">Open the print screen instead</button></div>');
}
var origPrint = ACT['print-inv'], origPub = ACT['pub-print'];
ACT['print-inv'] = function (t) {
  var id = t.dataset.id;
  if (!ownerData(id)) { Z.toast('Still loading, try again', true); return; }
  pdfSheet({ kind: 'owner', id: id, el: t });
};
ACT['pub-print'] = function (t) { if (!pubData()) { Z.toast('Could not prepare the PDF, try again', true); return; } pdfSheet({ kind: 'pub', el: t }); };
ACT['pdf-print'] = function () { var c = ctx; if (!c) return; if (c.kind === 'owner') origPrint(c.el); else origPub(c.el); };
ACT['pdf-dl'] = async function (t) {
  var c = ctx, o, label = t.textContent;
  if (!c) return;
  o = c.kind === 'owner' ? ownerData(c.id) : pubData();
  if (!o) { Z.toast('Could not prepare the PDF, try again', true); return; }
  o.opt.white = t.dataset.w === '1';
  Z.$$('[data-act=pdf-dl]').forEach(function (x) { x.disabled = true; });
  t.textContent = 'Preparing…';
  try {
    saveBlob(await buildPdf(o.d, o.opt), fileName(o.d.invoice));
    Z.closeSheet(); setTimeout(function () { Z.toast('PDF saved to your downloads'); }, 300);
  } catch (e) {
    Z.$$('[data-act=pdf-dl]').forEach(function (x) { x.disabled = false; }); t.textContent = label;
    Z.toast('Could not make the PDF. Try the print screen instead.', true);
  }
};

/* ---------- log out of all devices ---------- */
var baseSettings = SCR.settings;
SCR.settings = function () {
  var h = baseSettings(), key = '<div class="card" style="display:flex;flex-direction:column;gap:12px"><div class="eyebrow">Your data</div>', k = h.indexOf(key);
  var card = '<div class="card" style="display:flex;flex-direction:column;gap:12px"><div class="eyebrow">Security</div><p class="hint" style="margin:0">Think someone else is using your account, or you lost a phone? This signs you out on every device, including this one.</p><button class="btn btn-block" type="button" data-act="signout-all">Log out of all devices</button></div>';
  return k < 0 ? h : h.slice(0, k) + card + h.slice(k);
};
ACT['signout-all'] = function () {
  Z.openSheet('Log out of all devices?', '<p style="margin:0;color:var(--muted)">You will be signed out everywhere, including this phone, and notifications to your other devices will stop. You can sign back in with Google any time.</p><div class="btn-row"><button class="btn btn-grow" data-act="sheet-close">Keep me signed in</button><button class="btn btn-danger btn-grow" data-act="signout-all-yes">Log out everywhere</button></div>');
};
ACT['signout-all-yes'] = async function (t) {
  var sb = Z.getSB(), uid = S.user && S.user.id, r;
  t.disabled = true; t.textContent = 'Signing out…';
  try {
    try { if (uid) await sb.from('push_subscriptions').delete().eq('user_id', uid); } catch (e) { /* ignore */ }
    try { var reg = await navigator.serviceWorker.getRegistration(); var sub = reg ? await reg.pushManager.getSubscription() : null; if (sub) await sub.unsubscribe(); } catch (e2) { /* ignore */ }
    r = await sb.auth.signOut({ scope: 'global' });
    if (r && r.error) throw r.error;
  } catch (e3) { t.disabled = false; t.textContent = 'Log out everywhere'; Z.toast(Z.errMsg(e3), true); }
};
window.ZPDF = { build: buildPdf };
})();
