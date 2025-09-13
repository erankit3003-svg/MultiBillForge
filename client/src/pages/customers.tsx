import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CreateCustomerModal } from '@/components/modals/create-customer-modal';
import { getAuthHeaders, hasPermission } from '@/lib/auth';
import { apiRequest } from '@/lib/queryClient';
import { type Customer } from '@shared/schema';
import { Contact, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Customers() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation('/login');
    } else if (!isLoading && user && !hasPermission(user, 'customers', 'canRead')) {
      setLocation('/dashboard');
    }
  }, [user, isLoading, setLocation]);

  const { data: customers, isLoading: customersLoading } = useQuery({
    queryKey: ['/api/customers'],
    enabled: !!user && hasPermission(user, 'customers', 'canRead'),
    queryFn: async () => {
      const res = await fetch('/api/customers', {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch customers');
      const data = await res.json();
      return data as Customer[];
    },
  });

  const deleteCustomerMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/customers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      toast({
        title: 'Success',
        description: 'Customer deleted successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to delete customer',
        variant: 'destructive',
      });
    },
  });

  if (isLoading || customersLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user || !hasPermission(user, 'customers', 'canRead')) {
    return null;
  }

  const filteredCustomers = customers?.filter((customer) => {
    return customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
           (customer.phone && customer.phone.toLowerCase().includes(searchTerm.toLowerCase()));
  });

  const handleDeleteCustomer = (id: string) => {
    if (window.confirm('Are you sure you want to delete this customer?')) {
      deleteCustomerMutation.mutate(id);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      <div className="ml-64 p-8">
        <Header
          title="Customer Management"
          description="Manage your customers and their information"
          action={hasPermission(user, 'customers', 'canCreate') ? {
            label: 'Add Customer',
            onClick: () => setShowCreateModal(true),
          } : undefined}
        />

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Input
                  type="search"
                  placeholder="Search customers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  data-testid="input-search-customers"
                />
              </div>

              <div>
                <Button 
                  variant="outline" 
                  onClick={() => setSearchTerm('')}
                  data-testid="button-clear-search"
                >
                  Clear Search
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customers Table */}
        <Card>
          <div className="p-6 border-b border-border">
            <h2 className="text-xl font-semibold text-foreground">Customers</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-medium text-foreground">Customer</th>
                  <th className="text-left p-4 font-medium text-foreground">Contact</th>
                  <th className="text-left p-4 font-medium text-foreground">Address</th>
                  <th className="text-left p-4 font-medium text-foreground">Tax ID</th>
                  <th className="text-left p-4 font-medium text-foreground">Created</th>
                  <th className="text-left p-4 font-medium text-foreground">Status</th>
                  <th className="text-left p-4 font-medium text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers?.length ? (
                  filteredCustomers.map((customer) => (
                    <tr key={customer.id} className="table-row border-b border-border" data-testid={`row-customer-${customer.id}`}>
                      <td className="p-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center">
                            <Contact className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground" data-testid={`text-customer-name-${customer.id}`}>
                              {customer.name}
                            </p>
                            <p className="text-sm text-muted-foreground" data-testid={`text-customer-email-${customer.id}`}>
                              {customer.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div>
                          <p className="text-foreground" data-testid={`text-customer-phone-${customer.id}`}>
                            {customer.phone || '-'}
                          </p>
                        </div>
                      </td>
                      <td className="p-4 text-foreground" data-testid={`text-customer-address-${customer.id}`}>
                        {customer.address || '-'}
                      </td>
                      <td className="p-4 text-foreground" data-testid={`text-customer-taxid-${customer.id}`}>
                        {customer.taxId || '-'}
                      </td>
                      <td className="p-4 text-muted-foreground" data-testid={`text-customer-created-${customer.id}`}>
                        {new Date(customer.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-4">
                        <span
                          className={`status-badge ${customer.isActive ? 'status-active' : 'status-inactive'}`}
                          data-testid={`status-customer-${customer.id}`}
                        >
                          {customer.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          {hasPermission(user, 'customers', 'canUpdate') && (
                            <Button variant="ghost" size="sm" title="Edit" data-testid={`button-edit-customer-${customer.id}`}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {hasPermission(user, 'customers', 'canDelete') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Delete"
                              onClick={() => handleDeleteCustomer(customer.id)}
                              className="text-destructive hover:text-destructive/80"
                              data-testid={`button-delete-customer-${customer.id}`}
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
                      No customers found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <CreateCustomerModal
          open={showCreateModal}
          onOpenChange={setShowCreateModal}
        />
      </div>
    </div>
  );
}
