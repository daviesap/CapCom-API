export const USER_ROLES = {
  SUPER_ADMIN: "SuperAdmin",
  ADMIN: "Admin",
  USER: "User",
  VIEWER: "Viewer",
};

export function isSuperAdmin(userProfile) {
  return userProfile?.role === USER_ROLES.SUPER_ADMIN;
}

export function isAdmin(userProfile) {
  return userProfile?.role === USER_ROLES.ADMIN;
}

export function isUser(userProfile) {
  return userProfile?.role === USER_ROLES.USER;
}

export function isViewer(userProfile) {
  return userProfile?.role === USER_ROLES.VIEWER;
}

export function hasActiveProfile(userProfile) {
  return Boolean(userProfile?.isActive);
}

export function canCreateEvents(userProfile) {
  return hasActiveProfile(userProfile) && (
    isSuperAdmin(userProfile) || isAdmin(userProfile)
  );
}

export function canReadEvent(userProfile, eventRecord, assignment = null) {
  if (!hasActiveProfile(userProfile) || !eventRecord) return false;
  if (isSuperAdmin(userProfile)) return true;
  if (!userProfile.clientId) return false;
  if (isAdmin(userProfile)) return eventRecord.clientId === userProfile.clientId;

  return eventRecord.clientId === userProfile.clientId
    && assignment?.eventId === eventRecord.id
    && assignment?.userId === userProfile.id
    && assignment?.accessRole === userProfile.role
    && [USER_ROLES.USER, USER_ROLES.VIEWER].includes(assignment?.accessRole);
}

export function canEditEvent(userProfile, eventRecord, assignment = null) {
  if (!hasActiveProfile(userProfile) || !eventRecord) return false;
  if (isSuperAdmin(userProfile)) return true;
  if (!userProfile.clientId || eventRecord.clientId !== userProfile.clientId) return false;
  if (isAdmin(userProfile)) return true;

  return assignment?.eventId === eventRecord.id
    && assignment?.userId === userProfile.id
    && assignment?.accessRole === userProfile.role
    && assignment?.accessRole === USER_ROLES.USER;
}

export function canManageEvent(userProfile, eventRecord) {
  if (!hasActiveProfile(userProfile) || !eventRecord) return false;
  if (isSuperAdmin(userProfile)) return true;
  if (!isAdmin(userProfile) || !userProfile.clientId) return false;

  return eventRecord.clientId === userProfile.clientId;
}

export function canManageUsers(userProfile) {
  return hasActiveProfile(userProfile) && (
    isSuperAdmin(userProfile) || isAdmin(userProfile)
  );
}

export function canManageAssignments(userProfile) {
  return canManageUsers(userProfile);
}
