import { useMutation, useQueryClient } from '@tanstack/react-query';
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
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { apiRequest } from '@/lib/queryClient';
import { insertCompanySchema, type Company } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';

const editCompanyFormSchema = insertCompanySchema;

type EditCompanyFormValues = z.infer<typeof editCompanyFormSchema>;

interface EditCompanyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company: Company | null;
}

export function EditCompanyModal({ open, onOpenChange, company }: EditCompanyModalProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<EditCompanyFormValues>({
    resolver: zodResolver(editCompanyFormSchema),
    defaultValues: {
      name: '',
      slug: '',
      logoUrl: '',
      address: '',
      phone: '',
      email: '',
      website: '',
      isActive: true,
    },
  });

  // Update form when company changes
  useEffect(() => {
    if (company) {
      form.reset({
        name: company.name,
        slug: company.slug,
        logoUrl: company.logoUrl || '',
        address: company.address || '',
        phone: company.phone || '',
        email: company.email || '',
        website: company.website || '',
        isActive: company.isActive,
      });
    }
  }, [company, form]);

  const updateCompanyMutation = useMutation({
    mutationFn: async (data: EditCompanyFormValues) => {
      if (!company) throw new Error('No company to update');
      const res = await apiRequest('PUT', `/api/companies/${company.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/companies'] });
      toast({
        title: 'Success',
        description: 'Company updated successfully',
      });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update company',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: EditCompanyFormValues) => {
    updateCompanyMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Company</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" data-testid="form-edit-company">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Enter company name"
                      data-testid="input-company-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Slug</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Enter company slug"
                      data-testid="input-company-slug"
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
                      placeholder="Enter company email"
                      data-testid="input-company-email"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Enter phone number"
                      data-testid="input-company-phone"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Enter website URL"
                      data-testid="input-company-website"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Enter company address"
                      rows={3}
                      data-testid="textarea-company-address"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="logoUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Logo URL</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Enter logo URL"
                      data-testid="input-company-logo"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="checkbox-company-active"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Active Company
                    </FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Company is active and can be used for business operations
                    </p>
                  </div>
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateCompanyMutation.isPending}
                data-testid="button-update-company"
              >
                {updateCompanyMutation.isPending ? 'Updating...' : 'Update Company'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}