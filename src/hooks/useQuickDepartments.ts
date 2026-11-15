import { useState, useEffect } from 'react';

export interface QuickDepartment {
  id: string;
  label: string;
  icon: string;
  badge: string;
  color: string;
  verticalKey: string;
  tagline: string;
  isCustom?: boolean;
}

export const DEFAULT_DEPARTMENTS: QuickDepartment[] = [
  {
    id: 'grocery',
    label: 'Instant Grocery',
    icon: '🥦',
    badge: '10 MINS',
    color: 'emerald',
    verticalKey: 'quick_grocery',
    tagline: '10-20 Min Delivery from Dark Store'
  },
  {
    id: 'food',
    label: 'Food & Dining',
    icon: '🍲',
    badge: 'LIVE KITCHENS',
    color: 'orange',
    verticalKey: 'quick_food',
    tagline: 'Hot & Fresh Meals from Verified Kitchens'
  },
  {
    id: 'pharmacy',
    label: 'Pharmacy',
    icon: '💊',
    badge: 'CERTIFIED PHARMA',
    color: 'blue',
    verticalKey: 'quick_pharmacy',
    tagline: 'Rx Medicines & Health Essentials'
  }
];

const RAW_BASE = import.meta.env.VITE_API_URL || '';
const BASE = RAW_BASE.replace(/\/api\/?$/, '').replace(/\/$/, '');

export const useQuickDepartments = () => {
  const [departments, setDepartments] = useState<QuickDepartment[]>(DEFAULT_DEPARTMENTS);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${BASE}/api/categories/departments`);
      if (res.ok) {
        const data = await res.json();
        if (data?.departments && Array.isArray(data.departments) && data.departments.length > 0) {
          setDepartments(data.departments);
          return;
        }
      }
    } catch (_) {
      // Fallback to defaults
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  return { departments, loading, refresh: fetchDepartments };
};
