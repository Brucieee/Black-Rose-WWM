

export enum RoleType {
  DPS = 'DPS',
  TANK = 'Tank',
  HEALER = 'Healer',
  HYBRID = 'Hybrid'
}

export const WEAPON_LIST = [
  "Heavenquaker Spear", "Infernal Twinblades", "Inkwell Fan", 
  "Mortal Rope Dart", "Nameless Spear", "Nameless Sword", 
  "Vernal Umbrella", "Panacea Fan", "Soulshade Umbrella", 
  "Stormbreaker Spear", "Strategic Sword", "Thundercry Blade"
] as const;

export type Weapon = typeof WEAPON_LIST[number];

export const WEAPON_ROLE_MAP: Record<Weapon, RoleType[]> = {
  "Heavenquaker Spear": [RoleType.DPS],
  "Infernal Twinblades": [RoleType.DPS],
  "Inkwell Fan": [RoleType.DPS],
  "Mortal Rope Dart": [RoleType.DPS],
  "Nameless Spear": [RoleType.DPS],
  "Nameless Sword": [RoleType.DPS],
  "Vernal Umbrella": [RoleType.DPS],
  "Strategic Sword": [RoleType.DPS],
  "Panacea Fan": [RoleType.HEALER],
  "Soulshade Umbrella": [RoleType.HEALER],
  "Stormbreaker Spear": [RoleType.TANK],
  "Thundercry Blade": [RoleType.TANK]
};

export interface UserProfile {
  uid: string;
  inGameId: string;
  displayName: string;
  role: RoleType;
  systemRole: 'Member' | 'Officer' | 'Admin';
  weapons: Weapon[];
  guildId: string;
  photoURL?: string;
  status: 'online' | 'offline' | 'away' | 'in-game';
  email?: string | null;
  lastSeen?: string; // ISO Date String
}

export interface Guild {
  id: string;
  name: string;
  memberCap: number;
  arenaMinPoints?: number; // Added for arena threshold
  lastArenaChampion?: {
      uid: string;
      displayName: string;
      photoURL?: string;
      wonAt: string;
  };
}

export interface GuildEvent {
  id: string;
  guildId?: string;
  title: string;
  date: string;
  description: string;
  type: 'Raid' | 'PvP' | 'Social' | 'Meeting' | string;
}

export interface Announcement {
  id: string;
  guildId: string; // 'global' for main dashboard, or specific guild ID
  authorId: string;
  authorName: string;
  title: string;
  content: string;
  timestamp: string;
  isGlobal: boolean;
}

export interface Party {
  id: string;
  guildId: string;
  name: string;
  activity: string;
  leaderId: string;
  leaderName: string;
  maxMembers: number;
  currentMembers: {
    uid: string;
    name: string;
    role: RoleType;
    photoURL?: string;
  }[];
}

export interface LeaderboardEntry {
  id: string;
  rank: number;
  playerName: string;
  playerUid: string;
  branch: string;
  boss: string;
  time: string;
  date: string;
  proofUrl?: string;
  status: 'verified' | 'pending';
}

export interface WinnerLog extends LeaderboardEntry {
  prizeGiven?: boolean;
}

export interface QueueEntry {
  uid: string;
  name: string;
  role: RoleType;
  joinedAt: Date;
  guildId: string;
}

export interface Boss {
  name: string;
  imageUrl: string;
}

export interface ScheduleSlot {
  day: string;
  time: string;
}

export interface CooldownEntry {
  uid: string;
  branchId: string;
  timestamp: string;
  prizeGiven: boolean;
}

export interface BreakingArmyConfig {
  currentBoss: Record<string, string>; // guildId -> bossName
  schedules: Record<string, ScheduleSlot[]>; // guildId -> [{day, time}]
  recentWinners: CooldownEntry[];
  bossPool: Boss[];
}

export interface LeaveRequest {
  id: string;
  uid: string;
  displayName: string;
  inGameId: string;
  guildId: string;
  guildName: string;
  startDate: string;
  endDate: string;
  timestamp: string;
  reason?: string;
}

export interface ArenaParticipant {
  uid: string;
  displayName: string;
  photoURL?: string;
  guildId: string;
  activityPoints: number;
  status: 'pending' | 'approved' | 'denied';
}

export interface ArenaMatch {
  id: string;
  round: number;
  position: number; // 0 is top match, 1 is next down, etc.
  player1: ArenaParticipant | null;
  player2: ArenaParticipant | null;
  winner: ArenaParticipant | null;
  guildId: string;
}