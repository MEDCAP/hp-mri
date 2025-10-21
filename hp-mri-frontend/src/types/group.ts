export interface Group {
  _id: string;
  name: string;
  displayName: string;
  description: string;
  createdAt: string;
  createdBy: string;
  members: string[];
  admins: string[];
  properties: Record<string, any>;
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
  properties?: Record<string, any>;
}

