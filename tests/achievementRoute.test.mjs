import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source=readFileSync(new URL('../src/app/api/superadmin/achievements/route.ts',import.meta.url),'utf8');
function route({email='admin@example.test',invalid=false,rpcError=null,engineVersion=6}={}) {
 const calls=[];const exports={};
 const client={auth:{getUser:async token=>({data:{user:invalid?null:{email}},error:invalid?{message:'Invalid token'}:null})},rpc:async(...args)=>{calls.push(args);return{data:args[0]==='achievement_engine_version'?engineVersion:args[0]==='list_achievement_catalog'?[]:{eligible_members:2,awarded:2},error:rpcError};}};
 const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 vm.runInNewContext(compiled,{exports,require:name=>name==='next/server'?{NextResponse:{json:(value,options)=>new Response(JSON.stringify(value),options)}}:{supabaseAdmin:client},process:{env:{NEXT_PUBLIC_SUPERADMIN_EMAILS:'admin@example.test'}},Response});
 return {api:exports,calls};
}
const request=(body,token='synthetic-token')=>new Request('http://localhost/api/superadmin/achievements',{method:body?'POST':'GET',headers:token?{authorization:`Bearer ${token}`}:{},...(body?{body:JSON.stringify(body)}:{})});
test('missing, invalid and non-superadmin tokens cannot read or publish',async()=>{
 for(const [options,token,status]of [[{},null,401],[{invalid:true},'bad',401],[{email:'member@example.test'},'member',403]]) {
  const {api,calls}=route(options);assert.equal((await api.GET(request(null,token))).status,status);
  assert.equal((await api.POST(request({action:'publish',definition:{},role:'superadmin'},token))).status,status);assert.equal(calls.length,0);
 }
});
test('authenticated preview and publication route only to their intended RPC',async()=>{
 const {api,calls}=route();const definition={key:'asks_100',kind:'course_total',target:100};
 assert.equal((await api.POST(request({action:'preview',definition}))).status,200);
 assert.equal((await api.POST(request({action:'publish',definition}))).status,200);
 assert.equal(calls[0][0],'preview_achievement');assert.equal(calls[1][0],'publish_achievement');assert.deepEqual(JSON.parse(JSON.stringify(calls[1][1])),{_definition:definition});
 assert.equal((await api.POST(request({action:'execute_sql',definition}))).status,400);assert.equal(calls.length,2);
});
test('missing migration and malformed payloads are surfaced without publishing',async()=>{
 const missing=route({rpcError:{code:'PGRST202',message:'missing'}});assert.equal((await missing.api.GET(request())).status,503);
 const {api,calls}=route();assert.equal((await api.POST(request({action:'publish',definition:[]}))).status,400);
 const invalid=new Request('http://localhost',{method:'POST',headers:{authorization:'Bearer test'},body:'{'});assert.equal((await api.POST(invalid)).status,400);assert.equal(calls.length,0);
});

test('tiered builder fails closed against an older database instead of publishing a standalone badge',async()=>{
 const definition={key:'asking',mode:'series',tier:'bronze',artwork:'phosphor:chat-circle'};
 const outdated=route({engineVersion:2});
 assert.equal((await outdated.api.POST(request({action:'publish',definition}))).status,503);
 assert.deepEqual(outdated.calls.map(call=>call[0]),['achievement_engine_version']);
 const current=route();assert.equal((await current.api.POST(request({action:'publish',definition}))).status,200);
 assert.deepEqual(current.calls.map(call=>call[0]),['achievement_engine_version','publish_achievement']);
});

 test('editing requires version six and uses only the edit RPCs',async()=>{
  const definition={key:'launch_asks',mode:'series'};
  for(const action of ['preview_edit','edit']){
   const old=route({engineVersion:4});assert.equal((await old.api.POST(request({action,definition}))).status,503);
   assert.deepEqual(old.calls.map(c=>c[0]),['achievement_engine_version']);
   const member=route({email:'member@example.test'});assert.equal((await member.api.POST(request({action,definition}))).status,403);assert.equal(member.calls.length,0);
   const current=route();assert.equal((await current.api.POST(request({action,definition}))).status,200);
   assert.equal(current.calls[1][0],action==='edit'?'edit_achievement':'preview_achievement_edit');
  }
 });

test('shape-only definitions require the shape-aware database',async()=>{
 const definition={key:'round_medal',shape:'circle',kind:'course_total',target:10};
 const old=route({engineVersion:4});assert.equal((await old.api.POST(request({action:'publish',definition}))).status,503);assert.equal(old.calls.length,1);
 const current=route();assert.equal((await current.api.POST(request({action:'publish',definition}))).status,200);
 assert.equal(current.calls[1][1]._definition.shape,'circle');
});
