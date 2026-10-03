import {createNeonAuth} from '@neondatabase/auth/next/server';

const FALLBACK_AUTH_URL='https://ep-lively-night-b258ug4c.neonauth.eu-central-1.aws.neon.tech/neondb/auth';

export function authBaseUrl(){
  return process.env.NEON_AUTH_BASE_URL||FALLBACK_AUTH_URL;
}

export function authConfigured(){
  return Boolean(authBaseUrl() && (process.env.NEON_AUTH_COOKIE_SECRET||'').length>=32);
}

export function getAuth(){
  const secret=process.env.NEON_AUTH_COOKIE_SECRET||'';
  if(secret.length<32)throw new Error('NEON_AUTH_COOKIE_SECRET is missing or shorter than 32 characters');
  return createNeonAuth({
    baseUrl:authBaseUrl(),
    cookies:{secret,sessionDataTtl:300,sameSite:'lax'},
    logLevel:'warn'
  });
}
