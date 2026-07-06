import { useEffect, useState } from "react";
import { api, formatApiError, formatMoney } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { deleteWithUndo } from "@/lib/undoableDelete";

const COLOR_OPTIONS = [
  "#C5A880",
  "#E2C2B3",
  "#9CB4A6",
  "#E8CBA5",
  "#D48A8A",
  "#B6C4B6",
  "#8a6e47",
  "#76726B",
];

function CategoryForm({ initial, onSubmit, onCancel, busy }) {
  const [name, setName] = useState(initial?.name || "");
  const [color, setColor] = useState(initial?.color || COLOR_OPTIONS[0]);
  const [planned, setPlanned] = useState(initial?.planned_amount ?? "");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          name: name.trim(),
          color,
          planned_amount: Number(planned) || 0,
          icon: initial?.icon || "Sparkles",
        });
      }}
      className="space-y-5"
    >
      {/* Live preview chip */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#FAFAF7] border border-[#EAE5DF]">
        <div
          className="h-9 w-9 rounded-full flex items-center justify-center"
          style={{ backgroundColor: `${color}26` }}
        >
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
        </div>
        <div className="flex-1">
          <div className="font-serif text-lg text-[#2C2C2C]">{name || "Your category"}</div>
          <div className="text-xs text-[#76726B]">
            Planned · {planned ? formatMoney(planned, "USD") : "Set an amount"}
          </div>
        </div>
      </div>

      <div>
        <label className="text-xs text-[#76726B] mb-1.5 block">Name *</label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Honeymoon, Stationery…"
          data-testid="category-name-input"
          className="w-full h-12 rounded-xl border border-[#EAE5DF] px-4 text-sm focus:border-[#C5A880] focus:ring-2 focus:ring-[#C5A880]/15 outline-none transition"
        />
      </div>

      <div>
        <label className="text-xs text-[#76726B] mb-1.5 block">Planned amount</label>
        <input
          type="number"
          min={0}
          step="0.01"
          value={planned}
          onChange={(e) => setPlanned(e.target.value)}
          placeholder="0.00"
          data-testid="category-planned-input"
          className="w-full h-12 rounded-xl border border-[#EAE5DF] px-4 text-sm focus:border-[#C5A880] focus:ring-2 focus:ring-[#C5A880]/15 outline-none transition"
        />
        <p className="text-[11px] text-[#76726B] mt-1.5">
          The budget you&apos;ve allocated to this category. Leave blank if not sure yet.
        </p>
      </div>

      <div>
        <label className="text-xs text-[#76726B] mb-2 block">Accent color</label>
        <div className="flex flex-wrap gap-2">
          {COLOR_OPTIONS.map((c) => (
            <button
              type="button"
              key={c}
              onClick={() => setColor(c)}
              className={`h-9 w-9 rounded-full ring-2 transition-all ${
                color === c ? "ring-[#2C2C2C] scale-110" : "ring-transparent hover:ring-[#EAE5DF]"
              }`}
              style={{ backgroundColor: c }}
              data-testid={`color-${c}`}
              aria-label={`Color ${c}`}
            />
          ))}
        </div>
      </div>

      <DialogFooter className="pt-2">
        <button type="button" onClick={onCancel} className="btn-ghost">
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={busy} data-testid="category-save-btn">
          {busy ? "Saving…" : initial ? "Save changes" : "Add category"}
        </button>
      </DialogFooter>
    </form>
  );
}

export default function Categories() {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [profile, setProfile] = useState(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);

  const reload = async () => {
    const [c, s, p] = await Promise.all([
      api.get("/categories"),
      api.get("/stats"),
      api.get("/profile"),
    ]);
    setItems(Array.isArray(c.data) ? c.data : []);
    setStats(s.data);
    setProfile(p.data);
  };

  useEffect(() => {
    reload();
  }, []);

  const currency = profile?.currency || "USD";

  const submit = async (payload) => {
    setBusy(true);
    try {
      if (editing) {
        await api.put(`/categories/${editing.id}`, payload);
        toast.success("Category updated");
      } else {
        await api.post("/categories", payload);
        toast.success("Category added");
      }
      setOpen(false);
      setEditing(null);
      await reload();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (cat) => {
    await deleteWithUndo({
      path: "/categories",
      item: cat,
      body: {
        name: cat.name,
        icon: cat.icon || null,
        color: cat.color || null,
        planned_amount: cat.planned_amount || 0,
      },
      optimistic: () => setItems((prev) => prev.filter((c) => c.id !== cat.id)),
      refresh: reload,
      label: "Category",
    });
  };

  const byId = stats ? Object.fromEntries(stats.by_category.map((c) => [c.id, c])) : {};

  return (
    <div className="space-y-8" data-testid="categories-page">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <span className="label-overline">Buckets</span>
          <h1 className="font-serif text-4xl mt-2">Budget Categories</h1>
          <p className="text-[#5b574f] mt-1">
            Group expenses to see exactly where the budget is going.
          </p>
        </div>
        <Dialog
          open={open}
          onOpenChange={(o) => {
            setOpen(o);
            if (!o) setEditing(null);
          }}
        >
          <DialogTrigger asChild>
            <button className="btn-primary" data-testid="add-category-btn">
              <Plus className="h-4 w-4" /> Add category
            </button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl max-w-lg max-h-[88vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-serif text-2xl">
                {editing ? "Edit category" : "Add a category"}
              </DialogTitle>
              <DialogDescription>
                Give it a meaningful name and an optional planned amount.
              </DialogDescription>
            </DialogHeader>
            <CategoryForm
              initial={editing}
              busy={busy}
              onSubmit={submit}
              onCancel={() => {
                setOpen(false);
                setEditing(null);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {items.map((c) => {
          const live = byId[c.id] || { spent: 0, pending: 0, planned: c.planned_amount };
          const total = live.spent + live.pending;
          const pct = c.planned_amount > 0 ? Math.min(100, (total / c.planned_amount) * 100) : 0;
          return (
            <div
              key={c.id}
              className="soft-card p-6"
              data-testid={`category-card-${c.name.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="h-10 w-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${c.color}26` }}
                  >
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: c.color }} />
                  </div>
                  <div>
                    <div className="font-serif text-xl text-[#2C2C2C]">{c.name}</div>
                    <div className="text-xs text-[#76726B]">
                      Planned {formatMoney(c.planned_amount, currency)}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      setEditing(c);
                      setOpen(true);
                    }}
                    className="p-2 rounded-full hover:bg-[#EAE5DF]/50 text-[#76726B]"
                    data-testid={`edit-category-${c.id}`}
                  >
                    <Pencil className="h-4 w-4" strokeWidth={1.5} />
                  </button>
                  <button
                    onClick={() => remove(c)}
                    className="p-2 rounded-full hover:bg-[#D48A8A]/15 text-[#a55656]"
                    data-testid={`delete-category-${c.id}`}
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                  </button>
                </div>
              </div>
              <div className="mt-5 space-y-3">
                <Progress value={pct} className="h-1.5 bg-[#EAE5DF]" />
                <div className="flex items-center justify-between text-xs text-[#76726B]">
                  <span>
                    Spent <span className="text-[#2C2C2C] font-medium">{formatMoney(live.spent, currency)}</span>
                  </span>
                  <span>
                    Pending <span className="text-[#2C2C2C] font-medium">{formatMoney(live.pending, currency)}</span>
                  </span>
                </div>
                {c.planned_amount > 0 && total > c.planned_amount && (
                  <div className="text-xs text-[#a55656]">
                    Over by {formatMoney(total - c.planned_amount, currency)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
