import { useState, useEffect, useCallback } from 'react';
import type { Product } from '../data/types';
import { useApp } from '../context/AppContext';

const RAW_BASE = import.meta.env.VITE_API_URL || '';
const BASE = RAW_BASE.replace(/\/api\/?$/, '').replace(/\/$/, '');

export const useProducts = (verticalFilter?: string) => {
  const { userCoords } = useApp();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (userCoords?.lat != null) params.set('lat', String(userCoords.lat));
      if (userCoords?.lng != null) params.set('lng', String(userCoords.lng));
      if (userCoords?.city) params.set('city', userCoords.city);
      if (userCoords?.pincode) params.set('pincode', userCoords.pincode);
      if (verticalFilter) {
        params.set('vertical', verticalFilter);
      }

      const queryStr = params.toString() ? `?${params.toString()}` : '';
      const res = await fetch(`${BASE}/api/products${queryStr}`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      setProducts(data);
    } catch (err: any) {
      console.error('Error fetching products:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userCoords?.lat, userCoords?.lng, userCoords?.city, userCoords?.pincode, verticalFilter]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return { products, loading, error, refetch: fetchProducts };
};
