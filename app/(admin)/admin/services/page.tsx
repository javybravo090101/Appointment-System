"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  price: number;
  description: string | null;
  is_active: boolean;
}

export default function AdminServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchServices = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.from("services").select("*").order("name");
    setServices(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: fd.get("name") as string,
      duration_minutes: Number(fd.get("duration_minutes")),
      price: Number(fd.get("price")),
      description: (fd.get("description") as string) || null,
      is_active: true,
    };
    const supabase = createClient();

    if (editing) {
      const { error } = await supabase.from("services").update(payload).eq("id", editing.id);
      if (error) toast.error(error.message);
      else toast.success("Service updated");
    } else {
      const { error } = await supabase.from("services").insert(payload);
      if (error) toast.error(error.message);
      else toast.success("Service added");
    }

    setSaving(false);
    setDialogOpen(false);
    setEditing(null);
    fetchServices();
  }

  async function toggleActive(svc: Service) {
    const supabase = createClient();
    const { error } = await supabase
      .from("services")
      .update({ is_active: !svc.is_active })
      .eq("id", svc.id);
    if (error) toast.error(error.message);
    else fetchServices();
  }

  async function deleteService(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from("services").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Service deleted");
      fetchServices();
    }
  }

  function openEdit(svc: Service) {
    setEditing(svc);
    setDialogOpen(true);
  }

  function openAdd() {
    setEditing(null);
    setDialogOpen(true);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Services</h1>
          <p className="text-muted-foreground">Manage clinic services</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button onClick={openAdd} className="bg-pawgreen hover:bg-pawgreen-dark text-white gap-1">
              <Plus className="h-4 w-4" /> Add Service
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Service" : "Add Service"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" defaultValue={editing?.name ?? ""} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration_minutes">Duration (min)</Label>
                  <Input id="duration_minutes" name="duration_minutes" type="number" min={5} defaultValue={editing?.duration_minutes ?? 30} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Price (&#8369;)</Label>
                  <Input id="price" name="price" type="number" min={0} step={0.01} defaultValue={editing?.price ?? 0} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" defaultValue={editing?.description ?? ""} rows={3} />
              </div>
              <Button type="submit" className="w-full bg-pawgreen hover:bg-pawgreen-dark text-white" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editing ? "Update" : "Create"} Service
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {services.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">No services yet.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((svc) => (
            <Card key={svc.id} className="shadow-sm">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold">{svc.name}</h3>
                  <Badge
                    className="text-xs cursor-pointer"
                    variant={svc.is_active ? "default" : "secondary"}
                    onClick={() => toggleActive(svc)}
                  >
                    {svc.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                {svc.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{svc.description}</p>
                )}
                <div className="text-sm text-muted-foreground">
                  {svc.duration_minutes} min &middot; &#8369;{svc.price}
                </div>
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" size="sm" className="gap-1" onClick={() => openEdit(svc)}>
                    <Pencil className="h-3 w-3" /> Edit
                  </Button>
                  <Button variant="ghost" size="sm" className="text-danger hover:text-danger gap-1" onClick={() => deleteService(svc.id)}>
                    <Trash2 className="h-3 w-3" /> Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
