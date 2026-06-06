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
