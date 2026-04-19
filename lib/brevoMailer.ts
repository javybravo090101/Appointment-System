interface SendEmailParams {
  to: { email: string; name: string };
  subject: string;
  htmlContent: string;
}

export async function sendEmail({ to, subject, htmlContent }: SendEmailParams) {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "api-key": process.env.BREVO_API_KEY!,
    },
    body: JSON.stringify({
      sender: {
        name: process.env.BREVO_SENDER_NAME || "Paw Care Clinic",
        email: process.env.BREVO_SENDER_EMAIL || "pawcare.noreply@gmail.com",
      },
      to: [to],
      subject,
      htmlContent,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Brevo email failed: ${err}`);
  }

  return res.json();
}
