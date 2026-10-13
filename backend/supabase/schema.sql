-- ==============================================================================
-- LaundriTrack — FULL COMPLETE SUPABASE (POSTGRESQL) SCHEMA & INITIAL SEED DATA
-- 
-- How to use:
-- 1. Go to your Supabase Dashboard (https://supabase.com/dashboard)
-- 2. Click on "SQL Editor" in the left sidebar
-- 3. Click "New Query"
-- 4. Paste this entire file into the query box and click "RUN" (Ctrl + Enter)
-- ==============================================================================

-- 1. USERS TABLE
create table if not exists users (
  id                  text primary key,
  name                text not null,
  email               text not null unique,
  password            text not null,
  role                text not null default 'staff' check (role in ('admin', 'staff', 'customer')),
  "isTwoFactorEnabled" boolean not null default false,
  "createdAt"         timestamptz not null default now(),
  "updatedAt"         timestamptz not null default now()
);

-- Safely add role check constraint if table already exists
do $$
begin
  alter table users drop constraint if exists users_role_check;
  alter table users add constraint users_role_check check (role in ('admin', 'staff', 'customer'));
exception
  when others then null;
end $$;

-- 2. CUSTOMERS TABLE
create table if not exists customers (
  id          text primary key,
  "userId"    text references users (id) on delete set null,
  name        text not null,
  phone       text not null,
  address     text,
  email       text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

-- 3. SERVICES TABLE
create table if not exists services (
  id            text primary key,
  "serviceName" text not null,
  description   text,
  price         double precision not null,
  unit          text not null default 'kg',
  status        text not null default 'active' check (status in ('active', 'inactive')),
  "createdAt"   timestamptz not null default now(),
  "updatedAt"   timestamptz not null default now()
);

-- 4. ORDERS TABLE
create table if not exists orders (
  id             text primary key,
  "orderNumber"  text not null unique,
  "customerId"   text not null references customers (id),
  "serviceId"    text not null references services (id),
  "colorType"    text not null default 'Colored' check ("colorType" in ('Colored', 'White', 'Mixed')),
  weight         double precision not null,
  "pricePerKg"   double precision not null,
  "totalAmount"  double precision not null,
  "paymentStatus" text not null default 'UNPAID' check ("paymentStatus" in ('PAID', 'PARTIALLY PAID', 'UNPAID')),
  "orderStatus"  text not null default 'Received' check ("orderStatus" in ('Received', 'Washing', 'Drying', 'Folding', 'Ready for Pickup', 'Claimed')),
  "completedAt"  timestamptz,
  "claimedAt"    timestamptz,
  "createdAt"    timestamptz not null default now(),
  "updatedAt"    timestamptz not null default now()
);

-- 5. PAYMENTS TABLE
create table if not exists payments (
  id              text primary key,
  "orderId"       text not null references orders (id) on delete restrict,
  amount          double precision not null check (amount > 0),
  "paymentMethod" text not null default 'Cash',
  "paymentStatus" text not null default 'PAID' check ("paymentStatus" in ('PAID', 'PARTIALLY PAID', 'UNPAID')),
  "referenceNumber" text,
  "paymentDate"   timestamptz not null default now(),
  "createdAt"     timestamptz not null default now(),
  "updatedAt"     timestamptz not null default now()
);

-- 6. ORDER COUNTERS TABLE
create table if not exists counters (
  id  text primary key,
  seq bigint not null default 0
);

-- 7. ACTIVITY AUDIT LOGS TABLE
create table if not exists audit_logs (
  id          text primary key,
  "userId"    text,
  "userName"  text,
  "userRole"  text,
  action      text not null,
  resource    text not null,
  "resourceId" text,
  details     text,
  "ipAddress" text,
  "createdAt" timestamptz not null default now()
);

-- 8. FINANCIAL TRANSACTION LOGS TABLE
create table if not exists transaction_logs (
  id              text primary key,
  "paymentId"     text,
  "orderId"       text,
  type            text not null,
  amount          double precision not null,
  "paymentMethod" text,
  "paymentStatus" text,
  reference       text,
  "createdBy"     text,
  "createdAt"     timestamptz not null default now()
);

-- 9. 2FA OTP CODES TABLE
create table if not exists otp_codes (
  id          text primary key,
  "userId"    text not null references users (id) on delete cascade,
  "otpHash"   text not null,
  "expiresAt" timestamptz not null,
  attempts    integer not null default 0,
  "isVerified" boolean not null default false,
  "createdAt" timestamptz not null default now()
);

-- 10. ATOMIC SEQUENCE GENERATOR FOR ORDER NUMBERS
create or replace function next_sequence (counter_id text)
returns table (next_seq bigint)
language sql
as $$
  insert into counters as c (id, seq) values (counter_id, 1)
  on conflict (id) do update set seq = c.seq + 1
  returning c.seq;
$$;

-- 11. INDEXES FOR PERFORMANCE
create index if not exists orders_customer_id_idx    on orders ("customerId");
create index if not exists orders_service_id_idx     on orders ("serviceId");
create index if not exists orders_created_at_idx     on orders ("createdAt" desc);
create index if not exists payments_order_id_idx     on payments ("orderId");
create index if not exists payments_payment_date_idx on payments ("paymentDate" desc);

-- 12. ROW LEVEL SECURITY (RLS)
alter table users            enable row level security;
alter table customers        enable row level security;
alter table services         enable row level security;
alter table orders           enable row level security;
alter table payments         enable row level security;
alter table counters         enable row level security;
alter table audit_logs       enable row level security;
alter table transaction_logs enable row level security;
alter table otp_codes        enable row level security;

-- 13. AUTOMATIC UPDATED_AT TIMESTAMP TRIGGER
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin
  new."updatedAt" = now();
  return new;
end
$$;

do $$
declare t text;
begin
  foreach t in array array['users', 'customers', 'services', 'orders', 'payments']
  loop
    execute format('drop trigger if exists set_updated_at on %I', t);
    execute format(
      'create trigger set_updated_at before update on %I for each row execute function set_updated_at()', t
    );
  end loop;
end
$$;

-- 14. INITIAL SEED ACCOUNTS & SERVICES
insert into users (id, name, email, password, role, "isTwoFactorEnabled")
values 
  ('6ab332c3c4d817b0bf53c034', 'Shop Owner', 'admin@laundrytrack.com', '$2a$10$Psr/Ay7y8o4KQy/yy6zca.8ByEPKEUTjglzo7Bw2K/pwjNwMjj9FC', 'admin', false),
  ('6ab332c4c4d817b0bf53c037', 'Staff Juan', 'staff@laundrytrack.com', '$2a$10$ywpibsv1XbLLfhsdoYEaYOgvTzlln1fU4ItjmP2UgtphJ5UiV48QG', 'staff', false)
on conflict (email) do update
set password = excluded.password, role = excluded.role, "isTwoFactorEnabled" = excluded."isTwoFactorEnabled";

insert into services (id, "serviceName", description, price, unit, status)
values
  ('srv000000000000000000001', 'Wash & Fold', 'Machine wash, dry, and fold', 60, 'kg', 'active'),
  ('srv000000000000000000002', 'Wash & Press', 'Machine wash with ironing', 80, 'kg', 'active'),
  ('srv000000000000000000003', 'Dry Clean', 'Professional dry cleaning', 120, 'kg', 'active')
on conflict (id) do nothing;
