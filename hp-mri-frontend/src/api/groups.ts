import { apiClient } from './client';
import {
  Group,
  GroupMember,
  CreateGroupRequest,
  UpdateGroupRequest,
  SearchGroup,
  MyJoinRequest,
  JoinRequest,
  InviteCode,
} from '../types/group';

const g = (name: string) => `/groups/${encodeURIComponent(name)}`;

/** GET /groups — groups the caller belongs to. */
export async function listGroups(): Promise<Group[]> {
  const response = await apiClient.get<Group[]>('/groups');
  return response.data;
}

export async function createGroup(body: CreateGroupRequest): Promise<void> {
  await apiClient.post('/groups', body);
}

export async function getGroup(name: string): Promise<Group> {
  const response = await apiClient.get<Group>(g(name));
  return response.data;
}

export async function updateGroup(name: string, updates: UpdateGroupRequest): Promise<void> {
  await apiClient.patch(g(name), updates);
}

export async function deleteGroup(name: string): Promise<void> {
  await apiClient.delete(g(name));
}

export async function listMembers(name: string): Promise<GroupMember[]> {
  const response = await apiClient.get<{ members: GroupMember[] }>(`${g(name)}/members`);
  return response.data.members;
}

export async function addMember(name: string, userSub: string): Promise<void> {
  await apiClient.post(`${g(name)}/members`, { userSub });
}

export async function removeMember(name: string, userSub: string): Promise<void> {
  await apiClient.delete(`${g(name)}/members/${encodeURIComponent(userSub)}`);
}

export async function promoteAdmin(name: string, userSub: string): Promise<void> {
  await apiClient.post(`${g(name)}/admins`, { userSub });
}

export async function demoteAdmin(name: string, userSub: string): Promise<void> {
  await apiClient.delete(`${g(name)}/admins/${encodeURIComponent(userSub)}`);
}

/** POST /groups/join-by-code — returns the joined group's names. */
export async function joinByCode(code: string): Promise<{ groupName: string; displayName: string }> {
  const response = await apiClient.post<{ groupName: string; displayName: string }>(
    '/groups/join-by-code',
    { code }
  );
  return response.data;
}

export async function searchGroups(query: string): Promise<SearchGroup[]> {
  const response = await apiClient.get<{ groups: SearchGroup[] }>('/groups/search', {
    params: { q: query },
  });
  return response.data.groups;
}

export async function listMyJoinRequests(): Promise<MyJoinRequest[]> {
  const response = await apiClient.get<{ joinRequests: MyJoinRequest[] }>('/groups/my-join-requests');
  return response.data.joinRequests;
}

export async function requestToJoin(name: string): Promise<void> {
  await apiClient.post(`${g(name)}/join-requests`);
}

export async function withdrawJoinRequest(name: string): Promise<void> {
  await apiClient.post(`${g(name)}/join-requests/withdraw`);
}

export async function listJoinRequests(name: string): Promise<JoinRequest[]> {
  const response = await apiClient.get<{ joinRequests: JoinRequest[] }>(`${g(name)}/join-requests`);
  return response.data.joinRequests;
}

export async function approveJoinRequest(name: string, userSub: string): Promise<void> {
  await apiClient.post(`${g(name)}/join-requests/${encodeURIComponent(userSub)}/approve`);
}

export async function denyJoinRequest(name: string, userSub: string): Promise<void> {
  await apiClient.post(`${g(name)}/join-requests/${encodeURIComponent(userSub)}/deny`);
}

export async function listInviteCodes(name: string): Promise<InviteCode[]> {
  const response = await apiClient.get<{ inviteCodes?: InviteCode[] }>(`${g(name)}/invite-codes`);
  return response.data.inviteCodes ?? [];
}

export async function createInviteCode(
  name: string,
  options: { expiresInDays?: number; maxUses?: number }
): Promise<void> {
  await apiClient.post(`${g(name)}/invite-codes`, options);
}

export async function revokeInviteCode(name: string, code: string): Promise<void> {
  await apiClient.delete(`${g(name)}/invite-codes/${encodeURIComponent(code)}`);
}
