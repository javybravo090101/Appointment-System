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
  CalendarPlus,
  CalendarDays,
  Dog,
  LogOut,
  Menu,
  Bell,
  User,
  CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Book", href: "/book", icon: CalendarPlus },
  { name: "Appointments", href: "/appointments", icon: CalendarDays },
  { name: "My Pets", href: "/pets", icon: Dog },
];

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    async function fetchNotifications() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [notifRes, profileRes] = await Promise.all([
        supabase
          .from("notifications")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("profiles")
          .select("avatar_url, full_name")
          .eq("id", user.id)
          .single(),
      ]);

      const notifs = notifRes.data ?? [];
      setNotifications(notifs);
      setUnreadCount(notifs.filter((n: { is_read: boolean }) => !n.is_read).length);
      setAvatarUrl(profileRes.data?.avatar_url ?? null);
      setUserName(profileRes.data?.full_name ?? "");
    }
    fetchNotifications();

    const supabase = createClient();
    const channel = supabase
      .channel('client_notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          setNotifications(prev => [payload.new, ...prev].slice(0, 10));
          setUnreadCount(c => c + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function markAsRead() {
    if (unreadCount === 0) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    setUnreadCount(0);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const NavLinks = () => (
    <nav className="flex flex-col gap-1 w-full px-2 py-4">
      {navItems.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
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
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
            <PawPrint className="h-6 w-6 text-pawgreen" />
            <span className="">PawCare</span>
            <span className="ml-2 rounded-md bg-blue-50 border border-blue-200 px-1.5 py-0.5 text-[10px] font-medium text-blue-600">
              Client
            </span>
          </Link>
        </div>
        <div className="flex-1 overflow-auto">
          <NavLinks />
        </div>
        <div className="mt-auto border-t p-4 flex flex-col gap-2">
          <Link
            href="/profile"
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all hover:text-pawgreen",
              pathname === "/profile"
                ? "bg-pawgreen/10 text-pawgreen"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            <User className="h-4 w-4" />
            Profile
          </Link>
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-muted-foreground hover:text-danger hover:bg-danger/10 px-3 py-2.5"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col min-w-0">
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
                <Link href="/dashboard" className="flex items-center gap-2 font-semibold" onClick={() => setOpen(false)}>
                  <PawPrint className="h-6 w-6 text-pawgreen" />
                  <span>PawCare</span>
                  <span className="ml-1 rounded-md bg-blue-50 border border-blue-200 px-1.5 py-0.5 text-[10px] font-medium text-blue-600">
                    Client
                  </span>
                </Link>
              </div>
              <div className="flex-1 overflow-auto">
                <NavLinks />
              </div>
              <div className="mt-auto border-t p-4 flex flex-col gap-2">
                <Link
                  href="/profile"
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all hover:text-pawgreen",
                    pathname === "/profile"
                      ? "bg-pawgreen/10 text-pawgreen"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  <User className="h-4 w-4" />
                  Profile
                </Link>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2 text-muted-foreground hover:text-danger hover:bg-danger/10 px-3 py-2.5"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              </div>
            </SheetContent>
          </Sheet>
          
          <div className="flex flex-1 justify-end items-center gap-4">
            <Popover onOpenChange={(open) => { if (open) markAsRead(); }}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative hover:bg-muted">
                  <Bell className="h-5 w-5 text-slate-600" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-danger border-2 border-white animate-pulse" />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-0 shadow-lg">
                <div className="flex items-center justify-between border-b px-4 py-3 bg-muted/20">
                  <p className="text-sm font-semibold">Notifications</p>
                  {unreadCount > 0 && (
                    <span className="text-[10px] bg-pawgreen text-white px-2 py-0.5 rounded-full font-medium">
                      {unreadCount} New
                    </span>
                  )}
                </div>
                <div className="flex flex-col max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center flex flex-col items-center justify-center text-muted-foreground">
                      <CheckCircle2 className="h-8 w-8 mb-2 opacity-50" />
                      <p className="text-sm font-medium">All caught up!</p>
                      <p className="text-xs">No new notifications</p>
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div 
                        key={notif.id}
                        className={cn(
                          "px-4 py-3 border-b last:border-0 hover:bg-muted/50 transition-colors flex flex-col gap-1",
                          !notif.is_read ? "bg-pawgreen/5" : ""
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn("text-sm", !notif.is_read ? "font-semibold text-foreground" : "font-medium text-foreground/80")}>
                            {notif.title}
                          </p>
                          {!notif.is_read && <span className="h-2 w-2 rounded-full bg-pawgreen shrink-0 mt-1" />}
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{notif.message}</p>
                        <p className="text-[10px] text-muted-foreground/60 mt-1">
                          {new Date(notif.created_at).toLocaleString()}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </PopoverContent>
            </Popover>

            <Link href="/profile" className="shrink-0">
              <div className="h-8 w-8 rounded-full border-2 border-pawgreen/20 overflow-hidden bg-slate-100 flex items-center justify-center hover:border-pawgreen/50 transition-colors">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xs font-bold text-pawgreen">
                    {userName?.charAt(0)?.toUpperCase() || "?"}
                  </span>
                )}
              </div>
            </Link>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
