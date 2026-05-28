export const DOCUMENT_SYNC_DELAY_MS = 1500;

export const COLLAB_FEATURES_ENABLED = false;
export const COLLAB_DOCUMENT_SYNC_DELAY_MS = 80;
export const CURSOR_SYNC_THROTTLE_MS = 120;
export const CURSOR_HEARTBEAT_MS = 2500;
export const CURSOR_TIMEOUT_MS = 15000;

export type AccessMode = "private" | "view" | "edit";
export type ReadAccessMode = "private" | "view";
export type MemberRole = "viewer" | "editor";

export type Document = {
  id: string;
  title: string;
  content: string;
  access: AccessMode;
  ownerId: string;
  ownerName: string;
  createdAt: string;
  updatedAt: string;
};

export type DocumentMember = {
  id: string;
  documentId: string;
  userId: string;
  displayName: string;
  role: MemberRole;
  createdAt: string;
  updatedAt: string;
};

export type CursorPresence = {
  id: string;
  documentId: string;
  userId: string;
  displayName: string;
  picture: string;
  x: string;
  y: string;
  selection: string;
  lastSeenAt: string;
  createdAt: string;
  updatedAt: string;
};

export type Workspace = {
  documents: Document[];
  members: DocumentMember[];
  cursors: CursorPresence[];
};

export function cleanTitle(value: string): string {
  const title = value.trim().replace(/\s+/g, " ").slice(0, 80);
  return title || "Untitled document";
}

export function cleanContent(value: string): string {
  return value.slice(0, 40000);
}

export function cleanUserId(value: string): string {
  return value.trim().slice(0, 140);
}

export function cleanRole(value: string): MemberRole {
  return value === "viewer" ? "viewer" : "editor";
}

export function cleanAccess(value: string): AccessMode {
  if (value === "view" || value === "edit") {
    return value;
  }
  return "private";
}

export function cleanReadAccess(value: string): ReadAccessMode {
  return value === "view" ? "view" : "private";
}

export function cleanCoordinate(value: string): string {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return "0";
  }
  return String(Math.max(0, Math.min(40000, Math.round(n))));
}

const PALETTE = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#a855f7",
  "#ec4899",
];

export function userColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}
