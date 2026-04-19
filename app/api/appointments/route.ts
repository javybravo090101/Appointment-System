import { createClient } from "@/lib/supabaseServer";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();

  let query = supabase
    .from("appointments")
    .select("*, profiles(full_name, email), pets(name, species), services(name)")
    .order("created_at", { ascending: false });

  if (profile?.role !== "admin") {
    
    query = query.eq("client_id", user.id);
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
  const { pet_id, pet_ids, service_id, slot_id, appointment_date, appointment_time, notes } = body;

  // Support both single pet_id and multiple pet_ids
  const petIds = pet_ids || (pet_id ? [pet_id] : []);

  if (petIds.length === 0 || !service_id || !slot_id || !appointment_date || !appointment_time) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Check if any of the selected pets already booked this slot
  const { data: existingBookings } = await supabase
    .from("appointments")
    .select("pet_id")
    .eq("slot_id", slot_id)
    .in("pet_id", petIds)
    .in("status", ["pending", "approved"]);

  if (existingBookings && existingBookings.length > 0) {
    return NextResponse.json({ error: "One or more pets already have an appointment for this time slot." }, { status: 409 });
  }

  // Server-side capacity check - count unique pets per slot
  const { data: slot } = await supabase
    .from("availability_slots")
    .select("max_appointments")
    .eq("id", slot_id)
    .single();

  if (slot) {
    const { count } = await supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("slot_id", slot_id)
      .in("status", ["pending", "approved"]);

    const newTotal = (count ?? 0) + petIds.length;
    if (newTotal > slot.max_appointments) {
      return NextResponse.json({ error: `This time slot has capacity for ${slot.max_appointments} pets. You selected ${petIds.length} pet(s).` }, { status: 409 });
    }
  }

  // Create one appointment per pet
  const appointments = petIds.map((pid: string) => ({
    client_id: user.id,
    pet_id: pid,
    service_id,
    slot_id,
    appointment_date,
    appointment_time,
    status: "pending",
    notes: notes || null,
  }));

  const { data, error } = await supabase.from("appointments").insert(appointments).select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
