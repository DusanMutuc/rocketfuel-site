import {supabaseAdmin} from '@/lib/exports/adminClient';
import type {ReportSnapshot} from './reportTypes';
import {reportEmail,ReportEmailFailure,sendReportEmail} from './reportEmail';
type Claim={delivery_id:string;claim_token:string;report_id:string;revision:number;user_id:string;snapshot:ReportSnapshot};
export async function runReportJob(){
 const {data:generated,error}=await supabaseAdmin.rpc('generate_due_member_reports',{_limit:100});if(error)throw new Error('Report generation failed.');
 if(process.env.REPORTS_EMAIL_ENABLED!=='true')return {generated,emails:'disabled'};
 const site=process.env.REPORTS_SITE_URL || 'https://www.rocketfuelmembers.com';
 // Validate all delivery configuration before claiming any messages.
 if(!process.env.GHL_PRIVATE_INTEGRATION_TOKEN||!process.env.GHL_LOCATION_ID||!process.env.GHL_EMAIL_FROM)throw new Error('Report email provider is not configured.');
 const siteUrl=new URL(site);if(siteUrl.protocol!=='https:'||siteUrl.username||siteUrl.password)throw new Error('REPORTS_SITE_URL must use HTTPS.');
 const {data:claims,error:claimError}=await supabaseAdmin.rpc('claim_member_report_email',{_limit:5});if(claimError)throw new Error('Report notification queue could not be claimed.');
 const results=[];for(const claim of (claims??[]) as Claim[]){let outcome:'sent'|'failed'|'unknown'='failed';let provider:string|null=null;let detail:string|null=null;try{const {data,error:memberError}=await supabaseAdmin.auth.admin.getUserById(claim.user_id);if(memberError||!data.user?.email)throw new ReportEmailFailure('Member email is unavailable.','failed');const content=reportEmail(claim.snapshot,site);provider=await sendReportEmail({email:data.user.email,name:claim.snapshot.member_name,...content});outcome='sent';}catch(error){outcome=error instanceof ReportEmailFailure?error.outcome:'failed';detail=error instanceof Error?error.message:'Report notification failed.';}
 const {error:finishError}=await supabaseAdmin.rpc('finish_member_report_email',{_delivery_id:claim.delivery_id,_claim_token:claim.claim_token,_outcome:outcome,_provider_id:provider,_error:detail});
 // If acknowledgement fails, leave the claim unresolved; it will become unknown, never auto-resend.
 results.push({delivery_id:claim.delivery_id,status:finishError?'unconfirmed':outcome});}return {generated,deliveries:results};
}
