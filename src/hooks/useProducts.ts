import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Product } from '../types';

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Convertir datos de la base de datos al formato de la aplicación
  const transformFromDB = (dbProduct: any): Product => ({
    id: dbProduct.id,
    code: dbProduct.code,
    name: dbProduct.name,
    description: dbProduct.description,
    category: dbProduct.category,
    brand: dbProduct.brand,
    costPrice: dbProduct.cost_price,
    salePrice: dbProduct.sale_price,
    profitPercentage: dbProduct.profit_percentage,
    currentStock: dbProduct.current_stock,
    minStock: dbProduct.min_stock,
    maxStock: dbProduct.max_stock,
    expirationDate: dbProduct.expiration_date,
    imageUrl: dbProduct.image_url,
    createdAt: dbProduct.created_at,
    updatedAt: dbProduct.updated_at,
  });

  // Convertir datos de la aplicación al formato de la base de datos
  const transformToDB = (product: Product) => ({
    id: product.id,
    code: product.code,
    name: product.name,
    description: product.description,
    category: product.category,
    brand: product.brand,
    cost_price: product.costPrice,
    sale_price: product.salePrice,
    profit_percentage: product.profitPercentage,
    current_stock: product.currentStock,
    min_stock: product.minStock,
    max_stock: product.maxStock,
    expiration_date: product.expirationDate || null,
    image_url: product.imageUrl || null,
    created_at: product.createdAt,
    updated_at: product.updatedAt,
  });

  // Cargar productos
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const transformedProducts = data?.map(transformFromDB) || [];
      setProducts(transformedProducts);
      setError(null);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Error al cargar productos');
    } finally {
      setLoading(false);
    }
  };

  // Agregar producto
  const addProduct = async (product: Product) => {
    try {
      const dbProduct = transformToDB(product);
      const { data, error } = await supabase
        .from('products')
        .insert([dbProduct])
        .select()
        .single();

      if (error) throw error;

      const newProduct = transformFromDB(data);
      setProducts(prev => [newProduct, ...prev]);
      return newProduct;
    } catch (err) {
      console.error('Error adding product:', err);
      throw new Error('Error al agregar producto');
    }
  };

  // Actualizar producto
  const updateProduct = async (product: Product) => {
    try {
      const dbProduct = transformToDB(product);
      const { data, error } = await supabase
        .from('products')
        .update(dbProduct)
        .eq('id', product.id)
        .select()
        .single();

      if (error) throw error;

      const updatedProduct = transformFromDB(data);
      setProducts(prev => prev.map(p => p.id === product.id ? updatedProduct : p));
      return updatedProduct;
    } catch (err) {
      console.error('Error updating product:', err);
      throw new Error('Error al actualizar producto');
    }
  };

  // Eliminar producto
  const deleteProduct = async (productId: string) => {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;

      setProducts(prev => prev.filter(p => p.id !== productId));
    } catch (err) {
      console.error('Error deleting product:', err);
      throw new Error('Error al eliminar producto');
    }
  };

  // Suscripción a cambios en tiempo real
  useEffect(() => {
    fetchProducts();

    // Configurar suscripción en tiempo real
    const subscription = supabase
      .channel('products_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products'
        },
        (payload) => {
          console.log('Product change detected:', payload);
          
          switch (payload.eventType) {
            case 'INSERT':
              const newProduct = transformFromDB(payload.new);
              setProducts(prev => {
                // Evitar duplicados
                if (prev.some(p => p.id === newProduct.id)) return prev;
                return [newProduct, ...prev];
              });
              break;
              
            case 'UPDATE':
              const updatedProduct = transformFromDB(payload.new);
              setProducts(prev => prev.map(p => 
                p.id === updatedProduct.id ? updatedProduct : p
              ));
              break;
              
            case 'DELETE':
              setProducts(prev => prev.filter(p => p.id !== payload.old.id));
              break;
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return {
    products,
    loading,
    error,
    addProduct,
    updateProduct,
    deleteProduct,
    refetch: fetchProducts,
  };
}