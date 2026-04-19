import { createClient } from "@/lib/supabaseServer";
import { createServiceClient } from "@/lib/supabaseService";
import { sendEmail } from "@/lib/brevoMailer";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("appointments")
    .select("*, profiles(full_name, email, phone), pets(name, species, breed), services(name, duration_minutes, price)")
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { status } = body;

  const validStatuses = ["pending", "approved", "rejected", "cancelled", "completed"];
  if (!status || !validStatuses.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role === "admin";
  const adminOnlyStatuses = ["approved", "rejected", "completed"];
  const clientOnlyStatuses = ["cancelled"];

  if (!isAdmin && adminOnlyStatuses.includes(status)) {
    return NextResponse.json({ error: "Only admins can approve, reject, or complete appointments" }, { status: 403 });
  }

  if (isAdmin && clientOnlyStatuses.includes(status)) {
    // Admins can also cancel — no restriction here
  }

  if (!isAdmin) {
    const { data: appt } = await supabase
      .from("appointments")
      .select("client_id, status")
      .eq("id", id)
      .single();

    if (!appt || appt.client_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (appt.status !== "pending" && appt.status !== "approved") {
      return NextResponse.json({ error: "Can only cancel pending or approved appointments" }, { status: 400 });
    }
  }

  const { data, error } = await supabase
    .from("appointments")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Send approval email + notification when status changes to approved
  if (status === "approved") {
    try {
      const serviceSupabase = createServiceClient();
      const { data: appt } = await serviceSupabase
        .from("appointments")
        .select("*, profiles(full_name, email), pets(name), services(name)")
        .eq("id", id)
        .single();

      const clientEmail = appt?.profiles?.email;
      const clientName = appt?.profiles?.full_name || "Client";

      if (clientEmail && !appt?.reminder_approved_sent) {
        await sendEmail({
          to: { email: clientEmail, name: clientName },
          subject: "Your PawCare Appointment is Approved!",
          htmlContent: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background-color: #4f9d69; padding: 24px 32px; border-radius: 8px 8px 0 0;">
                <h1 style="color: #ffffff; margin: 0; font-size: 22px;">🐾 PawCare Clinic</h1>
              </div>
              <div style="background-color: #ffffff; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
                <h2 style="color: #111827; margin-top: 0;">Appointment Approved ✅</h2>
                <p style="color: #374151; line-height: 1.6;">Hi ${clientName}, your appointment has been <strong>approved</strong>!</p>
                <table style="width: 100%; border-collapse: collapse; margin: 16px 0; background: #f9fafb; border-radius: 8px;">
                  <tr><td style="padding: 10px 16px; color: #6b7280;">Pet</td><td style="padding: 10px 16px; font-weight: 600;">${appt?.pets?.name ?? "—"}</td></tr>
                  <tr><td style="padding: 10px 16px; color: #6b7280;">Service</td><td style="padding: 10px 16px; font-weight: 600;">${appt?.services?.name ?? "—"}</td></tr>
                  <tr><td style="padding: 10px 16px; color: #6b7280;">Date</td><td style="padding: 10px 16px; font-weight: 600;">${appt?.appointment_date}</td></tr>
                  <tr><td style="padding: 10px 16px; color: #6b7280;">Time</td><td style="padding: 10px 16px; font-weight: 600;">${appt?.appointment_time?.slice(0, 5)}</td></tr>
                </table>
                <p style="color: #374151;">Please arrive 10 minutes before your scheduled time. See you at PawCare Clinic!</p>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
                <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">PawCare Clinic — Caring for your pets, one paw at a time</p>
              </div>
            </div>
          `,
        });

        await serviceSupabase
          .from("appointments")
          .update({ reminder_approved_sent: true })
          .eq("id", id);

        await serviceSupabase.from("notifications").insert({
          user_id: appt.client_id,
          title: "Appointment Approved",
          message: `Your ${appt?.services?.name} appointment for ${appt?.pets?.name} on ${appt?.appointment_date} has been approved.`,
        });
      }
    } catch (emailErr) {
      console.error("Approval email error:", emailErr);
    }
  }

  return NextResponse.json(data);
}
