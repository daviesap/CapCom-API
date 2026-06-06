import {
  AddressBook,
  Buildings,
  Calendar,
  Factory,
  ForkKnife,
  Gear,
  House,
  ListChecks,
  MapPin,
  ShieldCheck,
  SignOut,
  Truck,
  User,
  Users,
} from "@phosphor-icons/react";

export const capcomIcons = {
  admin: ShieldCheck,
  catering: ForkKnife,
  contact: AddressBook,
  dashboard: House,
  event: Calendar,
  location: Buildings,
  mapPin: MapPin,
  profile: User,
  settings: Gear,
  signOut: SignOut,
  supplier: Factory,
  taskList: ListChecks,
  truck: Truck,
  users: Users,
};

export function CapcomIcon({
  name,
  size = 20,
  weight = "regular",
  decorative = true,
  label,
  ...iconProps
}) {
  const Icon = capcomIcons[name];

  if (!Icon) {
    return null;
  }

  return (
    <Icon
      aria-hidden={decorative ? "true" : undefined}
      aria-label={!decorative ? label : undefined}
      focusable="false"
      size={size}
      weight={weight}
      {...iconProps}
    />
  );
}
