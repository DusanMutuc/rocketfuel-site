'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Paper, TextField, Typography } from '@mui/material';
import { supabase } from '@/lib/supabaseClient';
import AchievementArtwork from './AchievementArtwork';
import { CUSTOM_ARTWORK, isCustomBadgeArtwork, MEDAL_SHAPES, defaultMedalShape, type MedalShape, TIERS, tierLabel, type AchievementTier, type BadgeArtwork } from '@/lib/achievements/badgeDesign';
import phosphor from '@/lib/achievements/phosphor-duotone.json';

type Milestone = {expected_revision?:number;tier:AchievementTier;target:number;title:string};
type Draft = {task_type_ids?:number[];series_keys?:string[];collection_tier?:AchievementTier;shape:MedalShape;expected_revision?:number;request_id?:string;key:string;title:string;artwork:BadgeArtwork;tier:AchievementTier;mode:'standalone'|'series';kind:'course_total'|'weekly_total'|'minimum_weeks'|'launch_wins'|'combo_weeks'|'collection';task_type_id:number|null;target:number;milestones:Milestone[]};
type Published = {shape?:MedalShape;key:string;title:string;description:string;artwork:BadgeArtwork;tier?:AchievementTier;series_key?:string;series_title?:string;published_at:string;revision?:number;rule?:{task_type_ids?:number[];series_keys?:string[];collection_tier?:AchievementTier;target:number;kind:Draft['kind'];task_type_id?:number;win?:string}};
type Preview = Published & {previous_target?:number} & {mode:string;eligible_members:number;rule:{thresholds?:{id:number;minimum:number}[]};milestones:(Published & {eligible_members:number;previous_target?:number})[]};
const activities=['Asks','Follow ups','Open houses','Handwritten cards','Action promises','Exercises'];
const initial:Draft={task_type_ids:[1,2],series_keys:[],collection_tier:'bronze',shape:'hexagon',key:'',title:'',artwork:'conversation',tier:'bronze',mode:'standalone',kind:'course_total',task_type_id:1,target:100,milestones:TIERS.map((tier,i)=>({tier,target:[50,125,200,250][i],title:''}))};
const iconChoices=Object.keys(phosphor).filter(key=>!isCustomBadgeArtwork(key)).map(key=>({key:key as BadgeArtwork,label:key.slice(9).split('-').map(word=>word[0].toUpperCase()+word.slice(1)).join(' ')}));
const themes:Record<string,RegExp>={Relationships:/chat|hand|heart|users|person|address|phone|envelope/,Consistency:/calendar|clock|check|repeat|steps|stack|hourglass/,Learning:/book|brain|graduat|lightbulb|pencil|student/,Milestones:/flag|trophy|medal|star|rocket|target|crown|mountain/};
async function request(action?:'preview'|'publish'|'preview_edit'|'edit',definition?:Draft & {expected_thresholds?:{id:number;minimum:number}[]}){
  const {data:{session}}=await supabase.auth.getSession();
  if(!session?.access_token)throw new Error('Sign in again to manage achievements.');
  const response=await fetch('/api/superadmin/achievements',{method:action?'POST':'GET',headers:{Authorization:`Bearer ${session.access_token}`,...(action?{'Content-Type':'application/json'}:{})},...(action?{body:JSON.stringify({action,definition})}:{})});
  const data=await response.json();if(!response.ok)throw new Error(data.error||'Could not complete the request.');return data;
}
export default function AchievementCatalogAdmin(){
  const [catalog,setCatalog]=useState<Published[]>([]),[draft,setDraft]=useState<Draft>(initial),[preview,setPreview]=useState<Preview|null>(null);
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[confirm,setConfirm]=useState(false);
  const [picker,setPicker]=useState(false),[source,setSource]=useState('custom'),[search,setSearch]=useState(''),[category,setCategory]=useState('All'),[limit,setLimit]=useState(24);
  // Keep the internal identity stable across edits and uncertain publication retries.
  const draftKey=useRef<string|null>(null);
  const [editing,setEditing]=useState(false);
  const editRequest=useRef<string|null>(null);
  const [previewTier,setPreviewTier]=useState<AchievementTier>('bronze');
  const categories=source==='custom'?Array.from(new Set(CUSTOM_ARTWORK.map(item=>item.category))):Object.keys(themes);
  const openPicker=()=>{setSource(isCustomBadgeArtwork(draft.artwork)?'custom':'phosphor');setSearch('');setCategory('All');setLimit(24);setPicker(true);};
  useEffect(()=>{let current=true;request().then(data=>{if(current)setCatalog(data.achievements??[]);}).catch(e=>{if(current)setError(e.message);}).finally(()=>{if(current)setLoading(false);});return()=>{current=false;};},[]);
  const startEdit=(items:Published[])=>{
    const first=items[0];if(!first.rule)return;
    setEditing(true);setPreview(null);setError('');setMessage('');draftKey.current=first.series_key||first.key;editRequest.current=null;
    setDraft({...initial,key:first.series_key||first.key,title:first.series_title||first.title,artwork:first.artwork,shape:first.shape??defaultMedalShape(first.artwork),tier:first.tier??'gold',mode:first.series_key?'series':'standalone',kind:first.rule.kind,task_type_ids:first.rule.task_type_ids,series_keys:first.rule.series_keys,collection_tier:first.rule.collection_tier,task_type_id:first.rule.task_type_id??null,target:first.rule.target,expected_revision:first.revision,
      milestones:first.series_key?items.slice().sort((a,b)=>TIERS.indexOf(a.tier??'gold')-TIERS.indexOf(b.tier??'gold')).map(item=>({tier:item.tier??'gold',target:item.rule!.target,title:item.title,expected_revision:item.revision})):initial.milestones});setPreviewTier(first.series_key?items.slice().sort((a,b)=>TIERS.indexOf(a.tier??'gold')-TIERS.indexOf(b.tier??'gold'))[0].tier??'gold':first.tier??'gold');
    document.getElementById('achievement-editor')?.scrollIntoView({block:'start'});
  };
  const cancelEdit=()=>{setEditing(false);setDraft(initial);setPreview(null);setPreviewTier('bronze');draftKey.current=null;editRequest.current=null;setError('');};
  const update=(patch:Partial<Draft>)=>{setDraft(value=>({...value,...patch,...(patch.title!==undefined&&!patch.milestones?{milestones:value.milestones.map(m=>({...m,title:m.title===`${value.title} · ${tierLabel(m.tier)}`?`${patch.title} · ${tierLabel(m.tier)}`:m.title}))}:{} )}));setPreview(null);setMessage('');setError('');};
  const updateMilestone=(i:number,patch:Partial<Milestone>)=>update({milestones:draft.milestones.map((m,index)=>index===i?{...m,...patch}:m)});
  const choices=useMemo(()=>{
    const query=search.toLowerCase().trim();
    return (source==='custom'?CUSTOM_ARTWORK:iconChoices).filter(item=>(category==='All'||(source==='custom'?'category' in item&&item.category===category:themes[category]?.test(item.key)))&&(!query||`${item.label} ${item.key} ${'keywords' in item?item.keywords:''}`.toLowerCase().includes(query)));
  },[source,search,category]);
  const groups=useMemo(()=>{
    const entries=new Map<string,Published[]>();for(const item of catalog){const key=item.series_key?`series:${item.series_key}`:`badge:${item.key}`;entries.set(key,[...(entries.get(key)??[]),item]);}return [...entries.values()];
  },[catalog]);
  const inspect=async()=>{
    setError('');if(draft.mode==='series'&&draft.milestones.slice().sort((a,b)=>TIERS.indexOf(a.tier)-TIERS.indexOf(b.tier)).some((m,i)=>!Number.isInteger(m.target)||m.target<1||(i>0&&m.target<=draft.milestones[i-1].target))){setError('Use increasing whole-number targets for each medal.');return;}
    const key=draftKey.current ?? `badge_${crypto.randomUUID().replace(/-/g,'')}`;
    draftKey.current=key;
    const prepared={...draft,key,task_type_id:['course_total','weekly_total'].includes(draft.kind)?draft.task_type_id:null};setDraft(prepared);
    editRequest.current=crypto.randomUUID();
    setBusy(true);try{setPreview(await request(editing?'preview_edit':'preview',prepared));}catch(e){setError(e instanceof Error?e.message:'Preview failed.');}finally{setBusy(false);}
  };
  const publish=async()=>{
    if(!preview)return;setBusy(true);setError('');
    try{
      const result=await request(editing?'edit':'publish',{...draft,...(editing?{request_id:editRequest.current!}:{}),...(preview.rule.thresholds?{expected_thresholds:preview.rule.thresholds}:{})});
      setConfirm(false);setPreview(null);setEditing(false);editRequest.current=null;draftKey.current=null;setDraft(initial);setPreviewTier('bronze');
      setMessage(result.replayed?'Already saved. No duplicate awards were created.':`${editing?'Updated':'Published'}. ${result.awarded} current members received ${result.awarded_milestones??result.awarded} milestones immediately.`);
      try{const data=await request();setCatalog(data.achievements??[]);}catch{setMessage('Saved. Reload this page to refresh the collection.');}
    }catch(e){setConfirm(false);setError(e instanceof Error?e.message:'Saving failed. Keep this definition unchanged and retry.');}finally{setBusy(false);}
  };
  const shownTier=draft.mode==='series'?previewTier:draft.tier;
  const shownMilestone=preview?.milestones?.find(m=>m.tier===shownTier);
  return <Box>
    <Typography id="achievement-editor" variant="h5" fontWeight={700}>{editing?'Edit achievement':'Achievement builder'}</Typography>
    <Typography color="text.secondary" sx={{mt:1,mb:3}}>{editing?'Change the name, shape, symbol or required amounts. The activity, earning rule and tiers stay the same.':'Choose a goal, give it a name, and make a medal members will be proud to earn.'}</Typography>
    {error&&<Alert severity="error" sx={{mb:2}}>{error}</Alert>}{message&&<Alert severity="success" sx={{mb:2}}>{message}</Alert>}
    <Box sx={{display:'grid',gridTemplateColumns:{xs:'1fr',md:'1.2fr 1fr'},gap:3,alignItems:'start'}}>
      <Paper component="form" onSubmit={e=>{e.preventDefault();void inspect();}} sx={{p:{xs:2,sm:3}}}>
        <Typography variant="h6" sx={{mb:2}}>1. Name your achievement</Typography>
        <Box sx={{display:'grid',gap:2}}>
          <TextField label="Name" placeholder="For example, Making connections" value={draft.title} onChange={e=>update({title:e.target.value})} required inputProps={{maxLength:draft.mode==='series'?55:70}} disabled={busy}/>
          <TextField select label="One medal or a series?" value={draft.mode} onChange={e=>{update({mode:e.target.value as Draft['mode']});setPreviewTier(draft.kind==='combo_weeks'?'silver':'bronze');}} helperText={draft.mode==='series'?'Members progress through each medal in the series.':'A single goal, with one medal to earn.'} disabled={busy||editing||draft.kind==='collection'}><MenuItem value="standalone">One medal</MenuItem><MenuItem value="series">{draft.kind==='combo_weeks'?'Silver and Gold':'Bronze through Diamond'}</MenuItem></TextField>
          <Typography variant="h6" sx={{mt:1}}>2. Set the goal</Typography>
          <TextField select label="How is it earned?" value={draft.kind} onChange={e=>{const kind=e.target.value as Draft['kind'];update({kind,task_type_id:['course_total','weekly_total'].includes(kind)?1:null,mode:kind==='collection'?'standalone':draft.mode,target:kind==='collection'?6:kind==='combo_weeks'?1:kind==='minimum_weeks'?3:100,milestones:kind==='combo_weeks'?[{tier:'silver',target:1,title:''},{tier:'gold',target:4,title:''}]:TIERS.map((tier,i)=>({tier,title:'',target:kind==='minimum_weeks'?[1,3,6,10][i]:[50,125,200,250][i]}))});setPreviewTier(kind==='combo_weeks'?'silver':'bronze');}} disabled={busy||editing}><MenuItem value="course_total">Total activity during the course</MenuItem><MenuItem value="weekly_total">Activity in a single week</MenuItem><MenuItem value="minimum_weeks">Weeks with every minimum reached</MenuItem><MenuItem value="combo_weeks">Activities completed in the same week</MenuItem><MenuItem value="collection">Milestones across activity series</MenuItem>{editing&&draft.kind==='launch_wins'&&<MenuItem value="launch_wins">Weekly wins</MenuItem>}</TextField>
          {['course_total','weekly_total'].includes(draft.kind)&&<TextField select label="Which activity?" value={draft.task_type_id} onChange={e=>update({task_type_id:Number(e.target.value)})} disabled={busy||editing}>{activities.map((label,i)=><MenuItem key={label} value={i+1}>{label}</MenuItem>)}</TextField>}
          {draft.kind==='combo_weeks'&&<Box>
            <Typography variant="subtitle2">Which activities go together?</Typography>
            <Typography variant="body2" color="text.secondary">Reach each selected activity’s weekly optimum in the same course week. These goals are saved when you publish.</Typography>
            <Box sx={{display:'flex',flexWrap:'wrap',gap:1,mt:1}}>{activities.map((label,i)=><Chip key={label} label={label} role="checkbox" aria-checked={draft.task_type_ids?.includes(i+1)??false} color={draft.task_type_ids?.includes(i+1)?'primary':'default'} disabled={busy||editing} onClick={()=>update({task_type_ids:(draft.task_type_ids?.includes(i+1)?draft.task_type_ids.filter(id=>id!==i+1):[...(draft.task_type_ids??[]),i+1]).sort((a,b)=>a-b)})}/>)}</Box>
          </Box>}
          {draft.kind==='collection'&&<>
            <TextField select label="Milestone members must reach" value={draft.collection_tier??'bronze'} onChange={e=>update({collection_tier:e.target.value as AchievementTier,series_keys:[]})} disabled={busy||editing}>{TIERS.map(tier=><MenuItem key={tier} value={tier}>{tierLabel(tier)} or higher</MenuItem>)}</TextField>
            <Box><Typography variant="subtitle2">Activity series included</Typography><Box sx={{display:'flex',flexWrap:'wrap',gap:1,mt:1}}>{groups.filter(items=>items.some(item=>item.rule?.kind==='course_total'&&item.tier===(draft.collection_tier??'bronze'))&&items[0].series_key).map(items=>{const key=items[0].series_key!;return <Chip key={key} label={items[0].series_title} role="checkbox" aria-checked={draft.series_keys?.includes(key)??false} color={draft.series_keys?.includes(key)?'primary':'default'} disabled={busy||editing} onClick={()=>update({series_keys:(draft.series_keys?.includes(key)?draft.series_keys.filter(k=>k!==key):[...(draft.series_keys??[]),key]).sort()})}/>;})}</Box></Box>
          </>}
          {draft.mode==='standalone'?<>
            <TextField label={draft.kind==='launch_wins'?'How many qualifying wins?':draft.kind==='collection'?'How many of the selected series?':['minimum_weeks','combo_weeks'].includes(draft.kind)?'How many weeks?':`How many ${activities[(draft.task_type_id??1)-1].toLowerCase()}?`} type="number" value={draft.target||''} onChange={e=>update({target:Number(e.target.value)})} required inputProps={{min:1,max:draft.kind==='collection'?(draft.series_keys?.length||6):['minimum_weeks','combo_weeks'].includes(draft.kind)?12:1000000,step:1}} disabled={busy}/>
          </>:<Box>
            <Typography variant="subtitle2">Milestones</Typography><Typography variant="caption" color="text.secondary">Set a bigger goal for each medal. You can give them names, or leave the names to us.</Typography>
            {draft.milestones.map((m,i)=><Box key={m.tier} sx={{mt:2,display:'grid',gridTemplateColumns:'85px 1fr',gap:1}}>
              <Typography sx={{gridColumn:'1 / -1',fontWeight:700,fontSize:13}}>{tierLabel(m.tier)}</Typography>
              <TextField label={['minimum_weeks','combo_weeks'].includes(draft.kind)?'Weeks':'Amount'} type="number" value={m.target||''} onChange={e=>updateMilestone(i,{target:Number(e.target.value)})} required inputProps={{min:1,max:draft.kind==='collection'?(draft.series_keys?.length||6):['minimum_weeks','combo_weeks'].includes(draft.kind)?12:1000000,step:1}} disabled={busy}/>
              <TextField label="Name (optional)" value={m.title} placeholder={`${draft.title||'Achievement'} · ${tierLabel(m.tier)}`} onChange={e=>updateMilestone(i,{title:e.target.value})} inputProps={{maxLength:70}} disabled={busy}/>
            </Box>)}
          </Box>}
          <Typography variant="h6" sx={{mt:1}}>3. Make it yours</Typography>
          {draft.mode==='standalone'&&<TextField select label="Medal colour" value={draft.tier} onChange={e=>update({tier:e.target.value as AchievementTier})} disabled={busy||editing}>{TIERS.map(tier=><MenuItem key={tier} value={tier}>{tierLabel(tier)}</MenuItem>)}</TextField>}
          <Box role="group" aria-label="Medal shape">
            <Typography variant="subtitle2" sx={{mb:1}}>Medal shape</Typography>
            <Box sx={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:1}}>
              {MEDAL_SHAPES.map(option=><Button key={option.key} aria-pressed={draft.shape===option.key} aria-label={`Choose ${option.label} shape`} disabled={busy} onClick={()=>update({shape:option.key})} sx={{display:'flex',flexDirection:'column',textTransform:'none',minWidth:0,p:1,color:'#24405B',border:'1px solid',borderColor:draft.shape===option.key?'#92703B':'#D5DCE2',background:draft.shape===option.key?'#F8F2E5':'transparent'}}>
                <AchievementArtwork artwork={draft.artwork} shape={option.key} tier={shownTier} size={64}/><Typography variant="caption">{option.label}</Typography>
              </Button>)}
            </Box>
          </Box>
          <Button variant="outlined" onClick={openPicker} disabled={busy}>Choose a symbol</Button>
          {editing&&<Button onClick={cancelEdit} disabled={busy}>Cancel editing</Button>}
          <Button type="submit" variant="contained" disabled={busy||loading}>{busy?'Working…':editing?'Preview changes':'Preview achievement'}</Button>
        </Box>
      </Paper>
      <Paper sx={{p:{xs:2,sm:3},background:'#FBF7ED',textAlign:'center'}}>
        <Typography variant="overline" color="text.secondary">Member preview · {tierLabel(shownTier)}</Typography>
        <Box sx={{display:'flex',justifyContent:'center'}}><AchievementArtwork artwork={draft.artwork} shape={draft.shape} tier={shownTier} size={180}/></Box>
        <Typography variant="h5" fontWeight={700} color="#17385B">{shownMilestone?.title||draft.title||'Your achievement title'}</Typography>
        <Typography sx={{mt:1}} color="text.secondary">{shownMilestone?.description||preview?.description||'Your medal is taking shape. Preview it to see the goal and who has already earned it.'}</Typography>
        <Box sx={{display:'grid',gridTemplateColumns:{xs:'repeat(3,1fr)',sm:'repeat(5,1fr)'},mt:3,gap:.5}}>
          {(draft.mode==='series'?draft.milestones.map(m=>m.tier):TIERS).map(tier=><Button key={tier} onClick={()=>setPreviewTier(tier)} disabled={draft.mode!=='series'||!draft.milestones.some(m=>m.tier===tier)} aria-label={`Preview ${tierLabel(tier)} medal`} sx={{minWidth:0,p:0,display:'flex',flexDirection:'column',textTransform:'none',color:'#344A5F','&.Mui-disabled':{color:'#344A5F'}}}><AchievementArtwork artwork={draft.artwork} shape={draft.shape} tier={tier} size={70}/><Typography variant="caption">{tierLabel(tier)}</Typography></Button>)}
          <Box><AchievementArtwork artwork={draft.artwork} shape={draft.shape} tier={shownTier} size={70} earned={false}/><Typography variant="caption" display="block">Not earned</Typography></Box>
        </Box>
        {preview&&<Box sx={{mt:3,textAlign:'left'}}>
          <Alert severity="info">{preview.eligible_members} {editing?'additional members will receive medals.':'members have already reached this goal.'}</Alert>
          {editing&&draft.mode==='standalone'&&<Typography sx={{mt:2}}>Required amount: {preview.previous_target} → {preview.rule.target}</Typography>}
          {draft.mode==='series'&&preview.milestones?.map(item=><Box key={item.key} sx={{py:1,borderBottom:'1px solid #DED6C6'}}><Typography variant="body2" fontWeight={700}>{tierLabel(item.tier)} · {item.eligible_members} {editing?'additional members':'already earned'}</Typography><Typography variant="body2">{item.description}</Typography>{editing&&<Typography variant="caption">Required amount: {item.previous_target} → {item.rule?.target} · Existing medals are kept.</Typography>}</Box>)}
          {!!preview.rule.thresholds?.length&&<Typography variant="body2" sx={{mt:2}}>Weekly goals included: {preview.rule.thresholds.map(t=>`${activities[t.id-1]} ${t.minimum}`).join(' · ')}.</Typography>}
          <Typography variant="body2" sx={{my:2}}>Members on a current course who have already reached the goal will receive their medals automatically. Names, shapes, symbols and amounts can be edited later. Existing medals are always kept.</Typography>
          <Button variant="contained" fullWidth onClick={()=>setConfirm(true)} disabled={busy}>{editing?'Save changes':`Publish ${draft.mode==='series'?'series':'achievement'}`}</Button>
        </Box>}
      </Paper>
    </Box>
    <Typography variant="h6" sx={{mt:4,mb:2}}>Your achievements</Typography>
    {loading?<CircularProgress size={24}/>:groups.map(items=><Box key={items[0].series_key||items[0].key} sx={{py:2,borderBottom:'1px solid',borderColor:'divider'}}>
      <Box sx={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:2}}><Typography fontWeight={700}>{items[0].series_title||items[0].title}</Typography><Button onClick={()=>startEdit(items)} disabled={busy||!items[0].rule} aria-label={`Edit ${items[0].series_title||items[0].title}`}>Edit</Button></Box>
      <Box sx={{display:'flex',flexWrap:'wrap',gap:2}}>{items.sort((a,b)=>TIERS.indexOf(a.tier??'gold')-TIERS.indexOf(b.tier??'gold')).map(item=><Box key={item.key} sx={{display:'flex',alignItems:'center',gap:1,flex:'1 1 250px'}}><AchievementArtwork artwork={item.artwork} shape={item.shape} tier={item.tier} size={76}/><Box><Typography variant="body2" fontWeight={600}>{tierLabel(item.tier)} · {item.title}</Typography><Typography variant="body2" color="text.secondary">{item.description}</Typography></Box></Box>)}</Box>
    </Box>)}
    <Dialog open={picker} onClose={()=>setPicker(false)} fullWidth maxWidth="md"><DialogTitle>Choose a symbol</DialogTitle><DialogContent>
      <Typography variant="body2" color="text.secondary" sx={{mb:2}}>Pick a symbol for your medal. It will look great in every colour.</Typography>
      <Box sx={{display:'flex',gap:1,flexWrap:'wrap',mb:2}}>{[['custom',`Custom Rocketfuel · ${CUSTOM_ARTWORK.length}`],['phosphor',`Phosphor · ${iconChoices.length.toLocaleString('en-US')} icons`]].map(([value,label])=><Chip key={value} label={label} onClick={()=>{setSource(value);setCategory('All');setLimit(24);}} color={source===value?'primary':'default'}/>)}</Box>
      <Box sx={{display:'grid',gridTemplateColumns:{xs:'1fr',sm:'2fr 1fr'},gap:2}}><TextField label="Search symbols" value={search} onChange={e=>{setSearch(e.target.value);setLimit(24);}}/><TextField select label="Category" value={category} onChange={e=>{setCategory(e.target.value);setLimit(24);}}>{['All',...categories].map(label=><MenuItem key={label} value={label}>{label}</MenuItem>)}</TextField></Box>
      <Typography variant="caption" sx={{display:'block',my:2}}>{choices.length} symbols found</Typography>
      <Box sx={{display:'grid',gridTemplateColumns:{xs:'repeat(3,1fr)',sm:'repeat(6,1fr)'},gap:1}}>{choices.slice(0,limit).map(item=><Button key={item.key} onClick={()=>{update({artwork:item.key});setPicker(false);}} aria-label={`Choose ${item.label}`} sx={{display:'flex',flexDirection:'column',textTransform:'none',minWidth:0,p:.5,color:'#24405B',border:draft.artwork===item.key?'1px solid #AA8244':'1px solid transparent'}}><AchievementArtwork artwork={item.key} shape={draft.shape} tier={shownTier} size={70}/><Typography variant="caption" textAlign="center">{item.label}</Typography></Button>)}</Box>
      {!choices.length&&<Typography>No matching symbols. Try another word or category.</Typography>}
      {choices.length>limit&&<Button sx={{mt:2}} onClick={()=>setLimit(value=>value+24)}>Show more</Button>}
    </DialogContent><DialogActions><Button onClick={()=>setPicker(false)}>Close</Button></DialogActions></Dialog>
    <Dialog open={confirm} onClose={()=>{if(!busy)setConfirm(false);}}><DialogTitle>{editing?'Save changes to':'Publish'} {preview?.title}?</DialogTitle><DialogContent><Typography>{preview?.eligible_members} {editing?'additional members qualify for medals.':'members had already reached the goal when you previewed it.'} We’ll check again when you save.</Typography><Typography sx={{mt:2}}>Existing medals and earned dates are kept. Members who meet the new amounts will receive their medals automatically. The activity, earning rule and tiers stay the same.</Typography></DialogContent><DialogActions><Button onClick={()=>setConfirm(false)} disabled={busy}>Keep editing</Button><Button onClick={()=>void publish()} disabled={busy} variant="contained">{busy?'Saving…':editing?'Save changes':'Publish now'}</Button></DialogActions></Dialog>
  </Box>;
}
