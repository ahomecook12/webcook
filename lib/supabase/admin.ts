import { createClient } from "./server";

export async function requireAdmin(accessToken?: string) {
  const supabase = await createClient(accessToken);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      user: null,
      isAdmin: false,
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return {
    user,
    isAdmin: profile?.role === "admin",
  };
}