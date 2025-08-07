-- Chat System Migration
-- Run this separately to add chat functionality to existing database

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
create index if not exists idx_conversations_seller_id on public.conversations(seller_id);
create index if not exists idx_conversations_updated_at on public.conversations(updated_at desc);
create index if not exists idx_chat_messages_conversation_id on public.chat_messages(conversation_id);
create index if not exists idx_chat_messages_created_at on public.chat_messages(created_at desc);
create index if not exists idx_chat_messages_role on public.chat_messages(role);

-- RLS policies for chat system
alter table public.conversations enable row level security;
alter table public.chat_messages enable row level security;
alter table public.chat_context enable row level security;

-- Conversations policies - sellers can only see their own conversation
do $$ begin
  create policy "Sellers can view their own conversation" on public.conversations
    for select using (auth.uid() = seller_id);
exception when duplicate_object then
  null;
end $$;

do $$ begin
  create policy "Sellers can create their own conversation" on public.conversations
    for insert with check (auth.uid() = seller_id);
exception when duplicate_object then
  null;
end $$;

do $$ begin
  create policy "Sellers can update their own conversation" on public.conversations
    for update using (auth.uid() = seller_id);
exception when duplicate_object then
  null;
end $$;

-- Chat messages policies
do $$ begin
  create policy "Sellers can view messages in their conversation" on public.chat_messages
    for select using (
      exists (
        select 1 from public.conversations 
        where id = conversation_id and seller_id = auth.uid()
      )
    );
exception when duplicate_object then
  null;
end $$;

do $$ begin
  create policy "Sellers can insert messages in their conversation" on public.chat_messages
    for insert with check (
      exists (
        select 1 from public.conversations 
        where id = conversation_id and seller_id = auth.uid()
      )
    );
exception when duplicate_object then
  null;
end $$;

-- Chat context policies
do $$ begin
  create policy "Sellers can view their chat context" on public.chat_context
    for select using (
      exists (
        select 1 from public.conversations 
        where id = conversation_id and seller_id = auth.uid()
      )
    );
exception when duplicate_object then
  null;
end $$;

do $$ begin
  create policy "Sellers can update their chat context" on public.chat_context
    for all using (
      exists (
        select 1 from public.conversations 
        where id = conversation_id and seller_id = auth.uid()
      )
    );
exception when duplicate_object then
  null;
end $$;

-- Triggers for updated_at on chat tables
drop trigger if exists handle_updated_at on public.conversations;
create trigger handle_updated_at before update on public.conversations
  for each row execute procedure public.handle_updated_at();

-- Function to initialize chat context when conversation is created
create or replace function public.initialize_chat_context()
returns trigger as $$
begin
  insert into public.chat_context (conversation_id)
  values (new.id)
  on conflict (conversation_id) do nothing;
  return new;
end;
$$ language plpgsql;

-- Trigger to auto-create chat context
drop trigger if exists initialize_chat_context_trigger on public.conversations;
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
drop trigger if exists update_conversation_timestamp_trigger on public.chat_messages;
create trigger update_conversation_timestamp_trigger
  after insert on public.chat_messages
  for each row execute procedure public.update_conversation_timestamp();