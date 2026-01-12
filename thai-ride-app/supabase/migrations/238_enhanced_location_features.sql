-- ============================================================================
-- Migration: Enhanced Location Features
-- Purpose: Add custom_name column to saved_places, add place_type to recent_places,
--          add unique constraints, and improve indexes for location management
-- Affected Tables: saved_places, recent_places
-- ============================================================================

-- ============================================================================
-- PART 1: Enhance saved_places table
-- ============================================================================

-- Add custom_name column for favorite places (allows user to give custom names)
alter table public.saved_places 
add column if not exists custom_name text;

-- Add comment explaining the column
comment on column public.saved_places.custom_name is 
  'Custom name for favorite places (place_type = other). Allows users to name their saved locations.';

-- Create partial unique index for home - only one home per user
-- Using partial index because we only want uniqueness for home type
create unique index if not exists idx_saved_places_unique_home 
on public.saved_places (user_id) 
where place_type = 'home';

-- Create partial unique index for work - only one work per user
create unique index if not exists idx_saved_places_unique_work 
on public.saved_places (user_id) 
where place_type = 'work';

-- Add index for faster lookup by place_type
create index if not exists idx_saved_places_type 
on public.saved_places (user_id, place_type);

-- ============================================================================
-- PART 2: Enhance recent_places table
-- ============================================================================

-- Add place_type column to distinguish pickup vs destination
alter table public.recent_places 
add column if not exists place_type text default 'destination' 
check (place_type in ('pickup', 'destination'));

-- Rename search_count to use_count for clarity (if exists)
-- Note: Using DO block to handle case where column might not exist
do $$
begin
  if exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' 
    and table_name = 'recent_places' 
    and column_name = 'search_count'
  ) then
    alter table public.recent_places rename column search_count to use_count;
  end if;
end $$;

-- Add use_count if it doesn't exist (in case rename didn't happen)
alter table public.recent_places 
add column if not exists use_count integer default 1;

-- Create unique constraint for deduplication
-- Same location (within precision) for same user and type should be unique
create unique index if not exists idx_recent_places_unique_location 
on public.recent_places (user_id, round(lat::numeric, 4), round(lng::numeric, 4), place_type);

-- Add index for faster lookup by last_used
create index if not exists idx_recent_places_last_used 
on public.recent_places (user_id, last_used_at desc);

-- Add index for place_type filtering
create index if not exists idx_recent_places_type 
on public.recent_places (user_id, place_type);

-- ============================================================================
-- PART 3: Update RLS Policies
-- ============================================================================

-- Drop existing policies if they exist (to recreate with better names)
drop policy if exists "Users can view own saved places" on public.saved_places;
drop policy if exists "Users can insert own saved places" on public.saved_places;
drop policy if exists "Users can update own saved places" on public.saved_places;
drop policy if exists "Users can delete own saved places" on public.saved_places;

drop policy if exists "Users can view own recent places" on public.recent_places;
drop policy if exists "Users can insert own recent places" on public.recent_places;
drop policy if exists "Users can update own recent places" on public.recent_places;
drop policy if exists "Users can delete own recent places" on public.recent_places;

-- Enable RLS on recent_places if not already enabled
alter table public.recent_places enable row level security;

-- ============================================================================
-- Saved Places RLS Policies
-- ============================================================================

-- Policy: Authenticated users can view their own saved places
create policy "saved_places_select_own"
on public.saved_places for select
to authenticated
using (auth.uid() = user_id);

-- Policy: Authenticated users can insert their own saved places
create policy "saved_places_insert_own"
on public.saved_places for insert
to authenticated
with check (auth.uid() = user_id);

-- Policy: Authenticated users can update their own saved places
create policy "saved_places_update_own"
on public.saved_places for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Policy: Authenticated users can delete their own saved places
create policy "saved_places_delete_own"
on public.saved_places for delete
to authenticated
using (auth.uid() = user_id);

-- ============================================================================
-- Recent Places RLS Policies
-- ============================================================================

-- Policy: Authenticated users can view their own recent places
create policy "recent_places_select_own"
on public.recent_places for select
to authenticated
using (auth.uid() = user_id);

-- Policy: Authenticated users can insert their own recent places
create policy "recent_places_insert_own"
on public.recent_places for insert
to authenticated
with check (auth.uid() = user_id);

-- Policy: Authenticated users can update their own recent places
create policy "recent_places_update_own"
on public.recent_places for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Policy: Authenticated users can delete their own recent places
create policy "recent_places_delete_own"
on public.recent_places for delete
to authenticated
using (auth.uid() = user_id);

-- ============================================================================
-- PART 4: Helper function for deduplication
-- ============================================================================

-- Function to upsert recent place with deduplication
-- If a place within ~11 meters (4 decimal places) exists, update it instead of inserting
create or replace function public.upsert_recent_place(
  p_user_id uuid,
  p_name text,
  p_address text,
  p_lat decimal(10,8),
  p_lng decimal(11,8),
  p_place_type text default 'destination'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing_id uuid;
  v_result_id uuid;
begin
  -- Check for existing place within ~11 meters (4 decimal places precision)
  select id into v_existing_id
  from public.recent_places
  where user_id = p_user_id
    and round(lat::numeric, 4) = round(p_lat::numeric, 4)
    and round(lng::numeric, 4) = round(p_lng::numeric, 4)
    and place_type = p_place_type
  limit 1;

  if v_existing_id is not null then
    -- Update existing record
    update public.recent_places
    set 
      name = p_name,
      address = p_address,
      use_count = use_count + 1,
      last_used_at = now()
    where id = v_existing_id
    returning id into v_result_id;
  else
    -- Insert new record
    insert into public.recent_places (user_id, name, address, lat, lng, place_type, use_count, last_used_at)
    values (p_user_id, p_name, p_address, p_lat, p_lng, p_place_type, 1, now())
    returning id into v_result_id;
  end if;

  return v_result_id;
end;
$$;

-- Grant execute permission to authenticated users
grant execute on function public.upsert_recent_place(uuid, text, text, decimal, decimal, text) to authenticated;

-- ============================================================================
-- PART 5: Function to get recent places with limit
-- ============================================================================

-- Function to get recent places for a user with limit
create or replace function public.get_recent_places(
  p_user_id uuid,
  p_place_type text default null,
  p_limit integer default 10
)
returns table (
  id uuid,
  name text,
  address text,
  lat decimal(10,8),
  lng decimal(11,8),
  place_type text,
  use_count integer,
  last_used_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select 
    rp.id,
    rp.name,
    rp.address,
    rp.lat,
    rp.lng,
    rp.place_type,
    rp.use_count,
    rp.last_used_at
  from public.recent_places rp
  where rp.user_id = p_user_id
    and (p_place_type is null or rp.place_type = p_place_type)
  order by rp.last_used_at desc
  limit p_limit;
end;
$$;

-- Grant execute permission to authenticated users
grant execute on function public.get_recent_places(uuid, text, integer) to authenticated;

-- ============================================================================
-- PART 6: Function to check saved places limits
-- ============================================================================

-- Function to check if user can add more favorite places (max 10)
create or replace function public.can_add_favorite_place(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  select count(*) into v_count
  from public.saved_places
  where user_id = p_user_id
    and place_type = 'other';
  
  return v_count < 10;
end;
$$;

-- Grant execute permission to authenticated users
grant execute on function public.can_add_favorite_place(uuid) to authenticated;

-- Add comment for documentation
comment on function public.upsert_recent_place is 
  'Upserts a recent place with deduplication. Places within ~11 meters are considered duplicates.';

comment on function public.get_recent_places is 
  'Gets recent places for a user, ordered by last used date, with optional type filter and limit.';

comment on function public.can_add_favorite_place is 
  'Checks if user can add more favorite places (max 10 allowed).';
