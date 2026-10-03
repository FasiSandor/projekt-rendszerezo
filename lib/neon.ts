import { neon } from '@neondatabase/serverless';

export function getSql(){
  const url=process.env.DATABASE_URL;
  if(!url) throw new Error('DATABASE_URL is not configured');
  return neon(url);
}

export async function ensureChatHubSchema(){
  const sql=getSql();
  await sql`
    create table if not exists chathub_projects (
      owner_id text not null,
      id text not null,
      data jsonb not null,
      updated_at timestamptz not null default now(),
      deleted_at timestamptz,
      primary key (owner_id,id)
    )
  `;
  await sql`
    create table if not exists chathub_chats (
      owner_id text not null,
      id text not null,
      data jsonb not null,
      updated_at timestamptz not null default now(),
      deleted_at timestamptz,
      primary key (owner_id,id)
    )
  `;
  await sql`
    create table if not exists chathub_topics (
      owner_id text not null,
      id text not null,
      data jsonb not null,
      updated_at timestamptz not null default now(),
      deleted_at timestamptz,
      primary key (owner_id,id)
    )
  `;
  await sql`
    create table if not exists chathub_import_logs (
      owner_id text not null,
      id text not null,
      data jsonb not null,
      updated_at timestamptz not null default now(),
      primary key (owner_id,id)
    )
  `;
  await sql`
    create table if not exists chathub_sync_state (
      owner_id text primary key,
      last_sync_at timestamptz,
      last_device text,
      schema_version integer not null default 1
    )
  `;
  await sql`create index if not exists chathub_chats_owner_updated_idx on chathub_chats(owner_id,updated_at desc)`;
  await sql`create index if not exists chathub_projects_owner_updated_idx on chathub_projects(owner_id,updated_at desc)`;
  return true;
}
