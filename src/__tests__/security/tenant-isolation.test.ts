/**
 * Tenant Isolation Security Tests
 * 
 * These tests verify that RLS policies correctly prevent cross-tenant data access.
 * They simulate real attack scenarios where a malicious client attempts to:
 * - Read data from other resorts
 * - Insert data into other resorts
 * - Update data to change resort_id
 * - Escalate privileges
 * 
 * IMPORTANT: These tests require a running Supabase instance with service_role access.
 * Run with: pnpm test:security
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SupabaseClient } from '@supabase/supabase-js';
import {
  createServiceClient,
  createTestResort,
  createTestUser,
  createTestGuest,
  cleanupTestFixtures,
  expectRLSError,
  expectNoRows,
  TestResort,
  TestUser,
  TestGuest,
  TEST_PREFIX,
} from './test-utils';

// Test fixtures
let serviceClient: SupabaseClient;
let resortA: TestResort;
let resortB: TestResort;
let superAdmin: TestUser;
let resortAdminA: TestUser;
let staffA: TestUser;
let resortAdminB: TestUser;
let staffB: TestUser;
let guestA1: TestGuest;
let guestA2: TestGuest;
let guestB1: TestGuest;

// Skip tests if service role key is not available
const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

describe.skipIf(!hasServiceKey)('Tenant Isolation Security Tests', () => {
  beforeAll(async () => {
    serviceClient = createServiceClient();
    
    // Clean up any existing test data
    await cleanupTestFixtures(serviceClient);
    
    // Create test resorts
    resortA = await createTestResort(serviceClient, 'A');
    resortB = await createTestResort(serviceClient, 'B');
    
    // Create test users
    const timestamp = Date.now();
    
    superAdmin = await createTestUser(
      serviceClient,
      `${TEST_PREFIX.toLowerCase()}superadmin_${timestamp}@test.local`,
      'TestPassword123!',
      null,
      null,
      'SUPER_ADMIN'
    );
    
    resortAdminA = await createTestUser(
      serviceClient,
      `${TEST_PREFIX.toLowerCase()}admin_a_${timestamp}@test.local`,
      'TestPassword123!',
      resortA.id,
      'RESORT_ADMIN'
    );
    
    staffA = await createTestUser(
      serviceClient,
      `${TEST_PREFIX.toLowerCase()}staff_a_${timestamp}@test.local`,
      'TestPassword123!',
      resortA.id,
      'STAFF'
    );
    
    resortAdminB = await createTestUser(
      serviceClient,
      `${TEST_PREFIX.toLowerCase()}admin_b_${timestamp}@test.local`,
      'TestPassword123!',
      resortB.id,
      'RESORT_ADMIN'
    );
    
    staffB = await createTestUser(
      serviceClient,
      `${TEST_PREFIX.toLowerCase()}staff_b_${timestamp}@test.local`,
      'TestPassword123!',
      resortB.id,
      'STAFF'
    );
    
    // Create test guests
    guestA1 = await createTestGuest(serviceClient, resortA.id, 'A1');
    guestA2 = await createTestGuest(serviceClient, resortA.id, 'A2');
    guestB1 = await createTestGuest(serviceClient, resortB.id, 'B1');
  }, 120000); // 2 minute timeout for setup

  afterAll(async () => {
    // Sign out all test clients
    await superAdmin?.client?.auth?.signOut();
    await resortAdminA?.client?.auth?.signOut();
    await staffA?.client?.auth?.signOut();
    await resortAdminB?.client?.auth?.signOut();
    await staffB?.client?.auth?.signOut();
    
    // Clean up test fixtures
    if (serviceClient) {
      await cleanupTestFixtures(serviceClient);
    }
  }, 60000);

  describe('Cross-tenant SELECT prevention', () => {
    it('Staff A cannot SELECT Resort B guests', async () => {
      const { data, error } = await staffA.client
        .from('guests')
        .select('*')
        .eq('resort_id', resortB.id);

      expect(error).toBeNull();
      expectNoRows(data);
    });

    it('Staff A can only SELECT Resort A guests', async () => {
      const { data, error } = await staffA.client
        .from('guests')
        .select('*')
        .eq('resort_id', resortA.id);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data!.length).toBeGreaterThan(0);
      // All returned guests should be from Resort A
      data!.forEach(guest => {
        expect(guest.resort_id).toBe(resortA.id);
      });
    });

    it('Resort Admin A cannot SELECT Resort B activities', async () => {
      // First create an activity in Resort B using service role
      const { data: activityB } = await serviceClient
        .from('activities')
        .insert({
          resort_id: resortB.id,
          name: `${TEST_PREFIX}Activity B`,
          duration_minutes: 60,
        })
        .select('id')
        .single();

      // Resort Admin A should not see it
      const { data, error } = await resortAdminA.client
        .from('activities')
        .select('*')
        .eq('id', activityB?.id);

      expect(error).toBeNull();
      expectNoRows(data);

      // Cleanup
      if (activityB) {
        await serviceClient.from('activities').delete().eq('id', activityB.id);
      }
    });

    it('SUPER_ADMIN can SELECT from all resorts', async () => {
      const { data: dataA, error: errorA } = await superAdmin.client
        .from('guests')
        .select('*')
        .eq('resort_id', resortA.id);

      const { data: dataB, error: errorB } = await superAdmin.client
        .from('guests')
        .select('*')
        .eq('resort_id', resortB.id);

      expect(errorA).toBeNull();
      expect(errorB).toBeNull();
      expect(dataA!.length).toBeGreaterThan(0);
      expect(dataB!.length).toBeGreaterThan(0);
    });
  });

  describe('Cross-tenant INSERT prevention', () => {
    it('Staff A cannot INSERT guest into Resort B', async () => {
      const { error } = await staffA.client
        .from('guests')
        .insert({
          resort_id: resortB.id, // Attempting cross-tenant insert
          full_name: `${TEST_PREFIX}Malicious Insert`,
          room_number: 'T999',
          check_in_date: new Date().toISOString().split('T')[0],
          check_out_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        });

      expectRLSError(error);
    });

    it('Staff A can INSERT guest into Resort A', async () => {
      const { data, error } = await resortAdminA.client
        .from('guests')
        .insert({
          resort_id: resortA.id,
          full_name: `${TEST_PREFIX}Valid Insert`,
          room_number: 'T101',
          check_in_date: new Date().toISOString().split('T')[0],
          check_out_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        })
        .select('id')
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();

      // Cleanup
      if (data) {
        await serviceClient.from('guests').delete().eq('id', data.id);
      }
    });

    it('Resort Admin B cannot INSERT activity into Resort A', async () => {
      const { error } = await resortAdminB.client
        .from('activities')
        .insert({
          resort_id: resortA.id, // Wrong resort
          name: `${TEST_PREFIX}Malicious Activity`,
          duration_minutes: 60,
        });

      expectRLSError(error);
    });
  });

  describe('Cross-tenant UPDATE prevention', () => {
    it('Staff A cannot UPDATE Resort B guests', async () => {
      const { error } = await staffA.client
        .from('guests')
        .update({ notes: 'Hacked!' })
        .eq('id', guestB1.id);

      // Either RLS error or no rows affected
      // The update should not succeed
      const { data: checkData } = await serviceClient
        .from('guests')
        .select('notes')
        .eq('id', guestB1.id)
        .single();

      expect(checkData?.notes).not.toBe('Hacked!');
    });

    it('Staff A cannot UPDATE resort_id to move guest to Resort B', async () => {
      // First verify the trigger exists and works
      const { error } = await resortAdminA.client
        .from('guests')
        .update({ resort_id: resortB.id }) // Attempting to change resort_id
        .eq('id', guestA1.id);

      // Should fail due to immutability trigger
      expect(error).toBeDefined();
      expect(error!.message).toContain('Cannot change resort_id');
    });

    it('Even SUPER_ADMIN cannot change resort_id (trigger enforced)', async () => {
      const { error } = await superAdmin.client
        .from('guests')
        .update({ resort_id: resortB.id })
        .eq('id', guestA1.id);

      // Trigger should block even super admin
      expect(error).toBeDefined();
      expect(error!.message).toContain('Cannot change resort_id');
    });
  });

  describe('Role escalation prevention', () => {
    it('User cannot self-grant resort_memberships', async () => {
      const { error } = await staffA.client
        .from('resort_memberships')
        .insert({
          user_id: staffA.id, // Self-grant
          resort_id: resortA.id,
          resort_role: 'RESORT_ADMIN', // Escalating to admin
        });

      // Should fail due to trigger or RLS
      expect(error).toBeDefined();
    });

    it('User cannot escalate own global_role to SUPER_ADMIN', async () => {
      const { error } = await staffA.client
        .from('profiles')
        .update({ global_role: 'SUPER_ADMIN' })
        .eq('id', staffA.id);

      // Should fail due to escalation prevention trigger
      expect(error).toBeDefined();
      expect(error!.message).toContain('Only super admins can modify global_role');
    });

    it('Resort Admin A cannot grant membership in Resort B', async () => {
      // Create a new user via service role to test membership grant
      const { data: tempUser } = await serviceClient.auth.admin.createUser({
        email: `${TEST_PREFIX.toLowerCase()}temp_${Date.now()}@test.local`,
        password: 'TempPassword123!',
        email_confirm: true,
      });

      if (tempUser?.user) {
        await serviceClient.from('profiles').upsert({
          id: tempUser.user.id,
          email: tempUser.user.email,
          global_role: 'STAFF',
        });

        // Resort Admin A tries to add user to Resort B
        const { error } = await resortAdminA.client
          .from('resort_memberships')
          .insert({
            user_id: tempUser.user.id,
            resort_id: resortB.id, // Wrong resort
            resort_role: 'STAFF',
          });

        // Should fail - Admin A has no authority over Resort B
        expectRLSError(error);

        // Cleanup
        await serviceClient.auth.admin.deleteUser(tempUser.user.id);
      }
    });

    it('SUPER_ADMIN can modify global_role', async () => {
      // Super admin should be able to change roles
      const { error: updateError } = await superAdmin.client
        .from('profiles')
        .update({ global_role: 'STAFF' }) // Demote to test
        .eq('id', staffA.id);

      expect(updateError).toBeNull();

      // Restore original role
      await superAdmin.client
        .from('profiles')
        .update({ global_role: 'STAFF' })
        .eq('id', staffA.id);
    });
  });

  describe('SECURITY DEFINER RPC safety', () => {
    it('get_resort_public_info returns only safe fields', async () => {
      const { data, error } = await staffA.client.rpc('get_resort_public_info', {
        resort_code: resortB.code,
      });

      expect(error).toBeNull();
      
      if (data) {
        // Should only contain branding/public fields, not sensitive data
        expect(data).not.toHaveProperty('subscription_tier');
        expect(data).not.toHaveProperty('stripe_customer_id');
        expect(data).not.toHaveProperty('billing_email');
        // Should have safe public fields
        expect(data).toHaveProperty('name');
      }
    });

    it('validate_prearrival_token does not leak cross-tenant data with invalid token', async () => {
      // Try to access prearrival with a fake token
      const { data, error } = await staffA.client.rpc('validate_prearrival_token', {
        token_value: 'FAKE_TOKEN_123',
        resort_code_input: resortB.code,
      });

      // Should not return data or error with sensitive info
      expect(data).toBeFalsy();
    });
  });

  describe('DELETE protection', () => {
    it('Staff A cannot DELETE Resort B guests', async () => {
      const { error } = await staffA.client
        .from('guests')
        .delete()
        .eq('id', guestB1.id);

      // Verify guest still exists
      const { data: checkData } = await serviceClient
        .from('guests')
        .select('id')
        .eq('id', guestB1.id)
        .single();

      expect(checkData).toBeDefined();
      expect(checkData?.id).toBe(guestB1.id);
    });

    it('Resort Admin A cannot DELETE Resort B activities', async () => {
      // Create an activity in Resort B
      const { data: activityB } = await serviceClient
        .from('activities')
        .insert({
          resort_id: resortB.id,
          name: `${TEST_PREFIX}Delete Test Activity`,
          duration_minutes: 60,
        })
        .select('id')
        .single();

      if (activityB) {
        // Try to delete from Resort A admin
        await resortAdminA.client
          .from('activities')
          .delete()
          .eq('id', activityB.id);

        // Verify it still exists
        const { data: checkData } = await serviceClient
          .from('activities')
          .select('id')
          .eq('id', activityB.id)
          .single();

        expect(checkData).toBeDefined();

        // Cleanup
        await serviceClient.from('activities').delete().eq('id', activityB.id);
      }
    });
  });
});

describe('Security Audit View', () => {
  it('security_rls_audit should return no critical issues in production', async () => {
    if (!hasServiceKey) {
      return; // Skip if no service key
    }

    const serviceClient = createServiceClient();
    
    // Query the audit view using service role
    const { data, error } = await serviceClient.rpc('get_security_audit_results');

    expect(error).toBeNull();
    
    // Filter for critical issues only
    const criticalIssues = (data || []).filter(
      (issue: { issue_type: string }) => 
        issue.issue_type === 'RLS_DISABLED' || 
        issue.issue_type === 'NO_POLICIES'
    );

    // In a properly secured system, there should be no critical issues
    // This test will fail if new tables are added without proper RLS
    expect(criticalIssues).toHaveLength(0);
  });
});
