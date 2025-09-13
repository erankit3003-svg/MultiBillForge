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
import { CreateUserModal } from '@/components/modals/create-user-modal';
import { EditUserModal } from '@/components/modals/edit-user-modal';
import { getAuthHeaders, hasPermission, isSuperAdmin } from '@/lib/auth';
import { apiRequest } from '@/lib/queryClient';
import { type User, type Role, type Company } from '@shared/schema';
import { Users as UsersIcon, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Users() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Set company filter from URL parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const companyId = urlParams.get('companyId');
    if (companyId) {
      setCompanyFilter(companyId);
    }
  }, []);

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation('/login');
    } else if (!isLoading && user && !hasPermission(user, 'users', 'canRead')) {
      setLocation('/dashboard');
    }
  }, [user, isLoading, setLocation]);

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['/api/users'],
    enabled: !!user && hasPermission(user, 'users', 'canRead'),
    queryFn: async () => {
      const res = await fetch('/api/users', {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      return data as User[];
    },
  });

  const { data: roles } = useQuery({
    queryKey: ['/api/roles'],
    enabled: !!user,
    queryFn: async () => {
      const res = await fetch('/api/roles', {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch roles');
      const data = await res.json();
      return data as Role[];
    },
  });

  const { data: companies } = useQuery({
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

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: 'Success',
        description: 'User deleted successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to delete user',
        variant: 'destructive',
      });
    },
  });

  if (isLoading || usersLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user || !hasPermission(user, 'users', 'canRead')) {
    return null;
  }

  const getRoleName = (roleId: string) => {
    return roles?.find(r => r.id === roleId)?.name || 'Unknown Role';
  };

  const getCompanyName = (companyId: string) => {
    return companies?.find(c => c.id === companyId)?.name || 'Unknown Company';
  };

  const filteredUsers = users?.filter((userItem) => {
    const matchesSearch = userItem.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         userItem.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || userItem.roleId === roleFilter;
    const matchesCompany = companyFilter === 'all' || userItem.companyId === companyFilter;
    
    return matchesSearch && matchesRole && matchesCompany;
  });

  const handleDeleteUser = (id: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      deleteUserMutation.mutate(id);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      <div className="ml-64 p-8">
        <Header
          title="User Management"
          description="Manage users and their permissions"
          action={hasPermission(user, 'users', 'canCreate') ? {
            label: 'Add User',
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
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  data-testid="input-search-users"
                />
              </div>
              
              <div>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger data-testid="select-role-filter">
                    <SelectValue placeholder="All Roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    {roles?.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {isSuperAdmin(user) && (
                <div>
                  <Select value={companyFilter} onValueChange={setCompanyFilter}>
                    <SelectTrigger data-testid="select-company-filter">
                      <SelectValue placeholder="All Companies" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Companies</SelectItem>
                      {companies?.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchTerm('');
                    setRoleFilter('all');
                    setCompanyFilter('all');
                  }}
                  data-testid="button-clear-filters"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <div className="p-6 border-b border-border">
            <h2 className="text-xl font-semibold text-foreground">Users</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-medium text-foreground">User</th>
                  <th className="text-left p-4 font-medium text-foreground">Role</th>
                  {isSuperAdmin(user) && (
                    <th className="text-left p-4 font-medium text-foreground">Company</th>
                  )}
                  <th className="text-left p-4 font-medium text-foreground">Created</th>
                  <th className="text-left p-4 font-medium text-foreground">Status</th>
                  <th className="text-left p-4 font-medium text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers?.length ? (
                  filteredUsers.map((userItem) => (
                    <tr key={userItem.id} className="table-row border-b border-border" data-testid={`row-user-${userItem.id}`}>
                      <td className="p-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center">
                            <UsersIcon className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground" data-testid={`text-user-name-${userItem.id}`}>
                              {userItem.name}
                            </p>
                            <p className="text-sm text-muted-foreground" data-testid={`text-user-email-${userItem.id}`}>
                              {userItem.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-foreground" data-testid={`text-user-role-${userItem.id}`}>
                        {getRoleName(userItem.roleId)}
                      </td>
                      {isSuperAdmin(user) && (
                        <td className="p-4 text-foreground" data-testid={`text-user-company-${userItem.id}`}>
                          {getCompanyName(userItem.companyId)}
                        </td>
                      )}
                      <td className="p-4 text-muted-foreground" data-testid={`text-user-created-${userItem.id}`}>
                        {new Date(userItem.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-4">
                        <span
                          className={`status-badge ${userItem.isActive ? 'status-active' : 'status-inactive'}`}
                          data-testid={`status-user-${userItem.id}`}
                        >
                          {userItem.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          {hasPermission(user, 'users', 'canUpdate') && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              title="Edit"
                              onClick={() => {
                                setEditingUser(userItem);
                                setShowEditModal(true);
                              }}
                              data-testid={`button-edit-user-${userItem.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {hasPermission(user, 'users', 'canDelete') && userItem.id !== user.id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Delete"
                              onClick={() => handleDeleteUser(userItem.id)}
                              className="text-destructive hover:text-destructive/80"
                              data-testid={`button-delete-user-${userItem.id}`}
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
                    <td colSpan={isSuperAdmin(user) ? 6 : 5} className="p-8 text-center text-muted-foreground">
                      No users found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <CreateUserModal
          open={showCreateModal}
          onOpenChange={setShowCreateModal}
        />

        <EditUserModal
          open={showEditModal}
          onOpenChange={setShowEditModal}
          user={editingUser}
        />
      </div>
    </div>
  );
}
