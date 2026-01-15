/**
 * Security Test Utilities
 * 
 * Provides helpers for creating test fixtures and authenticating as different users
 * to verify tenant isolation and RLS policies.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// These would typically come from environment variables in CI
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export interface TestResort {
  id: string;
  name: string;
  code: string;
}

export interface TestUser {
  id: string;
  email: string;
  password: string;
  client: SupabaseClient;
}

export interface TestGuest {
  id: string;
  resortId: string;
  fullName: string;
  roomNumber: string;
}

/**
 * Create a service role client for setup/teardown
 */
export function createServiceClient(): SupabaseClient {
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for security tests');
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Create an anonymous client (simulating unauthenticated access)
 */
export function createAnonClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Create an authenticated client for a specific user
 */
export async function createAuthenticatedClient(
  email: string,
  password: string
): Promise<SupabaseClient> {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) {
    throw new Error(`Failed to authenticate as ${email}: ${error.message}`);
  }

  return client;
}

/**
 * Generate a unique identifier for test fixtures
 */
export function generateTestId(): string {
  return `test_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

/**
 * Test fixture names prefixed to allow easy cleanup
 */
export const TEST_PREFIX = 'SECURITY_TEST_';

/**
 * Create a test resort using service role
 */
export async function createTestResort(
  serviceClient: SupabaseClient,
  suffix: string
): Promise<TestResort> {
  const code = `${TEST_PREFIX}${suffix}_${generateTestId()}`.substring(0, 10).toUpperCase();
  const name = `${TEST_PREFIX}Resort ${suffix}`;

  const { data, error } = await serviceClient
    .from('resorts')
    .insert({
      name,
      code,
      timezone: 'UTC',
      currency: 'USD',
      subscription_tier: 'starter',
      is_active: true,
    })
    .select('id, name, code')
    .single();

  if (error) {
    throw new Error(`Failed to create test resort ${suffix}: ${error.message}`);
  }

  return data as TestResort;
}

/**
 * Create a test user and assign resort membership
 */
export async function createTestUser(
  serviceClient: SupabaseClient,
  email: string,
  password: string,
  resortId: string | null,
  role: 'SUPER_ADMIN' | 'RESORT_ADMIN' | 'MANAGER' | 'STAFF' | 'FRONT_OFFICE' | null,
  globalRole: 'STAFF' | 'SUPER_ADMIN' = 'STAFF'
): Promise<TestUser> {
  // Create auth user
  const { data: authData, error: authError } = await serviceClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError) {
    throw new Error(`Failed to create auth user ${email}: ${authError.message}`);
  }

  const userId = authData.user.id;

  // Create profile
  const { error: profileError } = await serviceClient
    .from('profiles')
    .upsert({
      id: userId,
      email,
      global_role: globalRole,
      account_type: 'staff',
    });

  if (profileError) {
    throw new Error(`Failed to create profile for ${email}: ${profileError.message}`);
  }

  // Add resort membership if specified
  if (resortId && role) {
    const { error: membershipError } = await serviceClient
      .from('resort_memberships')
      .insert({
        user_id: userId,
        resort_id: resortId,
        resort_role: role,
      });

    if (membershipError) {
      throw new Error(`Failed to create membership for ${email}: ${membershipError.message}`);
    }
  }

  // Create authenticated client
  const client = await createAuthenticatedClient(email, password);

  return { id: userId, email, password, client };
}

/**
 * Create a test guest in a resort
 */
export async function createTestGuest(
  serviceClient: SupabaseClient,
  resortId: string,
  suffix: string
): Promise<TestGuest> {
  const today = new Date().toISOString().split('T')[0];
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const { data, error } = await serviceClient
    .from('guests')
    .insert({
      resort_id: resortId,
      full_name: `${TEST_PREFIX}Guest ${suffix}`,
      room_number: `T${suffix}`,
      check_in_date: today,
      check_out_date: nextWeek,
    })
    .select('id, resort_id, full_name, room_number')
    .single();

  if (error) {
    throw new Error(`Failed to create test guest ${suffix}: ${error.message}`);
  }

  return {
    id: data.id,
    resortId: data.resort_id,
    fullName: data.full_name,
    roomNumber: data.room_number,
  };
}

/**
 * Clean up all test fixtures
 */
export async function cleanupTestFixtures(serviceClient: SupabaseClient): Promise<void> {
  // Delete in reverse dependency order
  
  // Delete test guests
  await serviceClient
    .from('guests')
    .delete()
    .like('full_name', `${TEST_PREFIX}%`);

  // Delete test memberships (via cascade from users)
  
  // Delete test profiles and auth users
  const { data: testProfiles } = await serviceClient
    .from('profiles')
    .select('id')
    .like('email', `${TEST_PREFIX.toLowerCase()}%`);

  if (testProfiles) {
    for (const profile of testProfiles) {
      await serviceClient.auth.admin.deleteUser(profile.id);
    }
  }

  // Delete test resorts
  await serviceClient
    .from('resorts')
    .delete()
    .like('name', `${TEST_PREFIX}%`);
}

/**
 * Assert that an operation fails with RLS error
 */
export function expectRLSError(error: { message: string; code?: string } | null): void {
  if (!error) {
    throw new Error('Expected RLS error but operation succeeded');
  }
  // RLS violations typically return as permission denied or no rows affected
  const isRLSError = 
    error.message.includes('permission denied') ||
    error.message.includes('violates row-level security') ||
    error.message.includes('new row violates') ||
    error.code === '42501' ||
    error.code === '23514';
    
  if (!isRLSError) {
    throw new Error(`Expected RLS error but got: ${error.message}`);
  }
}

/**
 * Assert that a query returns no rows (RLS filtering)
 */
export function expectNoRows<T>(data: T[] | null): void {
  if (data && data.length > 0) {
    throw new Error(`Expected no rows but got ${data.length} rows`);
  }
}
