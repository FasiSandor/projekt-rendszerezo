import { NextRequest, NextResponse } from 'next/server';

const FALLBACK_AUTH_URL='https://ep-lively-night-b258ug4c.neonauth.eu-central-1.aws.neon.tech/neondb/auth';

export function authBaseUrl(){
  return (process.env.NEON_AUTH_BASE_URL||FALLBACK_AUTH_URL).replace(/\/$/,'');
}

function copyAuthCookies(upstream:Response,response:NextResponse){
  const headers=upstream.headers as Headers & {getSetCookie?:()=>string[]};
  const cookies=headers.getSetCookie?.()||[];
  for(const raw of cookies){
    const local=raw
      .replace(/;\s*Domain=[^;]+/ig,'')
      .replace(/;\s*Path=[^;]+/ig,'; Path=/');
    response.headers.append('Set-Cookie',local);
  }
}

export async function proxyAuth(request:NextRequest,path:string,body?:unknown){
  const upstream=await fetch(authBaseUrl()+path,{
    method:body===undefined?'GET':'POST',
    headers:{
      'Content-Type':'application/json',
      'Cookie':request.headers.get('cookie')||'',
      'Origin':new URL(request.url).origin
    },
    body:body===undefined?undefined:JSON.stringify(body),
    cache:'no-store',
    redirect:'manual'
  });
  const text=await upstream.text();
  let payload:unknown=null;
  try{payload=text?JSON.parse(text):null}catch{payload={message:text||'Auth hiba'}}
  const response=NextResponse.json(payload,{status:upstream.status,headers:{'Cache-Control':'no-store'}});
  copyAuthCookies(upstream,response);
  return response;
}

export async function neonSession(request:NextRequest){
  const upstream=await fetch(authBaseUrl()+'/get-session',{
    headers:{'Cookie':request.headers.get('cookie')||'','Origin':new URL(request.url).origin},
    cache:'no-store'
  });
  if(!upstream.ok)return null;
  return upstream.json().catch(()=>null);
}
