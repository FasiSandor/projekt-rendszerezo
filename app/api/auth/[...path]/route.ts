import {NextResponse} from 'next/server';
import {getAuth} from '../../../../lib/auth/server';

async function run(method:'GET'|'POST',request:Request){
  try{
    const handler=getAuth().handler();
    return await handler[method](request as any);
  }catch(e){
    return NextResponse.json({message:e instanceof Error?e.message:'Neon Auth configuration error'},{status:500});
  }
}

export async function GET(request:Request){return run('GET',request)}
export async function POST(request:Request){return run('POST',request)}
