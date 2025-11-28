

import { Guild, GuildEvent, Party, RoleType, UserProfile, LeaderboardEntry, BreakingArmyConfig, QueueEntry } from "../types";

export const MOCK_GUILDS: Guild[] = [
  { id: 'g1', name: 'Black Rose I' },
  { id: 'g2', name: 'Black Rose II' },
  { id: 'g3', name: 'Black Rose III' },
  { id: 'g4', name: 'Black Rose IV' },
  { id: 'g5', name: 'Black Rose V' },
];

export const MOCK_USERS: UserProfile[] = [
  {
    uid: 'u1', inGameId: '883921', displayName: 'ShadowBlade', role: RoleType.DPS, systemRole: 'Admin',
    weapons: ['Infernal Twinblades', 'Nameless Sword'], guildId: 'g1', status: 'online',
    photoURL: 'https://picsum.photos/200'
  },
  {
    uid: 'u2', inGameId: '102934', displayName: 'IronWall', role: RoleType.TANK, systemRole: 'Officer',
    weapons: ['Heavenquaker Spear', 'Stormbreaker Spear'], guildId: 'g1', status: 'in-game',
    photoURL: 'https://picsum.photos/201'
  },
  {
    uid: 'u3', inGameId: '554321', displayName: 'LifeBloom', role: RoleType.HEALER, systemRole: 'Member',
    weapons: ['Panacea Fan', 'Vernal Umbrella'], guildId: 'g2', status: 'offline',
    photoURL: 'https://picsum.photos/202'
  },
  {
    uid: 'u4', inGameId: '998877', displayName: 'MysticFlex', role: RoleType.HYBRID, systemRole: 'Member',
    weapons: ['Inkwell Fan', 'Strategic Sword'], guildId: 'g1', status: 'online',
    photoURL: 'https://picsum.photos/203'
  },
];

export const MOCK_EVENTS: GuildEvent[] = [
  { id: 'e1', guildId: 'g1', title: 'Weekly Raid Reset', date: new Date(Date.now() + 86400000).toISOString(), description: 'Clearing wings 1-4.', type: 'Raid' },
  { id: 'e2', guildId: 'g2', title: 'PvP Tournament', date: new Date(Date.now() + 172800000).toISOString(), description: 'Inter-guild skirmish.', type: 'PvP' },
  { id: 'e3', guildId: 'g3', title: 'Recruitment Drive', date: new Date(Date.now() + 259200000).toISOString(), description: 'Open world recruitment.', type: 'Social' },
  { id: 'e4', guildId: 'g1', title: 'Breaking Army (Wed)', date: new Date().toISOString(), description: 'Weekly Boss Run', type: 'Raid' },
];

export const MOCK_PARTIES: Party[] = [
  {
    id: 'p1', guildId: 'g1', name: 'Dungeon Grinders', activity: 'High Level Dungeons', leaderId: 'u1', leaderName: 'ShadowBlade', maxMembers: 5,
    currentMembers: [
      { uid: 'u1', name: 'ShadowBlade', role: RoleType.DPS, photoURL: 'https://picsum.photos/200' },
      { uid: 'u2', name: 'IronWall', role: RoleType.TANK, photoURL: 'https://picsum.photos/201' }
    ]
  },
  {
    id: 'p2', guildId: 'g1', name: 'Chill PvP', activity: 'Arena', leaderId: 'u4', leaderName: 'MysticFlex', maxMembers: 3,
    currentMembers: [
      { uid: 'u4', name: 'MysticFlex', role: RoleType.HYBRID, photoURL: 'https://picsum.photos/203' }
    ]
  }
];

export const BREAKING_ARMY_CONFIG: BreakingArmyConfig = {
  currentBoss: {
    'g1': 'Grand General of the Eternal Abyss',
    'g2': 'Grand General of the Eternal Abyss',
    'g3': 'Black God of Wealth',
  },
  schedules: {
    'g1': [{ day: 'Wednesday', time: '20:00' }, { day: 'Friday', time: '20:00' }],
    'g2': [{ day: 'Wednesday', time: '21:00' }, { day: 'Friday', time: '21:00' }]
  },
  recentWinners: [
    { uid: 'u99', branchId: 'g1', timestamp: new Date().toISOString(), prizeGiven: false },
    { uid: 'u98', branchId: 'g1', timestamp: new Date().toISOString(), prizeGiven: true }
  ],
  bossPool: [
    { name: 'Grand General of the Eternal Abyss', imageUrl: '' },
    { name: 'Black God of Wealth', imageUrl: '' },
    { name: 'Dao Lord', imageUrl: '' },
    { name: 'Heartseeker', imageUrl: '' }
  ]
};

export const MOCK_QUEUE: QueueEntry[] = [
  { uid: 'u2', name: 'IronWall', role: RoleType.TANK, joinedAt: new Date(Date.now() - 1000 * 60 * 5), guildId: 'g1' },
  { uid: 'u3', name: 'LifeBloom', role: RoleType.HEALER, joinedAt: new Date(Date.now() - 1000 * 60 * 2), guildId: 'g2' },
  ...Array.from({ length: 12 }).map((_, i) => ({
    uid: `q${i}`,
    name: `Player ${i+1}`,
    role: i % 3 === 0 ? RoleType.DPS : i % 3 === 1 ? RoleType.TANK : RoleType.HEALER,
    joinedAt: new Date(Date.now() - 1000 * 60 * (10 + i)),
    guildId: i % 2 === 0 ? 'g1' : 'g2'
  }))
];

const bosses = [
  'Black God of Wealth', 'Dao Lord', 'Heartseeker', 'Lucky Seventeen', 'Murong Yuan', 
  'Qianye', 'The Void King', 'Tian Ying', 'Ye Wanshan', 'Zheng the Frostwing'
];

const branches = ['Black Rose I', 'Black Rose II', 'Black Rose III'];
const players = [
  { name: 'ShadowBlade', uid: 'u1' },
  { name: 'LifeBloom', uid: 'u3' },
  { name: 'IronWall', uid: 'u2' },
  { name: 'MysticFlex', uid: 'u4' },
  { name: 'StormRage', uid: 'u99' },
  { name: 'ViperStrike', uid: 'u98' },
  { name: 'LunarLight', uid: 'u97' },
];

export const MOCK_LEADERBOARD: LeaderboardEntry[] = Array.from({ length: 50 }).map((_, i) => {
  const player = players[i % players.length];
  return {
    id: `l${i + 1}`,
    rank: i + 1,
    playerName: player.name,
    playerUid: player.uid,
    branch: branches[i % branches.length],
    boss: bosses[i % bosses.length],
    time: `${10 + (i % 20)}m ${10 + (i % 50)}s`,
    date: 'Oct 24',
    status: 'verified'
  };
});

export const PRESET_AVATARS = [
  "https://hvfncvygrmnxfdavwzkx.supabase.co/storage/v1/object/public/black-rose-wwm/avatars/Ninefold_Freedom.jpg",
  "https://hvfncvygrmnxfdavwzkx.supabase.co/storage/v1/object/public/black-rose-wwm/avatars/Blazing_Midnight.jpg",
  "https://hvfncvygrmnxfdavwzkx.supabase.co/storage/v1/object/public/black-rose-wwm/avatars/Heavenly_Frost.jpg",
  "https://hvfncvygrmnxfdavwzkx.supabase.co/storage/v1/object/public/black-rose-wwm/avatars/New_Wings.jpg",
  "https://hvfncvygrmnxfdavwzkx.supabase.co/storage/v1/object/public/black-rose-wwm/avatars/Change_of_Heart.jpg",
  "https://hvfncvygrmnxfdavwzkx.supabase.co/storage/v1/object/public/black-rose-wwm/avatars/Hundred_Acts.jpg",
  "https://hvfncvygrmnxfdavwzkx.supabase.co/storage/v1/object/public/black-rose-wwm/avatars/Initial_XII.jpg",
  "https://hvfncvygrmnxfdavwzkx.supabase.co/storage/v1/object/public/black-rose-wwm/avatars/Initial_X.jpg",
  "https://hvfncvygrmnxfdavwzkx.supabase.co/storage/v1/object/public/black-rose-wwm/avatars/Initial_VIII.jpg",
  "https://hvfncvygrmnxfdavwzkx.supabase.co/storage/v1/object/public/black-rose-wwm/avatars/Initial_VI.jpg",
  "https://hvfncvygrmnxfdavwzkx.supabase.co/storage/v1/object/public/black-rose-wwm/avatars/Initial_IV.jpg",
  "https://hvfncvygrmnxfdavwzkx.supabase.co/storage/v1/object/public/black-rose-wwm/avatars/Initial_II.jpg",
  "https://hvfncvygrmnxfdavwzkx.supabase.co/storage/v1/object/public/black-rose-wwm/avatars/Worldly_Bond.jpg",
  "https://hvfncvygrmnxfdavwzkx.supabase.co/storage/v1/object/public/black-rose-wwm/avatars/Silent_Current.jpg",
  "https://hvfncvygrmnxfdavwzkx.supabase.co/storage/v1/object/public/black-rose-wwm/avatars/Wild_Flame.jpg",
  "https://hvfncvygrmnxfdavwzkx.supabase.co/storage/v1/object/public/black-rose-wwm/avatars/Water_Dragon_Hymn.jpg",
  "https://hvfncvygrmnxfdavwzkx.supabase.co/storage/v1/object/public/black-rose-wwm/avatars/Veteran_Warrior.jpg",
  "https://hvfncvygrmnxfdavwzkx.supabase.co/storage/v1/object/public/black-rose-wwm/avatars/Heart_of_the_Healer.jpg",
  "https://hvfncvygrmnxfdavwzkx.supabase.co/storage/v1/object/public/black-rose-wwm/avatars/Initial_XI.jpg",
  "https://hvfncvygrmnxfdavwzkx.supabase.co/storage/v1/object/public/black-rose-wwm/avatars/Initial_IX.jpg",
  "https://hvfncvygrmnxfdavwzkx.supabase.co/storage/v1/object/public/black-rose-wwm/avatars/Initial_VII.jpg",
  "https://hvfncvygrmnxfdavwzkx.supabase.co/storage/v1/object/public/black-rose-wwm/avatars/Initial_V.jpg",
  "https://hvfncvygrmnxfdavwzkx.supabase.co/storage/v1/object/public/black-rose-wwm/avatars/Initial_III.jpg",
  "https://hvfncvygrmnxfdavwzkx.supabase.co/storage/v1/object/public/black-rose-wwm/avatars/Initial_I.jpg"
];