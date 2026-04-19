import { createClient } from "@/lib/supabaseServer";
import { createServiceClient } from "@/lib/supabaseService";
import { sendEmail } from "@/lib/brevoMailer";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const authSupabase = await createClient();
    const { data: { user } } = await authSupabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await authSupabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { appointmentId } = await request.json();
    if (!appointmentId) {
      return NextResponse.json({ error: "Missing appointmentId" }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data: appt } = await supabase
      .from("appointments")
      .select("*, profiles(full_name, email), pets(name), services(name)")
      .eq("id", appointmentId)
      .single();

    if (!appt || appt.reminder_10hr_sent) {
      return NextResponse.json({ message: "Skip" });
    }

    const clientEmail = appt.profiles?.email;
    const clientName = appt.profiles?.full_name ?? "Client";
    if (!clientEmail) return NextResponse.json({ error: "No email" }, { status: 400 });

    await sendEmail({
      to: { email: clientEmail, name: clientName },
      subject: "Reminder: Your PawCare Appointment is Tomorrow!",
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4f9d69;">Appointment Reminder — 10 Hours</h2>
          <p>Hi ${clientName},</p>
          <p>Your appointment is coming up <strong>very soon</strong>!</p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr><td style="padding: 8px; color: #666;">Pet:</td><td style="padding: 8px;">${appt.pets?.name ?? "—"}</td></tr>
            <tr><td style="padding: 8px; color: #666;">Service:</td><td style="padding: 8px;">${appt.services?.name ?? "—"}</td></tr>
            <tr><td style="padding: 8px; color: #666;">Date:</td><td style="padding: 8px;">${appt.appointment_date}</td></tr>
            <tr><td style="padding: 8px; color: #666;">Time:</td><td style="padding: 8px;">${appt.appointment_time?.slice(0, 5)}</td></tr>
          </table>
          <p>Please arrive 10 minutes early. See you soon!</p>
          <p style="color: #999; font-size: 12px;">PawCare Clinic — Caring for your pets, one paw at a time</p>
        </div>
      `,
    });

    await supabase
      .from("appointments")
      .update({ reminder_10hr_sent: true })
      .eq("id", appointmentId);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("send-reminder-10hr error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
