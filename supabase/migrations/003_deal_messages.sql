-- Deal Messages Table for Post-Acceptance Communication
-- This allows buyers and sellers to communicate after a deal is accepted

-- Message types enum
create type if not exists message_type as enum (
  'text',
  'location',
  'contact_info', 
  'payment_method',
  'meeting_time',
  'completion_confirmation',
  'image'
);

-- Deal status enum for tracking deal progress
create type if not exists deal_status as enum (
  'accepted',
  'arranging',
  'meeting_scheduled', 
  'in_progress',
  'completed',
  'cancelled'
);

-- Deal messages table
create table if not exists public.deal_messages (
  id bigserial primary key,
  negotiation_id bigint references public.negotiations(id) not null,
  sender_id uuid references public.profiles(id) not null,
  receiver_id uuid references public.profiles(id) not null,
  message_type message_type default 'text' not null,
  content text not null,
  metadata jsonb default '{}' not null, -- For additional data like coordinates, contact info, etc.
  is_read boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Deal status tracking table
create table if not exists public.deal_status_history (
  id bigserial primary key,
  negotiation_id bigint references public.negotiations(id) not null,
  status deal_status not null,
  updated_by uuid references public.profiles(id) not null,
  notes text,
  scheduled_meeting_time timestamp with time zone,
  meeting_location text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Indexes for performance
create index idx_deal_messages_negotiation_id on public.deal_messages(negotiation_id);
create index idx_deal_messages_sender_id on public.deal_messages(sender_id);
create index idx_deal_messages_receiver_id on public.deal_messages(receiver_id);
create index idx_deal_messages_created_at on public.deal_messages(created_at desc);
create index idx_deal_status_history_negotiation_id on public.deal_status_history(negotiation_id);
create index idx_deal_status_history_created_at on public.deal_status_history(created_at desc);

-- Row Level Security
alter table public.deal_messages enable row level security;
alter table public.deal_status_history enable row level security;

-- RLS Policies for deal_messages
create policy "Users can view messages they're part of" on public.deal_messages
  for select using (
    sender_id = auth.uid() or receiver_id = auth.uid()
  );

create policy "Users can send messages to their negotiations" on public.deal_messages
  for insert with check (
    sender_id = auth.uid() and
    exists (
      select 1 from public.negotiations 
      where id = negotiation_id 
      and (seller_id = auth.uid() or buyer_id = auth.uid())
      and status in ('completed', 'active')
    )
  );

-- RLS Policies for deal_status_history  
create policy "Users can view status of their negotiations" on public.deal_status_history
  for select using (
    exists (
      select 1 from public.negotiations 
      where id = negotiation_id 
      and (seller_id = auth.uid() or buyer_id = auth.uid())
    )
  );

create policy "Users can update status of their negotiations" on public.deal_status_history
  for insert with check (
    updated_by = auth.uid() and
    exists (
      select 1 from public.negotiations 
      where id = negotiation_id 
      and (seller_id = auth.uid() or buyer_id = auth.uid())
    )
  );

-- Helper function to get current deal status
create or replace function get_current_deal_status(neg_id bigint)
returns deal_status
language sql
stable
as $$
  select status
  from public.deal_status_history
  where negotiation_id = neg_id
  order by created_at desc
  limit 1;
$$;

-- Helper function to mark messages as read
create or replace function mark_messages_read(neg_id bigint, user_id uuid)
returns void
language sql
as $$
  update public.deal_messages
  set is_read = true
  where negotiation_id = neg_id
    and receiver_id = user_id
    and is_read = false;
$$;

-- Trigger to auto-create initial deal status when negotiation is completed
create or replace function handle_negotiation_completed()
returns trigger
language plpgsql
as $$
begin
  -- When a negotiation status changes to 'completed', create initial deal status
  if new.status = 'completed' and (old.status is null or old.status != 'completed') then
    insert into public.deal_status_history (negotiation_id, status, updated_by, notes)
    values (new.id, 'accepted', new.seller_id, 'Deal accepted by seller');
  end if;
  
  return new;
end;
$$;

create trigger negotiation_completed_trigger
  after update on public.negotiations
  for each row
  execute function handle_negotiation_completed();