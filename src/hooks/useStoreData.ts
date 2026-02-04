import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface StoreDataItem {
  id: number;
  category: string;
  key: string;
  display_name: string | null;
  value: string | null;
  is_active: boolean | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export function useStoreData(category: string) {
  const [items, setItems] = useState<StoreDataItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('store_data')
      .select('*')
      .eq('category', category)
      .order('id', { ascending: true });

    if (error) {
      console.error('Error fetching store_data:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los datos',
        variant: 'destructive',
      });
    } else {
      setItems((data as StoreDataItem[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();
  }, [category]);

  const updateIsActive = async (id: number, isActive: boolean) => {
    const { error } = await supabase
      .from('store_data')
      .update({ is_active: isActive })
      .eq('id', id);

    if (error) {
      console.error('Error updating is_active:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el estado',
        variant: 'destructive',
      });
      return false;
    }

    setItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, is_active: isActive } : item
      )
    );

    toast({
      title: '✅ Guardado',
      description: `Estado actualizado correctamente`,
    });
    return true;
  };

  const updateValue = async (id: number, value: string) => {
    const { error } = await supabase
      .from('store_data')
      .update({ value })
      .eq('id', id);

    if (error) {
      console.error('Error updating value:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el valor',
        variant: 'destructive',
      });
      return false;
    }

    setItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, value } : item
      )
    );

    toast({
      title: '✅ Guardado',
      description: `Valor actualizado correctamente`,
    });
    return true;
  };

  return {
    items,
    loading,
    updateIsActive,
    updateValue,
    refetch: fetchItems,
  };
}
