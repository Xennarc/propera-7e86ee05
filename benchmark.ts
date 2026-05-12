import { supabase } from './src/integrations/supabase/client';
import { performance } from 'perf_hooks';

// Mock supabase client to simulate a long query response if needed, or just benchmark real if there's data
// But actually we can mock global fetch to measure the number of queries and time

const MOCK_FETCH = async (input: RequestInfo | URL, init?: RequestInit) => {
  return new Response(JSON.stringify([{ resort_id: '1' }]), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

global.fetch = MOCK_FETCH as any;
