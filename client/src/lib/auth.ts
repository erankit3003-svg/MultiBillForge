import { type UserWithRole } from '@shared/schema';

export interface AuthContextType {
  user: UserWithRole | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

export function getStoredToken(): string | null {
  return localStorage.getItem('auth_token');
}

export function setStoredToken(token: string): void {
  localStorage.setItem('auth_token', token);
}

export function removeStoredToken(): void {
  localStorage.removeItem('auth_token');
}

export function getAuthHeaders(): Record<string, string> {
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function hasPermission(user: UserWithRole | null, module: string, action: 'canCreate' | 'canRead' | 'canUpdate' | 'canDelete'): boolean {
  if (!user) return false;
  
  const permission = user.permissions.find(p => p.module === module);
  return permission ? permission[action] : false;
}

export function isSuperAdmin(user: UserWithRole | null): boolean {
  return user?.role.name === 'Super Admin';
}

export function isCompanyAdmin(user: UserWithRole | null): boolean {
  return user?.role.name === 'Company Admin';
}
