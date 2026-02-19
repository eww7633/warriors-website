import { redirect } from "next/navigation";

export default function RegisterPage({
  searchParams
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const query = new URLSearchParams();
  const source = searchParams ?? {};

  for (const [key, value] of Object.entries(source)) {
    if (typeof value === "string") {
      query.set(key, value);
    } else if (Array.isArray(value)) {
      value.forEach((entry) => query.append(key, entry));
    }
  }

  const suffix = query.toString();
  redirect(suffix ? `/join?${suffix}` : "/join");
}
