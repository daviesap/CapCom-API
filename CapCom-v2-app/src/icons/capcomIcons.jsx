import {
  AddressBook,
  AddressBookTabs,
  ArrowClockwise,
  ArrowBendDownRight,
  ArrowBendUpRight,
  CaretDoubleLeft,
  CaretDoubleRight,
  CaretDoubleDown,
  CaretRight,
  ArrowDown,
  ArrowSquareOut,
  ArrowUp,
  BookOpen,
  Buildings,
  Calendar,
  CalendarBlank,
  CalendarDots,
  Copy,
  DotsThree,
  FunnelSimple,
  Factory,
  FileText,
  ForkKnife,
  Gear,
  House,
  Info,
  ListChecks,
  LockSimple,
  MapPin,
  NotePencil,
  PencilSimple,
  Plus,
  QuestionMark,
  ShieldCheck,
  SignOut,
  Share,
  Tag,
  Trash,
  Truck,
  User,
  Users,
  Warning,
  X,
} from "@phosphor-icons/react";

export const capcomIcons = {
  add: Plus,
  arrowBendDownRight: ArrowBendDownRight,
  arrowBendUpRight: ArrowBendUpRight,
  caretDoubleLeft: CaretDoubleLeft,
  caretDoubleRight: CaretDoubleRight,
  caretDoubleDown: CaretDoubleDown,
  caretRight: CaretRight,
  close: X,
  admin: ShieldCheck,
  catering: ForkKnife,
  contact: AddressBook,
  contacts: AddressBookTabs,
  dashboard: House,
  detail: CalendarDots,
  edit: PencilSimple,
  event: Calendar,
  externalLink: ArrowSquareOut,
  filter: FunnelSimple,
  refresh: ArrowClockwise,
  bookOpen: BookOpen,
  info: Info,
  keyInfo: FileText,
  location: Buildings,
  lock: LockSimple,
  mapPin: MapPin,
  moveToNextDay: ArrowDown,
  moveToPreviousDay: ArrowUp,
  notes: NotePencil,
  share: Share,
  profile: User,
  overflow: DotsThree,
  question: QuestionMark,
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
  warning: Warning,
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
