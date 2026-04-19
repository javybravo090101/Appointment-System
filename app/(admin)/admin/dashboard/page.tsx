"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, Users, Dog, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react";

interface DashboardStats {
  totalAppointments: number;
  pendingAppointments: number;
  approvedAppointments: number;
  completedAppointments: number;
  totalClients: number;
  totalPets: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      const supabase = createClient();

      const [appointments, pending, approved, completed, clients, pets] = await Promise.all([
        supabase.from("appointments").select("id", { count: "exact", head: true }),
        supabase.from("appointments").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("appointments").select("id", { count: "exact", head: true }).eq("status", "approved"),
        supabase.from("appointments").select("id", { count: "exact", head: true }).eq("status", "completed"),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "client"),
        supabase.from("pets").select("id", { count: "exact", head: true }),
      ]);

      setStats({
        totalAppointments: appointments.count ?? 0,
        pendingAppointments: pending.count ?? 0,
        approvedAppointments: approved.count ?? 0,
        completedAppointments: completed.count ?? 0,
        totalClients: clients.count ?? 0,
        totalPets: pets.count ?? 0,
      });
      setLoading(false);
    }
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-pawgreen" />
      </div>
    );
  }

  const cards = [
    { label: "Total Appointments", value: stats?.totalAppointments, icon: CalendarDays, color: "text-pawgreen bg-pawgreen/10" },
    { label: "Pending", value: stats?.pendingAppointments, icon: Clock, color: "text-amber-600 bg-amber-100" },
    { label: "Approved", value: stats?.approvedAppointments, icon: CheckCircle, color: "text-success bg-success/10" },
    { label: "Completed", value: stats?.completedAppointments, icon: XCircle, color: "text-blue-600 bg-blue-100" },
    { label: "Clients", value: stats?.totalClients, icon: Users, color: "text-purple-600 bg-purple-100" },
    { label: "Pets", value: stats?.totalPets, icon: Dog, color: "text-pawaccent bg-pawaccent/10" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Overview of PawCare Clinic</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.label} className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.label}
              </CardTitle>
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${card.color}`}>
                <card.icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
