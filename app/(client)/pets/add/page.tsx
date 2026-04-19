"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function AddPetPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [species, setSpecies] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("pets").insert({
      owner_id: user.id,
      name: fd.get("name") as string,
      species,
      breed: (fd.get("breed") as string) || null,
      age: fd.get("age") ? Number(fd.get("age")) : null,
      weight: fd.get("weight") ? Number(fd.get("weight")) : null,
      notes: (fd.get("notes") as string) || null,
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    toast.success("Pet added!");
    router.push("/pets");
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <Button variant="ghost" onClick={() => router.back()} className="gap-2">
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Add a New Pet</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Pet Name</Label>
              <Input id="name" name="name" placeholder="Buddy" required />
            </div>
            <div className="space-y-2">
              <Label>Species</Label>
              <Select value={species} onValueChange={setSpecies} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select species" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dog">Dog</SelectItem>
                  <SelectItem value="cat">Cat</SelectItem>
                  <SelectItem value="bird">Bird</SelectItem>
                  <SelectItem value="rabbit">Rabbit</SelectItem>
                  <SelectItem value="hamster">Hamster</SelectItem>
                  <SelectItem value="fish">Fish</SelectItem>
                  <SelectItem value="reptile">Reptile</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="breed">Breed (optional)</Label>
              <Input id="breed" name="breed" placeholder="Golden Retriever" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="age">Age (years)</Label>
                <Input id="age" name="age" type="number" min={0} placeholder="3" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weight">Weight (kg)</Label>
                <Input id="weight" name="weight" type="number" min={0} step={0.1} placeholder="12.5" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea id="notes" name="notes" placeholder="Allergies, medical conditions..." rows={3} />
            </div>
            <Button
              type="submit"
              className="w-full bg-pawgreen hover:bg-pawgreen-dark text-white"
              disabled={loading || !species}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Pet
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
