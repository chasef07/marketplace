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
      'active', 'deal_pending', 'completed', 'cancelled'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE offer_type AS ENUM ('buyer', 'seller');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Users table (extends Supabase auth.users)
create table if not exists public.profiles (
  id uuid references auth.users not null primary key,
  username text unique not null,
  email text unique not null,
  seller_personality text default 'flexible' not null,
  buyer_personality text default 'fair' not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  last_login timestamp with time zone,
  is_active boolean default true not null
);

-- Items table
create table if not exists public.items (
  id bigserial primary key,
  seller_id uuid references public.profiles(id) not null,
  name text not null,
  description text,
  furniture_type furniture_type not null,
  starting_price decimal(10,2) not null check (starting_price > 0),
  condition text,
  image_filename text,
  is_available boolean default true not null,
  views_count integer default 0 not null,
  dimensions text,
  material text,
  brand text,
  color text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  sold_at timestamp with time zone
);

-- Negotiations table
create table if not exists public.negotiations (
  id bigserial primary key,
  item_id bigint references public.items(id) not null,
  seller_id uuid references public.profiles(id) not null,
  buyer_id uuid references public.profiles(id) not null,
  status negotiation_status default 'active' not null,
  current_offer decimal(10,2),
  final_price decimal(10,2),
  round_number integer default 1 not null,
  max_rounds integer default 10 not null,
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
  price decimal(10,2) not null check (price > 0),
  message text,
  round_number integer not null,
  response_time_seconds integer,
  is_counter_offer boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Indexes for performance
create index idx_items_seller_id on public.items(seller_id);
create index idx_items_furniture_type on public.items(furniture_type);
create index idx_items_is_available on public.items(is_available);
create index idx_items_created_at on public.items(created_at desc);
create index idx_negotiations_item_id on public.negotiations(item_id);
create index idx_negotiations_seller_id on public.negotiations(seller_id);
create index idx_negotiations_buyer_id on public.negotiations(buyer_id);
create index idx_negotiations_status on public.negotiations(status);
create index idx_offers_negotiation_id on public.offers(negotiation_id);
create index idx_profiles_username on public.profiles(username);

-- Row Level Security (RLS) policies
alter table public.profiles enable row level security;
alter table public.items enable row level security;
alter table public.negotiations enable row level security;
alter table public.offers enable row level security;

-- Profiles policies
create policy "Public profiles are viewable by everyone" on public.profiles
  for select using (true);

create policy "Users can insert their own profile" on public.profiles
  for insert with check (auth.uid() = id);

create policy "Users can update their own profile" on public.profiles
  for update using (auth.uid() = id);

-- Items policies
create policy "Items are viewable by everyone" on public.items
  for select using (true);

create policy "Users can insert their own items" on public.items
  for insert with check (auth.uid() = seller_id);

create policy "Users can update their own items" on public.items
  for update using (auth.uid() = seller_id);

create policy "Users can delete their own items" on public.items
  for delete using (auth.uid() = seller_id);

-- Negotiations policies
create policy "Users can view negotiations they're part of" on public.negotiations
  for select using (auth.uid() = seller_id or auth.uid() = buyer_id);

create policy "Users can create negotiations for items they want to buy" on public.negotiations
  for insert with check (
    auth.uid() = buyer_id and 
    auth.uid() != seller_id and
    exists (select 1 from public.items where id = item_id and is_available = true)
  );

create policy "Sellers and buyers can update their negotiations" on public.negotiations
  for update using (auth.uid() = seller_id or auth.uid() = buyer_id);

-- Offers policies
create policy "Users can view offers for their negotiations" on public.offers
  for select using (
    exists (
      select 1 from public.negotiations 
      where id = negotiation_id 
      and (seller_id = auth.uid() or buyer_id = auth.uid())
    )
  );

create policy "Users can create offers for their negotiations" on public.offers
  for insert with check (
    exists (
      select 1 from public.negotiations 
      where id = negotiation_id 
      and (seller_id = auth.uid() or buyer_id = auth.uid())
      and status = 'active'
    )
  );

-- Functions for updated_at timestamps
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Triggers for updated_at
create trigger handle_updated_at before update on public.profiles
  for each row execute procedure public.handle_updated_at();

create trigger handle_updated_at before update on public.items
  for each row execute procedure public.handle_updated_at();

create trigger handle_updated_at before update on public.negotiations
  for each row execute procedure public.handle_updated_at();

-- Function to increment item views
create or replace function public.increment_views(item_id bigint)
returns void as $$
begin
  update public.items 
  set views_count = views_count + 1 
  where id = item_id;
end;
$$ language plpgsql;

-- Function to create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, email)
  values (new.id, new.raw_user_meta_data->>'username', new.email);
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new user signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Storage bucket for images
insert into storage.buckets (id, name, public) values ('furniture-images', 'furniture-images', true);

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

-- Seller Assistant Chat System Tables

-- Conversations table - one per seller for their assistant
create table if not exists public.conversations (
  id bigserial primary key,
  seller_id uuid references public.profiles(id) not null unique,
  title text default 'Seller Assistant Chat' not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  last_message_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Chat messages table
create table if not exists public.chat_messages (
  id bigserial primary key,
  conversation_id bigint references public.conversations(id) on delete cascade not null,
  role text check (role in ('user', 'assistant', 'system')) not null,
  content text not null,
  function_calls jsonb default null,
  function_results jsonb default null,
  metadata jsonb default '{}' not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Chat context table - stores conversation context and preferences
create table if not exists public.chat_context (
  conversation_id bigint references public.conversations(id) on delete cascade primary key,
  active_items jsonb default '[]' not null,
  recent_offers jsonb default '[]' not null,
  seller_preferences jsonb default '{}' not null,
  conversation_summary text default '' not null,
  last_updated timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Indexes for chat system
create index idx_conversations_seller_id on public.conversations(seller_id);
create index idx_conversations_updated_at on public.conversations(updated_at desc);
create index idx_chat_messages_conversation_id on public.chat_messages(conversation_id);
create index idx_chat_messages_created_at on public.chat_messages(created_at desc);
create index idx_chat_messages_role on public.chat_messages(role);

-- RLS policies for chat system
alter table public.conversations enable row level security;
alter table public.chat_messages enable row level security;
alter table public.chat_context enable row level security;

-- Conversations policies - sellers can only see their own conversation
create policy "Sellers can view their own conversation" on public.conversations
  for select using (auth.uid() = seller_id);

create policy "Sellers can create their own conversation" on public.conversations
  for insert with check (auth.uid() = seller_id);

create policy "Sellers can update their own conversation" on public.conversations
  for update using (auth.uid() = seller_id);

-- Chat messages policies
create policy "Sellers can view messages in their conversation" on public.chat_messages
  for select using (
    exists (
      select 1 from public.conversations 
      where id = conversation_id and seller_id = auth.uid()
    )
  );

create policy "Sellers can insert messages in their conversation" on public.chat_messages
  for insert with check (
    exists (
      select 1 from public.conversations 
      where id = conversation_id and seller_id = auth.uid()
    )
  );

-- Chat context policies
create policy "Sellers can view their chat context" on public.chat_context
  for select using (
    exists (
      select 1 from public.conversations 
      where id = conversation_id and seller_id = auth.uid()
    )
  );

create policy "Sellers can update their chat context" on public.chat_context
  for all using (
    exists (
      select 1 from public.conversations 
      where id = conversation_id and seller_id = auth.uid()
    )
  );

-- Triggers for updated_at on chat tables
create trigger handle_updated_at before update on public.conversations
  for each row execute procedure public.handle_updated_at();

-- Function to initialize chat context when conversation is created
create or replace function public.initialize_chat_context()
returns trigger as $$
begin
  insert into public.chat_context (conversation_id)
  values (new.id);
  return new;
end;
$$ language plpgsql;

-- Trigger to auto-create chat context
create trigger initialize_chat_context_trigger
  after insert on public.conversations
  for each row execute procedure public.initialize_chat_context();

-- Function to update conversation last_message_at when new message is added
create or replace function public.update_conversation_timestamp()
returns trigger as $$
begin
  update public.conversations 
  set last_message_at = new.created_at,
      updated_at = new.created_at
  where id = new.conversation_id;
  return new;
end;
$$ language plpgsql;

-- Trigger to update conversation timestamp
create trigger update_conversation_timestamp_trigger
  after insert on public.chat_messages
  for each row execute procedure public.update_conversation_timestamp();