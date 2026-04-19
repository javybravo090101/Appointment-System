"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, Dog, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Pet {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  age: number | null;
  weight: number | null;
  notes: string | null;
}

export default function ClientPetsPage() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPet, setEditingPet] = useState<Pet | null>(null);
  const [saving, setSaving] = useState(false);

  async function fetchPets() {
    const supabase = createClient();
    const { data } = await supabase
      .from("pets")
      .select("*")
      .order("created_at", { ascending: false });
    setPets(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    fetchPets();
  }, []);

  async function handleEditPet(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingPet) return;
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const supabase = createClient();
    const { error } = await supabase
      .from("pets")
      .update({
        name: fd.get("name") as string,
        species: fd.get("species") as string,
        breed: (fd.get("breed") as string) || null,
        age: fd.get("age") ? Number(fd.get("age")) : null,
        weight: fd.get("weight") ? Number(fd.get("weight")) : null,
        notes: (fd.get("notes") as string) || null,
      })
      .eq("id", editingPet.id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Pet updated");
      setEditingPet(null);
      fetchPets();
    }
    setSaving(false);
  }

  async function deletePet(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from("pets").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Pet removed");
      setPets((prev) => prev.filter((p) => p.id !== id));
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Pets</h1>
          <p className="text-muted-foreground">Manage your pet profiles</p>
        </div>
        <Button asChild className="bg-pawgreen hover:bg-pawgreen-dark text-white gap-1">
          <Link href="/pets/add">
            <Plus className="h-4 w-4" /> Add Pet
          </Link>
        </Button>
      </div>

      {pets.length === 0 ? (
        <div className="text-center py-16">
          <Dog className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground mb-4">No pets yet. Add your first pet!</p>
          <Button asChild className="bg-pawgreen hover:bg-pawgreen-dark text-white">
            <Link href="/pets/add">Add a Pet</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pets.map((pet) => (
            <Card key={pet.id} className="shadow-sm">
              <CardContent className="p-5 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pawgreen/10">
                    <Dog className="h-5 w-5 text-pawgreen" />
                  </div>
                  <div>
                    <p className="font-semibold">{pet.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {pet.species} {pet.breed ? `— ${pet.breed}` : ""}
                    </p>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground space-y-0.5">
                  {pet.age != null && <p>Age: {pet.age} year(s)</p>}
                  {pet.weight != null && <p>Weight: {pet.weight} kg</p>}
                  {pet.notes && <p className="line-clamp-2">Notes: {pet.notes}</p>}
                </div>
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" size="sm" className="text-pawgreen border-pawgreen/30 hover:bg-pawgreen/5 hover:text-pawgreen gap-1" onClick={() => setEditingPet(pet)}>
                    <Pencil className="h-3 w-3" /> Edit
                  </Button>
                  <Button variant="outline" size="sm" className="text-danger border-danger/30 hover:bg-danger/5 hover:text-danger gap-1" onClick={() => deletePet(pet.id)}>
                    <Trash2 className="h-3 w-3" /> Remove
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Dialog open={!!editingPet} onOpenChange={(open) => { if (!open) setEditingPet(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Pet — {editingPet?.name}</DialogTitle>
          </DialogHeader>
          {editingPet && (
            <form onSubmit={handleEditPet} className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name" className="font-medium">Name</Label>
                  <Input id="edit-name" name="name" defaultValue={editingPet.name} required className="h-10" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-species" className="font-medium">Species</Label>
                  <Input id="edit-species" name="species" defaultValue={editingPet.species} required className="h-10" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-breed" className="font-medium">Breed</Label>
                  <Input id="edit-breed" name="breed" defaultValue={editingPet.breed ?? ""} className="h-10" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-age" className="font-medium">Age (yrs)</Label>
                  <Input id="edit-age" name="age" type="number" min={0} defaultValue={editingPet.age ?? ""} className="h-10" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-weight" className="font-medium">Weight (kg)</Label>
                  <Input id="edit-weight" name="weight" type="number" min={0} step="0.1" defaultValue={editingPet.weight ?? ""} className="h-10" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-notes" className="font-medium">Notes</Label>
                <Textarea id="edit-notes" name="notes" defaultValue={editingPet.notes ?? ""} className="min-h-[80px] resize-none" />
              </div>
              <Button type="submit" className="w-full h-11 bg-pawgreen hover:bg-pawgreen-dark text-white font-semibold" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
