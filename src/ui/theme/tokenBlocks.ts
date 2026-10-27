/**
 * Reads custom properties out of a stylesheet's text, for tests: jsdom does
 * not apply stylesheets, so the token files can only be checked as text.
 */

function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

/**
 * The declarations of the first rule whose selector is exactly `selector`,
 * as name to value. With `media`, the rule must be the first thing inside
 * that at-rule, e.g. `@media (prefers-color-scheme: dark)`.
 */
export function tokenBlock(css: string, selector: string, media?: string): Map<string, string> {
  const text = stripComments(css);
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const head = media
    ? new RegExp(`${media.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{\\s*${escaped}\\s*\\{`)
    : new RegExp(`(^|[}\\s])${escaped}\\s*\\{`);
  const match = head.exec(text);
  if (!match) throw new Error(`no rule for ${media ? `${media} ` : ''}${selector}`);
  const start = match.index + match[0].length;
  const body = text.slice(start, text.indexOf('}', start));
  const out = new Map<string, string>();
  for (const part of body.split(';')) {
    const colon = part.indexOf(':');
    if (colon < 0) continue;
    out.set(part.slice(0, colon).trim(), part.slice(colon + 1).trim());
  }
  return out;
}
