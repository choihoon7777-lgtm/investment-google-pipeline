create extension if not exists pgcrypto;

create table if not exists articles (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  primary_keyword text not null,
  search_intent text not null,
  title text not null,
  slug text,
  intent_fingerprint text not null unique,
  content text,
  meta_description text,
  source_snapshot jsonb not null default '[]'::jsonb,
  source_checked_at timestamptz,
  quality_score numeric(3,1),
  quality_breakdown jsonb not null default '{}'::jsonb,
  status text not null default 'candidate' check (status in ('candidate','researching','draft','rejected','ready','scheduled','published','failed')),
  reject_reason text,
  published_url text unique,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists publish_queue (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references articles(id) on delete cascade,
  platform text not null default 'tistory',
  status text not null default 'waiting' check (status in ('waiting','publishing','published','failed','held')),
  scheduled_at timestamptz,
  attempts integer not null default 0,
  last_error text,
  created_at timestamptz not null default now()
);

create table if not exists performance_daily (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references articles(id) on delete cascade,
  measured_on date not null,
  impressions integer not null default 0,
  clicks integer not null default 0,
  ctr numeric(8,5),
  avg_position numeric(8,2),
  unique(article_id, measured_on)
);

create index if not exists idx_articles_status on articles(status);
create index if not exists idx_articles_keyword on articles(primary_keyword);
create index if not exists idx_queue_status_schedule on publish_queue(status, scheduled_at);
