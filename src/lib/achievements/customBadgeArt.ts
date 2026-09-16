/** Original Rocketfuel emblems in the medal's 200×200 coordinate system.
 * Stored artwork IDs remain compatible with released apps and the SQL registry.
 * Older apps render the corresponding Phosphor fallback; new apps use these
 * original drawings. This file is shared verbatim with the website renderer.
 */
export type EmblemPaint = 'metal' | 'light' | 'ink' | 'none';
export type EmblemPath = {
  d: string;
  fill: EmblemPaint;
  stroke?: EmblemPaint;
  strokeWidth?: number;
  opacity?: number;
};
export type CustomBadgeArt = {
  label: string;
  category: string;
  keywords: string;
  paths: EmblemPath[];
};

export const CUSTOM_BADGE_ART: Record<string, CustomBadgeArt> = {
  'phosphor:shield-check': {
    label: 'Built to last', category: 'Consistency', keywords: 'fortress shield lasting strength ten weeks',
    paths: [
      // Three towers, a cut-stone base and a bright central keystone.
      { d: 'M65 77 V59 H75 V68 H83 V59 H93 V104 H65 Z M107 104 V59 H117 V68 H125 V59 H135 V77 V104 Z', fill: 'metal' },
      { d: 'M82 111 V74 L100 58 L118 74 V111 Z', fill: 'light', stroke: 'metal', strokeWidth: 2 },
      { d: 'M65 96 H82 V107 H118 V96 H135 V119 L100 129 L65 119 Z', fill: 'metal' },
      { d: 'M72 114 L100 121 L128 114 M72 83 H79 M121 83 H128', fill: 'none', stroke: 'ink', strokeWidth: 3 },
      { d: 'M89 88 L98 97 L113 79', fill: 'none', stroke: 'ink', strokeWidth: 5 },
      { d: 'M89 68 L100 58 L111 68', fill: 'none', stroke: 'light', strokeWidth: 2 },
    ],
  },
  'phosphor:chats-circle': {
    label: 'The conversation', category: 'Relationships', keywords: 'follow ups conversation keeping touch asks chat',
    paths: [
      // Two interlocking speech balloons; their tails point toward each other.
      { d: 'M86 62 H122 Q137 62 137 77 V88 Q137 100 125 103 V117 L108 103 H92 Q79 103 79 90 V76 Q79 62 86 62 Z', fill: 'metal' },
      { d: 'M75 78 H108 Q122 78 122 92 V101 Q122 115 108 115 H91 L73 128 V113 Q61 109 61 98 V92 Q61 78 75 78 Z', fill: 'light', stroke: 'ink', strokeWidth: 3 },
      { d: 'M88 70 H120 Q129 70 129 78', fill: 'none', stroke: 'light', strokeWidth: 2 },
      { d: 'M74 94 H107 M74 103 H96', fill: 'none', stroke: 'ink', strokeWidth: 4 },
      { d: 'M65 67 l3 -7 M72 70 l6 -5 M57 75 l-7 -1', fill: 'none', stroke: 'metal', strokeWidth: 2.5 },
    ],
  },
  'phosphor:door-open': {
    label: 'The open door', category: 'Milestones', keywords: 'open houses doors home opportunity property',
    paths: [
      // A lit doorway with a deep, faceted door opening toward the viewer.
      { d: 'M71 124 V59 H122 V124 Z', fill: 'metal' },
      { d: 'M78 118 V66 H116 V118 Z', fill: 'ink' },
      { d: 'M85 68 L116 60 V117 L85 129 Z', fill: 'light', stroke: 'metal', strokeWidth: 2 },
      { d: 'M91 74 L110 69 V94 L91 100 Z', fill: 'metal' },
      { d: 'M94 77 L107 74 V90 L94 94 Z', fill: 'light', opacity: 0.5 },
      { d: 'M92 108 L95 107 V113 L92 114 Z', fill: 'ink' },
      { d: 'M66 126 H82 M120 126 H135 M128 79 L139 75 M130 91 H141 M128 103 L139 108', fill: 'none', stroke: 'metal', strokeWidth: 3 },
      { d: 'M76 62 H117', fill: 'none', stroke: 'light', strokeWidth: 1.5 },
    ],
  },
  'phosphor:envelope-simple': {
    label: 'The personal touch', category: 'Relationships', keywords: 'handwritten cards letter envelope personal thank you',
    paths: [
      // A handwritten card tucked into a folded envelope, with a wax-like seal.
      { d: 'M61 87 L100 61 L139 87 V121 H61 Z', fill: 'metal' },
      { d: 'M74 58 H121 L128 66 V104 H74 Z', fill: 'light', stroke: 'ink', strokeWidth: 2.5 },
      { d: 'M120 58 V67 H128', fill: 'none', stroke: 'metal', strokeWidth: 2 },
      { d: 'M82 75 Q88 69 93 75 T105 75 M83 84 H116 M83 91 H106', fill: 'none', stroke: 'ink', strokeWidth: 2.7 },
      { d: 'M61 87 L100 109 L139 87 V121 H61 Z', fill: 'metal', stroke: 'ink', strokeWidth: 2 },
      { d: 'M64 117 L87 101 M136 117 L113 101', fill: 'none', stroke: 'light', strokeWidth: 2 },
      { d: 'M100 100 A8 8 0 1 1 100 116 A8 8 0 1 1 100 100 Z', fill: 'light' },
      { d: 'M97 106 L100 110 L104 104', fill: 'none', stroke: 'ink', strokeWidth: 2 },
    ],
  },
  'phosphor:handshake': {
    label: 'The commitment', category: 'Relationships', keywords: 'action promises say do agreement handshake commitment',
    paths: [
      // Clasped hands: broad cuffs and clear interlocking fingers, not an outline icon.
      { d: 'M61 76 L73 68 L86 82 L72 108 L59 100 Z', fill: 'metal' },
      { d: 'M139 76 L127 68 L115 81 L129 108 L141 100 Z', fill: 'light', stroke: 'metal', strokeWidth: 2 },
      { d: 'M79 82 L92 72 L105 75 L117 84 L127 102 L106 120 Q102 124 98 119 L76 101 Z', fill: 'light', stroke: 'ink', strokeWidth: 2.5 },
      { d: 'M87 79 L98 72 Q102 70 109 74 L120 81 L125 94 L111 101 L100 87 L94 93 Q90 97 86 93 Q82 90 87 84 Z', fill: 'metal', stroke: 'ink', strokeWidth: 2.5 },
      { d: 'M84 105 L96 116 M91 100 L105 113 M101 99 L112 109', fill: 'none', stroke: 'ink', strokeWidth: 2.5 },
      { d: 'M63 94 L68 97 M131 95 L136 92', fill: 'none', stroke: 'ink', strokeWidth: 2.5 },
      { d: 'M100 53 l2 6 6 2 -6 2 -2 6 -2 -6 -6 -2 6 -2 Z', fill: 'light' },
    ],
  },
  'phosphor:barbell': {
    label: 'Built in motion', category: 'Consistency', keywords: 'exercise physical fitness barbell strength movement',
    paths: [
      // Diagonal barbell with solid end plates and bright machined edges.
      { d: 'M73 108 L117 64 L125 72 L81 116 Z', fill: 'light', stroke: 'metal', strokeWidth: 2 },
      { d: 'M61 94 L71 84 L96 109 L86 119 Z M104 70 L114 60 L139 85 L129 95 Z', fill: 'metal', stroke: 'ink', strokeWidth: 2 },
      { d: 'M59 108 L67 100 L81 114 L73 122 Z M119 58 L127 50 L141 64 L133 72 Z', fill: 'light', stroke: 'ink', strokeWidth: 2 },
      { d: 'M65 91 L90 116 M110 67 L135 92', fill: 'none', stroke: 'light', strokeWidth: 3 },
      { d: 'M54 119 L60 113 M140 60 L146 54', fill: 'none', stroke: 'metal', strokeWidth: 5 },
      { d: 'M73 65 L80 58 M61 72 H51 M130 118 L138 126 M140 104 H149', fill: 'none', stroke: 'metal', strokeWidth: 2.5 },
    ],
  },
  'phosphor:arrows-clockwise': {
    label: 'Closing the loop', category: 'Consistency', keywords: 'follow through promises follow ups circle complete loop',
    paths: [
      // Two substantial circular arrows surround a completed promise.
      { d: 'M68 87 Q68 56 97 54 Q118 53 130 72 L140 64 L140 92 L113 85 L122 78 Q114 64 98 65 Q80 66 80 86 Z', fill: 'light', stroke: 'metal', strokeWidth: 1.5 },
      { d: 'M132 96 Q132 126 103 129 Q83 130 70 111 L60 119 V92 L87 98 L79 104 Q87 119 103 117 Q120 115 120 96 Z', fill: 'metal' },
      { d: 'M84 89 L96 101 L115 78', fill: 'none', stroke: 'light', strokeWidth: 7 },
      { d: 'M75 79 Q82 58 100 59 M126 105 Q119 124 101 124', fill: 'none', stroke: 'light', strokeWidth: 1.5, opacity: 0.6 },
    ],
  },
  'phosphor:pen-nib': {
    label: 'Ink and inbox', category: 'Relationships', keywords: 'ink inbox handwritten pen follow ups cards envelope',
    paths: [
      // Fountain pen nib crossing a letter; the slit and vent stay visible at 140px.
      { d: 'M60 78 H119 V118 H60 Z', fill: 'metal', stroke: 'ink', strokeWidth: 2 },
      { d: 'M61 79 L89 99 L117 79 M62 116 L80 99 M117 116 L101 99', fill: 'none', stroke: 'light', strokeWidth: 2.5 },
      { d: 'M130 54 L145 69 L125 90 L100 108 L108 82 Z', fill: 'light', stroke: 'ink', strokeWidth: 3 },
      { d: 'M130 54 L145 69 L136 78 L121 63 Z', fill: 'metal' },
      { d: 'M102 106 L123 84', fill: 'none', stroke: 'ink', strokeWidth: 3 },
      { d: 'M124 77 A4 4 0 1 1 124 85 A4 4 0 1 1 124 77 Z', fill: 'ink' },
      { d: 'M76 126 Q92 119 108 125 Q119 130 131 121', fill: 'none', stroke: 'metal', strokeWidth: 2.5 },
    ],
  },
  'phosphor:person-simple-run': {
    label: 'On the move', category: 'Consistency', keywords: 'physical exercise open houses shoe movement running',
    paths: [
      // Winged trainer, a nod to both getting outside and physical exercise.
      { d: 'M78 91 L63 74 L77 76 L68 60 L84 69 L82 53 L108 86 Z', fill: 'metal' },
      { d: 'M81 87 L71 72 M87 80 L82 66', fill: 'none', stroke: 'light', strokeWidth: 2 },
      { d: 'M62 92 L79 87 Q89 96 99 88 L110 107 Q119 110 135 110 Q142 111 142 120 H61 Z', fill: 'light', stroke: 'ink', strokeWidth: 2.5 },
      { d: 'M61 118 H143 V125 H61 Z', fill: 'metal' },
      { d: 'M63 101 L77 98 L89 108 L107 105 M100 97 L108 94 M105 103 L113 100', fill: 'none', stroke: 'ink', strokeWidth: 3 },
      { d: 'M73 120 V125 M84 120 V125 M95 120 V125 M119 120 V125 M130 120 V125', fill: 'none', stroke: 'ink', strokeWidth: 2 },
      { d: 'M113 72 L126 61 L139 72 M117 71 V86 H135 V71 M124 86 V77 H129 V86', fill: 'none', stroke: 'light', strokeWidth: 2.5 },
    ],
  },
  'phosphor:globe-hemisphere-west': {
    label: 'Out in the world', category: 'Relationships', keywords: 'world globe asks open houses outside reach explore',
    paths: [
      // Meridian globe on a short stand, with a sweeping orbit.
      { d: 'M100 53 A33 33 0 1 1 100 119 A33 33 0 1 1 100 53 Z', fill: 'light', stroke: 'metal', strokeWidth: 2 },
      { d: 'M100 54 Q76 85 100 118 Q125 86 100 54 M69 85 H132 M75 68 Q100 78 125 68 M75 104 Q100 94 125 104', fill: 'none', stroke: 'ink', strokeWidth: 2.5 },
      { d: 'M94 120 V126 M106 120 V126 M86 129 H114', fill: 'none', stroke: 'metal', strokeWidth: 4 },
      { d: 'M70 111 Q42 111 68 84 M130 61 Q157 61 135 89 Q112 113 70 111', fill: 'none', stroke: 'ink', strokeWidth: 6 },
      { d: 'M70 111 Q42 111 68 84 M130 61 Q157 61 135 89 Q112 113 70 111', fill: 'none', stroke: 'metal', strokeWidth: 3 },
      { d: 'M132 52 l2 6 6 2 -6 2 -2 6 -2 -6 -6 -2 6 -2 Z', fill: 'light' },
    ],
  },
  'phosphor:toolbox': {
    label: 'The complete toolkit', category: 'Milestones', keywords: 'toolbox toolkit all activities six tools complete',
    paths: [
      // A six-rivet tool case with a raised handle, clasp and a small wrench.
      { d: 'M84 74 V60 Q84 55 89 55 H112 Q117 55 117 60 V74 H110 V63 H91 V74 Z', fill: 'light' },
      { d: 'M62 78 Q62 72 68 72 H132 Q138 72 138 78 V119 Q138 124 132 124 H68 Q62 124 62 119 Z', fill: 'metal', stroke: 'ink', strokeWidth: 2.5 },
      { d: 'M64 88 Q100 99 136 88 V78 Q136 74 130 74 H70 Q64 74 64 78 Z', fill: 'light' },
      { d: 'M95 87 H105 V103 H95 Z', fill: 'ink' },
      { d: 'M98 89 H102 V98 H98 Z', fill: 'metal' },
      { d: 'M69 104 H73 M69 111 H73 M69 118 H73 M127 104 H131 M127 111 H131 M127 118 H131', fill: 'none', stroke: 'ink', strokeWidth: 2.5 },
      { d: 'M83 114 L103 104 Q100 99 104 96 L110 101 L113 99 L109 93 Q117 92 118 98 Q120 105 113 108 L87 120 Z', fill: 'light', stroke: 'ink', strokeWidth: 1.7 },
    ],
  },
  'phosphor:shooting-star': {
    label: 'The full constellation', category: 'Milestones', keywords: 'diamond constellation six stars collection complete',
    paths: [
      // Six connected stars form an ascending constellation around its bright centre.
      { d: 'M68 102 L78 68 L104 87 L126 61 L135 109 L99 121 L68 102 M78 68 L126 61 M104 87 L99 121', fill: 'none', stroke: 'metal', strokeWidth: 2 },
      { d: 'M104 72 L108 83 L120 87 L108 91 L104 104 L100 91 L87 87 L100 83 Z', fill: 'light', stroke: 'ink', strokeWidth: 2 },
      { d: 'M78 61 l2 5 6 2 -6 2 -2 6 -2 -6 -6 -2 6 -2 Z M126 54 l2 5 6 2 -6 2 -2 6 -2 -6 -6 -2 6 -2 Z', fill: 'light' },
      { d: 'M68 96 l2 4 4 2 -4 2 -2 5 -2 -5 -4 -2 4 -2 Z M135 103 l2 4 4 2 -4 2 -2 5 -2 -5 -4 -2 4 -2 Z M99 115 l2 4 4 2 -4 2 -2 5 -2 -5 -4 -2 4 -2 Z', fill: 'light' },
      { d: 'M58 119 Q47 106 58 85 M143 77 Q153 92 145 114', fill: 'none', stroke: 'metal', strokeWidth: 2, opacity: 0.6 },
    ],
  },
  'phosphor:compass': {
    label: 'Strength in every direction', category: 'Milestones', keywords: 'compass direction balanced collection silver all six',
    paths: [
      // An eight-point compass rose with opposing metal and enamel facets.
      { d: 'M100 57 A34 34 0 1 1 100 125 A34 34 0 1 1 100 57 Z', fill: 'none', stroke: 'metal', strokeWidth: 2.5 },
      { d: 'M100 51 L109 80 L140 91 L109 101 L100 132 L91 101 L60 91 L91 81 Z', fill: 'light', stroke: 'ink', strokeWidth: 2 },
      { d: 'M100 51 V91 L109 80 Z M140 91 H100 L109 101 Z M100 132 V91 L91 101 Z M60 91 H100 L91 81 Z', fill: 'metal' },
      { d: 'M75 66 L91 81 L84 84 Z M125 66 L116 84 L109 81 Z M125 116 L109 101 L116 98 Z M75 116 L84 98 L91 101 Z', fill: 'metal' },
      { d: 'M100 85 A6 6 0 1 1 100 97 A6 6 0 1 1 100 85 Z', fill: 'ink', stroke: 'light', strokeWidth: 2 },
    ],
  },
};
