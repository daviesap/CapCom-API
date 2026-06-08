import {
  AddressBook,
  AddressBookTabs,
  CaretDoubleLeft,
  CaretDoubleRight,
  ArrowDown,
  ArrowUp,
  Buildings,
  Calendar,
  CalendarBlank,
  CalendarDots,
  Copy,
  Factory,
  FileText,
  ForkKnife,
  Gear,
  House,
  Info,
  ListChecks,
  MapPin,
  NotePencil,
  ShieldCheck,
  SignOut,
  Tag,
  Trash,
  Truck,
  User,
  Users,
} from "@phosphor-icons/react";

export const capcomIcons = {
  caretDoubleLeft: CaretDoubleLeft,
  caretDoubleRight: CaretDoubleRight,
  admin: ShieldCheck,
  catering: ForkKnife,
  contact: AddressBook,
  contacts: AddressBookTabs,
  dashboard: House,
  detail: CalendarDots,
  event: Calendar,
  info: Info,
  keyInfo: FileText,
  location: Buildings,
  mapPin: MapPin,
  moveToNextDay: ArrowDown,
  moveToPreviousDay: ArrowUp,
  notes: NotePencil,
  profile: User,
  settings: Gear,
  signOut: SignOut,
  summary: CalendarBlank,
  tag: Tag,
  duplicate: Copy,
  delete: Trash,
  company: Factory,
  taskList: ListChecks,
  truck: Truck,
  truckSize: Truck,
  trucking: Truck,
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
