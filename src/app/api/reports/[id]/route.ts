import {NextRequest,NextResponse} from 'next/server';
import {reportAuthorization,reportClient,reportRevision,privateHeaders} from '@/lib/reports/access';
import {supabaseAdmin} from '@/lib/exports/adminClient';
import {isReportId} from '@/lib/reports/milestoneFormat';
export const dynamic='force-dynamic';
export async function GET(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 const auth=await reportAuthorization(request);if(!auth)return NextResponse.json({error:'Please sign in to view this report.'},{status:401,headers:privateHeaders});
 const {id}=await params;let revision;try{revision=reportRevision(request.url);}catch{return NextResponse.json({error:'Invalid report revision.'},{status:400});}if(!isReportId(id))return NextResponse.json({error:'Invalid report link.'},{status:400});
 const {data,error}=await (auth.admin?supabaseAdmin:reportClient(auth.token)).rpc(auth.admin?'admin_get_member_report':'get_member_report',{_report_id:id,_revision:revision});
 if(error||!data)return NextResponse.json({error:error?.code==='PGRST202'?'Report cards are not available yet.':'This report is not available for your account.'},{status:error?.code==='PGRST202'?503:404,headers:privateHeaders});
 return NextResponse.json({report:data},{headers:privateHeaders});
}
