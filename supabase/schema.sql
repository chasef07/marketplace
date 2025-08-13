-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- Custom types (create if not exists)
DO $$ BEGIN
    CREATE TYPE furniture_type AS ENUM (
      'couch', 'dining_table', 'bookshelf', 'chair', 'desk', 'bed',
      'dresser', 'coffee_table', 'nightstand', 'cabinet', 'other'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE negotiation_status AS ENUM (
      'active', 'deal_pending', 'completed', 'cancelled', 'picked_up'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE offer_type AS ENUM ('buyer', 'seller');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Enhanced Item Status System
DO $$ BEGIN
    CREATE TYPE item_status AS ENUM (
      'draft',           -- Being created, not public yet
      'pending_review',  -- Submitted for moderation (if needed)
      'active',          -- Live and available for purchase
      'under_negotiation', -- Has active negotiations
      'sold_pending',    -- Sale agreed, pending completion
      'sold',            -- Successfully sold and completed
      'paused',          -- Seller temporarily paused listing
      'archived',        -- Seller archived (still viewable but not active)
      'flagged',         -- Flagged for review/violation
      'removed'          -- Removed by admin/moderation
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Users table (extends Supabase auth.users)
create table if not exists public.profiles (
  id uuid references auth.users not null primary key,
  username text unique not null,
  email text unique not null,
  zip_code varchar(10),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  last_login timestamp with time zone,
  is_active boolean default true not null
);

-- Enhanced Items table with comprehensive status system
create table if not exists public.items (
  id bigserial primary key,
  seller_id uuid references public.profiles(id) not null,
  name text not null check (length(trim(name)) >= 2),
  description text,
  furniture_type furniture_type not null,
  starting_price decimal(10,2) not null check (starting_price > 0),
  item_status item_status default 'active' not null,
  status_changed_at timestamp with time zone default timezone('utc'::text, now()) not null,
  views_count integer default 0 not null,
  dimensions text,
  images jsonb default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  sold_at timestamp with time zone,
  final_price decimal(10,2),
  buyer_id uuid references public.profiles(id)
);

-- Negotiations table
create table if not exists public.negotiations (
  id bigserial primary key,
  item_id bigint references public.items(id) not null,
  seller_id uuid references public.profiles(id) not null,
  buyer_id uuid references public.profiles(id) not null,
  status negotiation_status default 'active' not null,
  final_price decimal(10,2),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  completed_at timestamp with time zone,
  expires_at timestamp with time zone
);

-- Offers table
create table if not exists public.offers (
  id bigserial primary key,
  negotiation_id bigint references public.negotiations(id) not null,
  offer_type offer_type not null,
  price decimal(10,2),
  message text,
  response_time_seconds integer,
  is_counter_offer boolean default false not null,
  is_message_only boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Performance Optimized Indexes
-- Basic indexes for primary queries
create index if not exists idx_items_seller_id on public.items(seller_id);
create index if not exists idx_items_created_at on public.items(created_at desc);
create index if not exists idx_negotiations_item_id on public.negotiations(item_id);
create index if not exists idx_negotiations_seller_id on public.negotiations(seller_id);
create index if not exists idx_negotiations_buyer_id on public.negotiations(buyer_id);
create index if not exists idx_negotiations_status on public.negotiations(status);
create index if not exists idx_offers_negotiation_id on public.offers(negotiation_id);
create index if not exists idx_profiles_username on public.profiles(username);
create index if not exists idx_items_buyer_id on public.items(buyer_id);

-- Enhanced performance indexes for marketplace queries
-- Composite index for active items ordered by creation date (most common marketplace query)
create index if not exists idx_items_active_created 
on public.items(item_status, created_at desc) 
where item_status = 'active';

-- Composite index for category filtering with active status
create index if not exists idx_items_category_active 
on public.items(furniture_type, item_status, created_at desc) 
where item_status in ('active', 'under_negotiation');

-- Composite index for price range queries with category
create index if not exists idx_items_category_price 
on public.items(furniture_type, starting_price, item_status) 
where item_status in ('active', 'under_negotiation');

-- Index for item search by seller with status
create index if not exists idx_items_seller_status 
on public.items(seller_id, item_status, created_at desc);

-- Partial index for active negotiations only
create index if not exists idx_negotiations_active 
on public.negotiations(item_id, seller_id, buyer_id, created_at desc) 
where status = 'active';

-- Index for recent offers by negotiation
create index if not exists idx_offers_negotiation_recent 
on public.offers(negotiation_id, created_at desc, offer_type);

-- Index for user's recent negotiations (dashboard queries)
create index if not exists idx_negotiations_user_recent_seller 
on public.negotiations(seller_id, status, updated_at desc);

create index if not exists idx_negotiations_user_recent_buyer 
on public.negotiations(buyer_id, status, updated_at desc);

-- Index for view count updates and popular items
create index if not exists idx_items_views 
on public.items(views_count desc, item_status) 
where item_status in ('active', 'under_negotiation');

-- Text search indexes for item names and descriptions
create index if not exists idx_items_search_name 
on public.items using gin(to_tsvector('english', name)) 
where item_status in ('active', 'under_negotiation');

create index if not exists idx_items_search_description 
on public.items using gin(to_tsvector('english', description)) 
where item_status in ('active', 'under_negotiation');

-- Index for status tracking and transitions
create index if not exists idx_items_status_changed 
on public.items(item_status, status_changed_at desc);

-- Row Level Security (RLS) policies
alter table public.profiles enable row level security;
alter table public.items enable row level security;
alter table public.negotiations enable row level security;
alter table public.offers enable row level security;

-- Profiles policies
create policy "Public profiles are viewable by everyone" on public.profiles
  for select using (true);

create policy "Users can insert their own profile" on public.profiles
  for insert with check ((select auth.uid()) = id);

create policy "Users can update their own profile" on public.profiles
  for update using ((select auth.uid()) = id);

-- Items policies
create policy "Items are viewable by everyone" on public.items
  for select using (true);

create policy "Users can insert their own items" on public.items
  for insert with check ((select auth.uid()) = seller_id);

create policy "Users can update their own items" on public.items
  for update using ((select auth.uid()) = seller_id);

create policy "Users can delete their own items" on public.items
  for delete using ((select auth.uid()) = seller_id);

-- Negotiations policies
create policy "Users can view negotiations they're part of" on public.negotiations
  for select using ((select auth.uid()) = seller_id OR (select auth.uid()) = buyer_id);

create policy "Users can create negotiations for items they want to buy" on public.negotiations
  for insert with check (
    (select auth.uid()) = buyer_id AND 
    (select auth.uid()) != seller_id AND
    EXISTS (SELECT 1 FROM public.items WHERE id = item_id AND item_status = 'active')
  );

create policy "Sellers and buyers can update their negotiations" on public.negotiations
  for update using ((select auth.uid()) = seller_id OR (select auth.uid()) = buyer_id);

-- Offers policies
create policy "Users can view offers for their negotiations" on public.offers
  for select using (
    EXISTS (
      SELECT 1 FROM public.negotiations 
      WHERE id = negotiation_id 
      AND (seller_id = (select auth.uid()) OR buyer_id = (select auth.uid()))
    )
  );

create policy "Users can create offers for their negotiations" on public.offers
  for insert with check (
    EXISTS (
      SELECT 1 FROM public.negotiations 
      WHERE id = negotiation_id 
      AND (seller_id = (select auth.uid()) OR buyer_id = (select auth.uid()))
      AND status = 'active'
    )
  );

-- Functions for updated_at timestamps
create or replace function public.handle_updated_at()
returns trigger 
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

-- Function for status change tracking
create or replace function public.handle_status_change()
returns trigger 
language plpgsql
set search_path = ''
as $$
begin
  if old.item_status != new.item_status then
    new.status_changed_at = timezone('utc'::text, now());
  end if;
  return new;
end;
$$;

-- Function to increment item views
create or replace function public.increment_views(item_id bigint)
returns void 
language plpgsql
set search_path = ''
as $$
begin
  update public.items 
  set views_count = views_count + 1 
  where id = item_id;
end;
$$;

-- Function to create profile on user signup
create or replace function public.handle_new_user()
returns trigger 
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, username, email)
  values (new.id, new.raw_user_meta_data->>'username', new.email);
  return new;
end;
$$;

-- Function to get primary image filename from JSONB
create or replace function public.get_primary_image(images_jsonb jsonb)
returns text
language plpgsql
set search_path = ''
as $$
declare
  primary_image jsonb;
  first_image jsonb;
begin
  -- Return null if images is null or empty
  if images_jsonb is null or jsonb_array_length(images_jsonb) = 0 then
    return null;
  end if;
  
  -- Look for primary image first
  select img into primary_image
  from jsonb_array_elements(images_jsonb) img
  where (img->>'is_primary')::boolean = true
  limit 1;
  
  -- If no primary image found, get first image
  if primary_image is null then
    select img into first_image
    from jsonb_array_elements(images_jsonb) img
    order by (img->>'order')::integer nulls last
    limit 1;
    primary_image := first_image;
  end if;
  
  return primary_image->>'filename';
end;
$$;

-- Function to validate item status transitions
create or replace function public.validate_status_transition(old_status item_status, new_status item_status)
returns boolean
language plpgsql
set search_path = ''
as $$
begin
  -- Allow any transition from draft
  if old_status = 'draft' then
    return true;
  end if;
  
  -- Prevent going back to draft from any other status
  if new_status = 'draft' then
    return false;
  end if;
  
  -- Can't go from sold back to active states
  if old_status = 'sold' and new_status in ('active', 'under_negotiation', 'sold_pending') then
    return false;
  end if;
  
  -- Can't go from removed back to active states
  if old_status = 'removed' and new_status in ('active', 'under_negotiation', 'sold_pending') then
    return false;
  end if;
  
  -- All other transitions are allowed
  return true;
end;
$$;

-- Function to handle item status validation
create or replace function public.handle_status_validation()
returns trigger 
language plpgsql
set search_path = ''
as $$
begin
  if old.item_status is not null and not public.validate_status_transition(old.item_status, new.item_status) then
    raise exception 'Invalid status transition from % to %', old.item_status, new.item_status;
  end if;
  return new;
end;
$$;

-- Triggers for updated_at
create trigger handle_updated_at before update on public.profiles
  for each row execute procedure public.handle_updated_at();

create trigger handle_updated_at before update on public.items
  for each row execute procedure public.handle_updated_at();

create trigger handle_updated_at before update on public.negotiations
  for each row execute procedure public.handle_updated_at();

-- Triggers for item status management
create trigger handle_status_change before update on public.items
  for each row execute procedure public.handle_status_change();

create trigger handle_status_validation before update on public.items
  for each row execute procedure public.handle_status_validation();

-- Trigger for new user signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Enhanced negotiations view
create view public.negotiations_enhanced as
select 
  n.id,
  n.item_id,
  n.seller_id,
  n.buyer_id,
  n.status,
  n.final_price,
  n.created_at,
  n.updated_at,
  n.completed_at,
  n.expires_at,
  i.name as item_name,
  i.description as item_description,
  i.starting_price,
  public.get_primary_image(i.images) as image_filename,
  seller.username as seller_username,
  buyer.username as buyer_username,
  (select count(*) from public.offers where negotiation_id = n.id) as offer_count,
  (select price from public.offers where negotiation_id = n.id order by created_at desc limit 1) as latest_offer_price
from public.negotiations n
join public.items i on n.item_id = i.id  
join public.profiles seller on n.seller_id = seller.id
join public.profiles buyer on n.buyer_id = buyer.id;

-- Set security_invoker to respect RLS
alter view public.negotiations_enhanced set (security_invoker = true);

-- Storage bucket for images
insert into storage.buckets (id, name, public) values ('furniture-images', 'furniture-images', true)
on conflict (id) do nothing;

-- Storage policies
create policy "Anyone can view furniture images" on storage.objects
  for select using (bucket_id = 'furniture-images');

create policy "Authenticated users can upload furniture images" on storage.objects
  for insert with check (
    bucket_id = 'furniture-images' and 
    auth.role() = 'authenticated'
  );

create policy "Users can update their own images" on storage.objects
  for update using (
    bucket_id = 'furniture-images' and 
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete their own images" on storage.objects
  for delete using (
    bucket_id = 'furniture-images' and 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Comments for documentation
comment on table public.profiles is 'Simplified user profiles - core user data only';
comment on table public.items is 'Enhanced furniture listings with comprehensive status system and JSONB images';
comment on table public.negotiations is 'Simplified negotiations without round limits - continue until deal or cancellation';
comment on table public.offers is 'Simplified offers without round tracking - chronological order by created_at';
comment on column public.items.images is 'JSONB array of image objects: [{"filename": "img.jpg", "is_primary": true, "order": 1}, ...]';
comment on column public.items.item_status is 'Comprehensive item lifecycle status tracking';
comment on column public.items.status_changed_at is 'Timestamp when item_status was last changed';
comment on view public.negotiations_enhanced is 'Enhanced negotiation data used by seller dashboard for quick actions and status display';
comment on schema public is 'Optimized marketplace schema focused on core functionality with enhanced item lifecycle management';