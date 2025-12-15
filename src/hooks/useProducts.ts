import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Product, StockHistory, StockAlert } from '@/types/inventory';
import { toast } from 'sonner';

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [stockHistory, setStockHistory] = useState<StockHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [alerts, setAlerts] = useState<StockAlert[]>([]);

  useEffect(() => {
    fetchProducts();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel('products-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products'
        },
        () => {
          fetchProducts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchProducts() {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products');
    } else {
      const typedData = (data || []) as Product[];
      setProducts(typedData);
      calculateAlerts(typedData);
    }
    setIsLoading(false);
  }

  function calculateAlerts(products: Product[]) {
    const newAlerts: StockAlert[] = [];
    
    products.forEach(product => {
      if (!product.is_active) return;
      
      if (product.quantity === 0) {
        newAlerts.push({
          product,
          alertType: 'out_of_stock',
          message: `${product.name} is out of stock!`
        });
      } else if (product.quantity <= product.low_stock_threshold) {
        newAlerts.push({
          product,
          alertType: 'low_stock',
          message: `${product.name} is running low (${product.quantity} ${product.unit} left)`
        });
      } else if (product.quantity <= product.reorder_point) {
        newAlerts.push({
          product,
          alertType: 'reorder_point',
          message: `${product.name} has reached reorder point (${product.quantity} ${product.unit})`
        });
      }
    });
    
    setAlerts(newAlerts);
  }

  async function addProduct(product: Omit<Product, 'id' | 'user_id' | 'created_at' | 'updated_at'>) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('You must be logged in');
      return null;
    }

    const { data, error } = await supabase
      .from('products')
      .insert([{ ...product, user_id: user.id }])
      .select()
      .single();

    if (error) {
      console.error('Error adding product:', error);
      toast.error('Failed to add product');
      return null;
    }

    toast.success('Product added successfully');
    return data as Product;
  }

  async function updateProduct(id: string, updates: Partial<Product>) {
    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating product:', error);
      toast.error('Failed to update product');
      return null;
    }

    toast.success('Product updated successfully');
    return data as Product;
  }

  async function deleteProduct(id: string) {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting product:', error);
      toast.error('Failed to delete product');
      return false;
    }

    toast.success('Product deleted successfully');
    return true;
  }

  async function adjustStock(
    productId: string, 
    quantityChange: number, 
    movementType: 'in' | 'out' | 'adjustment' | 'return',
    reference?: string,
    notes?: string
  ) {
    const product = products.find(p => p.id === productId);
    if (!product) {
      toast.error('Product not found');
      return false;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('You must be logged in');
      return false;
    }

    const previousQuantity = product.quantity;
    let newQuantity = previousQuantity;
    
    if (movementType === 'in' || movementType === 'return') {
      newQuantity = previousQuantity + Math.abs(quantityChange);
    } else if (movementType === 'out') {
      newQuantity = previousQuantity - Math.abs(quantityChange);
    } else {
      newQuantity = quantityChange; // Direct adjustment to this value
    }

    if (newQuantity < 0) {
      toast.error('Stock cannot be negative');
      return false;
    }

    // Update product quantity
    const { error: updateError } = await supabase
      .from('products')
      .update({ quantity: newQuantity })
      .eq('id', productId);

    if (updateError) {
      console.error('Error updating stock:', updateError);
      toast.error('Failed to update stock');
      return false;
    }

    // Record stock history
    const { error: historyError } = await supabase
      .from('stock_history')
      .insert([{
        product_id: productId,
        user_id: user.id,
        quantity_change: movementType === 'adjustment' ? newQuantity - previousQuantity : quantityChange,
        previous_quantity: previousQuantity,
        new_quantity: newQuantity,
        movement_type: movementType,
        reference,
        notes,
      }]);

    if (historyError) {
      console.error('Error recording stock history:', historyError);
      // Don't fail the operation, just log
    }

    toast.success('Stock updated successfully');
    fetchProducts();
    return true;
  }

  async function fetchStockHistory(productId?: string) {
    let query = supabase
      .from('stock_history')
      .select('*')
      .order('created_at', { ascending: false });

    if (productId) {
      query = query.eq('product_id', productId);
    }

    const { data, error } = await query.limit(100);

    if (error) {
      console.error('Error fetching stock history:', error);
      return [];
    }

    return (data || []) as StockHistory[];
  }

  return {
    products,
    isLoading,
    alerts,
    addProduct,
    updateProduct,
    deleteProduct,
    adjustStock,
    fetchStockHistory,
    refetch: fetchProducts,
  };
}
