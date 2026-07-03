import { useEffect, useState } from "react";
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
import { Plus, Pencil, Trash2, Globe, Mail, Phone, Briefcase, Search } from "lucide-react";
import { toast } from "sonner";
import { deleteWithUndo } from "@/lib/undoableDelete";
import FindVendors from "@/components/vendors/FindVendors";
import { useAuth } from "@/context/AuthContext";

const STATUS_OPTIONS = [
  { value: "considering", label: "Considering", color: "#E8CBA5" },
  { value: "shortlisted", label: "Shortlisted", color: "#C5A880" },
  { value: "booked", label: "Booked", color: "#9CB4A6" },
  { value: "rejected", label: "Passed", color: "#D48A8A" },
];

const TABS = [
  { key: "my", label: "My Vendors" },
  { key: "find", label: "Find Vendors" },
];

function VendorForm({ initial, onSubmit, onCancel, busy }) {
  const [name, setName] = useState(initial?.name || "");
  const [category, setCategory] = useState(initial?.category || "");
  const [contactName, setContactName] = useState(initial?.contact_name || "");
  const [phone, setPhone] = useState(initial?.phone || "");
  const [email, setEmail] = useState(initial?.email || "");
  const [website, setWebsite] = useState(initial?.website || "");
  const [status, setStatus] = useState(initial?.status || "considering");
  const [notes, setNotes] = useState(initial?.notes || "");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          name: name.trim(),
          category: category.trim() || null,
          contact_name: contactName.trim() || null,
          phone: phone.trim() || null,
          email: email.trim() || null,
          website: website.trim() || null,
          status,
          notes: notes.trim() || null,
        });
      }}
      className="space-y-6"
    >
      <div className="space-y-3">
        <div className="label-overline">Vendor</div>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          <div className="sm:col-span-3">
            <label className="text-xs text-[#76726B] mb-1.5 block">Business name *</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Mira Yuen Photo"
              data-testid="vendor-name-input"
              className="w-full h-12 rounded-xl border border-[#EAE5DF] px-4 text-sm focus:border-[#C5A880] focus:ring-2 focus:ring-[#C5A880]/15 outline-none transition"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-[#76726B] mb-1.5 block">Type</label>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Photographer, Florist…"
              data-testid="vendor-category-input"
              className="w-full h-12 rounded-xl border border-[#EAE5DF] px-4 text-sm focus:border-[#C5A880] focus:ring-2 focus:ring-[#C5A880]/15 outline-none transition"
            />
          </div>
        </div>
      </div>

      <div>
        <div className="label-overline mb-2">Where are you with them?</div>
        <Segmented value={status} onChange={setStatus} options={STATUS_OPTIONS} testId="vendor-status" />
      </div>

      <div className="space-y-3 pt-2 border-t border-[#EAE5DF]">
        <div className="label-overline pt-4">Contact</div>
        <div>
          <label className="text-xs text-[#76726B] mb-1.5 block">Contact name</label>
          <input
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            placeholder="Sasha at Bakery"
            data-testid="vendor-contact-input"
            className="w-full h-12 rounded-xl border border-[#EAE5DF] px-4 text-sm focus:border-[#C5A880] focus:ring-2 focus:ring-[#C5A880]/15 outline-none transition"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-[#76726B] mb-1.5 block">Phone</label>
            <div className="relative">
              <Phone className="h-4 w-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#9c958a]" strokeWidth={1.5} />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 010-1234"
                data-testid="vendor-phone-input"
                className="w-full h-12 rounded-xl border border-[#EAE5DF] pl-11 pr-4 text-sm focus:border-[#C5A880] focus:ring-2 focus:ring-[#C5A880]/15 outline-none transition"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-[#76726B] mb-1.5 block">Email</label>
            <div className="relative">
              <Mail className="h-4 w-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#9c958a]" strokeWidth={1.5} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="hello@vendor.com"
                data-testid="vendor-email-input"
                className="w-full h-12 rounded-xl border border-[#EAE5DF] pl-11 pr-4 text-sm focus:border-[#C5A880] focus:ring-2 focus:ring-[#C5A880]/15 outline-none transition"
              />
            </div>
          </div>
        </div>
        <div>
          <label className="text-xs text-[#76726B] mb-1.5 block">Website</label>
          <div className="relative">
            <Globe className="h-4 w-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#9c958a]" strokeWidth={1.5} />
            <input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://vendor.com"
              data-testid="vendor-website-input"
              className="w-full h-12 rounded-xl border border-[#EAE5DF] pl-11 pr-4 text-sm focus:border-[#C5A880] focus:ring-2 focus:ring-[#C5A880]/15 outline-none transition"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="text-xs text-[#76726B] mb-1.5 block">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Pricing, availability, follow-ups…"
          data-testid="vendor-notes-input"
          className="w-full rounded-xl border border-[#EAE5DF] px-4 py-3 text-sm focus:border-[#C5A880] focus:ring-2 focus:ring-[#C5A880]/15 outline-none transition resize-none"
        />
      </div>

      <DialogFooter className="pt-2">
        <button type="button" onClick={onCancel} className="btn-ghost">Cancel</button>
        <button type="submit" className="btn-primary" disabled={busy} data-testid="vendor-save-btn">
          {busy ? "Saving…" : initial ? "Save changes" : "Add vendor"}
        </button>
      </DialogFooter>
    </form>
  );
}

export default function Vendors() {
  const { user } = useAuth();
  const [tab, setTab] = useState("my");
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);

  // Get wedding location from user profile for FindVendors
  const [weddingLocation, setWeddingLocation] = useState("");
  useEffect(() => {
    api.get("/profile").then(({ data }) => {
      if (data?.venue_location) setWeddingLocation(data.venue_location);
    }).catch(() => {});
  }, []);

  const reload = async () => {
    const { data } = await api.get("/vendors");
    setItems(data);
  };

  useEffect(() => { reload(); }, []);

  const submit = async (payload) => {
    setBusy(true);
    try {
      if (editing) {
        await api.put(`/vendors/${editing.id}`, payload);
        toast.success("Vendor updated");
      } else {
        await api.post("/vendors", payload);
        toast.success("Vendor added");
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

  const remove = async (vendor) => {
    await deleteWithUndo({
      path: "/vendors",
      item: vendor,
      body: {
        name: vendor.name,
        category: vendor.category || null,
        contact_name: vendor.contact_name || null,
        phone: vendor.phone || null,
        email: vendor.email || null,
        website: vendor.website || null,
        notes: vendor.notes || null,
        status: vendor.status || "considering",
      },
      optimistic: () => setItems((prev) => prev.filter((v) => v.id !== vendor.id)),
      refresh: reload,
      label: "Vendor",
    });
  };

  return (
    <div className="space-y-8" data-testid="vendors-page">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <span className="label-overline">Your team of artisans</span>
          <h1 className="font-serif text-4xl mt-2">Vendors</h1>
          <p className="text-[#5b574f] mt-1">Manage your vendors or discover new ones near your venue.</p>
        </div>
        {tab === "my" && (
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
            <DialogTrigger asChild>
              <button className="btn-primary" data-testid="add-vendor-btn">
                <Plus className="h-4 w-4" /> Add vendor
              </button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl max-w-xl max-h-[88vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-serif text-2xl">
                  {editing ? "Edit vendor" : "Add a vendor"}
                </DialogTitle>
                <DialogDescription>
                  Save details for vendors you&apos;re considering or have booked.
                </DialogDescription>
              </DialogHeader>
              <VendorForm
                initial={editing}
                busy={busy}
                onSubmit={submit}
                onCancel={() => { setOpen(false); setEditing(null); }}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: "#F5F0EB" }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            data-testid={`vendors-tab-${t.key}`}
            className="px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200"
            style={{
              background: tab === t.key ? "#FFFFFF" : "transparent",
              color: tab === t.key ? "#2C2C2C" : "#76726B",
              boxShadow: tab === t.key ? "0 1px 4px rgba(0,0,0,0.06)" : "none",
            }}
          >
            {t.key === "find" && <Search className="inline h-3.5 w-3.5 mr-1.5 -mt-0.5" strokeWidth={1.5} />}
            {t.label}
          </button>
        ))}
      </div>

      {/* My Vendors tab */}
      {tab === "my" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.length === 0 ? (
            <div className="col-span-full soft-card p-12 text-center text-[#76726B]">
              <Briefcase className="h-7 w-7 mx-auto mb-3 text-[#C5A880]" strokeWidth={1.5} />
              No vendors saved yet. Use the <strong>Find Vendors</strong> tab to discover local professionals.
            </div>
          ) : (
            items.map((v) => {
              const st = STATUS_OPTIONS.find((s) => s.value === v.status) || STATUS_OPTIONS[0];
              return (
                <div key={v.id} className="soft-card p-5" data-testid={`vendor-card-${v.id}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-serif text-lg text-[#2C2C2C]">{v.name}</div>
                      <div className="text-xs text-[#76726B] mt-1">{v.category || "—"}</div>
                    </div>
                    <div
                      className="px-2.5 py-1 rounded-full text-[11px] font-medium uppercase tracking-wider"
                      style={{ backgroundColor: `${st.color}33`, color: "#2C2C2C" }}
                    >
                      {st.label}
                    </div>
                  </div>
                  <div className="mt-4 space-y-1.5 text-sm text-[#5b574f]">
                    {v.contact_name && <div>Contact: {v.contact_name}</div>}
                    {v.phone && (
                      <a href={`tel:${v.phone}`} className="flex items-center gap-2 hover:text-[#8a6e47]">
                        <Phone className="h-3.5 w-3.5" strokeWidth={1.5} />{v.phone}
                      </a>
                    )}
                    {v.email && (
                      <a href={`mailto:${v.email}`} className="flex items-center gap-2 hover:text-[#8a6e47]">
                        <Mail className="h-3.5 w-3.5" strokeWidth={1.5} />{v.email}
                      </a>
                    )}
                    {v.website && (
                      <a
                        href={v.website.startsWith("http") ? v.website : `https://${v.website}`}
                        target="_blank" rel="noreferrer"
                        className="flex items-center gap-2 hover:text-[#8a6e47]"
                      >
                        <Globe className="h-3.5 w-3.5" strokeWidth={1.5} />{v.website}
                      </a>
                    )}
                    {v.notes && <p className="text-xs italic text-[#76726B] mt-2">&ldquo;{v.notes}&rdquo;</p>}
                  </div>
                  <div className="mt-4 pt-4 border-t border-[#EAE5DF] flex justify-end gap-1">
                    <button
                      onClick={() => { setEditing(v); setOpen(true); }}
                      className="p-2 rounded-full hover:bg-[#EAE5DF]/60 text-[#76726B]"
                      data-testid={`edit-vendor-${v.id}`}
                    >
                      <Pencil className="h-4 w-4" strokeWidth={1.5} />
                    </button>
                    <button
                      onClick={() => remove(v)}
                      className="p-2 rounded-full hover:bg-[#D48A8A]/15 text-[#a55656]"
                      data-testid={`delete-vendor-${v.id}`}
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Find Vendors tab */}
      {tab === "find" && (
        <div className="-mx-6 lg:-mx-8">
          <FindVendors weddingLocation={weddingLocation} />
        </div>
      )}
    </div>
  );
}
