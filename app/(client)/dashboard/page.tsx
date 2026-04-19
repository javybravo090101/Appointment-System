"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CalendarPlus, Dog, CalendarDays, Loader2 } from "lucide-react";

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  services: { name: string } | null;
  pets: { name: string } | null;
}

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-success/15 text-success",
  rejected: "bg-danger/15 text-danger",
  cancelled: "bg-muted text-muted-foreground",
  completed: "bg-blue-100 text-blue-700",
};

export default function ClientDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [petCount, setPetCount] = useState(0);
  const [upcomingAppts, setUpcomingAppts] = useState<Appointment[]>([]);

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [profileRes, petsRes, apptsRes] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", user.id).single(),
        supabase.from("pets").select("id", { count: "exact", head: true }).eq("owner_id", user.id),
        supabase
          .from("appointments")
          .select("*, services(name), pets(name)")
          .eq("client_id", user.id)
          .in("status", ["pending", "approved"])
          .gte("appointment_date", new Date().toISOString().split("T")[0])
          .order("appointment_date", { ascending: true })
          .limit(5),
      ]);

      setUserName(profileRes.data?.full_name ?? "");
      setPetCount(petsRes.count ?? 0);
      setUpcomingAppts((apptsRes.data as unknown as Appointment[]) ?? []);
      setLoading(false);
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-pawgreen" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back, {userName.split(" ")[0]}!
        </h1>
        <p className="text-muted-foreground">Here&apos;s what&apos;s happening with your pets</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-pawgreen/10">
              <Dog className="h-5 w-5 text-pawgreen" />
            </div>
            <div>
              <p className="text-2xl font-bold">{petCount}</p>
              <p className="text-sm text-muted-foreground">My Pets</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber-100">
              <CalendarDays className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{upcomingAppts.length}</p>
              <p className="text-sm text-muted-foreground">Upcoming</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="flex items-center justify-center p-5">
            <Button asChild className="bg-pawgreen hover:bg-pawgreen-dark text-white gap-2 w-full">
              <Link href="/book">
                <CalendarPlus className="h-4 w-4" />
                Book Appointment
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Upcoming Appointments</CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingAppts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No upcoming appointments.</p>
          ) : (
            <div className="space-y-3">
              {upcomingAppts.map((appt) => (
                <Link
                  key={appt.id}
                  href={`/appointments/${appt.id}`}
                  className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {appt.services?.name ?? "Service"} — {appt.pets?.name ?? "Pet"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {appt.appointment_date} at {appt.appointment_time?.slice(0, 5)}
                    </p>
                  </div>
                  <Badge
                    className={cn(
                      "text-xs px-2 py-0.5 rounded-full font-medium capitalize",
                      statusColors[appt.status]
                    )}
                  >
                    {appt.status}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
