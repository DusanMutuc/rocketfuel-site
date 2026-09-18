import {NextRequest,NextResponse} from 'next/server';
import {timingSafeEqual} from 'node:crypto';
import {runReportJob} from '@/lib/reports/reportWorker';
export const runtime='nodejs';export const maxDuration=300;export const dynamic='force-dynamic';
async function run(request:NextRequest){const secret=process.env.CRON_SECRET;const provided=request.headers.get('authorization')||'';const expected=`Bearer ${secret}`;const providedBytes=Buffer.from(provided),expectedBytes=Buffer.from(expected);if(!secret||providedBytes.length!==expectedBytes.length||!timingSafeEqual(providedBytes,expectedBytes))return NextResponse.json({error:'Unauthorized'},{status:401});if(process.env.REPORTS_ENABLED!=='true')return NextResponse.json({status:'disabled'},{headers:{'Cache-Control':'no-store'}});try{return NextResponse.json(await runReportJob(),{headers:{'Cache-Control':'no-store'}});}catch(error){console.error('[report-job]',error instanceof Error?error.message:'Job failed');return NextResponse.json({error:'Report job did not complete. Review the server log and delivery states before retrying.'},{status:500});}}
export const GET=run;export const POST=run;
