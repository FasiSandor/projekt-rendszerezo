import { NextRequest, NextResponse } from 'next/server';
import { ensureChatHubSchema, getSql } from '../../../../lib/neon';
import { neonSession } from '../../../../lib/auth-server';

export const dynamic='force-dynamic';

function userIdOf(session:any){return session?.user?.id||session?.session?.userId||null}
function safeArray(v:any){return Array.isArray(v)?v:[]}

export async function GET(request:NextRequest){
  const session=await neonSession(request);
  const owner=userIdOf(session);
  if(!owner)return NextResponse.json({error:'unauthorized'},{status:401});
  await ensureChatHubSchema();
  const sql=getSql();
  const [projects,chats,topics,logs,state]=await Promise.all([
    sql`select data from chathub_projects where owner_id=${owner} and deleted_at is null order by updated_at`,
    sql`select data from chathub_chats where owner_id=${owner} and deleted_at is null order by updated_at`,
    sql`select data from chathub_topics where owner_id=${owner} and deleted_at is null order by updated_at`,
    sql`select data from chathub_import_logs where owner_id=${owner} order by updated_at desc`,
    sql`select last_sync_at from chathub_sync_state where owner_id=${owner}`
  ]);
  return NextResponse.json({
    projects:projects.map((r:any)=>r.data),chats:chats.map((r:any)=>r.data),
    topics:topics.map((r:any)=>r.data),importLogs:logs.map((r:any)=>r.data),
    lastSyncAt:state[0]?.last_sync_at||null
  },{headers:{'Cache-Control':'no-store'}});
}

export async function POST(request:NextRequest){
  const session=await neonSession(request);
  const owner=userIdOf(session);
  if(!owner)return NextResponse.json({error:'unauthorized'},{status:401});
  const body=await request.json();
  const projects=safeArray(body.projects),chats=safeArray(body.chats),topics=safeArray(body.topics),importLogs=safeArray(body.importLogs).slice(0,20);
  await ensureChatHubSchema();
  const sql=getSql();

  await sql`with d as (delete from chathub_projects where owner_id=${owner}) insert into chathub_projects(owner_id,id,data,updated_at) select ${owner},x->>'id',x,now() from jsonb_array_elements(${JSON.stringify(projects)}::jsonb) x`;
  await sql`with d as (delete from chathub_chats where owner_id=${owner}) insert into chathub_chats(owner_id,id,data,updated_at) select ${owner},x->>'id',x,now() from jsonb_array_elements(${JSON.stringify(chats)}::jsonb) x`;
  await sql`with d as (delete from chathub_topics where owner_id=${owner}) insert into chathub_topics(owner_id,id,data,updated_at) select ${owner},x->>'id',x,now() from jsonb_array_elements(${JSON.stringify(topics)}::jsonb) x`;
  await sql`with d as (delete from chathub_import_logs where owner_id=${owner}) insert into chathub_import_logs(owner_id,id,data,updated_at) select ${owner},x->>'id',x,now() from jsonb_array_elements(${JSON.stringify(importLogs)}::jsonb) x`;
  const state=await sql`insert into chathub_sync_state(owner_id,last_sync_at,last_device,schema_version) values(${owner},now(),${String(body.device||'').slice(0,180)},1) on conflict(owner_id) do update set last_sync_at=excluded.last_sync_at,last_device=excluded.last_device,schema_version=excluded.schema_version returning last_sync_at`;
  return NextResponse.json({ok:true,lastSyncAt:state[0]?.last_sync_at});
}
