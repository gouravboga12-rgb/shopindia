export interface PartnerSkill {
  id: string;
  name: string;
  category: 'home' | 'vehicle';
  icon: string;
  description: string;
}

export const PARTNER_SKILLS: PartnerSkill[] = [
  // Home Services
  {
    id: 'electrician',
    name: 'Electrician & Home Wiring',
    category: 'home',
    icon: '⚡',
    description: 'Switchboard repair, wiring, fan/light/fuse setup, MCB troubleshooting',
  },
  {
    id: 'plumbing',
    name: 'Plumber & Sanitary Care',
    category: 'home',
    icon: '🔧',
    description: 'Leakage repair, pipe fitting, tap/sink replacement, water motor',
  },
  {
    id: 'ac_service',
    name: 'AC Repair & Servicing',
    category: 'home',
    icon: '❄️',
    description: 'AC deep cleaning, gas refill, installation & cooling repairs',
  },
  {
    id: 'cleaning',
    name: 'Deep House Cleaning & Pest Control',
    category: 'home',
    icon: '✨',
    description: 'Full home cleaning, kitchen/bathroom disinfection, pest treatment',
  },
  {
    id: 'appliance_repair',
    name: 'Appliance Maintenance & Repair',
    category: 'home',
    icon: '🧺',
    description: 'Washing machine, refrigerator, microwave oven, RO water purifier',
  },
  {
    id: 'carpentry',
    name: 'Carpentry & Furniture Assembly',
    category: 'home',
    icon: '🪚',
    description: 'Furniture repair, bed assembly, door locks, hinges, woodwork',
  },
  {
    id: 'painting',
    name: 'Painting & Waterproofing',
    category: 'home',
    icon: '🎨',
    description: 'Interior/exterior wall painting, seepage protection, touch-ups',
  },
  {
    id: 'salon_grooming',
    name: 'Salon & Grooming at Home',
    category: 'home',
    icon: '✂️',
    description: 'Men & women haircuts, facial, massage, grooming & styling',
  },

  // Vehicle Services
  {
    id: 'vehicle_care',
    name: 'Doorstep Vehicle Periodic Service',
    category: 'vehicle',
    icon: '🛵',
    description: 'Car & bike oil change, engine tuning, general health check',
  },
  {
    id: 'vehicle_wash',
    name: 'Doorstep Foam Wash & Detailing',
    category: 'vehicle',
    icon: '🚗',
    description: 'Pressure foam wash, interior vacuuming, dashboard polish',
  },
  {
    id: 'vehicle_breakdown',
    name: 'Emergency Roadside Towing (24x7)',
    category: 'vehicle',
    icon: '🚨',
    description: 'Flatbed towing, accidental recovery, breakdown transport',
  },
  {
    id: 'vehicle_battery',
    name: 'Battery Jumpstart & Replacement',
    category: 'vehicle',
    icon: '🔋',
    description: 'Dead battery jumpstart, voltage check, doorstep battery change',
  },
  {
    id: 'vehicle_tyres',
    name: 'Brakes, Tyres & Wheel Balancing',
    category: 'vehicle',
    icon: '🛞',
    description: 'Tubeless puncture fix, tyre replacement, brake shoe adjustment',
  },
];

export const PARTNER_TYPES = [
  {
    id: 'delivery',
    label: 'Delivery Partner',
    sublabel: 'Quick Commerce Grocery & Hyperlocal Orders',
    icon: '🚚',
    badgeColor: 'orange',
  },
  {
    id: 'service',
    label: 'Service Professional',
    sublabel: 'Doorstep Repairs & Maintenance',
    icon: '🛠️',
    badgeColor: 'indigo',
  },
  {
    id: 'both',
    label: 'All-Rounder Partner',
    sublabel: 'Both Quick Deliveries & Doorstep Services',
    icon: '⚡',
    badgeColor: 'emerald',
  },
] as const;

export type PartnerType = 'delivery' | 'service' | 'both';

export function getSkillLabel(skillId: string): string {
  const match = PARTNER_SKILLS.find((s) => s.id === skillId);
  return match ? `${match.icon} ${match.name}` : skillId;
}
