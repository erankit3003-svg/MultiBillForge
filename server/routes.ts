import type { Express } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { storage } from "./storage";
import { AuthService } from "./services/auth";
import { PDFService } from "./services/pdf";
import {
  loginSchema,
  insertCompanySchema,
  insertUserSchema,
  insertProductSchema,
  insertCustomerSchema,
  insertInvoiceSchema,
  insertInvoiceItemSchema,
} from "@shared/schema";

// Auth middleware
async function authMiddleware(req: any, res: any, next: any) {
  const token = AuthService.extractTokenFromHeader(req.headers.authorization);
  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const payload = AuthService.verifyToken(token);
  if (!payload) {
    return res.status(401).json({ message: "Invalid token" });
  }

  const user = await storage.getUserWithRole(payload.userId);
  if (!user) {
    return res.status(401).json({ message: "User not found" });
  }

  req.user = user;
  next();
}

// Permission middleware
function requirePermission(module: string, action: 'canCreate' | 'canRead' | 'canUpdate' | 'canDelete') {
  return (req: any, res: any, next: any) => {
    const permission = req.user.permissions.find((p: any) => p.module === module);
    if (!permission || !permission[action]) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    next();
  };
}

// Company scope middleware
function requireCompanyScope(req: any, res: any, next: any) {
  // Super admins can access all companies
  if (req.user.role.name === 'Super Admin') {
    return next();
  }

  // Other users can only access their company data
  const companyId = req.params.companyId || req.body.companyId || req.query.companyId;
  if (companyId && companyId !== req.user.companyId) {
    return res.status(403).json({ message: "Access denied to company data" });
  }

  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      
      const user = await storage.getUserByEmailWithRole(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const validPassword = await AuthService.comparePassword(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      if (!user.isActive) {
        return res.status(401).json({ message: "Account is inactive" });
      }

      const token = AuthService.generateToken(user);
      
      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          company: user.company,
          permissions: user.permissions,
        },
      });
    } catch (error) {
      res.status(400).json({ message: "Invalid request data" });
    }
  });

  app.get("/api/auth/me", authMiddleware, async (req: any, res) => {
    res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        role: req.user.role,
        company: req.user.company,
        permissions: req.user.permissions,
      },
    });
  });

  // Company routes
  app.get("/api/companies", authMiddleware, requirePermission('companies', 'canRead'), async (req: any, res) => {
    try {
      const companies = await storage.getCompanies();
      res.json(companies);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch companies" });
    }
  });

  app.post("/api/companies", authMiddleware, requirePermission('companies', 'canCreate'), async (req: any, res) => {
    try {
      const companyData = insertCompanySchema.parse(req.body);
      const company = await storage.createCompany(companyData);
      res.status(201).json(company);
    } catch (error) {
      res.status(400).json({ message: "Invalid company data" });
    }
  });

  app.put("/api/companies/:id", authMiddleware, requirePermission('companies', 'canUpdate'), async (req: any, res) => {
    try {
      const companyData = insertCompanySchema.partial().parse(req.body);
      const company = await storage.updateCompany(req.params.id, companyData);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      res.json(company);
    } catch (error) {
      res.status(400).json({ message: "Invalid company data" });
    }
  });

  app.delete("/api/companies/:id", authMiddleware, requirePermission('companies', 'canDelete'), async (req: any, res) => {
    try {
      const deleted = await storage.deleteCompany(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Company not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete company" });
    }
  });

  // User routes
  app.get("/api/users", authMiddleware, requirePermission('users', 'canRead'), requireCompanyScope, async (req: any, res) => {
    try {
      const companyId = req.user.role.name === 'Super Admin' ? undefined : req.user.companyId;
      const users = await storage.getUsers(companyId);
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post("/api/users", authMiddleware, requirePermission('users', 'canCreate'), requireCompanyScope, async (req: any, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Hash password
      userData.password = await AuthService.hashPassword(userData.password);
      
      // Company admins can only create users in their company
      if (req.user.role.name !== 'Super Admin') {
        userData.companyId = req.user.companyId;
      }

      const user = await storage.createUser(userData);
      res.status(201).json(user);
    } catch (error) {
      res.status(400).json({ message: "Invalid user data" });
    }
  });

  app.put("/api/users/:id", authMiddleware, requirePermission('users', 'canUpdate'), requireCompanyScope, async (req: any, res) => {
    try {
      const userData = insertUserSchema.partial().parse(req.body);
      
      // Hash password if provided
      if (userData.password) {
        userData.password = await AuthService.hashPassword(userData.password);
      }

      const user = await storage.updateUser(req.params.id, userData);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(400).json({ message: "Invalid user data" });
    }
  });

  app.delete("/api/users/:id", authMiddleware, requirePermission('users', 'canDelete'), requireCompanyScope, async (req: any, res) => {
    try {
      const deleted = await storage.deleteUser(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "User not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Product routes
  app.get("/api/products", authMiddleware, requirePermission('products', 'canRead'), async (req: any, res) => {
    try {
      const products = await storage.getProducts(req.user.companyId);
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.post("/api/products", authMiddleware, requirePermission('products', 'canCreate'), async (req: any, res) => {
    try {
      const productData = insertProductSchema.parse(req.body);
      productData.companyId = req.user.companyId;
      const product = await storage.createProduct(productData);
      res.status(201).json(product);
    } catch (error) {
      res.status(400).json({ message: "Invalid product data" });
    }
  });

  app.put("/api/products/:id", authMiddleware, requirePermission('products', 'canUpdate'), async (req: any, res) => {
    try {
      const productData = insertProductSchema.partial().parse(req.body);
      const product = await storage.updateProduct(req.params.id, productData);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      res.status(400).json({ message: "Invalid product data" });
    }
  });

  app.delete("/api/products/:id", authMiddleware, requirePermission('products', 'canDelete'), async (req: any, res) => {
    try {
      const deleted = await storage.deleteProduct(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  // Customer routes
  app.get("/api/customers", authMiddleware, requirePermission('customers', 'canRead'), async (req: any, res) => {
    try {
      const customers = await storage.getCustomers(req.user.companyId);
      res.json(customers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch customers" });
    }
  });

  app.post("/api/customers", authMiddleware, requirePermission('customers', 'canCreate'), async (req: any, res) => {
    try {
      const customerData = insertCustomerSchema.parse(req.body);
      customerData.companyId = req.user.companyId;
      const customer = await storage.createCustomer(customerData);
      res.status(201).json(customer);
    } catch (error) {
      res.status(400).json({ message: "Invalid customer data" });
    }
  });

  app.put("/api/customers/:id", authMiddleware, requirePermission('customers', 'canUpdate'), async (req: any, res) => {
    try {
      const customerData = insertCustomerSchema.partial().parse(req.body);
      const customer = await storage.updateCustomer(req.params.id, customerData);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      res.json(customer);
    } catch (error) {
      res.status(400).json({ message: "Invalid customer data" });
    }
  });

  app.delete("/api/customers/:id", authMiddleware, requirePermission('customers', 'canDelete'), async (req: any, res) => {
    try {
      const deleted = await storage.deleteCustomer(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Customer not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete customer" });
    }
  });

  // Invoice routes
  app.get("/api/invoices", authMiddleware, requirePermission('invoices', 'canRead'), async (req: any, res) => {
    try {
      const invoices = await storage.getInvoices(req.user.companyId);
      res.json(invoices);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });

  app.get("/api/invoices/:id", authMiddleware, requirePermission('invoices', 'canRead'), async (req: any, res) => {
    try {
      const invoice = await storage.getInvoiceWithDetails(req.params.id);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      res.json(invoice);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch invoice" });
    }
  });

  app.post("/api/invoices", authMiddleware, requirePermission('invoices', 'canCreate'), async (req: any, res) => {
    try {
      const { items, ...invoiceData } = req.body;
      
      const validatedInvoice = insertInvoiceSchema.parse(invoiceData);
      validatedInvoice.companyId = req.user.companyId;

      const validatedItems = z.array(insertInvoiceItemSchema).parse(items);

      const invoice = await storage.createInvoice(validatedInvoice, validatedItems);
      res.status(201).json(invoice);
    } catch (error) {
      res.status(400).json({ message: "Invalid invoice data" });
    }
  });

  app.put("/api/invoices/:id", authMiddleware, requirePermission('invoices', 'canUpdate'), async (req: any, res) => {
    try {
      const invoiceData = insertInvoiceSchema.partial().parse(req.body);
      const invoice = await storage.updateInvoice(req.params.id, invoiceData);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      res.json(invoice);
    } catch (error) {
      res.status(400).json({ message: "Invalid invoice data" });
    }
  });

  app.delete("/api/invoices/:id", authMiddleware, requirePermission('invoices', 'canDelete'), async (req: any, res) => {
    try {
      const deleted = await storage.deleteInvoice(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Invoice not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete invoice" });
    }
  });

  // PDF generation
  app.get("/api/invoices/:id/pdf", authMiddleware, requirePermission('invoices', 'canRead'), async (req: any, res) => {
    try {
      const invoice = await storage.getInvoiceWithDetails(req.params.id);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      const pdfBuffer = PDFService.generateInvoicePDF(invoice);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`);
      res.send(pdfBuffer);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate PDF" });
    }
  });

  // Dashboard stats
  app.get("/api/dashboard/stats", authMiddleware, async (req: any, res) => {
    try {
      const stats = await storage.getDashboardStats(req.user.companyId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Roles
  app.get("/api/roles", authMiddleware, async (req: any, res) => {
    try {
      const roles = await storage.getRoles();
      res.json(roles);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch roles" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
