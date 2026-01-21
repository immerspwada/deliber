import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AnalyticsRequest {
  metric: 'overview' | 'service_types' | 'earnings' | 'ratings' | 'growth';
  filters?: {
    start_date?: string;
    end_date?: string;
    service_type?: string;
    status?: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Verify admin user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    // Check if user is admin (production uses 'users' table, not 'profiles')
    const { data: userData } = await supabaseClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userData?.role !== 'admin') {
      throw new Error('Forbidden: Admin access required')
    }

    // Parse request body
    const body: AnalyticsRequest = await req.json()

    let result: unknown

    switch (body.metric) {
      case 'overview':
        result = await getOverviewStats(supabaseClient, body.filters)
        break
      case 'service_types':
        result = await getServiceTypeStats(supabaseClient, body.filters)
        break
      case 'earnings':
        result = await getEarningsStats(supabaseClient, body.filters)
        break
      case 'ratings':
        result = await getRatingsStats(supabaseClient, body.filters)
        break
      case 'growth':
        result = await getGrowthStats(supabaseClient, body.filters)
        break
      default:
        throw new Error('Invalid metric type')
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error in admin-analytics:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: error instanceof Error && error.message.includes('Forbidden') ? 403 : 400,
      }
    )
  }
})

async function getOverviewStats(supabaseClient: any, filters?: any) {
  // Total providers
  const { count: totalProviders } = await supabaseClient
    .from('providers')
    .select('*', { count: 'exact', head: true })

  // Active providers
  const { count: activeProviders } = await supabaseClient
    .from('providers')
    .select('*', { count: 'exact', head: true })
    .in('status', ['approved', 'active'])

  // Pending verifications
  const { count: pendingVerifications } = await supabaseClient
    .from('providers')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending_verification')

  // Average rating
  const { data: ratings } = await supabaseClient
    .from('providers')
    .select('rating')
    .not('rating', 'is', null)

  let averageRating = 0
  if (ratings && ratings.length > 0) {
    const sum = ratings.reduce((acc: number, r: any) => acc + parseFloat(r.rating), 0)
    averageRating = sum / ratings.length
  }

  return {
    totalProviders: totalProviders || 0,
    activeProviders: activeProviders || 0,
    pendingVerifications: pendingVerifications || 0,
    averageRating,
  }
}

async function getServiceTypeStats(supabaseClient: any, filters?: any) {
  let query = supabaseClient.from('providers').select('service_types')

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  const { data } = await query

  if (!data) return []

  // Count service types
  const counts: Record<string, number> = {}
  data.forEach((provider: any) => {
    provider.service_types?.forEach((type: string) => {
      counts[type] = (counts[type] || 0) + 1
    })
  })

  const total = Object.values(counts).reduce((sum, count) => sum + count, 0)

  return Object.entries(counts)
    .map(([type, count]) => ({
      serviceType: type,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count)
}

async function getEarningsStats(supabaseClient: any, filters?: any) {
  let query = supabaseClient.from('earnings').select('service_type, net_earnings, earned_at')

  if (filters?.start_date) {
    query = query.gte('earned_at', filters.start_date)
  }
  if (filters?.end_date) {
    query = query.lte('earned_at', filters.end_date)
  }
  if (filters?.service_type) {
    query = query.eq('service_type', filters.service_type)
  }

  const { data } = await query

  if (!data) return []

  // Group by service type
  const grouped: Record<string, { total: number; count: number }> = {}
  data.forEach((earning: any) => {
    const type = earning.service_type
    if (!grouped[type]) {
      grouped[type] = { total: 0, count: 0 }
    }
    grouped[type].total += parseFloat(earning.net_earnings)
    grouped[type].count += 1
  })

  return Object.entries(grouped)
    .map(([type, data]) => ({
      serviceType: type,
      totalEarnings: data.total,
      tripCount: data.count,
      averageEarnings: data.total / data.count,
    }))
    .sort((a, b) => b.totalEarnings - a.totalEarnings)
}

async function getRatingsStats(supabaseClient: any, filters?: any) {
  // This would require joining jobs with ratings
  // For now, return aggregated provider ratings by service type
  const { data: providers } = await supabaseClient
    .from('providers')
    .select('service_types, rating')
    .not('rating', 'is', null)

  if (!providers) return []

  // Group ratings by service type
  const grouped: Record<string, number[]> = {}
  providers.forEach((provider: any) => {
    provider.service_types?.forEach((type: string) => {
      if (!grouped[type]) {
        grouped[type] = []
      }
      grouped[type].push(parseFloat(provider.rating))
    })
  })

  return Object.entries(grouped).map(([type, ratings]) => ({
    serviceType: type,
    averageRating: ratings.reduce((sum, r) => sum + r, 0) / ratings.length,
    count: ratings.length,
  }))
}

async function getGrowthStats(supabaseClient: any, filters?: any) {
  const days = 30
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const { data } = await supabaseClient
    .from('providers')
    .select('created_at')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())
    .order('created_at', { ascending: true })

  if (!data) return []

  // Group by date
  const grouped: Record<string, number> = {}
  data.forEach((provider: any) => {
    const date = new Date(provider.created_at).toISOString().split('T')[0]
    grouped[date] = (grouped[date] || 0) + 1
  })

  // Fill in missing dates with 0
  const result = []
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate)
    date.setDate(date.getDate() + i)
    const dateStr = date.toISOString().split('T')[0]
    result.push({
      date: dateStr,
      count: grouped[dateStr] || 0,
    })
  }

  return result
}
