import {createAchievementArtwork} from '@/components/AchievementArtwork';
import type {ReportAchievement} from './reportTypes';
import type {BadgeArtwork} from '@/lib/achievements/badgeDesign';
const escapeAttribute=(value:unknown)=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const attributes:Record<string,string>={strokeWidth:'stroke-width',strokeLinecap:'stroke-linecap',strokeLinejoin:'stroke-linejoin',stopColor:'stop-color',stopOpacity:'stop-opacity',fillOpacity:'fill-opacity',strokeOpacity:'stroke-opacity',fillRule:'fill-rule',clipRule:'clip-rule',clipPath:'clip-path',className:'class'};
function serialize(node:unknown):string{
 if(node===null||node===undefined||typeof node==='boolean')return '';
 if(Array.isArray(node))return node.map(serialize).join('');
 if(typeof node==='string'||typeof node==='number')return escapeAttribute(node);
 const element=node as {type:unknown;props:Record<string,unknown>};if(typeof element.type==='symbol')return serialize(element.props.children);
 if(typeof element.type!=='string')throw new Error('Medal SVG must contain SVG primitives only.');
 const props=element.props;const attrs=Object.entries(props).filter(([key,value])=>key!=='children'&&key!=='dangerouslySetInnerHTML'&&key!=='key'&&value!==undefined&&value!==null).map(([key,value])=>` ${attributes[key]||key}="${escapeAttribute(value)}"`).join('');
 // Raw markup is only the bundled, reviewed icon library already used by the app.
 const bundled=props.dangerouslySetInnerHTML as {__html:string}|undefined;
 return `<${element.type}${attrs}>${bundled?.__html??serialize(props.children)}</${element.type}>`;
}
export function reportMedalSvg(medal:ReportAchievement,size:number,index:number){return serialize(createAchievementArtwork({artwork:medal.artwork as BadgeArtwork,shape:medal.shape,tier:medal.tier,size,id:`report-medal-${index}`}));}
