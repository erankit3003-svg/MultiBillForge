import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import {
  type Company, type InsertCompany,
  type User, type InsertUser, type UserWithRole,
  type Role, type Permission,
  type Product, type InsertProduct,
  type Customer, type InsertCustomer,
  type Invoice, type InsertInvoice, type InvoiceWithDetails,
  type InvoiceItem, type InsertInvoiceItem,
  type DashboardStats
} from '@shared/schema';

const DATA_DIR = path.join(process.cwd(), 'server', 'data');

export interface IStorage {
  // Companies
  getCompanies(): Promise<Company[]>;
  getCompany(id: string): Promise<Company | undefined>;
  createCompany(company: InsertCompany): Promise<Company>;
  updateCompany(id: string, company: Partial<InsertCompany>): Promise<Company | undefined>;
  deleteCompany(id: string): Promise<boolean>;

  // Users
  getUsers(companyId?: string): Promise<User[]>;
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserWithRole(id: string): Promise<UserWithRole | undefined>;
  getUserByEmailWithRole(email: string): Promise<UserWithRole | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;

  // Roles & Permissions
  getRoles(): Promise<Role[]>;
  getRole(id: string): Promise<Role | undefined>;
  getPermissions(roleId: string): Promise<Permission[]>;

  // Products
  getProducts(companyId: string): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: string): Promise<boolean>;

  // Customers
  getCustomers(companyId: string): Promise<Customer[]>;
  getCustomer(id: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: string, customer: Partial<InsertCustomer>): Promise<Customer | undefined>;
  deleteCustomer(id: string): Promise<boolean>;

  // Invoices
  getInvoices(companyId: string): Promise<Invoice[]>;
  getInvoice(id: string): Promise<Invoice | undefined>;
  getInvoiceWithDetails(id: string): Promise<InvoiceWithDetails | undefined>;
  createInvoice(invoice: InsertInvoice, items: InsertInvoiceItem[]): Promise<Invoice>;
  updateInvoice(id: string, invoice: Partial<InsertInvoice>): Promise<Invoice | undefined>;
  deleteInvoice(id: string): Promise<boolean>;

  // Dashboard
  getDashboardStats(companyId: string): Promise<DashboardStats>;
}

export class JSONStorage implements IStorage {
  private async readFile<T>(filename: string): Promise<T[]> {
    try {
      const filePath = path.join(DATA_DIR, filename);
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  }

  private async writeFile<T>(filename: string, data: T[]): Promise<void> {
    const filePath = path.join(DATA_DIR, filename);
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  }

  // Companies
  async getCompanies(): Promise<Company[]> {
    return this.readFile<Company>('companies.json');
  }

  async getCompany(id: string): Promise<Company | undefined> {
    const companies = await this.getCompanies();
    return companies.find(c => c.id === id);
  }

  async createCompany(company: InsertCompany): Promise<Company> {
    const companies = await this.getCompanies();
    const newCompany: Company = {
      ...company,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    companies.push(newCompany);
    await this.writeFile('companies.json', companies);
    return newCompany;
  }

  async updateCompany(id: string, company: Partial<InsertCompany>): Promise<Company | undefined> {
    const companies = await this.getCompanies();
    const index = companies.findIndex(c => c.id === id);
    if (index === -1) return undefined;

    companies[index] = {
      ...companies[index],
      ...company,
      updatedAt: new Date().toISOString(),
    };
    await this.writeFile('companies.json', companies);
    return companies[index];
  }

  async deleteCompany(id: string): Promise<boolean> {
    const companies = await this.getCompanies();
    const filtered = companies.filter(c => c.id !== id);
    if (filtered.length === companies.length) return false;
    await this.writeFile('companies.json', filtered);
    return true;
  }

  // Users
  async getUsers(companyId?: string): Promise<User[]> {
    const users = await this.readFile<User>('users.json');
    return companyId ? users.filter(u => u.companyId === companyId) : users;
  }

  async getUser(id: string): Promise<User | undefined> {
    const users = await this.getUsers();
    return users.find(u => u.id === id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const users = await this.getUsers();
    return users.find(u => u.email === email);
  }

  async getUserWithRole(id: string): Promise<UserWithRole | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;

    const [roles, companies, permissions] = await Promise.all([
      this.readFile<Role>('roles.json'),
      this.readFile<Company>('companies.json'),
      this.readFile<Permission>('permissions.json'),
    ]);

    const role = roles.find(r => r.id === user.roleId);
    const company = companies.find(c => c.id === user.companyId);
    const userPermissions = permissions.filter(p => p.roleId === user.roleId);

    if (!role || !company) return undefined;

    return {
      ...user,
      role,
      company,
      permissions: userPermissions,
    };
  }

  async getUserByEmailWithRole(email: string): Promise<UserWithRole | undefined> {
    const user = await this.getUserByEmail(email);
    if (!user) return undefined;
    return this.getUserWithRole(user.id);
  }

  async createUser(user: InsertUser): Promise<User> {
    const users = await this.getUsers();
    const newUser: User = {
      ...user,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    users.push(newUser);
    await this.writeFile('users.json', users);
    return newUser;
  }

  async updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined> {
    const users = await this.getUsers();
    const index = users.findIndex(u => u.id === id);
    if (index === -1) return undefined;

    users[index] = {
      ...users[index],
      ...user,
      updatedAt: new Date().toISOString(),
    };
    await this.writeFile('users.json', users);
    return users[index];
  }

  async deleteUser(id: string): Promise<boolean> {
    const users = await this.getUsers();
    const filtered = users.filter(u => u.id !== id);
    if (filtered.length === users.length) return false;
    await this.writeFile('users.json', filtered);
    return true;
  }

  // Roles & Permissions
  async getRoles(): Promise<Role[]> {
    return this.readFile<Role>('roles.json');
  }

  async getRole(id: string): Promise<Role | undefined> {
    const roles = await this.getRoles();
    return roles.find(r => r.id === id);
  }

  async getPermissions(roleId: string): Promise<Permission[]> {
    const permissions = await this.readFile<Permission>('permissions.json');
    return permissions.filter(p => p.roleId === roleId);
  }

  // Products
  async getProducts(companyId: string): Promise<Product[]> {
    const products = await this.readFile<Product>('products.json');
    return products.filter(p => p.companyId === companyId);
  }

  async getProduct(id: string): Promise<Product | undefined> {
    const products = await this.readFile<Product>('products.json');
    return products.find(p => p.id === id);
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const products = await this.readFile<Product>('products.json');
    const newProduct: Product = {
      ...product,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    products.push(newProduct);
    await this.writeFile('products.json', products);
    return newProduct;
  }

  async updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | undefined> {
    const products = await this.readFile<Product>('products.json');
    const index = products.findIndex(p => p.id === id);
    if (index === -1) return undefined;

    products[index] = {
      ...products[index],
      ...product,
      updatedAt: new Date().toISOString(),
    };
    await this.writeFile('products.json', products);
    return products[index];
  }

  async deleteProduct(id: string): Promise<boolean> {
    const products = await this.readFile<Product>('products.json');
    const filtered = products.filter(p => p.id !== id);
    if (filtered.length === products.length) return false;
    await this.writeFile('products.json', filtered);
    return true;
  }

  // Customers
  async getCustomers(companyId: string): Promise<Customer[]> {
    const customers = await this.readFile<Customer>('customers.json');
    return customers.filter(c => c.companyId === companyId);
  }

  async getCustomer(id: string): Promise<Customer | undefined> {
    const customers = await this.readFile<Customer>('customers.json');
    return customers.find(c => c.id === id);
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const customers = await this.readFile<Customer>('customers.json');
    const newCustomer: Customer = {
      ...customer,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    customers.push(newCustomer);
    await this.writeFile('customers.json', customers);
    return newCustomer;
  }

  async updateCustomer(id: string, customer: Partial<InsertCustomer>): Promise<Customer | undefined> {
    const customers = await this.readFile<Customer>('customers.json');
    const index = customers.findIndex(c => c.id === id);
    if (index === -1) return undefined;

    customers[index] = {
      ...customers[index],
      ...customer,
      updatedAt: new Date().toISOString(),
    };
    await this.writeFile('customers.json', customers);
    return customers[index];
  }

  async deleteCustomer(id: string): Promise<boolean> {
    const customers = await this.readFile<Customer>('customers.json');
    const filtered = customers.filter(c => c.id !== id);
    if (filtered.length === customers.length) return false;
    await this.writeFile('customers.json', filtered);
    return true;
  }

  // Invoices
  async getInvoices(companyId: string): Promise<Invoice[]> {
    const invoices = await this.readFile<Invoice>('invoices.json');
    return invoices.filter(i => i.companyId === companyId);
  }

  async getInvoice(id: string): Promise<Invoice | undefined> {
    const invoices = await this.readFile<Invoice>('invoices.json');
    return invoices.find(i => i.id === id);
  }

  async getInvoiceWithDetails(id: string): Promise<InvoiceWithDetails | undefined> {
    const invoice = await this.getInvoice(id);
    if (!invoice) return undefined;

    const [customers, companies, items, products] = await Promise.all([
      this.readFile<Customer>('customers.json'),
      this.readFile<Company>('companies.json'),
      this.readFile<InvoiceItem>('invoice_items.json'),
      this.readFile<Product>('products.json'),
    ]);

    const customer = customers.find(c => c.id === invoice.customerId);
    const company = companies.find(c => c.id === invoice.companyId);
    const invoiceItems = items.filter(i => i.invoiceId === invoice.id);

    if (!customer || !company) return undefined;

    const itemsWithProducts = invoiceItems.map(item => ({
      ...item,
      product: products.find(p => p.id === item.productId)!,
    }));

    return {
      ...invoice,
      customer,
      company,
      items: itemsWithProducts,
    };
  }

  async createInvoice(invoice: InsertInvoice, items: InsertInvoiceItem[]): Promise<Invoice> {
    const invoices = await this.readFile<Invoice>('invoices.json');
    const invoiceItems = await this.readFile<InvoiceItem>('invoice_items.json');

    const newInvoice: Invoice = {
      ...invoice,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const newItems: InvoiceItem[] = items.map(item => ({
      ...item,
      id: randomUUID(),
      invoiceId: newInvoice.id,
    }));

    invoices.push(newInvoice);
    invoiceItems.push(...newItems);

    await Promise.all([
      this.writeFile('invoices.json', invoices),
      this.writeFile('invoice_items.json', invoiceItems),
    ]);

    return newInvoice;
  }

  async updateInvoice(id: string, invoice: Partial<InsertInvoice>): Promise<Invoice | undefined> {
    const invoices = await this.readFile<Invoice>('invoices.json');
    const index = invoices.findIndex(i => i.id === id);
    if (index === -1) return undefined;

    invoices[index] = {
      ...invoices[index],
      ...invoice,
      updatedAt: new Date().toISOString(),
    };
    await this.writeFile('invoices.json', invoices);
    return invoices[index];
  }

  async deleteInvoice(id: string): Promise<boolean> {
    const invoices = await this.readFile<Invoice>('invoices.json');
    const items = await this.readFile<InvoiceItem>('invoice_items.json');

    const filteredInvoices = invoices.filter(i => i.id !== id);
    const filteredItems = items.filter(i => i.invoiceId !== id);

    if (filteredInvoices.length === invoices.length) return false;

    await Promise.all([
      this.writeFile('invoices.json', filteredInvoices),
      this.writeFile('invoice_items.json', filteredItems),
    ]);

    return true;
  }

  // Dashboard
  async getDashboardStats(companyId: string): Promise<DashboardStats> {
    const invoices = await this.getInvoices(companyId);
    const customers = await this.getCustomers(companyId);
    const items = await this.readFile<InvoiceItem>('invoice_items.json');

    const totalRevenue = invoices
      .filter(i => i.status === 'paid')
      .reduce((sum, i) => sum + i.total, 0);

    const activeCustomers = customers.filter(c => c.isActive).length;
    const pendingInvoices = invoices.filter(i => i.status === 'pending').length;

    const productsSold = items
      .filter(item => {
        const invoice = invoices.find(i => i.id === item.invoiceId);
        return invoice?.status === 'paid';
      })
      .reduce((sum, item) => sum + item.quantity, 0);

    return {
      totalRevenue,
      activeCustomers,
      pendingInvoices,
      productsSold,
    };
  }
}

export const storage = new JSONStorage();
