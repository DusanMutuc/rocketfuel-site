import {NextRequest,NextResponse} from 'next/server';
import {reportAuthorization,privateHeaders} from '@/lib/reports/access';
import {supabaseAdmin} from '@/lib/exports/adminClient';
import {isReportId} from '@/lib/reports/milestoneFormat';
async function denied(request:NextRequest){const auth=await reportAuthorization(request);return !auth?401:!auth.admin?403:null;}
function failure(error:{code?:string;message:string}){return NextResponse.json({error:error.code==='PGRST202'?'Install the report card database update first.':error.code==='P0001'?error.message:'The report request could not be completed.'},{status:error.code==='PGRST202'?503:error.code==='P0001'?400:500,headers:privateHeaders});}
export async function GET(request:NextRequest){const status=await denied(request);if(status)return NextResponse.json({error:'Unauthorized'},{status});const {data,error}=await supabaseAdmin.rpc('list_member_reports_admin',{_limit:100});return error?failure(error):NextResponse.json({reports:data??[]},{headers:privateHeaders});}
export async function POST(request:NextRequest){const status=await denied(request);if(status)return NextResponse.json({error:'Unauthorized'},{status});let body;try{const raw=await request.text();if(raw.length>4096)throw new Error();body=JSON.parse(raw);}catch{return NextResponse.json({error:'Invalid request.'},{status:400});}let rpc:string;let params:Record<string,unknown>;
 if(body.action==='preview'&&isReportId(body.user_id||'')&&isReportId(body.course_id||'')&&['day30','day60','final'].includes(body.milestone)){rpc='preview_member_report';params={_user_id:body.user_id,_course_id:body.course_id,_milestone:body.milestone};}
 else if(body.action==='regenerate'&&isReportId(body.report_id||'')&&typeof body.reason==='string'&&body.reason.trim().length>=5&&body.reason.length<=500){rpc='regenerate_member_report';params={_report_id:body.report_id,_reason:body.reason.trim()};}
 else if(body.action==='resend'&&isReportId(body.report_id||'')){rpc='retry_member_report_email';params={_report_id:body.report_id,_acknowledge_unknown:body.acknowledge_unknown===true};}
 else return NextResponse.json({error:'Choose a valid report action. Corrections require a reason.'},{status:400});
 const {data,error}=await supabaseAdmin.rpc(rpc,params);return error?failure(error):NextResponse.json({result:data},{headers:privateHeaders});}
