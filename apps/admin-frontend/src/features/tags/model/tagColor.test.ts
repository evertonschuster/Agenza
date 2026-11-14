import { describe, expect, it } from 'vitest';
import { TAG_COLOR_PALETTE, suggestTagColor } from './tagColor';

const palette = TAG_COLOR_PALETTE.map((option) => option.value);

describe('suggestTagColor', () => {
  it('always suggests a palette color', () => {
    for (const name of ['', 'VIP', 'Pós-operatório', 'Aniversariante do mês', '  x  ']) {
      expect(palette).toContain(suggestTagColor(name));
    }
  });

  it('suggests the same color for the same name', () => {
    expect(suggestTagColor('Retorno')).toBe(suggestTagColor('Retorno'));
  });

  it('ignores case, accents and surrounding spaces', () => {
    const color = suggestTagColor('Pós-operatório');
    expect(suggestTagColor('pos-operatorio')).toBe(color);
    expect(suggestTagColor('  PÓS-OPERATÓRIO ')).toBe(color);
  });

  it('spreads different names across the palette', () => {
    const names = [
      'VIP',
      'Retorno',
      'Convênio',
      'Indicação',
      'Promoção',
      'Fidelidade',
      'Ortodontia',
    ];
    expect(new Set(names.map(suggestTagColor)).size).toBeGreaterThan(1);
  });
});
