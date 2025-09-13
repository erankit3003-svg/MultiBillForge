import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ViewInvoiceModal } from '@/components/modals/view-invoice-modal';
import { getAuthHeaders } from '@/lib/auth';
import { type DashboardStats, type Invoice, type Customer } from '@shared/schema';
import { DollarSign, Users, Clock, Package, Eye, Download, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Dashboard() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingInvoiceId, setViewingInvoiceId] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation('/login');
    }
  }, [user, isLoading, setLocation]);

  const { data: stats } = useQuery({
    queryKey: ['/api/dashboard/stats'],
    enabled: !!user,
    queryFn: async () => {
      const res = await fetch('/api/dashboard/stats', {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch stats');
      const data = await res.json();
      return data as DashboardStats;
    },
  });

  const { data: recentInvoices } = useQuery({
    queryKey: ['/api/invoices'],
    enabled: !!user,
    queryFn: async () => {
      const res = await fetch('/api/invoices', {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch invoices');
      const invoices = await res.json() as Invoice[];
      return invoices.slice(0, 5); // Get latest 5
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

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
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

  const handleViewInvoice = (invoiceId: string) => {
    setViewingInvoiceId(invoiceId);
    setShowViewModal(true);
  };

  const handleEditInvoice = (invoiceId: string) => {
    // Navigate to invoice edit or open modal
    setLocation(`/invoices`); // For now, navigate to invoices page
    toast({
      title: 'Info',
      description: 'Redirected to invoices page for editing',
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      <div className="ml-64 p-8">
        <Header
          title="Dashboard"
          description={`Welcome back, ${user.name}. Manage your billing operations`}
          action={{
            label: 'Create Invoice',
            onClick: () => setLocation('/invoices'),
          }}
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Total Revenue</p>
                  <p className="text-2xl font-bold text-foreground" data-testid="text-total-revenue">
                    ${stats?.totalRevenue?.toFixed(2) || '0.00'}
                  </p>
                </div>
                <div className="bg-green-100 text-green-600 p-3 rounded-lg">
                  <DollarSign className="h-6 w-6" />
                </div>
              </div>
              <p className="text-green-600 text-sm mt-2">+12.5% from last month</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Active Customers</p>
                  <p className="text-2xl font-bold text-foreground" data-testid="text-active-customers">
                    {stats?.activeCustomers || 0}
                  </p>
                </div>
                <div className="bg-blue-100 text-blue-600 p-3 rounded-lg">
                  <Users className="h-6 w-6" />
                </div>
              </div>
              <p className="text-blue-600 text-sm mt-2">+8 new this month</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Pending Invoices</p>
                  <p className="text-2xl font-bold text-foreground" data-testid="text-pending-invoices">
                    {stats?.pendingInvoices || 0}
                  </p>
                </div>
                <div className="bg-yellow-100 text-yellow-600 p-3 rounded-lg">
                  <Clock className="h-6 w-6" />
                </div>
              </div>
              <p className="text-yellow-600 text-sm mt-2">$12,450 pending</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Products Sold</p>
                  <p className="text-2xl font-bold text-foreground" data-testid="text-products-sold">
                    {stats?.productsSold || 0}
                  </p>
                </div>
                <div className="bg-purple-100 text-purple-600 p-3 rounded-lg">
                  <Package className="h-6 w-6" />
                </div>
              </div>
              <p className="text-purple-600 text-sm mt-2">+15% from last month</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Invoices Table */}
        <Card>
          <div className="p-6 border-b border-border">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-foreground">Recent Invoices</h2>
              <Button variant="ghost" onClick={() => setLocation('/invoices')} data-testid="button-view-all-invoices">
                View all
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-medium text-foreground">Invoice #</th>
                  <th className="text-left p-4 font-medium text-foreground">Customer</th>
                  <th className="text-left p-4 font-medium text-foreground">Date</th>
                  <th className="text-left p-4 font-medium text-foreground">Amount</th>
                  <th className="text-left p-4 font-medium text-foreground">Status</th>
                  <th className="text-left p-4 font-medium text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentInvoices?.length ? (
                  recentInvoices.map((invoice) => (
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
                            onClick={() => handleViewInvoice(invoice.id)}
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
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Edit"
                            onClick={() => handleEditInvoice(invoice.id)}
                            data-testid={`button-edit-invoice-${invoice.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      No invoices found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <ViewInvoiceModal
          open={showViewModal}
          onOpenChange={setShowViewModal}
          invoiceId={viewingInvoiceId}
        />
      </div>
    </div>
  );
}
