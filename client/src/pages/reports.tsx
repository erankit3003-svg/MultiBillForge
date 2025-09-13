import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getAuthHeaders, hasPermission } from '@/lib/auth';
import { type Invoice, type Customer, type Product } from '@shared/schema';
import { FileSpreadsheet, FileText, TrendingUp, PieChart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function Reports() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [dateRange, setDateRange] = useState('last-30-days');
  const [customerFilter, setCustomerFilter] = useState('all');
  const [productFilter, setProductFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const { toast } = useToast();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation('/login');
    } else if (!isLoading && user && !hasPermission(user, 'reports', 'canRead')) {
      setLocation('/dashboard');
    }
  }, [user, isLoading, setLocation]);

  const { data: invoices } = useQuery({
    queryKey: ['/api/invoices'],
    enabled: !!user && hasPermission(user, 'reports', 'canRead'),
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

  const { data: products } = useQuery({
    queryKey: ['/api/products'],
    enabled: !!user,
    queryFn: async () => {
      const res = await fetch('/api/products', {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch products');
      const data = await res.json();
      return data as Product[];
    },
  });

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user || !hasPermission(user, 'reports', 'canRead')) {
    return null;
  }

  const getCustomerName = (customerId: string) => {
    return customers?.find(c => c.id === customerId)?.name || 'Unknown Customer';
  };

  // Calculate report data
  const filteredInvoices = invoices?.filter((invoice) => {
    const matchesCustomer = customerFilter === 'all' || invoice.customerId === customerFilter;
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    
    // Date filtering logic would go here
    return matchesCustomer && matchesStatus;
  });

  const totalRevenue = filteredInvoices?.reduce((sum, inv) => sum + inv.total, 0) || 0;
  const paidRevenue = filteredInvoices?.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.total, 0) || 0;
  const pendingRevenue = filteredInvoices?.filter(inv => inv.status === 'pending').reduce((sum, inv) => sum + inv.total, 0) || 0;

  // Group by customer for sales report
  const salesByCustomer = filteredInvoices?.reduce((acc, invoice) => {
    const customerName = getCustomerName(invoice.customerId);
    if (!acc[customerName]) {
      acc[customerName] = {
        customerName,
        invoiceCount: 0,
        totalRevenue: 0,
        paidRevenue: 0,
      };
    }
    acc[customerName].invoiceCount++;
    acc[customerName].totalRevenue += invoice.total;
    if (invoice.status === 'paid') {
      acc[customerName].paidRevenue += invoice.total;
    }
    return acc;
  }, {} as Record<string, any>) || {};

  const salesReportData = Object.values(salesByCustomer);

  const handleExportExcel = () => {
    try {
      // Create workbook with multiple sheets
      const workbook = XLSX.utils.book_new();
      
      // Summary sheet
      const summaryData = [
        ['BillMaster Pro - Sales Report'],
        ['Generated on:', new Date().toLocaleDateString()],
        [''],
        ['Summary Statistics'],
        ['Total Revenue:', `$${totalRevenue.toFixed(2)}`],
        ['Paid Revenue:', `$${paidRevenue.toFixed(2)}`],
        ['Pending Revenue:', `$${pendingRevenue.toFixed(2)}`],
        ['Total Invoices:', filteredInvoices?.length || 0],
        [''],
        ['Sales by Customer'],
        ['Customer Name', 'Invoice Count', 'Total Revenue', 'Paid Revenue'],
        ...salesReportData.map(customer => [
          customer.customerName,
          customer.invoiceCount,
          customer.totalRevenue.toFixed(2),
          customer.paidRevenue.toFixed(2)
        ])
      ];
      
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
      
      // Detailed invoices sheet
      if (filteredInvoices && filteredInvoices.length > 0) {
        const invoiceData = [
          ['Invoice Number', 'Customer', 'Date', 'Due Date', 'Status', 'Subtotal', 'Tax', 'Total'],
          ...filteredInvoices.map(invoice => [
            invoice.invoiceNumber,
            getCustomerName(invoice.customerId),
            new Date(invoice.date).toLocaleDateString(),
            new Date(invoice.dueDate).toLocaleDateString(),
            invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1),
            invoice.subtotal?.toFixed(2) || '0.00',
            invoice.tax?.toFixed(2) || '0.00',
            invoice.total.toFixed(2)
          ])
        ];
        
        const invoiceSheet = XLSX.utils.aoa_to_sheet(invoiceData);
        XLSX.utils.book_append_sheet(workbook, invoiceSheet, 'Invoices');
      }
      
      // Generate and download file
      const fileName = `sales-report-${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      
      toast({
        title: 'Success',
        description: 'Excel report downloaded successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate Excel report',
        variant: 'destructive',
      });
    }
  };

  const handleExportPDF = () => {
    try {
      const doc = new jsPDF();
      
      // Title
      doc.setFontSize(20);
      doc.text('BillMaster Pro - Sales Report', 20, 30);
      
      // Subtitle
      doc.setFontSize(12);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 45);
      
      // Summary statistics
      doc.setFontSize(16);
      doc.text('Summary Statistics', 20, 65);
      
      doc.setFontSize(12);
      doc.text(`Total Revenue: $${totalRevenue.toFixed(2)}`, 20, 80);
      doc.text(`Paid Revenue: $${paidRevenue.toFixed(2)}`, 20, 90);
      doc.text(`Pending Revenue: $${pendingRevenue.toFixed(2)}`, 20, 100);
      doc.text(`Total Invoices: ${filteredInvoices?.length || 0}`, 20, 110);
      
      // Sales by Customer table
      if (salesReportData.length > 0) {
        doc.setFontSize(16);
        doc.text('Sales by Customer', 20, 130);
        
        (doc as any).autoTable({
          startY: 140,
          head: [['Customer Name', 'Invoice Count', 'Total Revenue', 'Paid Revenue']],
          body: salesReportData.map(customer => [
            customer.customerName,
            customer.invoiceCount.toString(),
            `$${customer.totalRevenue.toFixed(2)}`,
            `$${customer.paidRevenue.toFixed(2)}`
          ]),
          theme: 'grid',
          styles: { fontSize: 10 },
          headStyles: { fillColor: [66, 139, 202] }
        });
      }
      
      // Add new page for detailed invoices if there are many customers
      if (filteredInvoices && filteredInvoices.length > 0) {
        doc.addPage();
        doc.setFontSize(16);
        doc.text('Invoice Details', 20, 30);
        
        (doc as any).autoTable({
          startY: 40,
          head: [['Invoice #', 'Customer', 'Date', 'Status', 'Total']],
          body: filteredInvoices.slice(0, 50).map(invoice => [ // Limit to 50 for PDF readability
            invoice.invoiceNumber,
            getCustomerName(invoice.customerId),
            new Date(invoice.date).toLocaleDateString(),
            invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1),
            `$${invoice.total.toFixed(2)}`
          ]),
          theme: 'grid',
          styles: { fontSize: 9 },
          headStyles: { fillColor: [66, 139, 202] }
        });
        
        if (filteredInvoices.length > 50) {
          doc.text(`Note: Showing first 50 of ${filteredInvoices.length} invoices`, 20, doc.internal.pageSize.height - 20);
        }
      }
      
      // Download the PDF
      const fileName = `sales-report-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
      toast({
        title: 'Success',
        description: 'PDF report downloaded successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate PDF report',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      <div className="ml-64 p-8">
        <Header
          title="Reports & Analytics"
          description="View detailed business analytics and reports"
        />

        {/* Export Buttons */}
        <div className="flex justify-end items-center space-x-3 mb-6">
          <Button
            onClick={handleExportExcel}
            className="bg-green-600 hover:bg-green-700 text-white flex items-center space-x-2"
            data-testid="button-export-excel"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Export Excel</span>
          </Button>
          <Button
            onClick={handleExportPDF}
            className="bg-red-600 hover:bg-red-700 text-white flex items-center space-x-2"
            data-testid="button-export-pdf"
          >
            <FileText className="h-4 w-4" />
            <span>Export PDF</span>
          </Button>
        </div>

        {/* Report Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Date Range</label>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger data-testid="select-date-range">
                    <SelectValue placeholder="Select date range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="last-30-days">Last 30 Days</SelectItem>
                    <SelectItem value="last-3-months">Last 3 Months</SelectItem>
                    <SelectItem value="last-6-months">Last 6 Months</SelectItem>
                    <SelectItem value="last-year">Last Year</SelectItem>
                    <SelectItem value="custom-range">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Customer</label>
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
                <label className="block text-sm font-medium text-foreground mb-2">Product</label>
                <Select value={productFilter} onValueChange={setProductFilter}>
                  <SelectTrigger data-testid="select-product-filter">
                    <SelectValue placeholder="All Products" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Products</SelectItem>
                    {products?.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger data-testid="select-status-filter">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button
                  className="w-full"
                  onClick={() => toast({ title: 'Filters applied' })}
                  data-testid="button-apply-filters"
                >
                  Apply Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Total Revenue</p>
                  <p className="text-2xl font-bold text-foreground" data-testid="text-total-revenue">
                    ${totalRevenue.toFixed(2)}
                  </p>
                </div>
                <div className="bg-blue-100 text-blue-600 p-3 rounded-lg">
                  <TrendingUp className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Paid Revenue</p>
                  <p className="text-2xl font-bold text-foreground" data-testid="text-paid-revenue">
                    ${paidRevenue.toFixed(2)}
                  </p>
                </div>
                <div className="bg-green-100 text-green-600 p-3 rounded-lg">
                  <TrendingUp className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Pending Revenue</p>
                  <p className="text-2xl font-bold text-foreground" data-testid="text-pending-revenue">
                    ${pendingRevenue.toFixed(2)}
                  </p>
                </div>
                <div className="bg-yellow-100 text-yellow-600 p-3 rounded-lg">
                  <TrendingUp className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Revenue Chart */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Revenue Trend</h3>
              <div className="h-64 bg-muted/30 rounded-lg flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-2" />
                  <p>Revenue Chart</p>
                  <p className="text-sm">Chart implementation needed</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Product Sales Chart */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Sales by Customer</h3>
              <div className="h-64 bg-muted/30 rounded-lg flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <PieChart className="h-12 w-12 mx-auto mb-2" />
                  <p>Customer Sales Chart</p>
                  <p className="text-sm">Chart implementation needed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sales Report Table */}
        <Card>
          <div className="p-6 border-b border-border">
            <h2 className="text-xl font-semibold text-foreground">Sales Report</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-medium text-foreground">Customer</th>
                  <th className="text-left p-4 font-medium text-foreground">Invoices</th>
                  <th className="text-left p-4 font-medium text-foreground">Total Revenue</th>
                  <th className="text-left p-4 font-medium text-foreground">Paid Revenue</th>
                  <th className="text-left p-4 font-medium text-foreground">Collection Rate</th>
                </tr>
              </thead>
              <tbody>
                {salesReportData.length ? (
                  salesReportData.map((item: any, index) => (
                    <tr key={index} className="table-row border-b border-border" data-testid={`row-sales-${index}`}>
                      <td className="p-4">
                        <p className="font-medium text-foreground" data-testid={`text-customer-${index}`}>
                          {item.customerName}
                        </p>
                      </td>
                      <td className="p-4 text-foreground" data-testid={`text-invoices-${index}`}>
                        {item.invoiceCount}
                      </td>
                      <td className="p-4 font-medium text-foreground" data-testid={`text-total-revenue-${index}`}>
                        ${item.totalRevenue.toFixed(2)}
                      </td>
                      <td className="p-4 font-medium text-foreground" data-testid={`text-paid-revenue-${index}`}>
                        ${item.paidRevenue.toFixed(2)}
                      </td>
                      <td className="p-4 text-green-600" data-testid={`text-collection-rate-${index}`}>
                        {item.totalRevenue > 0 ? ((item.paidRevenue / item.totalRevenue) * 100).toFixed(1) : 0}%
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      No sales data found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
