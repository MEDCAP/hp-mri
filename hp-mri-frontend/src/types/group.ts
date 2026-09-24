export interface Group {
  _id: string;
  name: string;
  displayName: string;
  description: string;
  createdAt: string;
  createdBy: string;
  members: string[];
  admins: string[];
  properties: Record<string, unknown>;
}

export interface GroupMember {
  sub: string;
  isAdmin: boolean;
}

export interface CreateGroupRequest {
  name: string;
  displayName: string;
  description?: string;
}

export interface UpdateGroupRequest {
  displayName?: string;
  description?: string;
  properties?: Record<string, unknown>;
}


/** A GET /groups/search hit, annotated with the caller's request status. */
export interface SearchGroup {
  _id: string;
  name: string;
  displayName: string;
  description?: string;
  memberCount: number;
  createdAt: string;
  requestStatus?: 'pending' | 'approved' | 'denied' | 'member' | 'none';
}

/** The caller's own join request, from GET /groups/my-join-requests. */
export interface MyJoinRequest {
  groupName: string;
  displayName: string;
  status: 'pending' | 'approved' | 'denied';
  requestedAt: string;
}

/** A request to join a group, as its admins see it. */
export interface JoinRequest {
  userSub: string;
  userName: string;
  userEmail: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'denied';
}

export interface InviteCode {
  code: string;
  createdBy: string;
  createdAt: string;
  expiresAt?: string;
  maxUses?: number;
  usedCount: number;
}
