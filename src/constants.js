export const C = {
  bg: '#1e1f22',
  surface: '#2b2d31',
  surface2: '#313338',
  surface3: '#383a40',
  blurple: '#5865F2',
  blurpleHov: '#4752C4',
  blurpleDim: 'rgba(88,101,242,0.15)',
  green: '#57F287',
  greenDim: 'rgba(87,242,135,0.12)',
  red: '#ED4245',
  yellow: '#FEE75C',
  text: '#DBDEE1',
  muted: '#949BA4',
  faint: '#5C5F66',
  border: 'rgba(255,255,255,0.06)',
  white: '#ffffff',
};

export const ALL_TAGS = [
  'moderation',
  'fun',
  'utility',
  'music',
  'economy',
  'games',
  'admin',
  'info',
  'social',
  'ai',
  'logging',
  'roles',
  'tickets',
  'welcome',
  'giveaway',
];

export const FRAMEWORKS = [
  'Discord.js',
  'Discord.py',
  'Discordeno',
  'Discord Bot Maker',
  'Framework-agnostic JSON',
  'Custom',
];

export const CMD_TYPES = ['Slash', 'Context', 'Message'];

export const FW_COLORS = {
  'Discord.js': { bg: 'rgba(59,165,92,0.15)', color: '#3ba55c' },
  'Discord.py': { bg: 'rgba(88,101,242,0.15)', color: '#5865F2' },
  Discordeno: { bg: 'rgba(254,163,0,0.15)', color: '#fea300' },
  'Discord Bot Maker': { bg: 'rgba(237,66,69,0.15)', color: '#ED4245' },
  'Framework-agnostic JSON': { bg: 'rgba(149,55,255,0.15)', color: '#9537ff' },
  Custom: { bg: 'rgba(255,255,255,0.08)', color: '#DBDEE1' },
};

export const TYPE_COLORS = { Slash: C.blurple, Context: C.green, Message: C.yellow };

export const MOCK_USER = { id: '123456789', username: 'Kai', avatar: null };

export const fmt = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));
