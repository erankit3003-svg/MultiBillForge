import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { apiRequest } from '@/lib/queryClient';
import { insertUserSchema } from '@shared/schema';
import { useAuth } from '@/components/auth/auth-provider';
import { getAuthHeaders, isSuperAdmin } from '@/lib/auth';
import { type Role, type Company, type User } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';

// For editing, password should be optional
const editUserFormSchema = insertUserSchema.extend({
  password: z.string().optional(),
});

type EditUserFormValues = z.infer<typeof editUserFormSchema>;

interface EditUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
}

export function EditUserModal({ open, onOpenChange, user: editUser }: EditUserModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

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

  const form = useForm<EditUserFormValues>({
    resolver: zodResolver(editUserFormSchema),
    defaultValues: {
      companyId: user?.companyId || '',
      roleId: '',
      email: '',
      password: '',
      name: '',
      isActive: true,
    },
  });

  // Update form when editUser changes
  useEffect(() => {
    if (editUser) {
      form.reset({
        companyId: editUser.companyId,
        roleId: editUser.roleId,
        email: editUser.email,
        name: editUser.name,
        isActive: editUser.isActive,
        password: '', // Don't pre-fill password for security
      });
    }
  }, [editUser, form]);

  const updateUserMutation = useMutation({
    mutationFn: async (data: EditUserFormValues) => {
      if (!editUser) throw new Error('No user to update');
      
      // If password is empty, don't include it in the update
      const updateData = { ...data };
      if (!updateData.password || updateData.password.trim() === '') {
        delete updateData.password;
      }
      
      const res = await apiRequest('PUT', `/api/users/${editUser.id}`, updateData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: 'Success',
        description: 'User updated successfully',
      });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update user',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: EditUserFormValues) => {
    updateUserMutation.mutate(data);
  };

  // Filter roles based on user permissions
  const availableRoles = roles?.filter(role => {
    if (isSuperAdmin(user)) {
      return true; // Super admins can assign any role
    }
    // Company admins can't create super admins or other company admins
    return role.name !== 'Super Admin' && role.name !== 'Company Admin';
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" data-testid="form-edit-user">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Enter full name"
                      data-testid="input-user-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="email"
                      placeholder="user@company.com"
                      data-testid="input-user-email"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password (leave empty to keep current)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="password"
                      placeholder="Enter new password or leave empty"
                      data-testid="input-user-password"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isSuperAdmin(user) && (
              <FormField
                control={form.control}
                name="companyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-user-company">
                          <SelectValue placeholder="Select company" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {companies?.map((company) => (
                          <SelectItem key={company.id} value={company.id}>
                            {company.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="roleId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-user-role">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableRoles?.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="checkbox-user-active"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Active User</FormLabel>
                  </div>
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel-user"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateUserMutation.isPending}
                data-testid="button-update-user"
              >
                {updateUserMutation.isPending ? 'Updating...' : 'Update User'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}