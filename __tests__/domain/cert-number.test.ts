import {
  certDigitToLevel,
  certLevelToDigit,
  formatIrataNumber,
  irataLevelFromNumber,
  irataNumberDigits,
  normalizeSpratNumber,
} from '@/src/domain/cert-number';

describe('cert number helpers', () => {
  it('keeps SPRAT numbers numeric with a safe maximum length', () => {
    expect(normalizeSpratNumber('SPRAT-1234 abc 5678')).toBe('12345678');
    expect(normalizeSpratNumber('123456789012345')).toBe('123456789012');
  });

  it('formats IRATA numbers as level slash five digits', () => {
    expect(certLevelToDigit('I')).toBe('1');
    expect(certLevelToDigit('II')).toBe('2');
    expect(certLevelToDigit('III')).toBe('3');
    expect(certDigitToLevel('3')).toBe('III');
    expect(formatIrataNumber('III', '54-3219')).toBe('3/54321');
    expect(irataNumberDigits('1/12345')).toBe('12345');
    expect(irataLevelFromNumber('1/12345')).toBe('I');
  });
});
