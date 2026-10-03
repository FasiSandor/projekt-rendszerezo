import {createNeonAuth} from '@neondatabase/auth/next/server';

const baseUrl=process.env.NEON_AUTH_BASE_URL||'https://ep-lively-night-b258ug4c.neonauth.eu-central-1.aws.neon.tech/neondb/auth';
const secret=process.env.NEON_AUTH_COOKIE_SECRET||'';

export const auth=createNeonAuth({
  baseUrl,
  cookies:{
    secret,
    sessionDataTtl:300,
    sameSite:'lax'
  }
});

export function authConfigured(){
  return Boolean(baseUrl&&secret.length>=32);
}

export function authBaseUrl(){
  return baseUrl;
}
