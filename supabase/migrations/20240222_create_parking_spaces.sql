create table public.parking_spaces (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    owner_id uuid references auth.users not null,
    location jsonb not null,
    address text not null,
    hourly_rate decimal(10,2) not null,
    bike_capacity integer not null,
    car_capacity integer not null
);

-- Enable full-text search for address
alter table public.parking_spaces add column address_search tsvector 
    generated always as (to_tsvector('english', address)) stored;

create index parking_spaces_address_search_idx on public.parking_spaces using gin(address_search);

-- Set up Row Level Security (RLS)
alter table public.parking_spaces enable row level security;

-- Create policies
create policy "Users can view all parking spaces"
    on public.parking_spaces for select
    to authenticated
    using (true);

create policy "Public can view all parking spaces"
    on public.parking_spaces for select
    to anon
    using (true);

create policy "Users can insert their own parking spaces"
    on public.parking_spaces for insert
    to authenticated
    with check (auth.uid() = owner_id);

create policy "Users can update their own parking spaces"
    on public.parking_spaces for update
    to authenticated
    using (auth.uid() = owner_id);

create policy "Users can delete their own parking spaces"
    on public.parking_spaces for delete
    to authenticated
    using (auth.uid() = owner_id);
