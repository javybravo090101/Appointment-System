"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabaseClient";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Loader2, Search, CalendarDays, Eye, Clock, Dog, BriefcaseMedical } from "lucide-react";

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  services: { name: string } | null;
  pets: { name: string; species: string } | null;
}

const statusColors: Record<string, string> = {
  pending: "bg-amber-50 text-amber-600 border-amber-100",
  approved: "bg-success/5 text-success border-success/20",
  rejected: "bg-danger/5 text-danger border-danger/20",
  cancelled: "bg-muted/50 text-muted-foreground border-muted",
  completed: "bg-blue-50 text-blue-600 border-blue-100",
};

export default function ClientAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchAppts() {
      const supabase = createClient();
      let query = supabase
        .from("appointments")
        .select("*, services(name), pets(name, species)")
        .order("appointment_date", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data } = await query;
      setAppointments((data as unknown as Appointment[]) ?? []);
      setLoading(false);
    }
    fetchAppts();
  }, [statusFilter]);

  const filtered = appointments.filter((a) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      a.services?.name?.toLowerCase().includes(s) ||
      a.pets?.name?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">My Appointments</h1>
        <p className="text-muted-foreground text-sm">View and manage your clinic bookings</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by service or pet..."
            className="pl-9 h-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44 h-10">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Appointments</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-pawgreen" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-muted shadow-sm">
          <CalendarDays className="mx-auto h-12 w-12 mb-3 text-muted-foreground/30" />
          <p className="text-lg font-medium text-foreground">No appointments found</p>
          <p className="text-sm text-muted-foreground">Try adjusting your filters or search.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((appt) => (
            <Link key={appt.id} href={`/appointments/${appt.id}`}>
              <Card className="group hover:border-pawgreen/50 hover:shadow-md transition-all cursor-pointer overflow-hidden border-slate-200">
                <CardContent className="p-0">
                  <div className="flex flex-col sm:flex-row sm:items-center p-4 gap-4">
                    {/* Left: Service Icon & Name */}
                    <div className="flex items-center gap-4 flex-1">
                      <div className="h-12 w-12 rounded-xl bg-pawgreen/10 flex items-center justify-center text-pawgreen group-hover:bg-pawgreen group-hover:text-white transition-colors">
                        <BriefcaseMedical className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-base text-foreground leading-tight group-hover:text-pawgreen transition-colors">
                          {appt.services?.name ?? "Service"}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-1 text-muted-foreground">
                          <Dog className="h-3.5 w-3.5" />
                          <span className="text-xs font-medium">{appt.pets?.name ?? "Pet"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Middle: Date & Time */}
                    <div className="flex flex-row sm:flex-col gap-4 sm:gap-1 sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                      <div className="flex items-center gap-1.5 sm:justify-end text-sm font-medium">
                        <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                        {new Date(appt.appointment_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                      <div className="flex items-center gap-1.5 sm:justify-end text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        {appt.appointment_time?.slice(0, 5)}
                      </div>
                    </div>

                    {/* Right: Status & Action */}
                    <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[11px] px-2.5 py-0.5 rounded-full font-bold capitalize tracking-wide shadow-none border",
                          statusColors[appt.status]
                        )}
                      >
                        {appt.status}
                      </Badge>
                      <div className="h-8 w-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-pawgreen/10 group-hover:text-pawgreen transition-all">
                        <Eye className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
