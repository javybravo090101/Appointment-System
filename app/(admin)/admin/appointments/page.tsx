"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Loader2, Eye, Search } from "lucide-react";

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  notes: string | null;
  created_at: string;
  profiles: { full_name: string; email: string } | null;
  pets: { name: string; species: string } | null;
  services: { name: string } | null;
}

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-success/15 text-success",
  rejected: "bg-danger/15 text-danger",
  cancelled: "bg-muted text-muted-foreground",
  completed: "bg-blue-100 text-blue-700",
};

export default function AdminAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetch() {
      const supabase = createClient();
      let query = supabase
        .from("appointments")
        .select("*, profiles(full_name, email), pets(name, species), services(name)")
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data } = await query;
      setAppointments((data as unknown as Appointment[]) ?? []);
      setLoading(false);
    }
    fetch();
  }, [statusFilter]);

  const filtered = appointments.filter((a) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      a.profiles?.full_name?.toLowerCase().includes(s) ||
      a.pets?.name?.toLowerCase().includes(s) ||
      a.services?.name?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Appointments</h1>
        <p className="text-muted-foreground">Manage all clinic appointments</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by client, pet, or service..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-pawgreen" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">No appointments found.</div>
      ) : (
        <div className="rounded-lg border bg-white overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Pet</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((appt) => (
                <TableRow key={appt.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span className="text-base">{appt.profiles?.full_name ?? "—"}</span>
                      <span className="text-xs text-muted-foreground">{appt.profiles?.email}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{appt.pets?.name ?? "—"}</span>
                    <div className="text-xs text-muted-foreground capitalize">{appt.pets?.species}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 font-normal">
                      {appt.services?.name ?? "—"}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium text-foreground/80">{appt.appointment_date}</TableCell>
                  <TableCell className="text-muted-foreground">{appt.appointment_time?.slice(0, 5)}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[11px] px-2.5 py-0.5 rounded-full font-semibold capitalize tracking-wide shadow-none border-0",
                        statusColors[appt.status] ?? "bg-muted text-muted-foreground"
                      )}
                    >
                      {appt.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="hover:bg-pawgreen/10 hover:text-pawgreen" asChild>
                      <Link href={`/admin/appointments/${appt.id}`}>
                        <Eye className="h-4 w-4 mr-1.5" />
                        View
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
