import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { formatValidationErrors } from './pricing-validation';

describe('formatValidationErrors', () => {
  it('returns an empty string when there are no issues', () => {
    const error = new z.ZodError([]);
    expect(formatValidationErrors(error)).toBe('');
  });

  it('returns the message of a single issue', () => {
    const error = new z.ZodError([
      {
        code: z.ZodIssueCode.custom,
        path: ['field1'],
        message: 'Field 1 is invalid',
      },
    ]);
    expect(formatValidationErrors(error)).toBe('Field 1 is invalid');
  });

  it('joins multiple issue messages with a comma and a space', () => {
    const error = new z.ZodError([
      {
        code: z.ZodIssueCode.custom,
        path: ['field1'],
        message: 'Field 1 is invalid',
      },
      {
        code: z.ZodIssueCode.custom,
        path: ['field2'],
        message: 'Field 2 is required',
      },
      {
        code: z.ZodIssueCode.custom,
        path: ['field3'],
        message: 'Field 3 must be a number',
      },
    ]);
    expect(formatValidationErrors(error)).toBe('Field 1 is invalid, Field 2 is required, Field 3 must be a number');
  });
});
