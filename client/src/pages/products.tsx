import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreateProductModal } from '@/components/modals/create-product-modal';
import { getAuthHeaders, hasPermission } from '@/lib/auth';
import { apiRequest } from '@/lib/queryClient';
import { type Product } from '@shared/schema';
import { Package, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Products() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation('/login');
    } else if (!isLoading && user && !hasPermission(user, 'products', 'canRead')) {
      setLocation('/dashboard');
    }
  }, [user, isLoading, setLocation]);

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['/api/products'],
    enabled: !!user && hasPermission(user, 'products', 'canRead'),
    queryFn: async () => {
      const res = await fetch('/api/products', {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch products');
      const data = await res.json();
      return data as Product[];
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      toast({
        title: 'Success',
        description: 'Product deleted successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to delete product',
        variant: 'destructive',
      });
    },
  });

  if (isLoading || productsLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user || !hasPermission(user, 'products', 'canRead')) {
    return null;
  }

  const categories = products ? Array.from(new Set(products.map(p => p.category).filter(Boolean))) : [];

  const filteredProducts = products?.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  const handleDeleteProduct = (id: string) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      deleteProductMutation.mutate(id);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      <div className="ml-64 p-8">
        <Header
          title="Product Management"
          description="Manage your products and services"
          action={hasPermission(user, 'products', 'canCreate') ? {
            label: 'Add Product',
            onClick: () => setShowCreateModal(true),
          } : undefined}
        />

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Input
                  type="search"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  data-testid="input-search-products"
                />
              </div>
              
              <div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger data-testid="select-category-filter">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category!}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchTerm('');
                    setCategoryFilter('all');
                  }}
                  data-testid="button-clear-filters"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Products Table */}
        <Card>
          <div className="p-6 border-b border-border">
            <h2 className="text-xl font-semibold text-foreground">Products</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-medium text-foreground">Product</th>
                  <th className="text-left p-4 font-medium text-foreground">Category</th>
                  <th className="text-left p-4 font-medium text-foreground">Price</th>
                  <th className="text-left p-4 font-medium text-foreground">Unit</th>
                  <th className="text-left p-4 font-medium text-foreground">Created</th>
                  <th className="text-left p-4 font-medium text-foreground">Status</th>
                  <th className="text-left p-4 font-medium text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts?.length ? (
                  filteredProducts.map((product) => (
                    <tr key={product.id} className="table-row border-b border-border" data-testid={`row-product-${product.id}`}>
                      <td className="p-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-primary text-primary-foreground rounded-lg flex items-center justify-center">
                            <Package className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground" data-testid={`text-product-name-${product.id}`}>
                              {product.name}
                            </p>
                            {product.description && (
                              <p className="text-sm text-muted-foreground" data-testid={`text-product-description-${product.id}`}>
                                {product.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-foreground" data-testid={`text-product-category-${product.id}`}>
                        {product.category || '-'}
                      </td>
                      <td className="p-4 font-medium text-foreground" data-testid={`text-product-price-${product.id}`}>
                        ${product.price.toFixed(2)}
                      </td>
                      <td className="p-4 text-foreground" data-testid={`text-product-unit-${product.id}`}>
                        {product.unit || '-'}
                      </td>
                      <td className="p-4 text-muted-foreground" data-testid={`text-product-created-${product.id}`}>
                        {new Date(product.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-4">
                        <span
                          className={`status-badge ${product.isActive ? 'status-active' : 'status-inactive'}`}
                          data-testid={`status-product-${product.id}`}
                        >
                          {product.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          {hasPermission(user, 'products', 'canUpdate') && (
                            <Button variant="ghost" size="sm" title="Edit" data-testid={`button-edit-product-${product.id}`}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {hasPermission(user, 'products', 'canDelete') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Delete"
                              onClick={() => handleDeleteProduct(product.id)}
                              className="text-destructive hover:text-destructive/80"
                              data-testid={`button-delete-product-${product.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      No products found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <CreateProductModal
          open={showCreateModal}
          onOpenChange={setShowCreateModal}
        />
      </div>
    </div>
  );
}
