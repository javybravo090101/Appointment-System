"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Loader2, ArrowLeft, XCircle } from "lucide-react";
import { toast } from "sonner";

interface AppointmentDetail {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  notes: string | null;
  created_at: string;
  pets: { name: string; species: string; breed: string | null } | null;
  services: { name: string; duration_minutes: number; price: number } | null;
}

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-success/15 text-success",
  rejected: "bg-danger/15 text-danger",
  cancelled: "bg-muted text-muted-foreground",
  completed: "bg-blue-100 text-blue-700",
};

export default function ClientAppointmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [appt, setAppt] = useState<AppointmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    async function fetchAppt() {
      const supabase = createClient();
      const { data } = await supabase
        .from("appointments")
        .select("*, pets(name, species, breed), services(name, duration_minutes, price)")
        .eq("id", id)
        .single();
      setAppt(data as unknown as AppointmentDetail);
      setLoading(false);
    }
    fetchAppt();
  }, [id]);

  async function handleCancel() {
    setCancelling(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("appointments")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Appointment cancelled");
      setAppt((prev) => (prev ? { ...prev, status: "cancelled" } : prev));
    }
    setCancelling(false);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-pawgreen" />
      </div>
    );
  }

  if (!appt) {
    return <div className="text-center py-20 text-muted-foreground">Appointment not found.</div>;
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <Button variant="ghost" onClick={() => router.back()} className="gap-2">
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>

      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">Appointment</h1>
        <Badge
          className={cn(
            "text-xs px-2 py-0.5 rounded-full font-medium capitalize",
            statusColors[appt.status]
          )}
        >
          {appt.status}
        </Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Service</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium">{appt.services?.name}</p>
            <p className="text-sm text-muted-foreground">
              {appt.services?.duration_minutes} min &middot; &#8369;{appt.services?.price}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Pet</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium">{appt.pets?.name}</p>
            <p className="text-sm text-muted-foreground capitalize">
              {appt.pets?.species} {appt.pets?.breed ? `— ${appt.pets.breed}` : ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Date & Time</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium">{appt.appointment_date}</p>
            <p className="text-sm text-muted-foreground">{appt.appointment_time?.slice(0, 5)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Booked</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{new Date(appt.created_at).toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {appt.notes && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{appt.notes}</p>
          </CardContent>
        </Card>
      )}

      {(appt.status === "pending" || appt.status === "approved") && (
        <>
          <Separator />
          <Button
            variant="outline"
            className="text-danger border-danger hover:bg-danger/10 gap-2"
            onClick={handleCancel}
            disabled={cancelling}
          >
            {cancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
            Cancel Appointment
          </Button>
        </>
      )}
    </div>
  );
}
