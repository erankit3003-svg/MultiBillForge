import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/auth/auth-provider';
import { hasPermission, isSuperAdmin } from '@/lib/auth';
import {
  Building,
  Users,
  Package,
  Contact,
  FileText,
  BarChart3,
  Settings,
  LogOut,
  Receipt,
  ChartBar,
} from 'lucide-react';

export function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  if (!user) return null;

  const menuItems = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: ChartBar,
      show: true,
    },
    {
      label: 'Companies',
      href: '/companies',
      icon: Building,
      show: isSuperAdmin(user),
    },
    {
      label: 'Users',
      href: '/users',
      icon: Users,
      show: hasPermission(user, 'users', 'canRead'),
    },
    {
      label: 'Products',
      href: '/products',
      icon: Package,
      show: hasPermission(user, 'products', 'canRead'),
    },
    {
      label: 'Customers',
      href: '/customers',
      icon: Contact,
      show: hasPermission(user, 'customers', 'canRead'),
    },
    {
      label: 'Invoices',
      href: '/invoices',
      icon: FileText,
      show: hasPermission(user, 'invoices', 'canRead'),
    },
    {
      label: 'Reports',
      href: '/reports',
      icon: BarChart3,
      show: hasPermission(user, 'reports', 'canRead'),
    },
  ];

  return (
    <div className="sidebar fixed left-0 top-0 h-full w-64 bg-card border-r border-border z-10">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="bg-primary text-primary-foreground w-10 h-10 rounded-lg flex items-center justify-center">
            <Receipt className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-bold text-foreground">BillMaster Pro</h1>
            <p className="text-xs text-muted-foreground">{user.company.name}</p>
          </div>
        </div>
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center">
            <Users className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium text-foreground" data-testid="text-user-name">
              {user.name}
            </p>
            <p className="text-xs text-muted-foreground" data-testid="text-user-role">
              {user.role.name}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-2">
        {menuItems.map((item) => {
          if (!item.show) return null;

          const isActive = location === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'nav-item flex items-center space-x-3 p-3 rounded-lg transition-colors',
                isActive
                  ? 'active bg-primary text-primary-foreground'
                  : 'hover:bg-accent'
              )}
              data-testid={`link-${item.label.toLowerCase().replace(' ', '-')}`}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}

        <div className="pt-4 border-t border-border mt-4">
          <Link
            href="/settings"
            className="nav-item flex items-center space-x-3 p-3 rounded-lg transition-colors hover:bg-accent"
            data-testid="link-settings"
          >
            <Settings className="h-5 w-5" />
            <span>Settings</span>
          </Link>

          <button
            onClick={logout}
            className="nav-item flex items-center space-x-3 p-3 rounded-lg transition-colors text-destructive hover:bg-accent w-full text-left"
            data-testid="button-logout"
          >
            <LogOut className="h-5 w-5" />
            <span>Logout</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
