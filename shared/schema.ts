import { z } from "zod";

// Company schema
export const companySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  logoUrl: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  website: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  isActive: z.boolean(),
});

export const insertCompanySchema = companySchema.omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export type Company = z.infer<typeof companySchema>;
export type InsertCompany = z.infer<typeof insertCompanySchema>;

// Role schema
export const roleSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
});

export const insertRoleSchema = roleSchema.omit({ id: true });

export type Role = z.infer<typeof roleSchema>;
export type InsertRole = z.infer<typeof insertRoleSchema>;

// Permission schema
export const permissionSchema = z.object({
  id: z.string(),
  roleId: z.string(),
  module: z.string(),
  canCreate: z.boolean(),
  canRead: z.boolean(),
  canUpdate: z.boolean(),
  canDelete: z.boolean(),
});

export const insertPermissionSchema = permissionSchema.omit({ id: true });

export type Permission = z.infer<typeof permissionSchema>;
export type InsertPermission = z.infer<typeof insertPermissionSchema>;

// User schema
export const userSchema = z.object({
  id: z.string(),
  companyId: z.string(),
  roleId: z.string(),
  email: z.string().email(),
  password: z.string(),
  name: z.string(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const insertUserSchema = userSchema.omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type User = z.infer<typeof userSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginCredentials = z.infer<typeof loginSchema>;

// Product schema
export const productSchema = z.object({
  id: z.string(),
  companyId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  price: z.number(),
  unit: z.string().optional(),
  category: z.string().optional(),
  taxRate: z.number().default(0),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const insertProductSchema = productSchema.omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export type Product = z.infer<typeof productSchema>;
export type InsertProduct = z.infer<typeof insertProductSchema>;

// Customer schema
export const customerSchema = z.object({
  id: z.string(),
  companyId: z.string(),
  name: z.string(),
  email: z.string().email(),
  phone: z.string().optional(),
  address: z.string().optional(),
  taxId: z.string().optional(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const insertCustomerSchema = customerSchema.omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export type Customer = z.infer<typeof customerSchema>;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;

// Invoice schema
export const invoiceSchema = z.object({
  id: z.string(),
  companyId: z.string(),
  customerId: z.string(),
  invoiceNumber: z.string(),
  date: z.string(),
  dueDate: z.string(),
  subtotal: z.number(),
  tax: z.number(),
  total: z.number(),
  status: z.enum(['pending', 'paid', 'overdue', 'cancelled']),
  notes: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const insertInvoiceSchema = invoiceSchema.omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export type Invoice = z.infer<typeof invoiceSchema>;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;

// Invoice Item schema
export const invoiceItemSchema = z.object({
  id: z.string(),
  invoiceId: z.string(),
  productId: z.string(),
  description: z.string(),
  quantity: z.number(),
  unitPrice: z.number(),
  total: z.number(),
});

export const insertInvoiceItemSchema = invoiceItemSchema.omit({ id: true });

export type InvoiceItem = z.infer<typeof invoiceItemSchema>;
export type InsertInvoiceItem = z.infer<typeof insertInvoiceItemSchema>;

// Extended types for API responses
export type UserWithRole = User & { 
  role: Role;
  company: Company;
  permissions: Permission[];
};

export type InvoiceWithDetails = Invoice & {
  customer: Customer;
  items: (InvoiceItem & { product: Product })[];
  company: Company;
};

export type DashboardStats = {
  totalRevenue: number;
  activeCustomers: number;
  pendingInvoices: number;
  productsSold: number;
};
