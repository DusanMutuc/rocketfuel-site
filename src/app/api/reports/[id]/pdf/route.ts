import {NextRequest,NextResponse} from 'next/server';
import {reportAuthorization,reportClient,reportRevision,privateHeaders} from '@/lib/reports/access';
import {supabaseAdmin} from '@/lib/exports/adminClient';
import {generateMilestonePdf} from '@/lib/reports/milestonePdf';
import {isReportId,reportFilename} from '@/lib/reports/milestoneFormat';
import type {ReportSnapshot} from '@/lib/reports/reportTypes';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 const auth=await reportAuthorization(request);if(!auth)return NextResponse.json({error:'Please sign in to download this report.'},{status:401,headers:privateHeaders});
 const {id}=await params;let revision;try{revision=reportRevision(request.url);}catch{return NextResponse.json({error:'Invalid report revision.'},{status:400});}if(!isReportId(id))return NextResponse.json({error:'Invalid report link.'},{status:400});
 const {data,error}=await (auth.admin?supabaseAdmin:reportClient(auth.token)).rpc(auth.admin?'admin_get_member_report':'get_member_report',{_report_id:id,_revision:revision});
 if(error||!data)return NextResponse.json({error:'This report is not available for your account.'},{status:404,headers:privateHeaders});
 try{const report=data as ReportSnapshot;const pdf=await generateMilestonePdf(report);return new Response(Uint8Array.from(pdf),{headers:{...privateHeaders,'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="${reportFilename(report)}"`,'X-Content-Type-Options':'nosniff'}});}catch{return NextResponse.json({error:'The report PDF could not be generated.'},{status:500,headers:privateHeaders});}
}
