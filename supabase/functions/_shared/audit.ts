type AuditPayload = {
  actor_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  meta?: Record<string, unknown> | null;
  severity?: string | null;
};

export async function writeAuditLog(
  supabaseClient: {
    from: (table: string) => {
      insert: (values: Record<string, unknown>[]) => Promise<{
        error: { message?: string; code?: string } | null;
      }>;
    };
  },
  payload: AuditPayload,
) {
  try {
    const { error } = await supabaseClient.from("audit_logs").insert([{
      actor_id: payload.actor_id,
      action: payload.action,
      entity_type: payload.entity_type,
      entity_id: payload.entity_id,
      meta: payload.meta ?? null,
      severity: payload.severity ?? null,
    }]);

    if (error) {
      // Table may not exist in all environments.
      console.warn("Audit log skipped:", error.message ?? error.code);
    }
  } catch (err) {
    console.warn("Audit log skipped:", err);
  }
}
