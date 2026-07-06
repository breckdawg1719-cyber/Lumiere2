import { useEffect, useMemo, useState } from "react";
import { api, formatApiError, formatMoney, getCurrencySymbol } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar as CalendarComp } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, Plus, Pencil, Trash2, Search, CheckCircle2, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { deleteWithUndo } from "@/lib/undoableDelete";

function ExpenseForm({ initial, categories, currency, onSubmit, onCancel, busy }) {
  const [vendor, setVendor] = useState(initial?.vendor || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [amount, setAmount] = useState(initial?.amount ?? "");
  // Default to PAID so users adding an existing expense don't need to flip a toggle.
  const [status, setStatus] = useState(initial?.status || "paid");
  const [categoryId, setCategoryId] = useState(initial?.category_id || "__none__");
  const [dueDate, setDueDate] = useState(
    initial?.due_date ? new Date(initial.due_date) : undefined
  );
  const sym = getCurrencySymbol(currency);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          vendor: vendor.trim(),
          description: description.trim() || null,
          amount: Number(amount) || 0,
          status,
          category_id: categoryId === "__none__" ? null : categoryId,
          due_date: dueDate ? dueDate.toISOString().slice(0, 10) : null,
          paid_date: null,
        });
      }}
      className="space-y-6"
    >
      {/* Big status toggle — most important field for the "is this spent or upcoming" question */}
      <div>
        <div className="label-overline mb-2">Is this paid already?</div>
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => setStatus("paid")}
            data-testid="expense-status-paid"
            className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 transition-all text-left ${
              status === "paid"
                ? "border-[#9CB4A6] bg-[#9CB4A6]/12"
                : "border-[#EAE5DF] hover:border-[#9CB4A6]/40 hover:bg-[#FAFAF7]"
            }`}
          >
            <CheckCircle2
              className={`h-5 w-5 ${status === "paid" ? "text-[#5e7c6b]" : "text-[#9c958a]"}`}
              strokeWidth={1.5}
            />
            <div>
              <div className="text-sm font-medium text-[#2C2C2C]">Already paid</div>
              <div className="text-[11px] text-[#76726B]">Counts toward Spent</div>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setStatus("pending")}
            data-testid="expense-status-pending"
            className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 transition-all text-left ${
              status === "pending"
                ? "border-[#E8CBA5] bg-[#E8CBA5]/20"
                : "border-[#EAE5DF] hover:border-[#E8CBA5]/40 hover:bg-[#FAFAF7]"
            }`}
          >
            <Clock
              className={`h-5 w-5 ${status === "pending" ? "text-[#8a6e2e]" : "text-[#9c958a]"}`}
              strokeWidth={1.5}
            />
            <div>
              <div className="text-sm font-medium text-[#2C2C2C]">Not yet paid</div>
              <div className="text-[11px] text-[#76726B]">Counts toward Pending</div>
            </div>
          </button>
        </div>
      </div>

      {/* Vendor + Amount — primary fields */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
        <div className="sm:col-span-3">
          <label className="text-xs text-[#76726B] mb-1.5 block">Vendor or item *</label>
          <input
            required
            value={vendor}
            onChange={(e) => setVendor(e.target.value)}
            placeholder="Hidden Cove Estate"
            data-testid="expense-vendor-input"
            className="w-full h-12 rounded-xl border border-[#EAE5DF] px-4 text-sm focus:border-[#C5A880] focus:ring-2 focus:ring-[#C5A880]/15 outline-none transition"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs text-[#76726B] mb-1.5 block">Amount *</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#76726B] text-sm">
              {sym}
            </span>
            <input
              type="number"
              min={0}
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              data-testid="expense-amount-input"
              className="w-full h-12 rounded-xl border border-[#EAE5DF] pl-9 pr-4 text-sm focus:border-[#C5A880] focus:ring-2 focus:ring-[#C5A880]/15 outline-none transition"
            />
          </div>
        </div>
      </div>

      {/* Category + Due date */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-[#76726B] mb-1.5 block">Category</label>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger
              data-testid="expense-category-select"
              className="h-12 rounded-xl border-[#EAE5DF]"
            >
              <SelectValue placeholder="Uncategorized" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Uncategorized</SelectItem>
              {categories.map((c) => (
                <SelectItem value={c.id} key={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-[#76726B] mb-1.5 block">
            {status === "paid" ? "Date paid" : "Due date"}
          </label>
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                data-testid="expense-duedate-trigger"
                className="w-full h-12 rounded-xl border border-[#EAE5DF] px-4 text-sm flex items-center gap-2 text-[#2C2C2C] hover:bg-[#FAFAF7] transition"
              >
                <CalendarIcon className="h-4 w-4 text-[#76726B]" strokeWidth={1.5} />
                {dueDate ? dueDate.toLocaleDateString() : "Choose date"}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 rounded-2xl" align="start">
              <CalendarComp mode="single" selected={dueDate} onSelect={setDueDate} initialFocus />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div>
        <label className="text-xs text-[#76726B] mb-1.5 block">Description (optional)</label>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Venue deposit, dress alterations…"
          data-testid="expense-description-input"
          className="w-full h-12 rounded-xl border border-[#EAE5DF] px-4 text-sm focus:border-[#C5A880] focus:ring-2 focus:ring-[#C5A880]/15 outline-none transition"
        />
      </div>

      <DialogFooter className="pt-2">
        <button type="button" onClick={onCancel} className="btn-ghost">
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={busy} data-testid="expense-save-btn">
          {busy ? "Saving…" : initial ? "Save changes" : "Add expense"}
        </button>
      </DialogFooter>
    </form>
  );
}

export default function Expenses() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [profile, setProfile] = useState(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");

  const reload = async () => {
    const [e, c, p] = await Promise.all([
      api.get("/expenses"),
      api.get("/categories"),
      api.get("/profile"),
    ]);
    setItems(Array.isArray(e.data) ? e.data : []);
    setCategories(Array.isArray(c.data) ? c.data : []);
    setProfile(p.data || null);
  };

  useEffect(() => {
    reload();
  }, []);

  const submit = async (payload) => {
    setBusy(true);
    try {
      if (editing) {
        await api.put(`/expenses/${editing.id}`, payload);
        toast.success("Expense updated");
      } else {
        await api.post("/expenses", payload);
        toast.success("Expense added");
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

  const remove = async (item) => {
    await deleteWithUndo({
      path: "/expenses",
      item,
      body: {
        category_id: item.category_id || null,
        vendor: item.vendor,
        description: item.description || null,
        amount: item.amount,
        status: item.status,
        due_date: item.due_date || null,
        paid_date: item.paid_date || null,
      },
      optimistic: () => setItems((prev) => prev.filter((x) => x.id !== item.id)),
      refresh: reload,
      label: "Expense",
    });
  };

  const togglePaid = async (item) => {
    try {
      await api.put(`/expenses/${item.id}`, {
        category_id: item.category_id || null,
        vendor: item.vendor,
        description: item.description || null,
        amount: item.amount,
        status: item.status === "paid" ? "pending" : "paid",
        due_date: item.due_date || null,
        paid_date: item.paid_date || null,
      });
      await reload();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    }
  };

  const currency = profile?.currency || "USD";
  const catMap = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [categories]);
  const filtered = items.filter((x) => {
    if (filter !== "all" && x.status !== filter) return false;
    if (q && !`${x.vendor} ${x.description || ""}`.toLowerCase().includes(q.toLowerCase()))
      return false;
    return true;
  });

  return (
    <div className="space-y-8" data-testid="expenses-page">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <span className="label-overline">The ledger</span>
          <h1 className="font-serif text-4xl mt-2">Expenses</h1>
          <p className="text-[#5b574f] mt-1">
            Mark expenses as <span className="text-[#5e7c6b]">paid</span> to count them toward your spent total.
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
            <button className="btn-primary" data-testid="add-expense-btn">
              <Plus className="h-4 w-4" /> Add expense
            </button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl max-w-xl max-h-[88vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-serif text-2xl">
                {editing ? "Edit expense" : "Add an expense"}
              </DialogTitle>
              <DialogDescription>
                Record a payment you&apos;ve made or one that&apos;s coming up.
              </DialogDescription>
            </DialogHeader>
            <ExpenseForm
              initial={editing}
              categories={categories}
              currency={currency}
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

      <div className="soft-card p-4 lg:p-5 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9c958a]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search vendor or description"
            data-testid="expense-search"
            className="w-full h-11 rounded-xl border border-[#EAE5DF] pl-9 pr-3 text-sm focus:border-[#C5A880] focus:ring-2 focus:ring-[#C5A880]/15 outline-none"
          />
        </div>
        <div className="flex gap-1 rounded-full bg-[#EAE5DF]/40 p-1">
          {["all", "pending", "paid"].map((k) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              data-testid={`filter-${k}`}
              className={`px-4 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${
                filter === k ? "bg-white text-[#2C2C2C] shadow-sm" : "text-[#76726B]"
              }`}
            >
              {k}
            </button>
          ))}
        </div>
      </div>

      <div className="soft-card overflow-hidden" data-testid="expenses-table">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-[#76726B]">
            <p>No expenses match.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#EAE5DF]">
            <div className="hidden sm:grid grid-cols-12 px-6 py-3 text-[11px] uppercase tracking-[0.18em] text-[#9c958a] bg-[#FAFAF7]">
              <div className="col-span-4">Vendor</div>
              <div className="col-span-2">Category</div>
              <div className="col-span-2">Due</div>
              <div className="col-span-2">Amount</div>
              <div className="col-span-2 text-right">Status</div>
            </div>
            {filtered.map((e) => (
              <div
                key={e.id}
                className="grid grid-cols-2 sm:grid-cols-12 px-6 py-4 items-center gap-2 hover:bg-[#FAFAF7] transition-colors"
                data-testid={`expense-row-${e.id}`}
              >
                <div className="col-span-2 sm:col-span-4">
                  <div className="font-medium text-[#2C2C2C]">{e.vendor}</div>
                  {e.description && (
                    <div className="text-xs text-[#76726B] mt-0.5">{e.description}</div>
                  )}
                </div>
                <div className="sm:col-span-2 text-sm text-[#5b574f]">
                  {e.category_id && catMap[e.category_id] ? (
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: catMap[e.category_id].color }}
                      />
                      {catMap[e.category_id].name}
                    </div>
                  ) : (
                    <span className="text-[#9c958a]">—</span>
                  )}
                </div>
                <div className="sm:col-span-2 text-sm text-[#5b574f]">
                  {e.due_date ? new Date(e.due_date).toLocaleDateString() : "—"}
                </div>
                <div className="sm:col-span-2 font-medium font-serif text-lg">
                  {formatMoney(e.amount, currency)}
                </div>
                <div className="sm:col-span-2 flex items-center justify-end gap-2">
                  <button onClick={() => togglePaid(e)} data-testid={`toggle-status-${e.id}`} title="Click to toggle">
                    <Badge
                      variant="outline"
                      className={
                        e.status === "paid"
                          ? "border-[#9CB4A6] text-[#5e7c6b] bg-[#9CB4A6]/15 cursor-pointer"
                          : "border-[#E8CBA5] text-[#8a6e2e] bg-[#E8CBA5]/20 cursor-pointer"
                      }
                    >
                      {e.status}
                    </Badge>
                  </button>
                  <button
                    onClick={() => {
                      setEditing(e);
                      setOpen(true);
                    }}
                    className="p-2 rounded-full hover:bg-[#EAE5DF]/60 text-[#76726B]"
                    data-testid={`edit-expense-${e.id}`}
                  >
                    <Pencil className="h-4 w-4" strokeWidth={1.5} />
                  </button>
                  <button
                    onClick={() => remove(e)}
                    className="p-2 rounded-full hover:bg-[#D48A8A]/15 text-[#a55656]"
                    data-testid={`delete-expense-${e.id}`}
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
