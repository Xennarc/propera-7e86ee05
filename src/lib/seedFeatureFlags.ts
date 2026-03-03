/**
 * Feature Flag Seeding Utility
 * 
 * Seeds missing global feature flags from the canonical registry.
 * This is idempotent and will never overwrite existing flag values.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { FEATURE_FLAG_REGISTRY, type FeatureFlagDefinition } from './feature-flag-registry';

export interface SeedResult {
  success: boolean;
  seededCount: number;
  skippedCount: number;
  errors: string[];
}

/**
 * Seeds global feature flags from the registry.
 * Only inserts flags that don't already exist (resort_id IS NULL).
 * 
 * @param supabase - Supabase client instance
 * @returns SeedResult with counts and any errors
 */
export async function seedGlobalFeatureFlags(
  supabase: SupabaseClient
): Promise<SeedResult> {
  const result: SeedResult = {
    success: true,
    seededCount: 0,
    skippedCount: 0,
    errors: [],
  };

  try {
    // 1. Fetch existing global flags
    const { data: existingFlags, error: fetchError } = await supabase
      .from('feature_flags')
      .select('key')
      .is('resort_id', null);

    if (fetchError) {
      result.success = false;
      result.errors.push(`Failed to fetch existing flags: ${fetchError.message}`);
      return result;
    }

    const existingKeys = new Set(existingFlags?.map(f => f.key) || []);

    // 2. Filter registry to find missing flags
    const missingFlags = FEATURE_FLAG_REGISTRY.filter(
      flag => !existingKeys.has(flag.key)
    );

    if (missingFlags.length === 0) {
      result.skippedCount = FEATURE_FLAG_REGISTRY.length;
      return result;
    }

    // 3. Prepare rows for insertion
    const rowsToInsert = missingFlags.map((flag: FeatureFlagDefinition) => ({
      key: flag.key,
      label: flag.label,
      description: flag.description,
      category: flag.category,
      tier: flag.tier,
      // Default ON for activities_ops (safe module), OFF for everything else
      is_enabled: flag.key === 'enable_activities_ops' ? true : false,
      is_dangerous: flag.is_dangerous,
      scope: flag.scope,
      resort_id: null, // Global flags have no resort_id
    }));

    // 4. Insert missing flags
    const { error: insertError } = await supabase
      .from('feature_flags')
      .insert(rowsToInsert);

    if (insertError) {
      result.success = false;
      result.errors.push(`Failed to insert flags: ${insertError.message}`);
      return result;
    }

    result.seededCount = missingFlags.length;
    result.skippedCount = existingKeys.size;

    console.log(
      `[Feature Flags] Seeded ${result.seededCount} new flags, skipped ${result.skippedCount} existing`
    );

    return result;
  } catch (error) {
    result.success = false;
    result.errors.push(
      `Unexpected error during seeding: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    return result;
  }
}

/**
 * Validates that all registry flags exist in the database.
 * Useful for debugging and health checks.
 */
export async function validateFeatureFlags(
  supabase: SupabaseClient
): Promise<{ valid: boolean; missingKeys: string[] }> {
  const { data: existingFlags, error } = await supabase
    .from('feature_flags')
    .select('key')
    .is('resort_id', null);

  if (error) {
    console.error('[Feature Flags] Validation failed:', error.message);
    return { valid: false, missingKeys: [] };
  }

  const existingKeys = new Set(existingFlags?.map(f => f.key) || []);
  const missingKeys = FEATURE_FLAG_REGISTRY
    .filter(flag => !existingKeys.has(flag.key))
    .map(flag => flag.key);

  return {
    valid: missingKeys.length === 0,
    missingKeys,
  };
}
