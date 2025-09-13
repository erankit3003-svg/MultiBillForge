import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface HeaderProps {
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function Header({ title, description, action }: HeaderProps) {
  return (
    <div className="flex justify-between items-center mb-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground" data-testid="text-page-title">{title}</h1>
        <p className="text-muted-foreground mt-1" data-testid="text-page-description">{description}</p>
      </div>

      {action && (
        <Button onClick={action.onClick} className="flex items-center space-x-2" data-testid="button-header-action">
          <Plus className="h-4 w-4" />
          <span>{action.label}</span>
        </Button>
      )}
    </div>
  );
}
