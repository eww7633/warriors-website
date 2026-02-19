import nodemailer from "nodemailer";

function getSmtpConfig() {
  const host = process.env.SMTP_HOST;
  const portRaw = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.EMAIL_FROM || process.env.ADMIN_EMAIL || "ops@pghwarriorhockey.us";

  if (!host || !portRaw || !user || !pass) {
    throw new Error("SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS.");
  }

  const port = Number(portRaw);
  if (!Number.isFinite(port)) {
    throw new Error("Invalid SMTP_PORT value.");
  }

  return {
    host,
    port,
    secure: port === 465,
    user,
    pass,
    from
  };
}

export async function sendInviteEmail(input: {
  to: string;
  fullName?: string | null;
  registerUrl: string;
}) {
  const smtp = getSmtpConfig();

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: {
      user: smtp.user,
      pass: smtp.pass
    }
  });

  const subject = "Pittsburgh Warriors Hockey Club Registration Invite";
  const greeting = input.fullName ? `Hi ${input.fullName},` : "Hi,";

  const text = [
    greeting,
    "",
    "You are invited to register for the Pittsburgh Warriors Hockey Club player portal.",
    "Please register using this exact email address so we can link your existing contact record:",
    input.to,
    "",
    input.registerUrl,
    "",
    "After registration, Hockey Ops will review and approve your player access.",
    "",
    "Pittsburgh Warriors Hockey Ops"
  ].join("\n");

  await transporter.sendMail({
    from: smtp.from,
    to: input.to,
    subject,
    text
  });
}
