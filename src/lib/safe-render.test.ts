import { describe, it, expect } from 'vitest';
import { safeRenderValue } from './safe-render';

describe('safeRenderValue', () => {
  it('returns default fallback for null', () => {
    expect(safeRenderValue(null)).toBe('');
  });

  it('returns default fallback for undefined', () => {
    expect(safeRenderValue(undefined)).toBe('');
  });

  it('returns custom fallback for null', () => {
    expect(safeRenderValue(null, 'N/A')).toBe('N/A');
  });

  it('returns strings as is', () => {
    expect(safeRenderValue('hello')).toBe('hello');
    expect(safeRenderValue('')).toBe('');
  });

  it('returns numbers as strings', () => {
    expect(safeRenderValue(42)).toBe('42');
    expect(safeRenderValue(0)).toBe('0');
    expect(safeRenderValue(-12.5)).toBe('-12.5');
  });

  it('returns booleans as strings', () => {
    expect(safeRenderValue(true)).toBe('true');
    expect(safeRenderValue(false)).toBe('false');
  });

  it('returns dates as ISO strings', () => {
    const date = new Date('2023-01-01T00:00:00Z');
    expect(safeRenderValue(date)).toBe('2023-01-01T00:00:00.000Z');
  });

  it('returns arrays joined by comma and space', () => {
    expect(safeRenderValue([1, 'two', true])).toBe('1, two, true');
    expect(safeRenderValue([])).toBe('');
  });

  it('returns objects as stringified JSON', () => {
    const obj = { key: 'value', num: 42 };
    expect(safeRenderValue(obj)).toBe('{"key":"value","num":42}');
  });

  it('returns fallback for circular objects that fail JSON.stringify', () => {
    const circularObj: any = { name: 'circular' };
    circularObj.self = circularObj;
    expect(safeRenderValue(circularObj, 'fallback-string')).toBe('fallback-string');
  });

  it('returns fallback for objects that throw on stringify by default', () => {
    const circularObj: any = { name: 'circular' };
    circularObj.self = circularObj;
    expect(safeRenderValue(circularObj)).toBe('');
  });
});
