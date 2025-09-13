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
import { CreateInvoiceModal } from '@/components/modals/create-invoice-modal';
import { getAuthHeaders, hasPermission } from '@/lib/auth';
import { apiRequest } from '@/lib/queryClient';
import { type Invoice, type Customer } from '@shared/schema';
import { FileText, Eye, Download, Edit, Mail, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Invoices() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [customerFilter, setCustomerFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation('/login');
    } else if (!isLoading && user && !hasPermission(user, 'invoices', 'canRead')) {
      setLocation('/dashboard');
    }
  }, [user, isLoading, setLocation]);

  const { data: invoices, isLoading: invoicesLoading } = useQuery({
    queryKey: ['/api/invoices'],
    enabled: !!user && hasPermission(user, 'invoices', 'canRead'),
    queryFn: async () => {
      const res = await fetch('/api/invoices', {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch invoices');
      const data = await res.json();
      return data as Invoice[];
    },
  });

  const { data: customers } = useQuery({
    queryKey: ['/api/customers'],
    enabled: !!user,
    queryFn: async () => {
      const res = await fetch('/api/customers', {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch customers');
      const data = await res.json();
      return data as Customer[];
    },
  });

  const deleteInvoiceMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/invoices/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      toast({
        title: 'Success',
        description: 'Invoice deleted successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to delete invoice',
        variant: 'destructive',
      });
    },
  });

  if (isLoading || invoicesLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user || !hasPermission(user, 'invoices', 'canRead')) {
    return null;
  }

  const getCustomerName = (customerId: string) => {
    return customers?.find(c => c.id === customerId)?.name || 'Unknown Customer';
  };

  const getCustomerEmail = (customerId: string) => {
    return customers?.find(c => c.id === customerId)?.email || '';
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "status-badge";
    switch (status) {
      case 'paid':
        return `${baseClasses} status-paid`;
      case 'pending':
        return `${baseClasses} status-pending`;
      case 'overdue':
        return `${baseClasses} status-overdue`;
      case 'cancelled':
        return `${baseClasses} status-cancelled`;
      default:
        return `${baseClasses} status-pending`;
    }
  };

  const filteredInvoices = invoices?.filter((invoice) => {
    const customerName = getCustomerName(invoice.customerId);
    const matchesSearch = invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    const matchesCustomer = customerFilter === 'all' || invoice.customerId === customerFilter;
    
    return matchesSearch && matchesStatus && matchesCustomer;
  });

  const handleDeleteInvoice = (id: string) => {
    if (window.confirm('Are you sure you want to delete this invoice?')) {
      deleteInvoiceMutation.mutate(id);
    }
  };

  const handleDownloadPDF = async (invoiceId: string) => {
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/pdf`, {
        headers: getAuthHeaders(),
      });
      
      if (!res.ok) throw new Error('Failed to generate PDF');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `invoice-${invoiceId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: 'Success',
        description: 'PDF downloaded successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to download PDF',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      <div className="ml-64 p-8">
        <Header
          title="Invoice Management"
          description="Create and manage your invoices"
          action={hasPermission(user, 'invoices', 'canCreate') ? {
            label: 'Create Invoice',
            onClick: () => setShowCreateModal(true),
          } : undefined}
        />

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <Input
                  type="search"
                  placeholder="Search invoices..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  data-testid="input-search-invoices"
                />
              </div>
              
              <div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger data-testid="select-status-filter">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Select value={customerFilter} onValueChange={setCustomerFilter}>
                  <SelectTrigger data-testid="select-customer-filter">
                    <SelectValue placeholder="All Customers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Customers</SelectItem>
                    {customers?.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Input
                  type="date"
                  placeholder="Date From"
                  data-testid="input-date-from"
                />
              </div>

              <div>
                <Input
                  type="date"
                  placeholder="Date To"
                  data-testid="input-date-to"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Invoices Table */}
        <Card>
          <div className="p-6 border-b border-border">
            <h2 className="text-xl font-semibold text-foreground">All Invoices</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-medium text-foreground">Invoice #</th>
                  <th className="text-left p-4 font-medium text-foreground">Customer</th>
                  <th className="text-left p-4 font-medium text-foreground">Date</th>
                  <th className="text-left p-4 font-medium text-foreground">Due Date</th>
                  <th className="text-left p-4 font-medium text-foreground">Amount</th>
                  <th className="text-left p-4 font-medium text-foreground">Status</th>
                  <th className="text-left p-4 font-medium text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices?.length ? (
                  filteredInvoices.map((invoice) => (
                    <tr key={invoice.id} className="table-row border-b border-border" data-testid={`row-invoice-${invoice.id}`}>
                      <td className="p-4">
                        <span className="font-mono text-primary" data-testid={`text-invoice-number-${invoice.id}`}>
                          #{invoice.invoiceNumber}
                        </span>
                      </td>
                      <td className="p-4">
                        <div>
                          <p className="font-medium text-foreground" data-testid={`text-customer-name-${invoice.id}`}>
                            {getCustomerName(invoice.customerId)}
                          </p>
                          <p className="text-sm text-muted-foreground" data-testid={`text-customer-email-${invoice.id}`}>
                            {getCustomerEmail(invoice.customerId)}
                          </p>
                        </div>
                      </td>
                      <td className="p-4 text-muted-foreground" data-testid={`text-invoice-date-${invoice.id}`}>
                        {new Date(invoice.date).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-muted-foreground" data-testid={`text-invoice-due-${invoice.id}`}>
                        {new Date(invoice.dueDate).toLocaleDateString()}
                      </td>
                      <td className="p-4 font-medium text-foreground" data-testid={`text-invoice-amount-${invoice.id}`}>
                        ${invoice.total.toFixed(2)}
                      </td>
                      <td className="p-4">
                        <span className={getStatusBadge(invoice.status)} data-testid={`status-invoice-${invoice.id}`}>
                          {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            title="View"
                            onClick={() => {
                              alert(`View invoice: ${invoice.invoiceNumber}`);
                            }}
                            data-testid={`button-view-invoice-${invoice.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Download PDF"
                            onClick={() => handleDownloadPDF(invoice.id)}
                            data-testid={`button-download-invoice-${invoice.id}`}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          {hasPermission(user, 'invoices', 'canUpdate') && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              title="Edit"
                              onClick={() => {
                                alert(`Edit invoice: ${invoice.invoiceNumber}`);
                              }}
                              data-testid={`button-edit-invoice-${invoice.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            title="Send Email"
                            onClick={() => {
                              alert(`Send email for invoice: ${invoice.invoiceNumber}`);
                            }}
                            data-testid={`button-email-invoice-${invoice.id}`}
                          >
                            <Mail className="h-4 w-4" />
                          </Button>
                          {hasPermission(user, 'invoices', 'canDelete') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Delete"
                              onClick={() => handleDeleteInvoice(invoice.id)}
                              className="text-destructive hover:text-destructive/80"
                              data-testid={`button-delete-invoice-${invoice.id}`}
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
                      No invoices found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <CreateInvoiceModal
          open={showCreateModal}
          onOpenChange={setShowCreateModal}
        />
      </div>
    </div>
  );
}
