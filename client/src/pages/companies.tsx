import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CreateCompanyModal } from '@/components/modals/create-company-modal';
import { EditCompanyModal } from '@/components/modals/edit-company-modal';
import { getAuthHeaders, isSuperAdmin } from '@/lib/auth';
import { apiRequest } from '@/lib/queryClient';
import { type Company } from '@shared/schema';
import { Building, Edit, Users, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Companies() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation('/login');
    } else if (!isLoading && user && !isSuperAdmin(user)) {
      setLocation('/dashboard');
    }
  }, [user, isLoading, setLocation]);

  const { data: companies, isLoading: companiesLoading } = useQuery({
    queryKey: ['/api/companies'],
    enabled: !!user && isSuperAdmin(user),
    queryFn: async () => {
      const res = await fetch('/api/companies', {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch companies');
      const data = await res.json();
      return data as Company[];
    },
  });

  const deleteCompanyMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/companies/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/companies'] });
      toast({
        title: 'Success',
        description: 'Company deleted successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to delete company',
        variant: 'destructive',
      });
    },
  });

  if (isLoading || companiesLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user || !isSuperAdmin(user)) {
    return null;
  }

  const filteredCompanies = companies?.filter((company) =>
    company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDeleteCompany = (id: string) => {
    if (window.confirm('Are you sure you want to delete this company?')) {
      deleteCompanyMutation.mutate(id);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      <div className="ml-64 p-8">
        <Header
          title="Company Management"
          description="Manage all companies in the system"
          action={{
            label: 'Add Company',
            onClick: () => setShowCreateModal(true),
          }}
        />

        {/* Companies Table */}
        <Card>
          <div className="p-6 border-b border-border">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-foreground">Companies</h2>
              <Input
                type="search"
                placeholder="Search companies..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
                data-testid="input-search-companies"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-medium text-foreground">Company</th>
                  <th className="text-left p-4 font-medium text-foreground">Contact</th>
                  <th className="text-left p-4 font-medium text-foreground">Created</th>
                  <th className="text-left p-4 font-medium text-foreground">Status</th>
                  <th className="text-left p-4 font-medium text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCompanies?.length ? (
                  filteredCompanies.map((company) => (
                    <tr key={company.id} className="table-row border-b border-border" data-testid={`row-company-${company.id}`}>
                      <td className="p-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-primary text-primary-foreground rounded-lg flex items-center justify-center">
                            <Building className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground" data-testid={`text-company-name-${company.id}`}>
                              {company.name}
                            </p>
                            <p className="text-sm text-muted-foreground" data-testid={`text-company-slug-${company.id}`}>
                              {company.slug}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div>
                          {company.email && (
                            <p className="font-medium text-foreground" data-testid={`text-company-email-${company.id}`}>
                              {company.email}
                            </p>
                          )}
                          {company.phone && (
                            <p className="text-sm text-muted-foreground" data-testid={`text-company-phone-${company.id}`}>
                              {company.phone}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-muted-foreground" data-testid={`text-company-created-${company.id}`}>
                        {new Date(company.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-4">
                        <span
                          className={`status-badge ${company.isActive ? 'status-active' : 'status-inactive'}`}
                          data-testid={`status-company-${company.id}`}
                        >
                          {company.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            title="Edit"
                            onClick={() => {
                              setEditingCompany(company);
                              setShowEditModal(true);
                            }}
                            data-testid={`button-edit-company-${company.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            title="Manage Users"
                            onClick={() => {
                              setLocation(`/users?companyId=${company.id}`);
                            }}
                            data-testid={`button-manage-users-${company.id}`}
                          >
                            <Users className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Delete"
                            onClick={() => handleDeleteCompany(company.id)}
                            className="text-destructive hover:text-destructive/80"
                            data-testid={`button-delete-company-${company.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      No companies found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <CreateCompanyModal
          open={showCreateModal}
          onOpenChange={setShowCreateModal}
        />
        
        <EditCompanyModal
          open={showEditModal}
          onOpenChange={setShowEditModal}
          company={editingCompany}
        />
      </div>
    </div>
  );
}
