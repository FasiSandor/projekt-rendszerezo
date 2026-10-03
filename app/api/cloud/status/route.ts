import { NextResponse } from 'next/server';
import { ensureChatHubSchema, getSql } from '../../../../lib/neon';

export const dynamic='force-dynamic';

export async function GET(){
  try{
    await ensureChatHubSchema();
    const sql=getSql();
    const rows=await sql`select current_database() as database, current_setting('server_version') as version`;
    return NextResponse.json({
      connected:true,
      schemaReady:true,
      authConfigured:Boolean(process.env.NEON_AUTH_BASE_URL),
      database:rows[0]?.database||'Neon Postgres',
      version:rows[0]?.version
    },{headers:{'Cache-Control':'no-store'}});
  }catch(e){
    return NextResponse.json({
      connected:false,
      schemaReady:false,
      authConfigured:Boolean(process.env.NEON_AUTH_BASE_URL),
      database:'Neon',
      error:e instanceof Error?e.message:'Ismeretlen kapcsolódási hiba'
    },{status:503,headers:{'Cache-Control':'no-store'}});
  }
}
