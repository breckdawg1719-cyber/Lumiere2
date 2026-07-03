import { useEffect, useMemo, useState } from "react";
import { api, formatApiError } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import Segmented from "@/components/Segmented";
import { Plus, Pencil, Trash2, Search, Mail, Phone, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { celebrateAttending, originFromEvent } from "@/lib/confetti";
import { deleteWithUndo } from "@/lib/undoableDelete";

const RSVP_OPTIONS = [
  { value: "pending", label: "Pending", color: "#E8CBA5" },
  { value: "attending", label: "Attending", color: "#9CB4A6" },
  { value: "declined", label: "Declined", color: "#D48A8A" },
  { value: "maybe", label: "Maybe", color: "#C5A880" },
];

const SIDE_OPTIONS = [
  { value: "both", label: "Both" },
  { value: "partner1", label: "Partner 1" },
  { value: "partner2", label: "Partner 2" },
];

function GuestForm({ initial, onSubmit, onCancel, busy }) {
  const [name, setName] = useState(initial?.name || "");
  const [email, setEmail] = useState(initial?.email || "");
  const [phone, setPhone] = useState(initial?.phone || "");
  const [side, setSide] = useState(initial?.side || "both");
  const [group, setGroup] = useState(initial?.group || "");
  const [rsvp, setRsvp] = useState(initial?.rsvp || "pending");
  const [plusOne, setPlusOne] = useState(initial?.plus_one || false);
  const [notes, setNotes] = useState(initial?.notes || "");
  const [touched, setTouched] = useState(false);

  const wasAttending = initial?.rsvp === "attending";
  const contactMissing = !email.trim() && !phone.trim();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setTouched(true);
        if (contactMissing) {
          toast.error("Please provide a phone number or email address");
          return;
        }
        if (rsvp === "attending" && !wasAttending) {
          celebrateAttending(originFromEvent(e.nativeEvent));
        }
        onSubmit({
          name: name.trim(),
          email: email.trim() || null,
          phone: phone.trim() || null,
          side,
          group: group.trim() || null,
          rsvp,
          plus_one: !!plusOne,
          notes: notes.trim() || null,
        });
      }}
      className="space-y-6"
    >
      {/* Section 1: Identity */}
      <div className="space-y-4">
        <div className="label-overline">Who&apos;s coming</div>
        <div>
          <label className="text-xs text-[#76726B] mb-1.5 block">Full name *</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Lily Chen"
            data-testid="guest-name-input"
            className="w-full h-12 rounded-xl border border-[#EAE5DF] px-4 text-sm focus:border-[#C5A880] focus:ring-2 focus:ring-[#C5A880]/15 outline-none transition"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-[#76726B] mb-1.5 block">Side</label>
            <Segmented
              value={side}
              onChange={setSide}
              options={SIDE_OPTIONS}
              testId="guest-side"
            />
          </div>
          <div>
            <label className="text-xs text-[#76726B] mb-1.5 block">Group</label>
            <input
              value={group}
              onChange={(e) => setGroup(e.target.value)}
              placeholder="Family, Friends…"
              data-testid="guest-group-input"
              className="w-full h-10 rounded-full border border-[#EAE5DF] px-4 text-sm focus:border-[#C5A880] focus:ring-2 focus:ring-[#C5A880]/15 outline-none transition"
            />
          </div>
        </div>
      </div>

      {/* Section 2: Contact (one required) */}
      <div className="space-y-4 pt-2 border-t border-[#EAE5DF]">
        <div className="flex items-center justify-between pt-4">
          <div className="label-overline">Contact</div>
          <span className="text-[10px] uppercase tracking-[0.18em] text-[#9c958a]">
            Phone or email required
          </span>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-[#76726B] mb-1.5 block">Phone</label>
            <div className="relative">
              <Phone
                className="h-4 w-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#9c958a]"
                strokeWidth={1.5}
              />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 010-1234"
                data-testid="guest-phone-input"
                className={`w-full h-12 rounded-xl border pl-11 pr-4 text-sm focus:ring-2 outline-none transition ${
                  touched && contactMissing
                    ? "border-[#D48A8A] focus:border-[#D48A8A] focus:ring-[#D48A8A]/15"
                    : "border-[#EAE5DF] focus:border-[#C5A880] focus:ring-[#C5A880]/15"
                }`}
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-[#76726B] mb-1.5 block">Email</label>
            <div className="relative">
              <Mail
                className="h-4 w-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#9c958a]"
                strokeWidth={1.5}
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="guest@email.com"
                data-testid="guest-email-input"
                className={`w-full h-12 rounded-xl border pl-11 pr-4 text-sm focus:ring-2 outline-none transition ${
                  touched && contactMissing
                    ? "border-[#D48A8A] focus:border-[#D48A8A] focus:ring-[#D48A8A]/15"
                    : "border-[#EAE5DF] focus:border-[#C5A880] focus:ring-[#C5A880]/15"
                }`}
              />
            </div>
          </div>
        </div>
        {touched && contactMissing && (
          <div
            data-testid="guest-contact-error"
            className="flex items-center gap-2 text-xs text-[#a55656]"
          >
            <AlertCircle className="h-3.5 w-3.5" strokeWidth={1.5} />
            Add a phone number or an email so you can reach them.
          </div>
        )}
      </div>

      {/* Section 3: RSVP */}
      <div className="space-y-4 pt-2 border-t border-[#EAE5DF]">
        <div className="label-overline pt-4">RSVP</div>
        <Segmented
          value={rsvp}
          onChange={setRsvp}
          options={RSVP_OPTIONS}
          testId="guest-rsvp"
        />
        <label
          className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[#EAE5DF] cursor-pointer hover:bg-[#FAFAF7] transition"
          data-testid="guest-plusone-label"
        >
          <input
            type="checkbox"
            checked={plusOne}
            onChange={(e) => setPlusOne(e.target.checked)}
            data-testid="guest-plusone-checkbox"
            className="accent-[#C5A880] h-4 w-4"
          />
          <div className="flex-1">
            <div className="text-sm text-[#2C2C2C]">Plus one</div>
            <div className="text-xs text-[#76726B]">
              They&apos;re bringing a companion (counts as 2 attending)
            </div>
          </div>
        </label>
      </div>

      {/* Notes */}
      <div>
        <label className="text-xs text-[#76726B] mb-1.5 block">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          data-testid="guest-notes-input"
          rows={2}
          placeholder="Dietary preferences, table seating notes…"
          className="w-full rounded-xl border border-[#EAE5DF] px-4 py-3 text-sm focus:border-[#C5A880] focus:ring-2 focus:ring-[#C5A880]/15 outline-none transition resize-none"
        />
      </div>

      <DialogFooter className="pt-2">
        <button type="button" onClick={onCancel} className="btn-ghost">
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={busy} data-testid="guest-save-btn">
          {busy ? "Saving…" : initial ? "Save changes" : "Add guest"}
        </button>
      </DialogFooter>
    </form>
  );
}

export default function Guests() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");

  const reload = async () => {
    const { data } = await api.get("/guests");
    setItems(data);
  };

  useEffect(() => {
    reload();
  }, []);

  const submit = async (payload) => {
    setBusy(true);
    try {
      if (editing) {
        await api.put(`/guests/${editing.id}`, payload);
        toast.success("Guest updated");
      } else {
        await api.post("/guests", payload);
        toast.success("Guest added");
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

  const remove = async (guest) => {
    await deleteWithUndo({
      path: "/guests",
      item: guest,
      body: {
        name: guest.name,
        email: guest.email || null,
        phone: guest.phone || null,
        side: guest.side || "both",
        group: guest.group || null,
        rsvp: guest.rsvp || "pending",
        plus_one: !!guest.plus_one,
        notes: guest.notes || null,
      },
      optimistic: () => setItems((prev) => prev.filter((g) => g.id !== guest.id)),
      refresh: reload,
      label: "Guest",
    });
  };

  const counts = useMemo(() => {
    const c = { all: items.length, pending: 0, attending: 0, declined: 0, maybe: 0 };
    items.forEach((g) => {
      c[g.rsvp] = (c[g.rsvp] || 0) + 1;
    });
    return c;
  }, [items]);

  const filtered = items.filter((g) => {
    if (filter !== "all" && g.rsvp !== filter) return false;
    if (q && !`${g.name} ${g.email || ""} ${g.group || ""}`.toLowerCase().includes(q.toLowerCase()))
      return false;
    return true;
  });

  return (
    <div className="space-y-8" data-testid="guests-page">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <span className="label-overline">Your circle</span>
          <h1 className="font-serif text-4xl mt-2">Guest List</h1>
          <p className="text-[#5b574f] mt-1">Track RSVPs as replies come in.</p>
        </div>
        <Dialog
          open={open}
          onOpenChange={(o) => {
            setOpen(o);
            if (!o) setEditing(null);
          }}
        >
          <DialogTrigger asChild>
            <button className="btn-primary" data-testid="add-guest-btn">
              <Plus className="h-4 w-4" /> Add guest
            </button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl max-w-xl max-h-[88vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-serif text-2xl">
                {editing ? "Edit guest" : "Add a guest"}
              </DialogTitle>
              <DialogDescription>
                We&apos;ll need a way to reach them, plus their RSVP status.
              </DialogDescription>
            </DialogHeader>
            <GuestForm
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

      <div className="soft-card p-4 lg:p-5 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9c958a]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search guests"
            data-testid="guest-search"
            className="w-full h-11 rounded-xl border border-[#EAE5DF] pl-9 pr-3 text-sm focus:border-[#C5A880] focus:ring-2 focus:ring-[#C5A880]/15 outline-none"
          />
        </div>
        <div className="flex gap-1 rounded-full bg-[#EAE5DF]/40 p-1 flex-wrap">
          {["all", "attending", "pending", "declined", "maybe"].map((k) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              data-testid={`guest-filter-${k}`}
              className={`px-4 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${
                filter === k ? "bg-white text-[#2C2C2C] shadow-sm" : "text-[#76726B]"
              }`}
            >
              {k} ({counts[k] || 0})
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.length === 0 ? (
          <div className="col-span-full soft-card p-12 text-center text-[#76726B]">
            No guests yet. Add your first one.
          </div>
        ) : (
          filtered.map((g) => {
            const rsvp = RSVP_OPTIONS.find((r) => r.value === g.rsvp) || RSVP_OPTIONS[0];
            return (
              <div key={g.id} className="soft-card p-5" data-testid={`guest-card-${g.id}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-serif text-lg text-[#2C2C2C]">{g.name}</div>
                    <div className="text-xs text-[#76726B] mt-1">
                      {g.group || "Guest"} {g.plus_one && "· +1"}
                    </div>
                  </div>
                  <div
                    className="px-2.5 py-1 rounded-full text-[11px] font-medium uppercase tracking-wider"
                    style={{ backgroundColor: `${rsvp.color}33`, color: "#2C2C2C" }}
                  >
                    {rsvp.label}
                  </div>
                </div>
                <div className="mt-4 space-y-1.5 text-sm text-[#5b574f]">
                  {g.email && (
                    <a
                      href={`mailto:${g.email}`}
                      className="flex items-center gap-2 hover:text-[#8a6e47]"
                    >
                      <Mail className="h-3.5 w-3.5" strokeWidth={1.5} /> {g.email}
                    </a>
                  )}
                  {g.phone && (
                    <a
                      href={`tel:${g.phone}`}
                      className="flex items-center gap-2 hover:text-[#8a6e47]"
                    >
                      <Phone className="h-3.5 w-3.5" strokeWidth={1.5} /> {g.phone}
                    </a>
                  )}
                  {g.notes && <p className="text-xs italic text-[#76726B] mt-2">&ldquo;{g.notes}&rdquo;</p>}
                </div>
                <div className="mt-4 pt-4 border-t border-[#EAE5DF] flex justify-end gap-1">
                  <button
                    onClick={() => {
                      setEditing(g);
                      setOpen(true);
                    }}
                    className="p-2 rounded-full hover:bg-[#EAE5DF]/60 text-[#76726B]"
                    data-testid={`edit-guest-${g.id}`}
                  >
                    <Pencil className="h-4 w-4" strokeWidth={1.5} />
                  </button>
                  <button
                    onClick={() => remove(g)}
                    className="p-2 rounded-full hover:bg-[#D48A8A]/15 text-[#a55656]"
                    data-testid={`delete-guest-${g.id}`}
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
