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
    "Use the invite link below and keep the prefilled email address exactly as provided so we can auto-link your existing contact record:",
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

export async function sendInterestRosterFinalizedEmail(input: {
  to: string;
  fullName?: string | null;
  eventTitle: string;
  eventStartsAt: string;
  eventLocation?: string;
  hqEventUrl?: string;
  guestCostReminder?: string;
}) {
  let smtp: ReturnType<typeof getSmtpConfig>;
  try {
    smtp = getSmtpConfig();
  } catch {
    return { sent: false as const, reason: "smtp_not_configured" as const };
  }

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: {
      user: smtp.user,
      pass: smtp.pass
    }
  });

  const subject = `Hockey Ops Final Roster: ${input.eventTitle}`;
  const greeting = input.fullName ? `Hi ${input.fullName},` : "Hi,";

  const text = [
    greeting,
    "",
    "Hockey Ops has finalized the roster and you were selected for this event:",
    input.eventTitle,
    `When: ${new Date(input.eventStartsAt).toLocaleString()}`,
    input.eventLocation ? `Where: ${input.eventLocation}` : "",
    input.guestCostReminder ? `Guest reminder: ${input.guestCostReminder}` : "",
    input.hqEventUrl ? `Event details: ${input.hqEventUrl}` : "",
    "",
    "Please confirm your RSVP status and logistics in Warrior HQ.",
    "",
    "Pittsburgh Warriors Hockey Ops"
  ]
    .filter(Boolean)
    .join("\n");

  await transporter.sendMail({
    from: smtp.from,
    to: input.to,
    subject,
    text
  });

  return { sent: true as const };
}

export async function sendDonationReceiptEmail(input: {
  to: string;
  fullName?: string | null;
  amountUsd: number;
  receiptId: string;
}) {
  let smtp: ReturnType<typeof getSmtpConfig>;
  try {
    smtp = getSmtpConfig();
  } catch {
    return { sent: false as const, reason: "smtp_not_configured" as const };
  }

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: {
      user: smtp.user,
      pass: smtp.pass
    }
  });

  const subject = "Pittsburgh Warriors Donation Receipt";
  const greeting = input.fullName ? `Hi ${input.fullName},` : "Hi,";

  const text = [
    greeting,
    "",
    "Thank you for supporting Pittsburgh Warriors Hockey Club.",
    `Amount received: $${input.amountUsd.toFixed(2)} USD`,
    `Receipt ID: ${input.receiptId}`,
    "",
    "Pittsburgh Warriors Hockey Ops"
  ].join("\n");

  await transporter.sendMail({
    from: smtp.from,
    to: input.to,
    subject,
    text
  });

  return { sent: true as const };
}

export async function sendAnnouncementEmail(input: {
  to: string;
  fullName?: string | null;
  title: string;
  body: string;
  hqUrl?: string;
}) {
  let smtp: ReturnType<typeof getSmtpConfig>;
  try {
    smtp = getSmtpConfig();
  } catch {
    return { sent: false as const, reason: "smtp_not_configured" as const };
  }

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: {
      user: smtp.user,
      pass: smtp.pass
    }
  });

  const subject = `Hockey Ops Announcement: ${input.title}`;
  const greeting = input.fullName ? `Hi ${input.fullName},` : "Hi,";
  const text = [
    greeting,
    "",
    input.title,
    "",
    input.body,
    "",
    input.hqUrl ? `View in Warrior HQ: ${input.hqUrl}` : "",
    "",
    "Pittsburgh Warriors Hockey Ops"
  ]
    .filter(Boolean)
    .join("\n");

  await transporter.sendMail({
    from: smtp.from,
    to: input.to,
    subject,
    text
  });

  return { sent: true as const };
}
