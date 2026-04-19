"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  PawPrint,
  LayoutDashboard,
  CalendarDays,
  CalendarClock,
  Briefcase,
  Dog,
  Users,
  LogOut,
  Menu,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const navItems = [
  { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { name: "Appointments", href: "/admin/appointments", icon: CalendarDays },
  { name: "Schedule", href: "/admin/schedule", icon: CalendarClock },
  { name: "Services", href: "/admin/services", icon: Briefcase },
  { name: "Pets", href: "/admin/pets", icon: Dog },
  { name: "Users", href: "/admin/users", icon: Users },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    async function fetchNotifications() {
      const supabase = createClient();
      
      // Admin notifications logic: Since admins oversee the clinic, we just count pending appointments 
      // as "notifications" for them to review
      const { count } = await supabase
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");

      setUnreadCount(count ?? 0);
    }
    
    fetchNotifications();

    // Set up realtime listener for new appointments
    const supabase = createClient();
    const channel = supabase
      .channel('admin_appointments')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'appointments' },
        (payload) => {
          if (payload.new.status === 'pending') {
            setUnreadCount((c) => c + 1);
            toast.success("New appointment request received!");
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const NavLinks = () => (
    <nav className="flex flex-col gap-1 w-full px-2 py-4">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.name}
            href={item.href}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all hover:text-pawgreen",
              isActive
                ? "bg-pawgreen/10 text-pawgreen"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.name}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen flex-col bg-slate-50/50 md:flex-row">
      <aside className="hidden w-64 flex-col border-r bg-white md:flex sticky top-0 h-screen">
        <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
          <Link href="/admin/dashboard" className="flex items-center gap-2 font-semibold">
            <PawPrint className="h-6 w-6 text-pawgreen" />
            <span className="">PawCare</span>
            <span className="ml-2 rounded-md bg-pawgreen/10 px-1.5 py-0.5 text-[10px] font-medium text-pawgreen">
              Admin
            </span>
          </Link>
        </div>
        <div className="flex-1 overflow-auto">
          <NavLinks />
        </div>
        <div className="mt-auto border-t p-4">
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-muted-foreground hover:text-danger hover:bg-danger/10"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-between gap-4 border-b bg-white px-4 lg:h-[60px] lg:px-6 sticky top-0 z-30">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0 md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col p-0 w-64">
              <div className="flex h-14 items-center border-b px-4">
                <Link href="/admin/dashboard" className="flex items-center gap-2 font-semibold" onClick={() => setOpen(false)}>
                  <PawPrint className="h-6 w-6 text-pawgreen" />
                  <span>PawCare</span>
                  <span className="ml-1 rounded-md bg-pawgreen/10 px-1.5 py-0.5 text-[10px] font-medium text-pawgreen">
                    Admin
                  </span>
                </Link>
              </div>
              <div className="flex-1 overflow-auto">
                <NavLinks />
              </div>
              <div className="mt-auto border-t p-4">
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2 text-muted-foreground hover:text-danger hover:bg-danger/10"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              </div>
            </SheetContent>
          </Sheet>
          
          <div className="flex flex-1 justify-end items-center gap-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative hover:bg-muted">
                  <Bell className="h-5 w-5 text-slate-600" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-danger border-2 border-white animate-pulse" />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-0 shadow-lg">
                <div className="flex items-center justify-between border-b px-4 py-3">
                  <p className="text-sm font-semibold">Notifications</p>
                  <span className="text-xs bg-muted px-2 py-0.5 rounded-full font-medium">
                    {unreadCount} New
                  </span>
                </div>
                <div className="flex flex-col py-2">
                  {unreadCount === 0 ? (
                    <p className="px-4 py-3 text-sm text-muted-foreground text-center">No new notifications</p>
                  ) : (
                    <Link 
                      href="/admin/appointments" 
                      className="px-4 py-3 hover:bg-muted/50 transition-colors flex flex-col gap-1 border-l-2 border-pawgreen bg-pawgreen/5 mx-2 rounded-sm"
                    >
                      <p className="text-sm font-medium text-foreground">Pending Appointments</p>
                      <p className="text-xs text-muted-foreground">You have {unreadCount} new appointment request(s) awaiting your review and approval.</p>
                    </Link>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl">
          {children}
        </main>
      </div>
    </div>
  );
}
