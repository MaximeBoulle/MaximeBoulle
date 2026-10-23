import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const W = 900;
const H = 2301;
const PAD = 36;

const DISPLAY = "'Inter Tight', 'Arial Black', sans-serif";
const BODY = "Inter, Arial, sans-serif";
const MONO = "'Space Mono', 'Courier New', monospace";

const C = {
  light: {
    bg: '#F2F0EB',
    ink: '#111111',
    muted: '#4B4740',
    soft: '#6F6B63',
    line: '#111111',
    band: '#111111',
    bandText: '#FFFFFF',
    bandMuted: '#A9A49B',
    chipSolid: '#111111',
    chipSolidText: '#F2F0EB',
    sideBg: '#111111',
    sideText: '#F2F0EB',
    accentText: '#C93018',
  },
  dark: {
    bg: '#111111',
    ink: '#F2F0EB',
    muted: '#B8B3AA',
    soft: '#8F8B84',
    line: '#F2F0EB',
    band: '#191919',
    bandText: '#FFFFFF',
    bandMuted: '#A9A49B',
    chipSolid: '#F2F0EB',
    chipSolidText: '#111111',
    sideBg: '#F2F0EB',
    sideText: '#111111',
    accentText: '#FF5C3D',
  },
};

const RED = '#D93A1E';
const TICKER_RED = '#FF6A4D';
const BLUE = '#2E5BFF';
const YELLOW = '#FFD400';
const WHITE = '#FFFFFF';
const BLACK = '#111111';
const PAPER = '#F2F0EB';

const esc = (s) => String(s)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

function text(x, y, str, o = {}) {
  const {
    size = 12,
    weight = 400,
    fill = BLACK,
    family = BODY,
    anchor = 'start',
    letter = 0,
    wordSpacing = 0,
    opacity = 1,
    transform = '',
  } = o;
  return `<text x="${x}" y="${y}" font-family="${family}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" letter-spacing="${letter}"${wordSpacing ? ` word-spacing="${wordSpacing}"` : ''} opacity="${opacity}"${transform ? ` transform="${transform}"` : ''}>${esc(str)}</text>`;
}

function rect(x, y, w, h, fill, stroke = 'none', sw = 0, extra = '') {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"${extra ? ` ${extra}` : ''}/>`;
}

function line(x1, y1, x2, y2, stroke, sw = 1, opacity = 1) {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${sw}" opacity="${opacity}"/>`;
}

function circle(cx, cy, r, fill, stroke = 'none', sw = 0) {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
}

// Six-spoke asterisk drawn as vectors so the ticker width is exact in every browser.
function star(cx, cy, r, stroke, sw = 1.5) {
  const dx = r * 0.866;
  const dy = r * 0.5;
  return `<path d="M${cx - r} ${cy}H${cx + r}M${cx - dx} ${cy - dy}L${cx + dx} ${cy + dy}M${cx - dx} ${cy + dy}L${cx + dx} ${cy - dy}" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round"/>`;
}

function estimateWidth(str, size) {
  return str.length * (size * 0.612 + 1.1);
}

function chip(x, y, label, t, opts = {}) {
  const { solid = false, accent = false, size = 8.5 } = opts;
  const h = size >= 9 ? 28 : 26;
  const w = estimateWidth(label, size) + 20;
  const fill = solid ? t.chipSolid : 'none';
  const stroke = solid ? t.chipSolid : accent ? t.accentText : t.ink;
  const color = solid ? t.chipSolidText : accent ? t.accentText : t.ink;
  return {
    width: w,
    svg: `${rect(x, y, w, h, fill, stroke, 1.5)}${text(x + w / 2, y + h / 2 + size * 0.45, label, { size, family: MONO, fill: color, anchor: 'middle', letter: 1.1 })}`,
  };
}

const tickerItems = [
  'REACT', 'JAVA', 'MAVEN', 'ANSIBLE', 'TERRAFORM', 'PROXMOX',
  'CKAD', 'PARIS', 'OPEN TO OPPORTUNITIES',
];
const TICKER_FONT = 9.5;
const TICKER_LETTER = 1.3;
const TICKER_BASELINE = 645;
const TICKER_ADVANCE = TICKER_FONT * 0.612 + TICKER_LETTER;
const TICKER_STAR_R = 3.3;
const TICKER_STAR_GAP = 6.7;

function ticker(t, baseline = TICKER_BASELINE) {
  let x = 0;
  let out = '';
  let passWidth = 0;
  for (let pass = 0; pass < 3; pass++) {
    for (const item of tickerItems) {
      out += text(x, baseline, item, {
        size: TICKER_FONT,
        family: MONO,
        fill: item === 'CKAD' ? TICKER_RED : t.bandText,
        letter: TICKER_LETTER,
      });
      x += item.length * TICKER_ADVANCE;
      const cx = x + TICKER_STAR_GAP + TICKER_STAR_R;
      out += star(cx, baseline - TICKER_STAR_R, TICKER_STAR_R, YELLOW);
      x = cx + TICKER_STAR_R + TICKER_STAR_GAP;
    }
    if (pass === 0) passWidth = x;
  }
  return { svg: out, width: passWidth };
}

function capCell(x, y, opts) {
  const { num, title1, title2, desc, tags, bg, fg, numColor } = opts;
  const pad = 24;
  const tx = x + pad;
  return [
    rect(x, y, 414, 220, bg),
    text(tx, y + 60, num, { size: 46, weight: 900, family: DISPLAY, fill: numColor, letter: -2 }),
    text(tx, y + 101, title1, { size: 26, weight: 900, family: DISPLAY, fill: fg, letter: -1.1 }),
    text(tx, y + 128, title2, { size: 26, weight: 900, family: DISPLAY, fill: fg, letter: -1.1 }),
    ...desc.map((d, i) => text(tx, y + 158 + i * 17, d, { size: 12, family: BODY, fill: fg, opacity: 1 })),
    text(tx, y + 210, tags, { size: 8.5, family: MONO, fill: fg, opacity: 1, letter: 0.4 }),
  ].join('');
}

function build(mode, fontCss) {
  const t = C[mode];
  const chips = [];
  let chipX = PAD;
  const chipY = 559;
  const chipDefs = [
    { label: 'PARIS, FR', solid: true },
    { label: 'PERMANENT CONTRACT' },
    { label: 'CKAD CERTIFIED', accent: true },
    { label: 'OPEN TO OPPORTUNITIES' },
  ];
  for (const def of chipDefs) {
    const c = chip(chipX, chipY, def.label, t, def);
    chips.push(c.svg);
    chipX += c.width + 8;
  }

  const tick = ticker(t);

  const sideLabel = `<g transform="translate(846 222) rotate(-90)">${text(0, 0, 'FULL-STACK & DEVOPS ENGINEER', { size: 9, family: MONO, fill: t.sideText, anchor: 'middle', letter: 2.4 })}</g>`;

  const whatIDo = [
    capCell(36, 951, {
      num: '01', title1: 'FULL-STACK', title2: 'ENGINEERING',
      desc: ['React interfaces, Java APIs, and the glue', 'in between. I ship features end to end,', 'not just tickets.'],
      tags: 'REACT / TYPESCRIPT / JAVA / MAVEN / REST',
      bg: BLACK, fg: WHITE, numColor: 'rgba(255,255,255,.55)',
    }),
    capCell(450, 951, {
      num: '02', title1: 'DEVOPS &', title2: 'PLATFORM',
      desc: ['Reproducible environments and delivery', "that doesn't depend on someone's laptop."],
      tags: 'ANSIBLE / TERRAFORM / PROXMOX / DOCKER / CI-CD',
      bg: RED, fg: WHITE, numColor: 'rgba(255,255,255,.55)',
    }),
    capCell(36, 1171, {
      num: '03', title1: 'SECURITY &', title2: 'RELIABILITY',
      desc: ['Secure by default, observable in production.', 'I design for failure before it happens.'],
      tags: 'OWASP / TESTING / MONITORING / LINUX',
      bg: BLUE, fg: WHITE, numColor: 'rgba(255,255,255,.55)',
    }),
    capCell(450, 1171, {
      num: '04', title1: 'DISTRIBUTED', title2: 'SYSTEMS',
      desc: ['REST and gRPC services with boundaries', 'that stay understandable as the system grows.'],
      tags: 'REST / GRPC / POSTGRESQL / MICROSERVICES',
      bg: YELLOW, fg: BLACK, numColor: 'rgba(17,17,17,.35)',
    }),
  ].join('');

  const toolCols = [
    { x: 36, label: 'FRONTEND', items: ['React', 'TypeScript', 'JavaScript', 'HTML / CSS'] },
    { x: 243, label: 'BACKEND', items: ['Java', 'Maven', 'Node.js', 'Python'] },
    { x: 450, label: 'PLATFORM', items: ['Ansible', 'Terraform', 'Proxmox', 'Docker / Linux'] },
    { x: 657, label: 'DATA & APIS', items: ['PostgreSQL', 'MySQL', 'REST', 'gRPC'] },
  ];
  const toolbelt = toolCols.map(col => [
    text(col.x, 1571, col.label, { size: 8, family: MONO, fill: YELLOW, letter: 1.2 }),
    ...col.items.map((item, i) => text(col.x, 1593 + i * 19, item, { size: 10, family: MONO, fill: '#DEDAD2' })),
  ].join('')).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="title desc">
<title id="title">Maxime Boulle — Full-Stack &amp; DevOps Engineer</title>
<desc id="desc">Maxime Boulle, Full-Stack and DevOps Engineer based in Paris. React, Java and Maven, Ansible, Terraform and Proxmox. CKAD certified. Permanent contract. Open to opportunities.</desc>
<metadata>Typefaces: Inter Tight, Inter, Space Mono — SIL Open Font License 1.1. Built with intent, Paris, 2026.</metadata>
<style><![CDATA[
${fontCss}
.ticker-track{animation:ticker 28s linear infinite}
@keyframes ticker{from{transform:translateX(0)}to{transform:translateX(-${tick.width.toFixed(3)}px)}}
@media (prefers-reduced-motion:reduce){.ticker-track{animation:none}}
]]></style>
${rect(0, 0, W, H, t.bg)}

<!-- top bar -->
${text(PAD, 28, 'MAXIME BOULLE', { size: 9, family: MONO, fill: t.ink, letter: 1.4 })}
${text(450, 28, 'FULL-STACK & DEVOPS / PARIS', { size: 9, family: MONO, fill: t.soft, anchor: 'middle', letter: 1.4 })}
${text(864, 28, '2026', { size: 9, family: MONO, fill: t.accentText, anchor: 'end', letter: 1.4 })}
${line(36, 44, 864, 44, t.line, 2)}

<!-- hero -->
${text(36, 206, 'MAXIME', { size: 205, weight: 900, family: DISPLAY, fill: t.ink, letter: -15 })}
${text(36, 366, 'BOULLE', { size: 205, weight: 900, family: DISPLAY, fill: RED, letter: -15 })}
${rect(828, 54, 36, 336, t.sideBg)}
${sideLabel}

${text(36, 428, 'I build full-stack systems end to end —', { size: 25, weight: 600, family: BODY, fill: t.ink, letter: -0.5 })}
${text(36, 461, 'and keep them running.', { size: 25, weight: 600, family: BODY, fill: t.ink, letter: -0.5 })}
${text(36, 503, 'Based in Paris. React on the front, Java and Maven on the back,', { size: 14, family: BODY, fill: t.muted })}
${text(36, 525, 'Ansible, Terraform and Proxmox on the platform. CKAD certified.', { size: 14, family: BODY, fill: t.muted })}
${chips.join('')}

<!-- ticker -->
${rect(0, 621, W, 38, t.band)}
${line(0, 621, W, 621, t.line, 2)}
${line(0, 659, W, 659, t.line, 2)}
<g class="ticker-track" aria-hidden="true">${tick.svg}</g>

<!-- color blocks -->
${rect(0, 659, 300, 150, RED)}
${rect(300, 659, 300, 150, BLUE)}
${rect(600, 659, 300, 150, YELLOW)}
${line(300, 659, 300, 809, BLACK, 1)}
${line(600, 659, 600, 809, BLACK, 1)}
${line(0, 659, W, 659, t.line, 2)}
${line(0, 809, W, 809, t.line, 2)}

${text(24, 687, 'FRONTEND', { size: 8.5, family: MONO, fill: WHITE, letter: 1.2 })}
${text(276, 687, '01', { size: 8.5, family: MONO, fill: WHITE, anchor: 'end', opacity: 0.7 })}
${text(24, 741, 'REACT', { size: 30, weight: 900, family: DISPLAY, fill: WHITE, letter: -1.5 })}
${text(24, 771, 'TYPESCRIPT', { size: 30, weight: 900, family: DISPLAY, fill: WHITE, letter: -1.5 })}
${text(24, 793, 'INTERFACES THAT SHIP', { size: 9, family: MONO, fill: WHITE, letter: 0.4 })}

${text(324, 687, 'BACKEND', { size: 8.5, family: MONO, fill: WHITE, letter: 1.2 })}
${text(576, 687, '02', { size: 8.5, family: MONO, fill: WHITE, anchor: 'end', opacity: 0.7 })}
${text(324, 741, 'JAVA', { size: 30, weight: 900, family: DISPLAY, fill: WHITE, letter: -1.5 })}
${text(324, 771, 'MAVEN', { size: 30, weight: 900, family: DISPLAY, fill: WHITE, letter: -1.5 })}
${text(324, 793, 'APIS THAT HOLD', { size: 9, family: MONO, fill: WHITE, letter: 0.4 })}

${text(624, 687, 'PLATFORM', { size: 8.5, family: MONO, fill: BLACK, letter: 1.2 })}
${text(876, 687, '03', { size: 8.5, family: MONO, fill: BLACK, anchor: 'end', opacity: 0.7 })}
${text(624, 741, 'ANSIBLE', { size: 30, weight: 900, family: DISPLAY, fill: BLACK, letter: -1.5 })}
${text(624, 771, 'TERRAFORM', { size: 30, weight: 900, family: DISPLAY, fill: BLACK, letter: -1.5 })}
${text(624, 793, 'INFRA THAT REPEATS', { size: 9, family: MONO, fill: BLACK, letter: 0.4 })}

<!-- what i do -->
${text(36, 871, 'CAPABILITIES / 02', { size: 9, family: MONO, fill: t.accentText, letter: 1.2 })}
${text(36, 931, 'WHAT I DO', { size: 64, weight: 900, family: DISPLAY, fill: t.ink, letter: -2.8, wordSpacing: 14 })}
${text(864, 931, '04 MODULES', { size: 9, family: MONO, fill: t.accentText, anchor: 'end', letter: 1.2 })}
${line(36, 951, 864, 951, t.line, 2)}
${rect(36, 951, 828, 440, 'none', t.line, 2)}
${whatIDo}
${line(450, 951, 450, 1391, t.line, 1)}
${line(36, 1171, 864, 1171, t.line, 1)}

<!-- toolbelt -->
${rect(0, 1431, W, 300, t.band)}
${line(0, 1431, W, 1431, t.line, 2)}
${line(0, 1731, W, 1731, t.line, 2)}
${text(36, 1511, 'TOOLBELT', { size: 76, weight: 900, family: DISPLAY, fill: t.bandText, letter: -3.6 })}
${text(864, 1481, 'CORE STACK', { size: 8.5, family: MONO, fill: YELLOW, anchor: 'end', letter: 1.2 })}
${text(864, 1499, 'NO BADGES, JUST WORK', { size: 8.5, family: MONO, fill: t.bandMuted, anchor: 'end', letter: 1.2 })}
${line(36, 1531, 864, 1531, t.bandText, 1, 0.28)}
${toolbelt}
${text(36, 1701, 'SECURE BY DEFAULT', { size: 8, family: MONO, fill: t.bandMuted, letter: 1.1 })}
${text(270, 1701, 'SHIP END TO END', { size: 8, family: MONO, fill: t.bandMuted, letter: 1.1 })}
${text(500, 1701, 'MAKE IT OBSERVABLE', { size: 8, family: MONO, fill: t.bandMuted, letter: 1.1 })}
${text(864, 1701, 'CKAD / CNCF', { size: 8, family: MONO, fill: YELLOW, anchor: 'end', letter: 1.1 })}

<!-- certification -->
${rect(0, 1771, W, 170, RED)}
${text(36, 1881, 'CKAD', { size: 96, weight: 900, family: DISPLAY, fill: WHITE, letter: -5.5 })}
${line(300, 1801, 300, 1911, WHITE, 1, 0.45)}
${text(330, 1826, 'CERTIFICATION / CNCF', { size: 8, family: MONO, fill: WHITE, opacity: 1, letter: 1.2 })}
${text(330, 1866, 'CERTIFIED KUBERNETES', { size: 22, weight: 900, family: DISPLAY, fill: WHITE, letter: -0.8 })}
${text(330, 1893, 'APPLICATION DEVELOPER', { size: 22, weight: 900, family: DISPLAY, fill: WHITE, letter: -0.8 })}
<g transform="rotate(7 810 1856)">
  ${circle(810, 1856, 36, YELLOW)}
  ${text(810, 1853, 'CNCF', { size: 8, weight: 700, family: MONO, fill: BLACK, anchor: 'middle', letter: 0.6 })}
  ${text(810, 1868, 'CERTIFIED', { size: 6, family: MONO, fill: BLACK, anchor: 'middle', letter: 0.5 })}
</g>

<!-- footer -->
${rect(0, 1981, W, 320, t.band)}
${line(0, 1981, W, 1981, t.line, 2)}
${text(880, 2291, 'MB', { size: 260, weight: 900, family: DISPLAY, fill: WHITE, anchor: 'end', opacity: 0.04, letter: -8 })}
${text(36, 2021, 'CONTACT / 03', { size: 8.5, family: MONO, fill: YELLOW, letter: 1.2 })}
${text(36, 2111, "LET'S TALK", { size: 96, weight: 900, family: DISPLAY, fill: WHITE, letter: -4.6, wordSpacing: 18 })}
${text(36, 2161, 'maxime.boulle1@gmail.com', { size: 20, family: MONO, fill: YELLOW, letter: 0.4 })}
${text(36, 2201, 'LINKEDIN ↗   /   GITHUB ↗', { size: 9, family: MONO, fill: WHITE, letter: 1.1 })}
${text(36, 2271, 'MAXIME BOULLE / PARIS / 2026', { size: 8, family: MONO, fill: t.bandMuted, letter: 1.1 })}
${text(864, 2271, 'BUILT WITH INTENT', { size: 8, family: MONO, fill: YELLOW, anchor: 'end', letter: 1.1 })}
</svg>`;
}

function buildMobile(mode, fontCss) {
  const t = C[mode];
  const Wm = 400;
  const Hm = 736;
  const p = 20;

  const chipsTop = [];
  let cx = p;
  for (const def of [{ label: 'PARIS, FR', solid: true, size: 9.5 }, { label: 'PERMANENT CONTRACT', size: 9.5 }]) {
    const c = chip(cx, 332, def.label, t, def);
    chipsTop.push(c.svg);
    cx += c.width + 8;
  }
  const chipsBottom = [];
  cx = p;
  for (const def of [{ label: 'CKAD CERTIFIED', accent: true, size: 9.5 }, { label: 'OPEN TO OPPORTUNITIES', size: 9.5 }]) {
    const c = chip(cx, 368, def.label, t, def);
    chipsBottom.push(c.svg);
    cx += c.width + 8;
  }

  const tick = ticker(t, 428);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${Wm}" height="${Hm}" viewBox="0 0 ${Wm} ${Hm}" role="img" aria-labelledby="title desc">
<title id="title">Maxime Boulle — Full-Stack &amp; DevOps Engineer</title>
<desc id="desc">Maxime Boulle, Full-Stack and DevOps Engineer based in Paris. React, Java and Maven, Ansible, Terraform and Proxmox. CKAD certified. Permanent contract. Open to opportunities.</desc>
<metadata>Typefaces: Inter Tight, Inter, Space Mono — SIL Open Font License 1.1. Built with intent, Paris, 2026.</metadata>
<style><![CDATA[
${fontCss}
.ticker-track{animation:ticker 28s linear infinite}
@keyframes ticker{from{transform:translateX(0)}to{transform:translateX(-${tick.width.toFixed(3)}px)}}
@media (prefers-reduced-motion:reduce){.ticker-track{animation:none}}
]]></style>
${rect(0, 0, Wm, Hm, t.bg)}

<!-- top bar -->
${text(p, 24, 'MAXIME BOULLE', { size: 7.5, family: MONO, fill: t.ink, letter: 1.2 })}
${text(380, 24, 'PARIS / 2026', { size: 7.5, family: MONO, fill: t.accentText, anchor: 'end', letter: 1.2 })}
${line(p, 36, 380, 36, t.line, 1.5)}

<!-- hero -->
${text(p, 112, 'MAXIME', { size: 88, weight: 900, family: DISPLAY, fill: t.ink, letter: -6.6 })}
${text(p, 180, 'BOULLE', { size: 88, weight: 900, family: DISPLAY, fill: RED, letter: -6.6 })}
${rect(360, 42, 28, 156, t.sideBg)}
<g transform="translate(378 120) rotate(-90)">${text(0, 0, 'FULL-STACK / DEVOPS', { size: 7.5, family: MONO, fill: t.sideText, anchor: 'middle', letter: 1.8 })}</g>

${text(p, 220, 'I build full-stack systems', { size: 18, weight: 600, family: BODY, fill: t.ink, letter: -0.3 })}
${text(p, 241, 'end to end — and keep them running.', { size: 18, weight: 600, family: BODY, fill: t.ink, letter: -0.3 })}
${text(p, 272, 'Based in Paris. React on the front, Java and', { size: 11, family: BODY, fill: t.muted })}
${text(p, 290, 'Maven on the back, Ansible, Terraform and', { size: 11, family: BODY, fill: t.muted })}
${text(p, 308, 'Proxmox on the platform. CKAD certified.', { size: 11, family: BODY, fill: t.muted })}
${chipsTop.join('')}
${chipsBottom.join('')}

<!-- ticker -->
${rect(0, 404, Wm, 38, t.band)}
${line(0, 404, Wm, 404, t.line, 1.5)}
${line(0, 442, Wm, 442, t.line, 1.5)}
<g class="ticker-track" aria-hidden="true">${tick.svg}</g>

<!-- stack blocks -->
${rect(0, 442, 134, 132, RED)}
${rect(134, 442, 133, 132, BLUE)}
${rect(267, 442, 133, 132, YELLOW)}
${line(134, 442, 134, 574, BLACK, 1)}
${line(267, 442, 267, 574, BLACK, 1)}
${line(0, 442, Wm, 442, t.line, 1.5)}
${line(0, 574, Wm, 574, t.line, 1.5)}

${text(12, 464, 'FRONTEND', { size: 7.5, family: MONO, fill: WHITE, letter: 1 })}
${text(122, 464, '01', { size: 7.5, family: MONO, fill: WHITE, anchor: 'end', opacity: 0.7 })}
${text(12, 509, 'REACT', { size: 16, weight: 900, family: DISPLAY, fill: WHITE, letter: -0.8 })}
${text(12, 531, 'TYPESCRIPT', { size: 16, weight: 900, family: DISPLAY, fill: WHITE, letter: -0.8 })}
${text(12, 552, 'INTERFACES THAT SHIP', { size: 7.5, family: MONO, fill: WHITE, letter: 0.3 })}

${text(146, 464, 'BACKEND', { size: 7.5, family: MONO, fill: WHITE, letter: 1 })}
${text(255, 464, '02', { size: 7.5, family: MONO, fill: WHITE, anchor: 'end', opacity: 0.7 })}
${text(146, 509, 'JAVA', { size: 16, weight: 900, family: DISPLAY, fill: WHITE, letter: -0.8 })}
${text(146, 531, 'MAVEN', { size: 16, weight: 900, family: DISPLAY, fill: WHITE, letter: -0.8 })}
${text(146, 552, 'APIS THAT HOLD', { size: 7.5, family: MONO, fill: WHITE, letter: 0.3 })}

${text(279, 464, 'PLATFORM', { size: 7.5, family: MONO, fill: BLACK, letter: 1 })}
${text(388, 464, '03', { size: 7.5, family: MONO, fill: BLACK, anchor: 'end', opacity: 0.7 })}
${text(279, 509, 'ANSIBLE', { size: 16, weight: 900, family: DISPLAY, fill: BLACK, letter: -0.8 })}
${text(279, 531, 'TERRAFORM', { size: 16, weight: 900, family: DISPLAY, fill: BLACK, letter: -0.8 })}
${text(279, 552, 'INFRA THAT REPEATS', { size: 7.5, family: MONO, fill: BLACK, letter: 0.3 })}

<!-- footer -->
${rect(0, 574, Wm, 162, t.band)}
${line(0, 574, Wm, 574, t.line, 1.5)}
${text(p, 600, 'CONTACT / 03', { size: 7.5, family: MONO, fill: YELLOW, letter: 1.1 })}
${text(p, 654, "LET'S TALK", { size: 48, weight: 900, family: DISPLAY, fill: WHITE, letter: -2.3, wordSpacing: 9 })}
${text(p, 684, 'maxime.boulle1@gmail.com', { size: 12, family: MONO, fill: YELLOW, letter: 0.3 })}
${text(p, 706, 'LINKEDIN ↗   /   GITHUB ↗', { size: 9, family: MONO, fill: WHITE, letter: 0.9 })}
${text(p, 726, 'MAXIME BOULLE / PARIS / 2026', { size: 7.5, family: MONO, fill: t.bandMuted, letter: 0.9 })}
${text(380, 726, 'BUILT WITH INTENT', { size: 7.5, family: MONO, fill: YELLOW, anchor: 'end', letter: 0.9 })}
</svg>`;
}

function subsetFont(input, name, chars, tmpDir) {
  const textFile = path.join(tmpDir, 'chars.txt');
  const output = path.join(tmpDir, name);
  fs.writeFileSync(textFile, chars, 'utf8');
  execFileSync('python', [
    '-m', 'fontTools.subset', input,
    `--text-file=${textFile}`,
    '--flavor=woff2',
    `--output-file=${output}`,
    '--layout-features=*',
    '--no-hinting',
    '--desubroutinize',
  ], { stdio: 'inherit' });
  return fs.readFileSync(output).toString('base64');
}

function fontFace(family, weight, b64) {
  return `@font-face{font-family:'${family}';font-style:normal;font-weight:${weight};src:url(data:font/woff2;base64,${b64}) format('woff2');}`;
}

const chars = [
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  'abcdefghijklmnopqrstuvwxyz',
  '0123456789',
  " &'’.,:;!?/\\-—+@()[]{}<>→↗✳·%#*",
].join('');

fs.mkdirSync('assets/fonts', { recursive: true });
fs.mkdirSync('assets', { recursive: true });

console.log('Subsetting fonts…');
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mb-profile-'));
const interTight = subsetFont('assets/fonts/inter-tight-900.woff2', 'inter-tight-900.subset.woff2', chars, tmpDir);
const inter = subsetFont('assets/fonts/inter-400.woff2', 'inter.subset.woff2', chars, tmpDir);
const space400 = subsetFont('assets/fonts/space-mono-400.woff2', 'space-mono-400.subset.woff2', chars, tmpDir);
const space700 = subsetFont('assets/fonts/space-mono-700.woff2', 'space-mono-700.subset.woff2', chars, tmpDir);
fs.rmSync(tmpDir, { recursive: true, force: true });

const fontCss = [
  fontFace('Inter Tight', 900, interTight),
  fontFace('Inter', '400 600', inter),
  fontFace('Space Mono', 400, space400),
  fontFace('Space Mono', 700, space700),
].join('\n');

console.log('Building profile SVGs…');
fs.writeFileSync('assets/profile-light.svg', build('light', fontCss));
fs.writeFileSync('assets/profile-dark.svg', build('dark', fontCss));
fs.writeFileSync('assets/profile-mobile-light.svg', buildMobile('light', fontCss));
fs.writeFileSync('assets/profile-mobile-dark.svg', buildMobile('dark', fontCss));

function arrow(x, y, s, stroke) {
  return `<path d="M${x} ${y + s}L${x + s} ${y}M${x + s - 5} ${y}H${x + s}V${y + 5}" stroke="${stroke}" stroke-width="1.8" fill="none" stroke-linecap="square"/>`;
}

function buildButton(label, bg, fg, border, fontB64) {
  const arrowColor = fg;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="44" viewBox="0 0 220 44" role="img" aria-label="${esc(label)}">
<style><![CDATA[@font-face{font-family:'Space Mono';font-style:normal;font-weight:700;src:url(data:font/woff2;base64,${fontB64}) format('woff2');}]]></style>
<rect x="1" y="1" width="218" height="42" fill="${bg}" stroke="${border}" stroke-width="2"/>
${text(18, 27.5, label, { size: 10, weight: 700, family: MONO, fill: fg, letter: 1.2 })}
${arrow(188, 16, 11, arrowColor)}
</svg>`;
}

fs.writeFileSync('assets/btn-email.svg', buildButton('EMAIL', RED, WHITE, BLACK, space700));
fs.writeFileSync('assets/btn-linkedin.svg', buildButton('LINKEDIN', PAPER, BLACK, BLACK, space700));
fs.writeFileSync('assets/btn-github.svg', buildButton('GITHUB', PAPER, BLACK, BLACK, space700));

console.log('Done.');
console.log('ticker width:', (ticker(C.light).width).toFixed(3));
