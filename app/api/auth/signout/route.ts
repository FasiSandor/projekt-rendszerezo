import { NextRequest } from 'next/server';
import { proxyAuth } from '../../../../lib/auth-server';
export async function POST(request:NextRequest){return proxyAuth(request,'/sign-out',{})}
