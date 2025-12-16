import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const BASE_URL = 'https://propera.cc'

// Static public pages to include in sitemap
const STATIC_PAGES = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/about', changefreq: 'monthly', priority: '0.8' },
  { path: '/pricing', changefreq: 'monthly', priority: '0.8' },
  { path: '/guest/login', changefreq: 'monthly', priority: '0.7' },
  { path: '/guest/find', changefreq: 'monthly', priority: '0.6' },
]

function formatDate(date: Date | string): string {
  const d = new Date(date)
  return d.toISOString().split('T')[0]
}

function generateUrlEntry(
  loc: string,
  lastmod?: string,
  changefreq = 'weekly',
  priority = '0.5'
): string {
  return `
  <url>
    <loc>${loc}</loc>
    ${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role to bypass RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Fetch only ACTIVE resorts (not INACTIVE or DEMO)
    const { data: resorts, error } = await supabase
      .from('resorts')
      .select('code, name, updated_at')
      .eq('status', 'ACTIVE')
      .order('name')

    if (error) {
      console.error('Error fetching resorts:', error)
      throw error
    }

    const today = formatDate(new Date())

    // Generate static page entries
    const staticEntries = STATIC_PAGES.map((page) =>
      generateUrlEntry(
        `${BASE_URL}${page.path}`,
        today,
        page.changefreq,
        page.priority
      )
    ).join('')

    // Generate resort marketing page entries (higher priority)
    // Pattern: /resorts/{code} (public marketing pages)
    const resortMarketingEntries = (resorts || [])
      .map((resort) =>
        generateUrlEntry(
          `${BASE_URL}/resorts/${resort.code.toLowerCase()}`,
          resort.updated_at ? formatDate(resort.updated_at) : today,
          'weekly',
          '0.8'
        )
      )
      .join('')

    // Generate resort-specific guest login entries
    // Pattern: /resort/{code}/guest/login (existing route structure)
    const resortLoginEntries = (resorts || [])
      .map((resort) =>
        generateUrlEntry(
          `${BASE_URL}/resort/${resort.code}/guest/login`,
          resort.updated_at ? formatDate(resort.updated_at) : today,
          'monthly',
          '0.6'
        )
      )
      .join('')

    // Build complete sitemap XML
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- 
    Propera Dynamic Sitemap
    Generated: ${today}
    
    Includes:
    - Static public pages (home, guest login, find resort)
    - Resort marketing pages (/resorts/{code}) for ACTIVE resorts
    - Resort-specific guest login pages for ACTIVE resorts
    
    Excludes:
    - /auth (staff login)
    - /staff/* (staff console)
    - /guest/* (authenticated guest routes)
    - /prearrival/* (token-based pre-arrival)
    - INACTIVE and DEMO resorts
  -->
${staticEntries}
${resortMarketingEntries}
${resortLoginEntries}
</urlset>`

    return new Response(sitemap.trim(), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    })
  } catch (error) {
    console.error('Sitemap generation error:', error)
    
    // Return a minimal valid sitemap on error
    const fallbackSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${BASE_URL}/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`

    return new Response(fallbackSitemap, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/xml; charset=utf-8',
      },
    })
  }
})
