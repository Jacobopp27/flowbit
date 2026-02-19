import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FolderKanban, 
  Users, 
  Boxes,
  Package,
  Layers,
  Briefcase,
  Building2,
  Settings as SettingsIcon,
  ShoppingCart,
  Warehouse,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import flowbitLogo from '@/assets/flowbit-logo.png';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  role: 'ADMIN' | 'WORKER' | 'BOTH';
}

const navItems: NavItem[] = [
  {
    title: 'Panel Principal',
    href: '/admin/dashboard',
    icon: LayoutDashboard,
    role: 'ADMIN',
  },
  {
    title: 'Proyectos',
    href: '/admin/projects',
    icon: FolderKanban,
    role: 'ADMIN',
  },
  {
    title: 'Etapas',
    href: '/admin/stages',
    icon: Layers,
    role: 'ADMIN',
  },
  {
    title: 'Usuarios',
    href: '/admin/users',
    icon: Users,
    role: 'ADMIN',
  },
  {
    title: 'Productos',
    href: '/admin/products',
    icon: Package,
    role: 'ADMIN',
  },
  {
    title: 'Materiales',
    href: '/admin/materials',
    icon: Boxes,
    role: 'ADMIN',
  },
  {
    title: 'Proveedores',
    href: '/admin/suppliers',
    icon: Building2,
    role: 'ADMIN',
  },
  {
    title: 'Compras',
    href: '/admin/purchases',
    icon: ShoppingCart,
    role: 'ADMIN',
  },
  {
    title: 'Inventario MP',
    href: '/admin/inventory/materials',
    icon: Warehouse,
    role: 'ADMIN',
  },
  {
    title: 'Inventario PT',
    href: '/admin/inventory/products',
    icon: Warehouse,
    role: 'ADMIN',
  },
  {
    title: 'Configuración',
    href: '/admin/settings',
    icon: SettingsIcon,
    role: 'ADMIN',
  },
  {
    title: 'Mis Tareas',
    href: '/work',
    icon: Briefcase,
    role: 'WORKER',
  },
];

interface SidebarProps {
  role: 'ADMIN' | 'WORKER';
  onClose?: () => void;
}

export function Sidebar({ role, onClose }: SidebarProps) {
  const location = useLocation();

  const filteredItems = navItems.filter(
    (item) => item.role === role || item.role === 'BOTH'
  );

  return (
    <div className="flex h-full flex-col border-r bg-background">
      <div className="flex h-16 items-center border-b px-6">
        <Link to="/" className="flex items-center">
          <img 
            src={flowbitLogo} 
            alt="Flowbit" 
            className="h-10 w-auto"
          />
        </Link>
      </div>

      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="flex flex-col gap-1">
          {filteredItems.map((item) => {
            const isActive = location.pathname === item.href || 
              (item.href !== '/' && location.pathname.startsWith(item.href));
            
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="flex-1">{item.title}</span>
                {isActive && <ChevronRight className="h-4 w-4" />}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      <div className="border-t p-4">
        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
          <div className="font-medium">Role: {role}</div>
          <Separator className="my-2" />
          <div>Flowbiit - Sistema Operativo para Producción</div>
          <div>v0.1.0 MVP</div>
        </div>
      </div>
    </div>
  );
}
