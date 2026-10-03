import { NextRequest, NextResponse } from 'next/server';
import { neonSession } from '../../../../lib/auth-server';
export async function GET(request:NextRequest){const data=await neonSession(request);return NextResponse.json(data||{user:null},{headers:{'Cache-Control':'no-store'}})}
