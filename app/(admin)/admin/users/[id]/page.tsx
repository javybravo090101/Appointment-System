"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, ArrowLeft } from "lucide-react";

interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: string;
  created_at: string;
}

interface Pet {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  age: number | null;
}

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  services: { name: string } | null;
  pets: { name: string } | null;
}

export default function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [pets, setPets] = useState<Pet[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const supabase = createClient();
      const [profileRes, petsRes, apptsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", id).single(),
        supabase.from("pets").select("*").eq("owner_id", id).order("created_at", { ascending: false }),
        supabase
          .from("appointments")
          .select("*, services(name), pets(name)")
          .eq("client_id", id)
          .order("appointment_date", { ascending: false })
          .limit(20),
      ]);
      setProfile(profileRes.data as Profile | null);
      setPets(petsRes.data ?? []);
      setAppointments((apptsRes.data as unknown as Appointment[]) ?? []);
      setLoading(false);
    }
    fetch();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-pawgreen" />
      </div>
    );
  }

  if (!profile) {
    return <div className="text-center py-20 text-muted-foreground">User not found.</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <Button variant="ghost" onClick={() => router.back()} className="gap-2">
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{profile.full_name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm"><span className="text-muted-foreground">Email:</span> {profile.email}</p>
          <p className="text-sm"><span className="text-muted-foreground">Phone:</span> {profile.phone ?? "—"}</p>
          <p className="text-sm"><span className="text-muted-foreground">Role:</span>{" "}
            <Badge variant={profile.role === "admin" ? "default" : "secondary"} className="capitalize text-xs">{profile.role}</Badge>
          </p>
          <p className="text-sm"><span className="text-muted-foreground">Joined:</span> {new Date(profile.created_at).toLocaleDateString()}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Pets ({pets.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {pets.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pets registered.</p>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Species</TableHead>
                    <TableHead>Breed</TableHead>
                    <TableHead>Age</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pets.map((pet) => (
                    <TableRow key={pet.id}>
                      <TableCell className="font-medium">{pet.name}</TableCell>
                      <TableCell className="capitalize">{pet.species}</TableCell>
                      <TableCell>{pet.breed ?? "—"}</TableCell>
                      <TableCell>{pet.age != null ? `${pet.age} yr` : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Appointments ({appointments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {appointments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No appointments.</p>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Pet</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appointments.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>{a.appointment_date}</TableCell>
                      <TableCell>{a.appointment_time?.slice(0, 5)}</TableCell>
                      <TableCell>{a.pets?.name ?? "—"}</TableCell>
                      <TableCell>{a.services?.name ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize text-xs">{a.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
