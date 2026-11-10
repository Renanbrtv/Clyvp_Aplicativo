export const roles = ['owner', 'moderator', 'support', 'finance', 'auditor'] as const;
export type Role = typeof roles[number];
export const permissions = ['dashboard', 'users.read', 'users.write', 'content.read', 'content.write', 'reports', 'proposals', 'billing', 'settings', 'audit'] as const;
export type Permission = typeof permissions[number];
const grants: Record<Role, readonly Permission[]> = {
 owner: permissions,
 moderator: ['dashboard','content.read','content.write','reports','proposals'],
 support: ['dashboard','users.read','content.read','proposals'],
 finance: ['dashboard','billing'],
 auditor: ['dashboard','users.read','content.read','proposals','billing','audit'],
};
export const allowed = (role: string, permission: Permission) => roles.includes(role as Role) && grants[role as Role].includes(permission);
export const grantsFor = (role: Role) => grants[role];
