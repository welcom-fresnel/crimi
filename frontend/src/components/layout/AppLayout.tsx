import { ReactNode } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full overflow-x-hidden">
        <AppSidebar />
        <main className="flex-1 min-w-0 flex flex-col">
          <header className="h-12 sm:h-14 border-b bg-card flex items-center px-3 sm:px-4 gap-3 sm:gap-4">
            <SidebarTrigger />
            <div className="flex-1" />
          </header>
          <div className="flex-1 p-3 sm:p-4 lg:p-6 overflow-auto">{children}</div>
        </main>
      </div>
    </SidebarProvider>
  );
}
