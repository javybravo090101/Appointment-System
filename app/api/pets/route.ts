import { createClient } from "@/lib/supabaseServer";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();

  let query = supabase.from("pets").select("*, profiles(full_name, email)").order("created_at", { ascending: false });
  if (profile?.role !== "admin") {
    query = query.eq("owner_id", user.id);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { name, species, breed, age, weight, notes } = body;

  if (!name || !species) {
    return NextResponse.json({ error: "Name and species are required" }, { status: 400 });
  }

  const { data, error } = await supabase.from("pets").insert({
    owner_id: user.id,
    name,
    species,
    breed: breed || null,
    age: age ?? null,
    weight: weight ?? null,
    notes: notes || null,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
