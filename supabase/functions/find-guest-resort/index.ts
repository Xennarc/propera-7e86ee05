import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Rate limit constants
const IP_RATE_LIMIT = 5 // requests per minute
const ROOM_RATE_LIMIT = 10 // requests per 5 minutes

function getClientIP(req: Request): string {
  const forwardedFor = req.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }
  return req.headers.get('x-real-ip') || 'unknown'
}

async function checkRateLimit(
  supabase: any, 
  ip: string, 
  roomNumber: string
): Promise<{ allowed: boolean; reason?: string }> {
  const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString()
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
  
  // Check requests per IP in last minute
  const { count: ipCount, error: ipError } = await supabase
    .from('rate_limit_logs')
    .select('*', { count: 'exact', head: true })
    .eq('endpoint', 'find-guest-resort')
    .eq('identifier', ip)
    .gte('created_at', oneMinuteAgo)
  
  if (ipError) {
    console.error('Rate limit IP check error:', ipError)
  } else if ((ipCount || 0) >= IP_RATE_LIMIT) {
    console.log(JSON.stringify({
      event: 'rate-limit-exceeded',
      type: 'ip',
      ip,
      count: ipCount,
      timestamp: new Date().toISOString()
    }))
    return { allowed: false, reason: 'Too many search attempts. Please wait a minute and try again.' }
  }
  
  // Check requests per room number in last 5 minutes
  const { count: roomCount, error: roomError } = await supabase
    .from('rate_limit_logs')
    .select('*', { count: 'exact', head: true })
    .eq('endpoint', 'find-guest-resort')
    .eq('secondary_key', roomNumber.toLowerCase())
    .gte('created_at', fiveMinutesAgo)
  
  if (roomError) {
    console.error('Rate limit room check error:', roomError)
  } else if ((roomCount || 0) >= ROOM_RATE_LIMIT) {
    console.log(JSON.stringify({
      event: 'rate-limit-exceeded',
      type: 'room',
      roomNumber,
      count: roomCount,
      timestamp: new Date().toISOString()
    }))
    return { allowed: false, reason: 'Too many attempts for this room number. Please try again later or contact the front desk.' }
  }
  
  return { allowed: true }
}

async function logRequest(supabase: any, ip: string, roomNumber: string) {
  const { error } = await supabase.from('rate_limit_logs').insert({
    endpoint: 'find-guest-resort',
    identifier: ip,
    secondary_key: roomNumber.toLowerCase()
  })
  if (error) {
    console.error('Failed to log rate limit request:', error)
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { lastName, roomNumber } = await req.json()
    const clientIP = getClientIP(req)

    console.log(JSON.stringify({
      event: 'find-guest-resort-request',
      ip: clientIP,
      hasLastName: !!lastName,
      hasRoomNumber: !!roomNumber,
      timestamp: new Date().toISOString()
    }))

    // Input validation
    if (!lastName || !roomNumber) {
      return new Response(
        JSON.stringify({ error: 'Last name and room number are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Sanitize inputs
    const sanitizedLastName = lastName.trim().substring(0, 100)
    const sanitizedRoomNumber = roomNumber.trim().substring(0, 20)

    // Validate input format (allow letters, spaces, hyphens, apostrophes, periods for names)
    if (!/^[a-zA-Z\s\-'\.]+$/.test(sanitizedLastName)) {
      return new Response(
        JSON.stringify({ error: 'Invalid last name format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client with service role to bypass RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Check rate limits
    const rateLimitResult = await checkRateLimit(supabase, clientIP, sanitizedRoomNumber)
    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({ error: rateLimitResult.reason, rateLimited: true }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Log this request for rate limiting
    await logRequest(supabase, clientIP, sanitizedRoomNumber)

    const today = new Date().toISOString().split('T')[0]

    // Search for guests matching the criteria
    const { data: guests, error } = await supabase
      .from('guests')
      .select(`
        id,
        resort_id,
        resorts!inner(id, code, name, status)
      `)
      .ilike('full_name', `%${sanitizedLastName}%`)
      .ilike('room_number', sanitizedRoomNumber)
      .lte('check_in_date', today)
      .gte('check_out_date', today)

    if (error) {
      console.error('Database error:', error)
      throw error
    }

    // Filter to only active resorts
    const activeGuests = guests?.filter((g: any) => g.resorts?.status === 'ACTIVE') || []

    // Get unique resorts
    const uniqueResorts = new Map<string, { code: string; name: string }>()
    activeGuests.forEach((g: any) => {
      if (g.resorts && !uniqueResorts.has(g.resort_id)) {
        uniqueResorts.set(g.resort_id, { code: g.resorts.code, name: g.resorts.name })
      }
    })

    let result: { type: string; resortCode?: string; resortName?: string }

    if (uniqueResorts.size === 0) {
      result = { type: 'not_found' }
    } else if (uniqueResorts.size === 1) {
      const [_, resort] = Array.from(uniqueResorts.entries())[0]
      result = { type: 'found', resortCode: resort.code, resortName: resort.name }
    } else {
      result = { type: 'multiple' }
    }

    console.log(JSON.stringify({
      event: 'find-guest-resort-result',
      ip: clientIP,
      resultType: result.type,
      timestamp: new Date().toISOString()
    }))

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
