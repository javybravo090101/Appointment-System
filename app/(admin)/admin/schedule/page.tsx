"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

function toLocalDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

interface Service {
  id: string;
  name: string;
}

interface Slot {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  max_appointments: number;
  is_blocked: boolean;
  service_id: string | null;
  services?: { name: string } | null;
}

export default function AdminSchedulePage() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");

  const fetchSlots = useCallback(async () => {
    const supabase = createClient();
    const [slotRes, svcRes] = await Promise.all([
      supabase
        .from("availability_slots")
        .select("*, services(name)")
        .order("date", { ascending: true })
        .order("start_time", { ascending: true }),
      supabase
        .from("services")
        .select("id, name")
        .eq("is_active", true)
        .order("name"),
    ]);
    setSlots(slotRes.data ?? []);
    setServices(svcRes.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  const dateStr = selectedDate
    ? toLocalDateStr(selectedDate)
    : "";

  const daySlots = slots.filter((s) => s.date === dateStr);

  const slotDates = new Set(slots.map((s) => s.date));

  async function handleAddSlot(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const supabase = createClient();
    const { error } = await supabase.from("availability_slots").insert({
      date: dateStr,
      start_time: fd.get("start_time") as string,
      end_time: fd.get("end_time") as string,
      max_appointments: Number(fd.get("max_appointments")) || 1,
      is_blocked: false,
      service_id: selectedServiceId || null,
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Slot added");
      setDialogOpen(false);
      setSelectedServiceId("");
      fetchSlots();
    }
    setSaving(false);
  }

  async function toggleBlock(slot: Slot) {
    const supabase = createClient();
    const { error } = await supabase
      .from("availability_slots")
      .update({ is_blocked: !slot.is_blocked })
      .eq("id", slot.id);
    if (error) toast.error(error.message);
    else fetchSlots();
  }

  async function deleteSlot(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from("availability_slots").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Slot deleted");
      fetchSlots();
    }
  }

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
        <h1 className="text-2xl font-bold tracking-tight">Schedule</h1>
        <p className="text-muted-foreground">Manage availability slots</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
        <Card className="w-fit shadow-sm border-muted">
          <CardContent className="p-6">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="scale-110 origin-top-left"
              modifiers={{
                hasSlots: (date) => slotDates.has(toLocalDateStr(date)),
              }}
              modifiersClassNames={{
                hasSlots: "bg-pawgreen/20 text-pawgreen font-semibold rounded-full",
              }}
            />
          </CardContent>
        </Card>

        <Card className="shadow-sm border-muted">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-xl font-bold">
              Slots for {selectedDate ? selectedDate.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : "—"}
            </CardTitle>
            {dateStr && (
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-pawgreen hover:bg-pawgreen-dark text-white gap-2 h-10 px-4">
                    <Plus className="h-4 w-4" /> Add New Slot
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Slot — {selectedDate?.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleAddSlot} className="space-y-5 pt-4">
                    <div className="space-y-2.5">
                      <Label className="font-medium">Service</Label>
                      <Select value={selectedServiceId} onValueChange={setSelectedServiceId}>
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Select a service" />
                        </SelectTrigger>
                        <SelectContent>
                          {services.map((svc) => (
                            <SelectItem key={svc.id} value={svc.id}>{svc.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2.5">
                        <Label htmlFor="start_time" className="font-medium">Start Time</Label>
                        <Input id="start_time" name="start_time" type="time" required className="h-11" />
                      </div>
                      <div className="space-y-2.5">
                        <Label htmlFor="end_time" className="font-medium">End Time</Label>
                        <Input id="end_time" name="end_time" type="time" required className="h-11" />
                      </div>
                    </div>
                    <div className="space-y-2.5">
                      <Label htmlFor="max_appointments" className="font-medium">Max Appointments</Label>
                      <Input id="max_appointments" name="max_appointments" type="number" min={1} defaultValue={1} className="h-11" />
                    </div>
                    <Button type="submit" className="w-full h-12 text-base font-semibold bg-pawgreen hover:bg-pawgreen-dark text-white mt-2" disabled={saving}>
                      {saving && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                      Save Slot
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </CardHeader>
          <CardContent>
            {daySlots.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground bg-muted/20 rounded-lg border border-dashed border-muted">
                <CalendarIcon className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="text-lg font-medium text-foreground">No slots scheduled</p>
                <p className="text-sm">Click "Add New Slot" to create availability.</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {daySlots.map((slot) => (
                  <div
                    key={slot.id}
                    className={cn(
                      "flex flex-col rounded-xl border p-4 transition-all shadow-sm",
                      slot.is_blocked 
                        ? "bg-danger/5 border-danger/20 opacity-80" 
                        : "bg-white hover:border-pawgreen/50 hover:shadow-md"
                    )}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-lg font-bold text-foreground">
                          {slot.start_time.slice(0, 5)} <span className="text-muted-foreground font-normal mx-1">→</span> {slot.end_time.slice(0, 5)}
                        </p>
                        {slot.services?.name && (
                          <p className="text-xs font-semibold text-pawgreen mt-0.5">
                            {slot.services.name}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground font-medium mt-0.5">
                          Capacity: {slot.max_appointments} pet{slot.max_appointments > 1 ? 's' : ''}
                        </p>
                      </div>
                      <Badge
                        className={cn(
                          "text-xs px-2.5 py-1 cursor-pointer transition-colors shadow-none font-semibold",
                          slot.is_blocked
                            ? "bg-danger/15 text-danger hover:bg-danger/25"
                            : "bg-success/15 text-success hover:bg-success/25"
                        )}
                        onClick={() => toggleBlock(slot)}
                      >
                        {slot.is_blocked ? "Blocked" : "Available"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-end mt-auto pt-2 border-t border-muted/50">
                      <Button variant="ghost" size="sm" onClick={() => deleteSlot(slot.id)} className="text-danger hover:text-danger hover:bg-danger/10 gap-1.5 h-8 px-2">
                        <Trash2 className="h-3.5 w-3.5" />
                        <span className="text-xs font-medium">Remove</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
