import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { lastName, roomNumber } = await req.json()

    console.log('Find guest resort request:', { lastName, roomNumber })

    if (!lastName || !roomNumber) {
      return new Response(
        JSON.stringify({ error: 'Last name and room number are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client with service role to bypass RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const today = new Date().toISOString().split('T')[0]

    // Search for guests matching the criteria
    const { data: guests, error } = await supabase
      .from('guests')
      .select(`
        id,
        resort_id,
        resorts!inner(id, code, name, status)
      `)
      .ilike('full_name', `%${lastName}%`)
      .ilike('room_number', roomNumber)
      .lte('check_in_date', today)
      .gte('check_out_date', today)

    if (error) {
      console.error('Database error:', error)
      throw error
    }

    console.log('Found guests:', guests?.length || 0)

    // Filter to only active resorts
    const activeGuests = guests?.filter((g: any) => g.resorts?.status === 'ACTIVE') || []

    // Get unique resorts
    const uniqueResorts = new Map<string, { code: string; name: string }>()
    activeGuests.forEach((g: any) => {
      if (g.resorts && !uniqueResorts.has(g.resort_id)) {
        uniqueResorts.set(g.resort_id, { code: g.resorts.code, name: g.resorts.name })
      }
    })

    console.log('Unique active resorts:', uniqueResorts.size)

    let result: { type: string; resortCode?: string; resortName?: string }

    if (uniqueResorts.size === 0) {
      result = { type: 'not_found' }
    } else if (uniqueResorts.size === 1) {
      const [_, resort] = Array.from(uniqueResorts.entries())[0]
      result = { type: 'found', resortCode: resort.code, resortName: resort.name }
    } else {
      result = { type: 'multiple' }
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in find-guest-resort:', error)
    return new Response(
      JSON.stringify({ error: 'An error occurred while searching' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
