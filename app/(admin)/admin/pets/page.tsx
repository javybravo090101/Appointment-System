"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabaseClient";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Search, Dog, Cat, Bird, Rabbit } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Pet {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  age: number | null;
  weight: number | null;
  notes: string | null;
  profiles: { full_name: string; email: string } | null;
  created_at: string;
}

const SpeciesIcon = ({ species, className }: { species: string; className?: string }) => {
  const s = species.toLowerCase();
  if (s.includes("cat") || s.includes("feline")) return <Cat className={className} />;
  if (s.includes("bird") || s.includes("avian")) return <Bird className={className} />;
  if (s.includes("rabbit") || s.includes("bunny")) return <Rabbit className={className} />;
  return <Dog className={className} />;
};

export default function AdminPetsPage() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchPets() {
      const supabase = createClient();
      const { data } = await supabase
        .from("pets")
        .select("*, profiles(full_name, email)")
        .order("created_at", { ascending: false });
      setPets((data as unknown as Pet[]) ?? []);
      setLoading(false);
    }
    fetchPets();
  }, []);

  const filtered = pets.filter((p) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(s) ||
      p.species.toLowerCase().includes(s) ||
      p.breed?.toLowerCase().includes(s) ||
      p.profiles?.full_name?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">All Pets</h1>
        <p className="text-muted-foreground">View all registered pets</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search pets..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-pawgreen" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">No pets found.</div>
      ) : (
        <div className="rounded-lg border bg-white overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Species</TableHead>
                <TableHead>Breed</TableHead>
                <TableHead>Age</TableHead>
                <TableHead>Weight</TableHead>
                <TableHead>Owner</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((pet) => (
                <TableRow key={pet.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell className="font-medium text-base">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pawgreen/10 text-pawgreen">
                        <SpeciesIcon species={pet.species} className="h-5 w-5" />
                      </div>
                      <div>
                        {pet.name}
                        <div className="text-xs text-muted-foreground font-normal sm:hidden">{pet.profiles?.full_name}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize bg-slate-50 text-slate-700 border-slate-200">
                      {pet.species}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {pet.breed ? (
                      <span className="text-sm">{pet.breed}</span>
                    ) : (
                      <span className="text-muted-foreground text-sm italic">Unknown</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {pet.age != null ? (
                      <div className="flex items-center gap-1.5 text-sm">
                        <span className="font-medium">{pet.age}</span>
                        <span className="text-muted-foreground">yrs</span>
                      </div>
                    ) : "—"}
                  </TableCell>
                  <TableCell>
                    {pet.weight != null ? (
                      <div className="flex items-center gap-1.5 text-sm">
                        <span className="font-medium">{pet.weight}</span>
                        <span className="text-muted-foreground">kg</span>
                      </div>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{pet.profiles?.full_name ?? "—"}</span>
                      {pet.profiles?.email && (
                        <span className="text-xs text-muted-foreground">{pet.profiles.email}</span>
                      )}
                    </div>
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
