import { createServiceClient } from "@/lib/supabaseService";
import { sendEmail } from "@/lib/brevoMailer";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const now = new Date();

  const { data: appointments, error } = await supabase
    .from("appointments")
    .select("*, profiles(full_name, email), pets(name), services(name)")
    .eq("status", "approved");

  if (error) {
    console.error("Cron fetch error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let sentApproval = 0;
  let sent3day = 0;
  let sent10hr = 0;

  for (const appt of appointments ?? []) {
    const clientEmail = appt.profiles?.email;
    const clientName = appt.profiles?.full_name || "Client";
    if (!clientEmail) continue;

    const apptDateTime = new Date(`${appt.appointment_date}T${appt.appointment_time}`);
    const hoursUntil = (apptDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    const daysUntil = hoursUntil / 24;

    // Catch missed approval emails
    if (!appt.reminder_approved_sent) {
      try {
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
                  <tr><td style="padding: 10px 16px; color: #6b7280;">Pet</td><td style="padding: 10px 16px; font-weight: 600;">${appt.pets?.name ?? "—"}</td></tr>
                  <tr><td style="padding: 10px 16px; color: #6b7280;">Service</td><td style="padding: 10px 16px; font-weight: 600;">${appt.services?.name ?? "—"}</td></tr>
                  <tr><td style="padding: 10px 16px; color: #6b7280;">Date</td><td style="padding: 10px 16px; font-weight: 600;">${appt.appointment_date}</td></tr>
                  <tr><td style="padding: 10px 16px; color: #6b7280;">Time</td><td style="padding: 10px 16px; font-weight: 600;">${appt.appointment_time?.slice(0, 5)}</td></tr>
                </table>
                <p style="color: #374151;">Please arrive 10 minutes before your scheduled time. See you at PawCare Clinic!</p>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
                <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">PawCare Clinic — Caring for your pets, one paw at a time</p>
              </div>
            </div>
          `,
        });

        await supabase.from("appointments").update({ reminder_approved_sent: true }).eq("id", appt.id);
        await supabase.from("notifications").insert({
          user_id: appt.client_id,
          title: "Appointment Approved",
          message: `Your ${appt.services?.name} appointment for ${appt.pets?.name} on ${appt.appointment_date} has been approved.`,
        });
        sentApproval++;
      } catch (err) {
        console.error(`Approval email failed for ${appt.id}:`, err);
      }
    }

    // 3-day reminder: send when 3 days or less away, but more than 10 hours
    if (!appt.reminder_3day_sent && daysUntil <= 3 && hoursUntil > 10) {
      try {
        await sendEmail({
          to: { email: clientEmail, name: clientName },
          subject: "Reminder: Your PawCare Appointment in 3 Days",
          htmlContent: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background-color: #4f9d69; padding: 24px 32px; border-radius: 8px 8px 0 0;">
                <h1 style="color: #ffffff; margin: 0; font-size: 22px;">🐾 PawCare Clinic</h1>
              </div>
              <div style="background-color: #ffffff; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
                <h2 style="color: #111827; margin-top: 0;">📅 Appointment Reminder — 3 Days Away</h2>
                <p style="color: #374151; line-height: 1.6;">Hi ${clientName}, your upcoming appointment is in <strong>3 days</strong>!</p>
                <table style="width: 100%; border-collapse: collapse; margin: 16px 0; background: #f9fafb; border-radius: 8px;">
                  <tr><td style="padding: 10px 16px; color: #6b7280;">Pet</td><td style="padding: 10px 16px; font-weight: 600;">${appt.pets?.name ?? "—"}</td></tr>
                  <tr><td style="padding: 10px 16px; color: #6b7280;">Service</td><td style="padding: 10px 16px; font-weight: 600;">${appt.services?.name ?? "—"}</td></tr>
                  <tr><td style="padding: 10px 16px; color: #6b7280;">Date</td><td style="padding: 10px 16px; font-weight: 600;">${appt.appointment_date}</td></tr>
                  <tr><td style="padding: 10px 16px; color: #6b7280;">Time</td><td style="padding: 10px 16px; font-weight: 600;">${appt.appointment_time?.slice(0, 5)}</td></tr>
                </table>
                <p style="color: #374151;">Please make sure to arrive 10 minutes early. See you soon at PawCare Clinic!</p>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
                <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">PawCare Clinic — Caring for your pets, one paw at a time</p>
              </div>
            </div>
          `,
        });

        await supabase.from("appointments").update({ reminder_3day_sent: true }).eq("id", appt.id);
        sent3day++;
      } catch (err) {
        console.error(`3-day reminder failed for ${appt.id}:`, err);
      }
    }

    // 10-hour reminder: send when 10 hours or less away
    if (!appt.reminder_10hr_sent && hoursUntil <= 10 && hoursUntil > 0) {
      try {
        await sendEmail({
          to: { email: clientEmail, name: clientName },
          subject: "Reminder: Your PawCare Appointment is Very Soon!",
          htmlContent: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background-color: #4f9d69; padding: 24px 32px; border-radius: 8px 8px 0 0;">
                <h1 style="color: #ffffff; margin: 0; font-size: 22px;">🐾 PawCare Clinic</h1>
              </div>
              <div style="background-color: #ffffff; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
                <h2 style="color: #111827; margin-top: 0;">⏰ Appointment Coming Up Soon!</h2>
                <p style="color: #374151; line-height: 1.6;">Hi ${clientName}, your appointment is <strong>in less than 10 hours</strong>!</p>
                <table style="width: 100%; border-collapse: collapse; margin: 16px 0; background: #f9fafb; border-radius: 8px;">
                  <tr><td style="padding: 10px 16px; color: #6b7280;">Pet</td><td style="padding: 10px 16px; font-weight: 600;">${appt.pets?.name ?? "—"}</td></tr>
                  <tr><td style="padding: 10px 16px; color: #6b7280;">Service</td><td style="padding: 10px 16px; font-weight: 600;">${appt.services?.name ?? "—"}</td></tr>
                  <tr><td style="padding: 10px 16px; color: #6b7280;">Date</td><td style="padding: 10px 16px; font-weight: 600;">${appt.appointment_date}</td></tr>
                  <tr><td style="padding: 10px 16px; color: #6b7280;">Time</td><td style="padding: 10px 16px; font-weight: 600;">${appt.appointment_time?.slice(0, 5)}</td></tr>
                </table>
                <p style="color: #374151;">Please arrive 10 minutes early. We look forward to seeing you and ${appt.pets?.name ?? "your pet"}!</p>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
                <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">PawCare Clinic — Caring for your pets, one paw at a time</p>
              </div>
            </div>
          `,
        });

        await supabase.from("appointments").update({ reminder_10hr_sent: true }).eq("id", appt.id);
        sent10hr++;
      } catch (err) {
        console.error(`10-hr reminder failed for ${appt.id}:`, err);
      }
    }
  }

  return NextResponse.json({
    success: true,
    processed: appointments?.length ?? 0,
    sentApproval,
    sent3day,
    sent10hr,
  });
}
