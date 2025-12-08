
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
  bestOf?: number; // 1 or 3
  activeStreamMatchId?: string; // ID of the match currently being broadcasted on VS Screen
  activeBannerMatchId?: string; // ID of the match currently being broadcasted on Match Banner
  lastArenaChampion?: {
      uid: string;
      displayName: string;
      photoURL?: string;
      wonAt: string;
  };
  lastArenaWinners?: {
      rank: number;
      uid: string;
      displayName: string;
      photoURL?: string;
      wonAt: string;
  }[];
}

export interface GuildEvent {
  id: string;
  guildId?: string;
  title: string;
  date: string;
  description: string;
  type: 'Raid' | 'PvP' | 'Social' | 'Meeting' | string;
  imageUrl?: string;
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
  imageUrl?: string;
}

export interface Party {
  id: string;
  guildId: string;
  name: string;
  activity: string;
  leaderId: string;
  leaderName: string;
  maxMembers: number;
  memberUids: string[]; // Array of UIDs for efficient querying
  currentMembers: {
    uid: string;
    name: string;
    role: RoleType;
    photoURL?: string;
  }[];
  lastNotificationTime?: number;
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

export interface Suggestion {
  id: string;
  uid: string;
  displayName: string;
  type: 'Suggestion' | 'Complaint' | 'Bug' | 'Other';
  content: string;
  timestamp: string;
  status: 'new' | 'read' | 'resolved';
}

export interface ArenaParticipant {
  uid: string;
  displayName: string;
  photoURL?: string;
  guildId: string;
  activityPoints: number;
  status: 'pending' | 'approved' | 'denied';
  role?: RoleType; 
  originalGuildId?: string;
}

export interface CustomTournament {
  id: string;
  title: string;
  createdAt: string;
  createdBy: string;
  hasGrandFinale?: boolean;
  hideRankings?: boolean;
  bestOf?: number; // 1 or 3
  activeStreamMatchId?: string; // ID of the match currently being broadcasted on VS Screen
  activeBannerMatchId?: string; // ID of the match currently being broadcasted on Match Banner
}

export interface ArenaMatch {
  id: string;
  round: number;
  position: number; // 0 is top match, 1 is next down, etc.
  player1: ArenaParticipant | null;
  player2: ArenaParticipant | null;
  winner: ArenaParticipant | null;
  guildId: string; // Or tournamentId
  isThirdPlace?: boolean; // Flag for 3rd place match
  score1?: number; // Score for player 1
  score2?: number; // Score for player 2
}

export interface HerosRealmRequest {
  id: string;
  guildId: string;
  day: string;
  time: string;
  createdByUid: string;
  createdByName: string;
  votes: string[]; // List of UIDs who voted for this time
  timestamp: string;
}

export interface HerosRealmConfig {
  schedules: Record<string, ScheduleSlot[]>; // guildId -> [{day, time}]
  currentBosses?: Record<string, string[]>; // guildId -> [BossName1, BossName2]
}

export interface AuditLogEntry {
  id: string;
  action: string; 
  details: string; 
  performedBy: string; 
  performedByName: string; 
  timestamp: string;
  category: 'System' | 'Guild' | 'Queue' | 'Event' | 'Announcement' | 'Member';
}

export interface AdConfig {
  isActive: boolean;
  title: string;
  description: string;
  images: string[];
  passphrase: string;
  intervalMinutes: number;
}

export interface AudioFile {
  id: string;
  name: string;
  url: string;
  uploadedBy: string;
  timestamp: string;
}

export interface ScheduledNotification {
  id: string;
  guildId: string;
  audioFileId: string;
  audioName: string;
  audioUrl: string;
  label: string; // "War Start", "Gathering"
  time: string; // 24h format "HH:mm"
  days?: string[]; // Array of days ['Monday', 'Wednesday']
  createdBy: string;
}