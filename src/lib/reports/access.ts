import {createClient} from '@supabase/supabase-js';
import {supabaseAdmin} from '@/lib/exports/adminClient';
export function reportClient(token:string){return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL||process.env.SUPABASE_PROJECT_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false,autoRefreshToken:false}});}
export async function reportAuthorization(request:Request){
 const header=request.headers.get('authorization');if(!header?.startsWith('Bearer '))return null;
 const token=header.slice(7);const {data,error}=await supabaseAdmin.auth.getUser(token);if(error||!data.user)return null;
 const allowed=(process.env.NEXT_PUBLIC_SUPERADMIN_EMAILS||'').split(';').map(item=>item.trim().toLowerCase()).filter(Boolean);
 return {token,user:data.user,admin:!!data.user.email&&allowed.includes(data.user.email.toLowerCase())};
}
export const privateHeaders={'Cache-Control':'private, no-store','Vary':'Authorization'};
export function reportRevision(url:string){const raw=new URL(url).searchParams.get('revision');if(raw===null)return null;if(!/^[1-9]\d{0,6}$/.test(raw))throw new Error('Invalid revision');return Number(raw);}
