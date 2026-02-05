 import { describe, it, expect } from 'vitest';
 import {
   getDisplayStatus,
   getAggregatedSubmissionStatus,
   isActiveStatus,
   getDepartmentLabel,
   deriveRequestTitle,
   formatDepartments,
   getTotalItemCount,
 } from './statusDisplay';
 
 describe('getDisplayStatus', () => {
   it('returns Submitted for NEW status', () => {
     const result = getDisplayStatus('NEW');
     expect(result.label).toBe('Submitted');
     expect(result.sortBucket).toBe('active');
     expect(result.badgeVariant).toBe('warning');
   });
 
   it('returns Received for ACKNOWLEDGED status', () => {
     const result = getDisplayStatus('ACKNOWLEDGED');
     expect(result.label).toBe('Received');
     expect(result.sortBucket).toBe('active');
   });
 
   it('returns Completed for COMPLETED status', () => {
     const result = getDisplayStatus('COMPLETED');
     expect(result.label).toBe('Completed');
     expect(result.sortBucket).toBe('past');
     expect(result.badgeVariant).toBe('success');
   });
 
   it('returns Cancelled for CANCELLED status', () => {
     const result = getDisplayStatus('CANCELLED');
     expect(result.label).toBe('Cancelled');
     expect(result.sortBucket).toBe('past');
     expect(result.badgeVariant).toBe('muted');
   });
 });
 
 describe('isActiveStatus', () => {
   it('returns true for active statuses', () => {
     expect(isActiveStatus('NEW')).toBe(true);
     expect(isActiveStatus('ACKNOWLEDGED')).toBe(true);
     expect(isActiveStatus('ASSIGNED')).toBe(true);
     expect(isActiveStatus('IN_PROGRESS')).toBe(true);
   });
 
   it('returns false for final statuses', () => {
     expect(isActiveStatus('COMPLETED')).toBe(false);
     expect(isActiveStatus('CANCELLED')).toBe(false);
   });
 });
 
 describe('getAggregatedSubmissionStatus', () => {
   it('returns NEW for empty requests array', () => {
     const result = getAggregatedSubmissionStatus([]);
     expect(result.status).toBe('NEW');
   });
 
   it('shows Cancelled when all items cancelled', () => {
     const requests = [
       { status: 'CANCELLED' as const },
       { status: 'CANCELLED' as const },
     ];
     const result = getAggregatedSubmissionStatus(requests);
     expect(result.status).toBe('CANCELLED');
     expect(result.label).toBe('Cancelled');
     expect(result.hasPartialCancellation).toBe(false);
   });
 
   it('shows Completed when all items completed', () => {
     const requests = [
       { status: 'COMPLETED' as const },
       { status: 'COMPLETED' as const },
     ];
     const result = getAggregatedSubmissionStatus(requests);
     expect(result.status).toBe('COMPLETED');
     expect(result.label).toBe('Completed');
     expect(result.hasPartialCancellation).toBe(false);
   });
 
   it('shows most advanced active status when any item active', () => {
     const requests = [
       { status: 'IN_PROGRESS' as const },
       { status: 'COMPLETED' as const },
     ];
     const result = getAggregatedSubmissionStatus(requests);
     expect(result.status).toBe('IN_PROGRESS');
   });
 
   it('picks the most progressed active status among multiple active', () => {
     const requests = [
       { status: 'NEW' as const },
       { status: 'ACKNOWLEDGED' as const },
       { status: 'IN_PROGRESS' as const },
     ];
     const result = getAggregatedSubmissionStatus(requests);
     expect(result.status).toBe('IN_PROGRESS');
   });
 
   it('shows Partially Completed when cancelled + completed mix', () => {
     const requests = [
       { status: 'CANCELLED' as const },
       { status: 'COMPLETED' as const },
     ];
     const result = getAggregatedSubmissionStatus(requests);
     expect(result.status).toBe('COMPLETED');
     expect(result.label).toBe('Partially Completed');
     expect(result.hasPartialCancellation).toBe(true);
   });
 
   it('active status takes precedence even with cancelled items', () => {
     const requests = [
       { status: 'CANCELLED' as const },
       { status: 'NEW' as const },
     ];
     const result = getAggregatedSubmissionStatus(requests);
     expect(result.status).toBe('NEW');
     expect(result.hasPartialCancellation).toBe(false);
   });
 });
 
 describe('getDepartmentLabel', () => {
   it('returns Housekeeping for HOUSEKEEPING key', () => {
     expect(getDepartmentLabel('HOUSEKEEPING')).toBe('Housekeeping');
   });
 
   it('returns Housekeeping for lowercase housekeeping key', () => {
     expect(getDepartmentLabel('housekeeping')).toBe('Housekeeping');
   });
 
   it('returns General for null or undefined', () => {
     expect(getDepartmentLabel(null)).toBe('General');
     expect(getDepartmentLabel(undefined)).toBe('General');
   });
 
   it('formats unknown keys to Title Case', () => {
     expect(getDepartmentLabel('some_custom_dept')).toBe('Some Custom Dept');
   });
 });
 
 describe('deriveRequestTitle', () => {
   it('returns Request for empty array', () => {
     expect(deriveRequestTitle([])).toBe('Request');
   });
 
   it('returns the title for single request', () => {
     expect(deriveRequestTitle([{ title: 'Extra Towels' }])).toBe('Extra Towels');
   });
 
   it('returns first title + count for multiple requests', () => {
     const requests = [
       { title: 'Extra Towels' },
       { title: 'Pillow' },
       { title: 'Blanket' },
     ];
     expect(deriveRequestTitle(requests)).toBe('Extra Towels + 2 more');
   });
 });
 
 describe('formatDepartments', () => {
   it('returns General for empty array', () => {
     expect(formatDepartments([])).toBe('General');
   });
 
   it('returns single department name', () => {
     expect(formatDepartments([{ department_key: 'HOUSEKEEPING' }])).toBe('Housekeeping');
   });
 
   it('joins two departments with &', () => {
     const requests = [
       { department_key: 'HOUSEKEEPING' },
       { department_key: 'CONCIERGE' },
     ];
     expect(formatDepartments(requests)).toBe('Housekeeping & Concierge');
   });
 
   it('formats three or more as "first + N more"', () => {
     const requests = [
       { department_key: 'HOUSEKEEPING' },
       { department_key: 'CONCIERGE' },
       { department_key: 'SPA' },
     ];
     expect(formatDepartments(requests)).toBe('Housekeeping + 2 more');
   });
 
   it('deduplicates same department', () => {
     const requests = [
       { department_key: 'HOUSEKEEPING' },
       { department_key: 'HOUSEKEEPING' },
     ];
     expect(formatDepartments(requests)).toBe('Housekeeping');
   });
 });
 
 describe('getTotalItemCount', () => {
   it('counts 1 per request without items', () => {
     const requests = [{}, {}, {}];
     expect(getTotalItemCount(requests)).toBe(3);
   });
 
   it('sums item quantities', () => {
     const requests = [
       { items: [{ quantity: 2 }, { quantity: 3 }] },
       { items: [{ quantity: 1 }] },
     ];
     expect(getTotalItemCount(requests)).toBe(6);
   });
 
   it('handles mixed requests with and without items', () => {
     const requests = [
       { items: [{ quantity: 2 }] },
       {},
     ];
     expect(getTotalItemCount(requests)).toBe(3);
   });
 });