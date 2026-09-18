import 'server-only';
import PDFDocument from 'pdfkit';
import path from 'node:path';
import SVGtoPDF from 'svg-to-pdfkit';
import {reportMedalSvg} from './medalSvg';
import type {ReportSnapshot} from './reportTypes';
import {activityGoal,count,money,reportDate,reportTimestamp,reportTitle} from './milestoneFormat';
const C={navy:'#153452',ink:'#183552',paper:'#FAF8F3',cream:'#F1E9D7',success:'#287650',gold:'#9C7134',goldLight:'#EBC585',muted:'#687075',line:'#dedbcf'};
/** Goals first; business and illustrated achievement descriptions follow. Long descriptions may continue onto another page. */
export async function generateMilestonePdf(report:ReportSnapshot):Promise<Buffer>{
 const doc=new PDFDocument({size:'A4',margin:0,bufferPages:true,info:{Title:`Rocketfuel ${reportTitle(report.milestone)}`,Author:'Rocketfuel',Subject:`${report.member_name} - saved revision ${report.revision}`}});
 doc.registerFont('ReportUnicode',path.join(process.cwd(),'public/fonts/Inter_18pt-Regular.ttf'));
 const chunks:Buffer[]=[];const complete=new Promise<Buffer>((resolve,reject)=>{doc.on('data',chunk=>chunks.push(Buffer.from(chunk)));doc.on('end',()=>resolve(Buffer.concat(chunks)));doc.on('error',reject);});
 const W=595.28,H=841.89,X=42,CW=W-84;
 const text=(value:string,x:number,y:number,size=11,color=C.ink,width=CW,align:'left'|'right'|'center'='left',bold=false)=>{const unicode=/[\u0100-\uFFFF]/.test(value);doc.font(unicode?'ReportUnicode':bold?'Helvetica-Bold':'Helvetica');let fitted=size;if(size>=17||y===66){while(fitted>9&&doc.fontSize(fitted).widthOfString(value)>width)fitted-=.5;}doc.fontSize(fitted).fillColor(color).text(value,x,y,{width,align,lineGap:3,height:size>=17||y===66?fitted*1.6:y===650?70:40,ellipsis:true});};
 const line=(y:number)=>doc.moveTo(X,y).lineTo(W-X,y).strokeColor(C.line).lineWidth(.7).stroke();
 function paper(){doc.rect(0,0,W,H).fill(C.paper);}
 function footer(page:number,total:number){line(H-48);text('ROCKETFUEL',X,H-32,8,C.muted,120);text(`Saved ${reportTimestamp(report.generated_at,report.reporting_timezone)}  |  Version ${report.revision}  |  ${page} / ${total}`,X+120,H-32,8,C.muted,CW-120,'right');}
 paper();doc.rect(0,0,W,211).fill(C.navy);text('R O C K E T F U E L',X,29,17,C.paper,CW,'left',true);text('YOUR PROGRESS, RECORDED',X,65,8,C.goldLight);text(reportTitle(report.milestone),X,83,36,C.paper,CW,'left',true);
 text(report.member_name,X,135,17,C.paper,CW,'left',true);text(`${reportDate(report.period_start)} - ${reportDate(report.period_end)}`,X,163,10,'#d0d9e3');text(`${report.days} days of your course`,X,186,9,'#d0d9e3');text(report.milestone==='final'?'Course complete':`Day ${report.days} of ${report.course_days}`,X+CW/2,186,9,'#d0d9e3',CW/2,'right');
 text('THE WORK YOU PUT IN',X,238,8,C.gold);text('Your activity',X,255,23,C.ink,CW,'left',true);text('Recorded activity alongside your goals for this period.',X,286,10,C.muted);
 report.activities.slice(0,6).forEach((row,index)=>{const y=318+index*69;const goal=activityGoal(row);text(row.label,X,y,12,C.ink,330,'left',true);text(goal.status,X,y+19,8,C.muted,330);text(row.actual===null?'Not available':count(row.actual),X+350,y-4,24,C.ink,CW-350,'right',true);doc.roundedRect(X,y+37,CW,6,1).fill('#e5dfd1');if(goal.fill>0)doc.roundedRect(X,y+37,CW*goal.fill,6,1).fill(goal.fill>=1?C.success:C.navy);if(goal.marker!==null)doc.moveTo(X+CW*goal.marker,y+33).lineTo(X+CW*goal.marker,y+47).strokeColor(C.ink).lineWidth(1.2).stroke();text(goal.single?`Goal ${count(row.minimum)}`:`Minimum ${count(row.minimum)}`,X,y+49,8,C.muted);if(!goal.single)text(`Optimum ${count(row.optimum)}`,X+CW/2,y+49,8,C.muted,CW/2,'right');});
 text(`Goals reflect weekly targets across ${report.days} days, rounded up to whole activities.`,X,751,8,C.muted);
 doc.addPage();paper();doc.rect(0,0,W,112).fill(C.navy);text('R O C K E T F U E L',X,29,17,C.paper,CW,'left',true);text(`${reportTitle(report.milestone)}  /  ${report.member_name}`,X,66,14,C.paper);
 doc.rect(0,112,W,281).fill(C.cream);text('RELATIONSHIPS & RESULTS',X,139,8,C.gold);text('Your business',X,157,25,C.ink,CW,'left',true);
 const business=[['15/30 pipeline','Working range: 15-30 contacts',count(report.business.pipeline_count)],['Estimated pipeline value','Potential business in your pipeline',money(report.business.pipeline_value)],['Reported gross revenue','Logged during this report period',money(report.business.gross_revenue)]];
 business.forEach(([label,subtitle,value],i)=>{const y=205+i*51;text(label,X,y,11,C.ink,300,'left',true);text(subtitle,X,y+17,8,C.muted,300);text(value,X+305,y,20,C.ink,CW-305,'right');});
 text(report.business.pipeline_status==='recorded'&&report.business.pipeline_as_of?`Pipeline captured ${reportTimestamp(report.business.pipeline_as_of,report.reporting_timezone)}. Pipeline estimates and reported revenue are separate figures.`:'A historical pipeline snapshot is not available for this report.',X,365,8,C.muted);
 if(report.achievements.length){
  text('EARNED ALONG THE WAY',X,425,8,C.gold);text('Moments worth keeping',X,445,25,C.ink,CW,'left',true);
  let y=480;
  for(const [i,medal] of report.achievements.slice(0,3).entries()){
   const tx=X+108,tw=CW-108;
   const titleFont=/[\u0100-\uFFFF]/.test(medal.title)?'ReportUnicode':'Helvetica-Bold';
   const description=medal.description?.trim() || 'No description was saved with this achievement.';
   const titleHeight=doc.font(titleFont).fontSize(12).heightOfString(medal.title,{width:tw,lineGap:2});
   const descriptionHeight=doc.font('ReportUnicode').fontSize(10).heightOfString(description,{width:tw,lineGap:2});
   const rowHeight=Math.max(88,titleHeight+descriptionHeight+28);
   if(y+rowHeight>H-63){doc.addPage();paper();text('ROCKETFUEL · ACHIEVEMENTS',X,35,12,C.ink,CW,'left',true);y=75;}
   SVGtoPDF(doc,reportMedalSvg(medal,88,i),X,y,{width:88,height:88,assumePt:true});
   doc.font(titleFont).fontSize(12).fillColor(C.ink).text(medal.title,tx,y,{width:tw,lineGap:2});
   doc.font('Helvetica').fontSize(9).fillColor(C.muted).text(medal.tier.charAt(0).toUpperCase()+medal.tier.slice(1),tx,y+titleHeight+4,{width:tw});
   doc.font('ReportUnicode').fontSize(10).fillColor(C.muted).text(description,tx,y+titleHeight+19,{width:tw,lineGap:2});
   y+=rowHeight+6;
  }
 }
 else{text('YOUR COURSE, RECORDED',X,430,8,C.gold);text('A record of your progress.',X,451,25,C.ink,CW,'left',true);text('Your activity and business figures are saved here for you to revisit.',X,491,12,C.muted);}
 const pages=doc.bufferedPageRange();for(let i=0;i<pages.count;i++){doc.switchToPage(i);footer(i+1,pages.count);}doc.end();return complete;
}
