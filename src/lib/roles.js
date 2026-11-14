import {
  Banknote, BarChart3, BedDouble, Building2, CalendarDays, ClipboardList, FlaskConical, HeartPulse, History, Inbox,
  ArrowLeftRight, Package, Pill, ReceiptText, ScrollText, ShieldCheck, Stethoscope, Syringe, Truck, Users, Wallet, Warehouse,
} from 'lucide-react';

export const ROLE_LABEL = {
  reception: 'Reception', nurse: 'Nurse', doctor: 'Doctor', lab: 'Lab', pharmacy: 'Pharmacy',
  cashier: 'Cashier', billing: 'Billing officer', store: 'General Store', admin: 'Admin',
};

// What each role sees in the sidebar. The first item is their home screen.
export const ROLE_NAV = {
  reception: [
    { to: '/reception', label: 'Patients', icon: Users, end: true },
    { to: '/reception/today', label: 'Today’s visits', icon: ClipboardList },
    { to: '/reception/appointments', label: 'Online appointments', icon: CalendarDays },
  ],
  nurse: [
    { to: '/triage', label: 'Triage', icon: HeartPulse },
    { to: '/wards', label: 'Wards & beds', icon: BedDouble },
    { to: '/procedures', label: 'Procedures', icon: Syringe },
  ],
  doctor: [
    { to: '/doctor', label: 'My queue', icon: Stethoscope },
    { to: '/patients', label: 'Patients', icon: Users },
    { to: '/wards', label: 'Wards & beds', icon: BedDouble },
    { to: '/procedures', label: 'Procedures', icon: Syringe },
  ],
  lab: [
    { to: '/lab', label: 'Lab worklist', icon: FlaskConical, end: true },
    { to: '/lab/done', label: 'Verified results', icon: History },
  ],
  pharmacy: [
    { to: '/pharmacy', label: 'Prescriptions', icon: Pill, end: true },
    { to: '/pharmacy/transfers', label: 'Transfers in', icon: ArrowLeftRight },
    { to: '/pharmacy/stock', label: 'Stock', icon: Package },
    { to: '/pharmacy/receive', label: 'Receive stock', icon: Inbox },
  ],
  store: [
    { to: '/store', label: 'General Store', icon: Warehouse, end: true },
    { to: '/store/transfers', label: 'Transfers', icon: ArrowLeftRight },
  ],
  cashier: [
    { to: '/cashier', label: 'Awaiting payment', icon: Wallet, end: true },
    { to: '/cashier/outstanding', label: 'Owing patients', icon: ReceiptText },
  ],
  billing: [
    { to: '/billing', label: 'Bills', icon: ReceiptText, end: true },
    { to: '/billing/claims', label: 'HMO claims', icon: ShieldCheck },
    { to: '/admin/reports', label: 'Reports', icon: BarChart3 },
  ],
  admin: [
    { to: '/admin', label: 'Price list', icon: Banknote, end: true },
    { to: '/patients', label: 'Patients', icon: Users },
    { to: '/wards', label: 'Wards & beds', icon: BedDouble },
    { to: '/store', label: 'General Store', icon: Warehouse },
    { to: '/store/transfers', label: 'Store transfers', icon: ArrowLeftRight },
    { to: '/admin/hmos', label: 'HMOs', icon: ShieldCheck },
    { to: '/admin/clinics', label: 'Clinics', icon: Building2 },
    { to: '/admin/staff', label: 'Staff', icon: Users },
    { to: '/reception/appointments', label: 'Online appointments', icon: CalendarDays },
    { to: '/admin/reports', label: 'Reports', icon: BarChart3 },
    { to: '/admin/audit', label: 'Activity log', icon: ScrollText },
  ],
};

export const ROLE_HOME = Object.fromEntries(Object.entries(ROLE_NAV).map(([r, nav]) => [r, nav[0].to]));
