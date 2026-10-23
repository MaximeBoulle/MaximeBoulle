import fs from 'node:fs';
import path from 'node:path';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const outDir = path.resolve('assets/fonts');
fs.mkdirSync(outDir, { recursive: true });

const families = [
  {
    file: 'inter-tight-900.woff2',
    css: 'https://fonts.googleapis.com/css2?family=Inter+Tight:wght@900&display=swap',
    weight: '900',
  },
  {
    file: 'space-mono-400.woff2',
    css: 'https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap',
    weight: '400',
  },
  {
    file: 'space-mono-700.woff2',
    css: 'https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap',
    weight: '700',
  },
  {
    file: 'inter-400.woff2',
    css: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap',
    weight: '400',
  },
];

for (const family of families) {
  const cssRes = await fetch(family.css, { headers: { 'User-Agent': UA } });
  const css = await cssRes.text();
  const blocks = css.split('@font-face').slice(1);
  const candidates = blocks
    .map(block => {
      const weight = (block.match(/font-weight:\s*(\d+)/) || [])[1];
      const range = (block.match(/unicode-range:\s*([^;]+)/) || [])[1] || '';
      const url = (block.match(/src:\s*url\(([^)]+)\)/) || [])[1];
      return { weight, range, url };
    })
    .filter(b => b.weight === family.weight && b.url && b.range.includes('U+0000-00FF'));
  const latin = candidates[candidates.length - 1];
  if (!latin) throw new Error(`No latin subset for ${family.file}`);
  const fontRes = await fetch(latin.url, { headers: { 'User-Agent': UA } });
  if (!fontRes.ok) throw new Error(`Failed to download ${family.file}: ${fontRes.status}`);
  const buffer = Buffer.from(await fontRes.arrayBuffer());
  fs.writeFileSync(path.join(outDir, family.file), buffer);
  console.log(`${family.file}  ${(buffer.length / 1024).toFixed(1)} KB  ${latin.url}`);
}
