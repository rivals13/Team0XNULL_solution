export function resolveScheduleSaveOutcome(response) {
  const scheduledItem = response?.scheduled ?? response?.schedule ?? null;
  const isSuccess = response?.status === "success" && Boolean(response?.saved) && Boolean(response?.id) && Boolean(scheduledItem);

  if (!isSuccess) {
    return {
      ok: false,
      message: response?.message ?? "Save failed",
      scheduledItem: null,
    };
  }

  return {
    ok: true,
    message: response?.message ?? "Scheduled Successfully!",
    scheduledItem,
  };
}
