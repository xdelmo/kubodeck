import { normalizeConfig, type BoxConfig } from './config';

export function encodeConfig(c: BoxConfig): string {
  return new URLSearchParams({
    v: '1',
    stack: String(c.stackThicknessMm),
    fb: c.filaments.body,
    fc: c.filaments.cap,
    fa: c.filaments.accent,
    ft: c.filaments.text,
    txt: c.text.value,
    font: c.text.font,
    tf: c.text.face,
    em: c.emblem.id ?? 'none',
    ef: c.emblem.face,
  }).toString();
}

// Un link vecchio, di un'altra versione o manomesso non deve mai rompere la pagina: si torna ai default.
export function decodeConfig(search: string): BoxConfig {
  let p: URLSearchParams;
  try {
    p = new URLSearchParams(search);
  } catch {
    return normalizeConfig(null);
  }
  if (p.get('v') !== '1') return normalizeConfig(null);
  const get = (k: string) => p.get(k) ?? undefined;
  const em = get('em');
  const stack = get('stack');
  const txt = get('txt');
  return normalizeConfig({
    stackThicknessMm: stack?.trim() ? Number(stack) : undefined,
    filaments: { body: get('fb'), cap: get('fc'), accent: get('fa'), text: get('ft') },
    // URLSearchParams trasforma un %-escape rotto in U+FFFD: quel testo è corrotto, si scarta.
    text: { value: txt?.includes('\uFFFD') ? undefined : txt, font: get('font'), face: get('tf') },
    emblem: { id: em === 'none' ? null : em, face: get('ef') },
  });
}
