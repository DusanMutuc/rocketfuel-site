import { CUSTOM_BADGE_ART } from './customBadgeArt';

// Shared medal materials. The web renderer receives the same file at release.
export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'diamond';
export type MedalShape = 'armor' | 'hexagon' | 'circle';
export const MEDAL_SHAPES: {key:MedalShape;label:string}[] = [{key:'armor',label:'Armor'},{key:'hexagon',label:'Hexagon'},{key:'circle',label:'Circle'}];
export const defaultMedalShape = (artwork: string): MedalShape => artwork === 'foundation' ? 'armor' : 'hexagon';
export type BadgeArtwork = 'flag' | 'foundation' | 'star' | 'layers' | 'rocket' | 'conversation' | `phosphor:${string}`;
export const TIERS: AchievementTier[] = ['bronze', 'silver', 'gold', 'diamond'];
export const tierNumber = (tier: AchievementTier = 'gold') => TIERS.indexOf(tier) + 1;
export const tierLabel = (tier: AchievementTier = 'gold') => tier.charAt(0).toUpperCase() + tier.slice(1);
export const MEDAL_MATERIALS = {
  diamond: { main: '#70CFF3', light: '#FCFEFF', shadow: '#354477', label: '#354C87' },
  bronze: { main: '#D89A66', light: '#FFE0BD', shadow: '#83492B', label: '#91502E' },
  silver: { main: '#C8D6E6', light: '#F5FBFF', shadow: '#607994', label: '#4D6682' },
  gold: { main: '#E8BB61', light: '#FFF4D5', shadow: '#966223', label: '#896029' },
};
export const CUSTOM_ARTWORK: {key: BadgeArtwork; label: string; category: string; keywords: string}[] = [
  {key:'flag',label:'First steps',category:'Milestones',keywords:'start goal flag'},
  {key:'foundation',label:'Foundations',category:'Consistency',keywords:'foundation check complete'},
  {key:'star',label:'Above and beyond',category:'Milestones',keywords:'star excellence'},
  {key:'layers',label:'Consistency',category:'Consistency',keywords:'layers repeat habits'},
  {key:'rocket',label:'Rocketfuel',category:'Milestones',keywords:'rocket launch momentum'},
  {key:'conversation',label:'Conversation',category:'Relationships',keywords:'asks chat connections'},
  // Retain the registered artwork IDs so existing courses and older app builds
  // remain compatible while current builds use the original Rocketfuel art.
  ...Object.entries(CUSTOM_BADGE_ART).map(([key, { label, category, keywords }]) => ({ key: key as BadgeArtwork, label, category, keywords })),
];
const customArtworkKeys = new Set(CUSTOM_ARTWORK.map(item => item.key));
export const isCustomBadgeArtwork = (artwork: string): boolean => customArtworkKeys.has(artwork as BadgeArtwork);
