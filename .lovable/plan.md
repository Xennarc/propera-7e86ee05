
## Root cause
The `demo-enter` edge function exists in `supabase/functions/demo-enter/index.ts` but was never deployed to Supabase — calling it returns `NOT_FOUND`, which surfaces in the browser as `FunctionsFetchError: Failed to send a request to the Edge Function`. The DB side (3 demo_credentials rows, 3 demo guests, RPC) is correctly seeded.

## Fix
Redeploy the two demo functions. No code changes required.

1. Deploy `demo-enter` and `demo-reset` via `supabase--deploy_edge_functions`.
2. Smoke-test with `supabase--curl_edge_functions` POST `/demo-enter` `{"portal":"guest"}` → expect `success:true` with a `guestSession` payload.
3. If the curl reveals a runtime error (e.g. permissions on `demo_get_next_slot`, listUsers pagination, etc.), patch and redeploy.

## Files touched
None expected. Only redeploy. Code patch only if smoke test fails.
