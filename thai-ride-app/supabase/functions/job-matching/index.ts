import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface JobMatchingRequest {
  provider_id: string
  location: { lat: number; lng: number }
  service_types: string[]
  max_distance_km?: number
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body: JobMatchingRequest = await req.json()
    const { provider_id, location, service_types, max_distance_km = 10 } = body

    // Validate required fields
    if (!provider_id || !location || !service_types || service_types.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify provider is online and approved
    const { data: provider, error: providerError } = await supabaseClient
      .from('providers')
      .select('id, status, is_online')
      .eq('id', provider_id)
      .single()

    if (providerError || !provider) {
      return new Response(
        JSON.stringify({ error: 'Provider not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!provider.is_online) {
      return new Response(
        JSON.stringify({ error: 'Provider is offline' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (provider.status !== 'approved' && provider.status !== 'active') {
      return new Response(
        JSON.stringify({ error: 'Provider is not approved' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if provider has active job
    const { data: activeJob } = await supabaseClient
      .from('jobs')
      .select('id')
      .eq('provider_id', provider_id)
      .in('status', ['accepted', 'arrived', 'in_progress'])
      .single()

    if (activeJob) {
      return new Response(
        JSON.stringify({ jobs: [], message: 'Provider has active job' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Query available jobs using PostGIS
    // Convert max distance to meters for ST_DWithin
    const maxDistanceMeters = max_distance_km * 1000

    // Create point from provider location
    const providerPoint = `POINT(${location.lng} ${location.lat})`

    // Query jobs within service area
    const { data: jobs, error: jobsError } = await supabaseClient.rpc(
      'get_nearby_jobs',
      {
        p_provider_location: providerPoint,
        p_max_distance_meters: maxDistanceMeters,
        p_service_types: service_types,
      }
    )

    if (jobsError) {
      console.error('Error querying jobs:', jobsError)
      throw jobsError
    }

    // Calculate distance and sort by earnings and distance
    const jobsWithDistance = (jobs || []).map((job: any) => {
      // Calculate distance using Haversine formula
      const distance = calculateDistance(
        location.lat,
        location.lng,
        job.pickup_lat,
        job.pickup_lng
      )

      return {
        ...job,
        distance_km: distance,
        score: calculateJobScore(job.estimated_earnings, distance),
      }
    })

    // Sort by score (higher is better)
    jobsWithDistance.sort((a, b) => b.score - a.score)

    // Return top 10 jobs
    const topJobs = jobsWithDistance.slice(0, 10)

    return new Response(
      JSON.stringify({
        success: true,
        jobs: topJobs,
        count: topJobs.length,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371 // Earth's radius in km
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180
}

function calculateJobScore(earnings: number, distance: number): number {
  // Score formula: earnings per km
  // Higher earnings and shorter distance = higher score
  if (distance === 0) return earnings * 100
  return earnings / distance
}
