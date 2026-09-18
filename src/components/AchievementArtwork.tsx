import React, { useId } from 'react';
import { MEDAL_MATERIALS, tierNumber, defaultMedalShape, type MedalShape, type AchievementTier, type BadgeArtwork } from '../lib/achievements/badgeDesign';
import { CUSTOM_BADGE_ART } from '../lib/achievements/customBadgeArt';
import phosphor from '../lib/achievements/phosphor-duotone.json';
const phosphorSymbol = (artwork: string): string | undefined => (phosphor as Record<string, string>)[artwork];

// Original vector flight patches: crisp at collection, detail and celebration sizes.
export type AchievementArtworkProps = { artwork: BadgeArtwork; shape?: MedalShape; tier?: AchievementTier; size?: number; earned?: boolean };
// Pure SVG tree shared by the interactive UI and the private PDF renderer.
export const createAchievementArtwork = ({ artwork, shape: medalShape, tier = 'gold', size = 140, earned = true, id }: AchievementArtworkProps & { id: string }) => {
  const material = MEDAL_MATERIALS[tier] ?? MEDAL_MATERIALS.gold;
  const gold = earned ? material.main : '#BEB9AB';
  const diamond = tier === 'diamond' && earned;
  const metal = earned && tier !== 'diamond';
  const ink = earned ? diamond ? '#09172F' : '#17385B' : '#677480';
  const light = earned ? material.light : '#F5F2EA';
  const customArt = CUSTOM_BADGE_ART[artwork];
  const emblemColors = { metal: gold, light, ink, none: 'none' };
  const originalSymbol = customArt ? undefined : phosphorSymbol(artwork);
  // Diamond's filled areas stay bright; the library's 20% tint is too faint here.
  const symbol = diamond ? originalSymbol?.replace(/opacity="0\.2"/g, 'opacity="0.9"') : originalSymbol;
  const symbolColor = earned ? light : '#98988F';
  // Keep library paths in the medal's native SVG coordinate system. Nested
  // SvgXml roots lose their x/y placement and currentColor on native platforms.
  const symbolMarkup = symbol
    ? symbol.replace(/currentColor/g, symbolColor).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '')
    : null;
  const frame = medalShape ?? defaultMedalShape(artwork);
  const shape = frame === 'circle'
    ? 'M100 17 A78 78 0 1 1 100 173 A78 78 0 1 1 100 17 Z'
    : frame === 'armor'
      ? tier === 'diamond' ? 'M100 12 L172 38 V102 L153 141 L100 181 L47 141 L28 102 V38 Z' : 'M100 18 L164 42 V105 L148 139 L100 177 L52 139 L36 105 V42 Z'
      : tier === 'diamond' ? 'M100 12 L174 52 V128 L100 178 L26 128 V52 Z' : 'M100 15 L166 53 V129 L100 170 L34 129 V53 Z';
  // Clip radial facets to the chosen silhouette; the enamel face covers their centre.
  const facetColors = ['#414776','#7762B8','#4E8DBC','#9CDDF2','#414776','#7762B8','#4E8DBC','#9CDDF2'];
  const facetPoint = (index: number) => {
    const angle = -Math.PI / 2 + index * Math.PI / 4;
    return `${100 + Math.cos(angle) * 180} ${95 + Math.sin(angle) * 180}`;
  };
  return <svg width={size} height={size} viewBox="0 0 200 200" aria-hidden="true">
    <defs>
      <clipPath id={`${id}frameClip`}><path d={shape}/></clipPath>
      <linearGradient id={`${id}rim`} x1="0" y1="0" x2="1" y2="1">{(diamond ? [['0','#BAEFFF'],['0.28','#4086B8'],['0.53','#303C6A'],['0.76','#7253B8'],['1','#B5ECFF']] : earned ? [['0',material.shadow],['0.18',gold],['0.3',light],['0.43',gold],['0.68',material.shadow],['0.85',gold],['1',light]] : [['0',light],['0.35',gold],['0.7','#ACA798'],['1',light]]).map(([offset,color])=><stop key={offset} offset={offset} stopColor={color}/>)}</linearGradient>
      <linearGradient id={`${id}face`} x1="0" y1="0" x2="0.8" y2="1"><stop offset="0" stopColor={earned ? diamond ? '#132C49' : '#284C70' : '#EBE7DD'} /><stop offset="1" stopColor={earned ? diamond ? '#050E21' : '#0D2742' : '#D9D9D1'} /></linearGradient>
      <linearGradient id={`${id}ribbon`} x1="0" y1="0" x2="0.7" y2="1"><stop offset="0" stopColor="#091B30"/><stop offset="0.55" stopColor="#244767"/><stop offset="1" stopColor="#102A43"/></linearGradient>
      <linearGradient id={`${id}bevel`} x1="0" y1="0" x2="0.5" y2="1"><stop offset="0" stopColor={material.shadow}/><stop offset="0.55" stopColor="#142B43"/><stop offset="1" stopColor={light}/></linearGradient>
    </defs>
    <ellipse cx="100" cy="181" rx="53" ry="7" fill="#071C32" opacity={earned ? 0.17 : 0.06} />
    {tier === 'diamond' && <g stroke={gold} strokeWidth="1.5"><path d="M40 118 L13 161 L39 158 L42 186 L81 147 M160 118 L187 161 L161 158 L158 186 L119 147" fill={earned ? '#463771' : '#A9AAA7'}/><path d="M100 147 L87 194 L100 184 L113 194 Z" fill={ink}/><path d="M28 158 L56 134 M172 158 L144 134" fill="none" stroke={light}/></g>}
    <path d="M45 134 L32 183 L64 174 L79 192 L93 146 M107 146 L121 192 L137 174 L168 183 L155 134" fill={metal ? `url(#${id}ribbon)` : ink} stroke={gold} strokeWidth="2" />
    {metal && <g>
      <path d="M44 151 L34 179 L62 172 Z M156 151 L166 179 L138 172 Z" fill="#42617E" opacity="0.55"/>
      <path d="M64 174 L79 192 L76 164 Z M136 174 L121 192 L124 164 Z" fill="#091B30"/>
      <path d="M48 145 L40 174 M152 145 L160 174" fill="none" stroke={light} strokeWidth="1" opacity="0.45"/>
      <g transform="translate(0 2)"><path d={shape} fill={material.shadow} stroke={material.shadow} strokeWidth="2"/></g>
    </g>}
    <path d={shape} fill={`url(#${id}rim)`} stroke={metal ? material.shadow : gold} strokeWidth={metal ? 1.5 : 2} />
    {metal && <g transform="translate(100 95) scale(.975) translate(-100 -95)"><path d={shape} fill="none" stroke={light} strokeWidth="0.8" opacity="0.5"/></g>}
    {tier === 'diamond' && frame === 'hexagon' && <g opacity={earned ? 1 : 0.2}>
      <path d="M100 12 L100 22 L35 57 L26 52 Z M26 52 L35 57 V124 L26 128 Z" fill={earned ? '#9CDDF2' : light}/>
      <path d="M174 52 L165 57 V124 L174 128 Z M174 128 L165 124 L100 168 L100 178 Z" fill={earned ? '#7762B8' : light}/>
      <path d="M26 128 L35 124 L100 168 V178 Z" fill={earned ? '#4E8DBC' : light}/>
      <path d="M100 12 L174 52 L165 57 L100 22 Z" fill={earned ? '#414776' : light}/>
    </g>}
    {tier === 'diamond' && frame !== 'hexagon' && <g clipPath={`url(#${id}frameClip)`} opacity={earned ? 0.85 : 0.2}>
      {facetColors.map((color,index)=><path key={index} d={`M100 95 L${facetPoint(index)} L${facetPoint(index+1)} Z`} fill={earned ? color : light}/>)}
    </g>}
    {diamond && <path d={shape} fill="none" stroke="#26365B" strokeWidth="3" strokeLinejoin="round"/>}
    {metal && <g transform="translate(100 95) scale(.915) translate(-100 -95)"><path d={shape} fill={`url(#${id}bevel)`}/></g>}
    <g transform="translate(100 95) scale(.88) translate(-100 -95)"><path d={shape} fill={`url(#${id}face)`} stroke={light} strokeWidth="1" /></g>
    {tier !== 'bronze' && <g transform="translate(100 95) scale(.82) translate(-100 -95)"><path d={shape} fill="none" stroke={metal ? `url(#${id}rim)` : gold} strokeWidth="1.2" opacity={earned ? 0.9 : 0.25} /></g>}
    {earned && tier === 'gold' && <g transform="translate(0 1.5)" stroke="#071B2E" strokeWidth="3.5" fill="none">
      <path d="M54 116 Q45 98 51 77 M146 116 Q155 98 149 77 M54 119 Q45 112 44 102 M146 119 Q155 112 156 102 M49 99 Q42 91 44 81 M151 99 Q158 91 156 81"/>
    </g>}
    {(tier === 'gold' || tier === 'diamond') && <g stroke={metal ? `url(#${id}rim)` : gold} strokeWidth="1.8" fill="none" opacity={earned ? 0.85 : 0.3}>
      <path d="M54 116 Q45 98 51 77 M146 116 Q155 98 149 77" />
      <path d="M53 111 l-9 -5 M50 101 l-9 -7 M50 90 l-7 -9 M147 111 l9 -5 M150 101 l9 -7 M150 90 l7 -9" />
      <path d="M54 119 Q45 112 44 102 M146 119 Q155 112 156 102 M49 99 Q42 91 44 81 M151 99 Q158 91 156 81" strokeWidth="3" />
    </g>}
    <g fill={gold} stroke={gold} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      {artwork === 'flag' && <><path d="M78 115 V63" fill="none" strokeWidth="5" /><path d="M81 64 Q98 52 111 65 Q122 73 134 60 L130 91 Q116 103 102 91 Q91 84 81 91 Z" fill={light} stroke="none" /><path d="M107 65 l-3 24 M83 77 Q102 68 115 80 Q123 86 132 77" fill="none" stroke={ink} strokeWidth="7" /><path d="M68 122 H108" fill="none" /></>}
      {artwork === 'foundation' && <><path d="M67 106 L100 87 L133 106 L100 125 Z" opacity="0.55" /><path d="M67 86 L100 67 L133 86 L100 105 Z" fill={light} /><path d="M88 85 l9 9 18 -20" fill="none" stroke={ink} strokeWidth="5" /></>}
      {artwork === 'star' && <path d="M100 53 L112 78 L140 82 L119 102 L124 130 L100 116 L76 130 L81 102 L60 82 L88 78 Z" fill={light} strokeWidth="4" />}
      {artwork === 'layers' && <><path d="M66 108 L100 126 L134 108 M66 94 L100 112 L134 94" fill="none" strokeWidth="7" /><path d="M65 76 L100 57 L135 76 L100 95 Z" fill={light} /><path d="M91 76 L100 71 L109 76 L100 81 Z" fill={ink} stroke="none" /></>}
      {artwork === 'rocket' && <><path d="M89 105 Q78 116 81 132 Q96 125 102 113" fill={gold} /><path d="M89 87 L69 93 L69 117 L91 103 M112 103 L107 125 L131 125 L137 106" fill={gold} /><path d="M88 94 Q101 57 140 54 Q143 90 108 111 Z" fill={light} /><circle cx="121" cy="76" r="8" fill={ink} stroke="none" /><path d="M70 136 L58 148 M67 122 L53 136" fill="none" /></>}
      {(artwork === 'conversation' || (artwork.startsWith('phosphor:') && !customArt && !symbol)) && <><path d="M66 67 H135 V107 H101 L81 123 V107 H66 Z" fill={light} /><circle cx="85" cy="87" r="3" fill={ink} stroke="none" /><circle cx="101" cy="87" r="3" fill={ink} stroke="none" /><circle cx="117" cy="87" r="3" fill={ink} stroke="none" /></>}
    </g>
    {customArt && <g strokeLinecap="round" strokeLinejoin="round">
      {customArt.paths.map((path, index) => <path key={index} d={path.d} fill={emblemColors[path.fill]}
        stroke={emblemColors[path.stroke ?? 'none']} strokeWidth={path.strokeWidth} opacity={path.opacity} />)}
    </g>}
    {symbolMarkup && <g transform="translate(58 48) scale(0.328125)" fill={symbolColor} stroke="none" dangerouslySetInnerHTML={{__html:symbolMarkup}}/>}
    {Array.from({length:tierNumber(tier)},(_,index) => <path key={index} d={`M${100 + (index-(tierNumber(tier)-1)/2)*12} 135 l3 4 -3 4 -3 -4 Z`} fill={gold} opacity={earned ? 1 : 0.35} />)}
    {earned && tier !== 'bronze'  && <g fill={light}><path d="M157 26 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3 Z" />{(tier === 'gold' || tier === 'diamond') && <circle cx="33" cy="53" r="2.5" />}</g>}
  </svg>;
};

const AchievementArtwork = (props: AchievementArtworkProps) => createAchievementArtwork({...props, id: useId().replace(/[^a-zA-Z0-9_-]/g, '')});
export default React.memo(AchievementArtwork);
