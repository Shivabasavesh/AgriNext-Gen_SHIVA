import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

type RoleResult = {
  userId: string;
  role: string | null;
  supabaseUserClient: SupabaseClient;
};

export async function getUserAndRole(
  req: Request,
  supabaseUrl: string,
  supabaseAnonKey: string,
): Promise<RoleResult> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
    throw new Error("Missing or invalid authorization header");
  }

  const token = authHeader.replace(/bearer\s+/i, "");
  const supabaseUserClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const {
    data: userData,
    error: userError,
  } = await supabaseUserClient.auth.getUser(token);

  if (userError || !userData?.user) {
    throw new Error("Unauthorized");
  }

  const userId = userData.user.id;
  const { data: roleData, error: roleError } = await supabaseUserClient
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  if (roleError) {
    throw roleError;
  }

  return {
    userId,
    role: roleData?.role ?? null,
    supabaseUserClient,
  };
}

export function assertRole(role: string | null, allowedRoles: string[]) {
  if (!role || !allowedRoles.includes(role)) {
    throw new Error("Forbidden");
  }
}
