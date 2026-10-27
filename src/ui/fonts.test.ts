import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { tokenBlock } from './theme/tokenBlocks';

// vitest runs from the project root.
const FONTS = 'src/ui/theme/fonts.css';
const fonts = () => readFileSync(FONTS, 'utf-8');
const tokens = tokenBlock(readFileSync('src/ui/theme/tokens.css', 'utf-8'), ':root');

/**
 * Fonts ship inside the APK (the app works offline), and only the latin and
 * vietnamese subsets: a plain `400.css` import pulls in all seven subsets and
 * Vite bundles every one of them.
 */
describe('bundled fonts', () => {
  it('imports only the latin and vietnamese files', () => {
    expect(existsSync(FONTS)).toBe(true);
    const imports = [...fonts().matchAll(/@import\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);
    for (const path of imports) {
      expect(path).toMatch(/^@fontsource\/(nunito|mali|jetbrains-mono)\/(latin|vietnamese)-\d{3}\.css$/);
    }
    const wanted = [
      ...[400, 600, 700, 800].map((w) => ['nunito', w] as const),
      ['mali', 400] as const,
      ...[500, 700].map((w) => ['jetbrains-mono', w] as const),
    ].flatMap(([family, weight]) => ['latin', 'vietnamese'].map((subset) => `@fontsource/${family}/${subset}-${weight}.css`));
    expect([...imports].sort()).toEqual([...wanted].sort());
  });

  it('uses the full axis Fraunces file for both subsets', () => {
    const faces = fonts().match(/@font-face\s*{[^}]*}/g) ?? [];
    const fraunces = faces.filter((face) => face.includes("font-family: 'Fraunces Variable'"));
    expect(fraunces).toHaveLength(2);
    expect(fraunces.some((face) => face.includes('fraunces-latin-full-normal.woff2'))).toBe(true);
    expect(fraunces.some((face) => face.includes('fraunces-vietnamese-full-normal.woff2'))).toBe(true);
    for (const face of fraunces) {
      expect(face).toMatch(/unicode-range:/);
      expect(face).toMatch(/font-weight:\s*100 900/);
    }
  });

  it('names the bundled families in the tokens', () => {
    expect(tokens.get('--jx-font')).toMatch(/^'Nunito'/);
    expect(tokens.get('--jx-font-mono')).toMatch(/^'JetBrains Mono'/);
    expect(tokens.get('--jx-font-display')).toMatch(/^'Fraunces Variable'/);
    expect(tokens.get('--jx-font-hand')).toMatch(/^'Mali'/);
    expect(tokens.get('--jx-weight-display')).toBe('650');
    expect(tokens.get('--jx-weight-heavy')).toBe('800');
    expect(tokens.get('--jx-text-title')).toBe('1.4rem');
    expect(tokens.get('--jx-text-name')).toBe('1.15rem');
    expect(tokens.get('--jx-text-hand')).toBe('1.2rem');
  });

  it('has dropped Inter and Roboto Mono', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf-8')) as { dependencies: Record<string, string> };
    expect(pkg.dependencies).not.toHaveProperty('@fontsource/inter');
    expect(pkg.dependencies).not.toHaveProperty('@fontsource/roboto-mono');
    expect(readFileSync('src/main.tsx', 'utf-8')).not.toContain('@fontsource');
  });
});
