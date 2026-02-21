export type MobilePushProviderName = "expo" | "webhook";

export type MobilePushInput = {
  token: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

export type MobilePushSendResult =
  | {
      ok: true;
      provider: MobilePushProviderName;
      status: number;
    }
  | {
      ok: false;
      provider: MobilePushProviderName;
      status: number;
      reason:
        | "no_provider"
        | "provider_rejected"
        | "provider_unreachable"
        | "invalid_device_token";
    };

function resolveProvider(): MobilePushProviderName {
  const raw = String(process.env.MOBILE_PUSH_PROVIDER || "").trim().toLowerCase();
  if (raw === "expo" || raw === "webhook") {
    return raw;
  }
  if (process.env.EXPO_ACCESS_TOKEN || process.env.MOBILE_PUSH_EXPO_ENABLED === "1") {
    return "expo";
  }
  return "webhook";
}

async function sendViaWebhook(input: MobilePushInput): Promise<MobilePushSendResult> {
  const webhook = process.env.MOBILE_PUSH_WEBHOOK_URL;
  if (!webhook) {
    return { ok: false, provider: "webhook", reason: "no_provider", status: 0 };
  }

  try {
    const response = await fetch(webhook, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        token: input.token,
        title: input.title,
        body: input.body,
        data: input.data || {}
      })
    });
    if (!response.ok) {
      return {
        ok: false,
        provider: "webhook",
        reason: "provider_rejected",
        status: response.status
      };
    }
    return { ok: true, provider: "webhook", status: response.status };
  } catch {
    return {
      ok: false,
      provider: "webhook",
      reason: "provider_unreachable",
      status: 0
    };
  }
}

function isExpoToken(token: string) {
  return token.startsWith("ExponentPushToken[") || token.startsWith("ExpoPushToken[");
}

async function sendViaExpo(input: MobilePushInput): Promise<MobilePushSendResult> {
  const accessToken = String(process.env.EXPO_ACCESS_TOKEN || "").trim();
  if (!isExpoToken(input.token)) {
    return { ok: false, provider: "expo", reason: "invalid_device_token", status: 0 };
  }

  try {
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {})
      },
      body: JSON.stringify({
        to: input.token,
        title: input.title,
        body: input.body,
        data: input.data || {},
        sound: "default"
      })
    });
    if (!response.ok) {
      return {
        ok: false,
        provider: "expo",
        reason: "provider_rejected",
        status: response.status
      };
    }

    return { ok: true, provider: "expo", status: response.status };
  } catch {
    return {
      ok: false,
      provider: "expo",
      reason: "provider_unreachable",
      status: 0
    };
  }
}

export async function sendMobilePush(input: MobilePushInput): Promise<MobilePushSendResult> {
  const provider = resolveProvider();
  if (provider === "expo") {
    return sendViaExpo(input);
  }
  return sendViaWebhook(input);
}

