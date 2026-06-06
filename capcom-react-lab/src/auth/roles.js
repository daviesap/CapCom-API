export const USER_ROLES = {
  SUPER_ADMIN: "SuperAdmin",
  CLIENT_ADMIN: "ClientAdmin",
  CLIENT_USER: "ClientUser",
};

export function isSuperAdmin(userProfile) {
  return userProfile?.role === USER_ROLES.SUPER_ADMIN;
}

export function isClientAdmin(userProfile) {
  return userProfile?.role === USER_ROLES.CLIENT_ADMIN;
}

export function isClientUser(userProfile) {
  return userProfile?.role === USER_ROLES.CLIENT_USER;
}

export function hasActiveProfile(userProfile) {
  return Boolean(userProfile?.isActive);
}

export function canCreateEvents(userProfile) {
  return hasActiveProfile(userProfile) && (
    isSuperAdmin(userProfile) || isClientAdmin(userProfile)
  );
}

export function canReadEvent(userProfile, eventRecord) {
  if (!hasActiveProfile(userProfile) || !eventRecord) return false;
  if (isSuperAdmin(userProfile)) return true;
  if (!userProfile.clientId) return false;

  return eventRecord.clientId === userProfile.clientId;
}

export function canManageEvent(userProfile, eventRecord) {
  if (!hasActiveProfile(userProfile) || !eventRecord) return false;
  if (isSuperAdmin(userProfile)) return true;
  if (!isClientAdmin(userProfile) || !userProfile.clientId) return false;

  return eventRecord.clientId === userProfile.clientId;
}
