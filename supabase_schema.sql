-- Run this SQL in your Supabase SQL Editor:

-- 1. Create the user_data table to hold Calyx state per user
create table if not exists public.user_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  items jsonb default '[]'::jsonb,
  logs jsonb default '[]'::jsonb,
  cds jsonb default '[]'::jsonb,
  pages jsonb default '[]'::jsonb,
  folders jsonb default '[]'::jsonb,
  prefs jsonb default '{}'::jsonb
);

-- 2. Enable Row Level Security (RLS)
alter table public.user_data enable row level security;

-- 3. Create policies so users can only access their own data
create policy "Users can view own data"
  on public.user_data for select
  using (auth.uid() = user_id);

create policy "Users can insert own data"
  on public.user_data for insert
  with check (auth.uid() = user_id);

create policy "Users can update own data"
  on public.user_data for update
  using (auth.uid() = user_id);

create policy "Users can delete own data"
  on public.user_data for delete
  using (auth.uid() = user_id);

-- 4. (Optional) Function to allow a user to delete their own account completely
create or replace function public.delete_user_account()
returns void
language plpgsql
security definer
as $$
begin
  delete from auth.users where id = auth.uid();
end;
$$;
