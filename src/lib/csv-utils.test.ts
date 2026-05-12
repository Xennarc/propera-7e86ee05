import { describe, it, expect } from 'vitest';
import { parseDate } from './csv-utils';

describe('parseDate', () => {
  it('should parse YYYY-MM-DD correctly', () => {
    expect(parseDate('2024-01-15')).toEqual({ date: '2024-01-15' });
  });

  it('should parse DD/MM/YYYY correctly', () => {
    expect(parseDate('15/01/2024')).toEqual({ date: '2024-01-15' });
  });

  it('should parse DD-MM-YYYY correctly', () => {
    expect(parseDate('15-01-2024')).toEqual({ date: '2024-01-15' });
  });

  it('should parse M/D/YYYY (US) correctly', () => {
    expect(parseDate('1/15/2024')).toEqual({ date: '2024-01-15' });
    expect(parseDate('11/5/2024')).toEqual({ date: '2024-11-05' });
  });

  it('should parse YYYY/MM/DD correctly', () => {
    expect(parseDate('2024/01/15')).toEqual({ date: '2024-01-15' });
  });

  it('should handle empty or whitespace values', () => {
    expect(parseDate('')).toEqual({ date: null });
    expect(parseDate('   ')).toEqual({ date: null });
  });

  it('should fallback to native Date parsing for valid string formats', () => {
    expect(parseDate('Jan 15, 2024')).toEqual({ date: '2024-01-15' });
    expect(parseDate('2024-01-15T00:00:00.000Z')).toEqual({ date: '2024-01-15' });
  });

  it('should return error for completely invalid dates', () => {
    expect(parseDate('not a date')).toEqual({
      date: null,
      error: 'Invalid date format: "not a date"',
    });
  });

  it('should return error for formatted but invalid dates', () => {
    expect(parseDate('2024-13-45')).toEqual({
      date: null,
      error: 'Invalid date format: "2024-13-45"',
    });
  });

  it('should return error for invalid fallback dates', () => {
    expect(parseDate('Jan 45, 2024')).toEqual({
      date: null,
      error: 'Invalid date format: "Jan 45, 2024"',
    });
  });
});
