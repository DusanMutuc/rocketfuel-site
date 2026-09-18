 'use client';
import {useEffect,useRef,useState} from 'react';
import {useParams,useRouter} from 'next/navigation';
import {supabase} from '@/lib/supabaseClient';
import type {ReportSnapshot} from '@/lib/reports/reportTypes';
import {isReportId,reportFilename} from '@/lib/reports/milestoneFormat';
import MilestoneReport from '@/components/MilestoneReport';
export default function ReportPage(){
 const {id}=useParams<{id:string}>();const router=useRouter();const [report,setReport]=useState<ReportSnapshot|null>(null);const [error,setError]=useState('');const [downloading,setDownloading]=useState(false);
 const ownerRef=useRef<string|null>(null),epochRef=useRef(0),downloadAbort=useRef<AbortController|null>(null);
 useEffect(()=>{
  let cancelled=false;let lastOwner:string|null|undefined=undefined;let loadAbort:AbortController|null=null;
  const login=()=>router.replace(`/login?next=${encodeURIComponent(`/reports/${id}`)}`);
  function acceptSession(session:{user:{id:string};access_token:string}|null){
   if(cancelled)return;const owner=session?.user.id??null;if(lastOwner===owner)return;lastOwner=owner;ownerRef.current=owner;const epoch=++epochRef.current;
   loadAbort?.abort();downloadAbort.current?.abort();setReport(null);setError('');setDownloading(false);
   if(!session){login();return;}if(!isReportId(id)){setError('This report link is not valid.');return;}
   loadAbort=new AbortController();const controller=loadAbort;const current=()=>!cancelled&&epoch===epochRef.current&&owner===ownerRef.current;
   async function load(){const result=await fetch(`/api/reports/${id}`,{headers:{Authorization:`Bearer ${session!.access_token}`},cache:'no-store',signal:controller.signal});const body=await result.json();if(!current())return;if(result.status===401){login();return;}if(!result.ok)throw new Error(body.error||'Your report could not be loaded.');setReport(body.report);if(current())await supabase.rpc('mark_member_report_seen',{_report_id:id});}
   void load().catch(err=>{if(current()&&err.name!=='AbortError')setError(err.message);});
  }
  const initialEpoch=epochRef.current;const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>acceptSession(session));
  void supabase.auth.getSession().then(({data:{session}})=>{if(epochRef.current===initialEpoch)acceptSession(session);});
  return()=>{cancelled=true;++epochRef.current;ownerRef.current=null;loadAbort?.abort();downloadAbort.current?.abort();subscription.unsubscribe();};
 },[id,router]);
 async function download(){
  if(!report||downloading||!ownerRef.current)return;const owner=ownerRef.current,epoch=epochRef.current,snapshot=report;const current=()=>ownerRef.current===owner&&epochRef.current===epoch;
  const controller=new AbortController();downloadAbort.current=controller;setDownloading(true);setError('');
  try{const {data:{session}}=await supabase.auth.getSession();if(!current())return;if(!session||session.user.id!==owner)throw new Error('Please sign in again to download this report.');
   const response=await fetch(`/api/reports/${id}/pdf?revision=${snapshot.revision}`,{headers:{Authorization:`Bearer ${session.access_token}`},cache:'no-store',signal:controller.signal});if(!current())return;if(!response.ok)throw new Error('The PDF could not be downloaded. Please try again.');const blob=await response.blob();if(!current())return;
   const {data:{session:latest}}=await supabase.auth.getSession();if(!current()||latest?.user.id!==owner)return;
   const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=reportFilename(snapshot);document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30_000);
  }catch(err){if(current()&&!(err instanceof Error&&err.name==='AbortError'))setError(err instanceof Error?err.message:'Download failed.');}finally{if(current())setDownloading(false);if(downloadAbort.current===controller)downloadAbort.current=null;}
 }
 return <main style={{background:'#EAE7DF',minHeight:'100vh',padding:'20px 0 40px'}}><div style={{maxWidth:760,margin:'0 auto 20px',padding:'0 20px',display:'flex',gap:16,justifyContent:'space-between',alignItems:'center',flexWrap:'wrap'}}><a href={`rocketfuel://reports/${id}`} style={{color:'#183552',fontWeight:700}}>Open in Rocketfuel ↗</a>{report&&<button onClick={download} disabled={downloading} style={{border:0,borderRadius:6,background:'#153452',color:'#fff',padding:'12px 18px',cursor:'pointer',fontWeight:700}}>{downloading?'Preparing PDF…':'Download PDF'}</button>}</div>{error&&<p role="alert" style={{maxWidth:720,margin:'20px auto',padding:20,color:'#8d2525'}}>{error}</p>}{report?<MilestoneReport report={report}/>:!error&&<p style={{padding:40,textAlign:'center'}}>Opening your report…</p>}</main>;
}
