export type SubVerticalType = 'grocery' | 'food' | 'pharmacy' | 'home_service' | 'vehicle_service' | 'normal_shop';

export interface FoodModifier {
  name: string;
  price: number;
}

export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  originalPrice: number;
  rating: number;
  ratingCount: number;
  image: string;
  category: string;
  brand: string;
  vertical: 'shop' | 'quick' | 'services';
  subVertical?: SubVerticalType;
  tags?: string[];
  specs?: Record<string, string>;
  deliveryTime?: string;
  isAssured?: boolean;
  quantity?: number;
  stock?: number;
  isOutOfStock?: boolean;

  // Food Delivery specifics
  isVeg?: boolean;
  prepTime?: string;
  restaurantName?: string;
  cuisine?: string;
  modifiers?: FoodModifier[];

  // Pharmacy specifics
  requiresPrescription?: boolean;
  dosageForm?: string;
  packSize?: string;
  manufacturer?: string;

  // Services specifics
  serviceType?: 'home' | 'vehicle';
  durationEstimate?: string;
  warrantyDays?: number;
  includedPoints?: string[];
  serviceSlots?: string[];

  // Vehicle Services specifics
  vehicleType?: 'car' | 'bike' | 'both';
  serviceLocationType?: 'doorstep' | 'garage' | 'both';
}

export interface Category {
  id: string;
  name: string;
  image: string;
  vertical: 'shop' | 'quick' | 'services';
  subVertical?: SubVerticalType;
  iconName?: string;
}

export const CATEGORIES: Category[] = [];

export const PRODUCTS: Product[] = [];

export const BANNERS: any[] = [];

