import { toast } from "sonner";
import { api, formatApiError } from "@/lib/api";

/**
 * Delete an item from the server with optimistic UI + Undo toast.
 *
 * @param {object} opts
 * @param {string} opts.path       - "/guests/:id" without the id (eg "/guests")
 * @param {object} opts.item       - the item being deleted (must have .id)
 * @param {object} opts.body       - the request body to POST when restoring
 * @param {function} opts.optimistic - sync function called immediately to remove item locally
 * @param {function} opts.refresh  - async function to refetch authoritative server list
 * @param {string} opts.label      - what to call the item in toasts ("Guest", "Expense"…)
 */
export async function deleteWithUndo({ path, item, body, optimistic, refresh, label = "Item" }) {
  // 1. Optimistic UI removal so it feels instant
  if (optimistic) optimistic();

  // 2. Actually delete from the server
  try {
    await api.delete(`${path}/${item.id}`);
  } catch (e) {
    toast.error(formatApiError(e.response?.data?.detail) || e.message);
    if (refresh) await refresh();
    return;
  }

  // 3. Show toast with Undo action
  toast(`${label} removed`, {
    duration: 6000,
    action: {
      label: "Undo",
      onClick: async () => {
        try {
          await api.post(path, body);
          if (refresh) await refresh();
          toast.success(`${label} restored`);
        } catch (e) {
          toast.error(formatApiError(e.response?.data?.detail) || e.message);
        }
      },
    },
  });
}
