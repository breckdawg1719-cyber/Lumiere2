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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Check, Trash2, Sparkles, ListChecks } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { deleteWithUndo } from "@/lib/undoableDelete";
import { celebrateAttending, originFromEvent } from "@/lib/confetti";

const PHASE_ORDER = [
  "12+ months out",
  "9–11 months out",
  "6–8 months out",
  "3–5 months out",
  "1–2 months out",
  "Week of",
  "Day of",
  "Anytime",
];

function NewTaskDialog({ phases, onCreated, trigger }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [phase, setPhase] = useState(phases[0] || "Anytime");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/tasks", {
        title: title.trim(),
        description: description.trim() || null,
        phase,
        completed: false,
        order: 9999,
      });
      toast.success("Task added");
      setOpen(false);
      setTitle("");
      setDescription("");
      onCreated();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <button className="btn-primary" data-testid="add-task-btn">
            <Plus className="h-4 w-4" /> Add task
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="rounded-2xl max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Add a task</DialogTitle>
          <DialogDescription>Add anything you&apos;d like to track.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-xs text-[#76726B] mb-1.5 block">Task *</label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Try on the dress one more time"
              data-testid="task-title-input"
              className="w-full h-12 rounded-xl border border-[#EAE5DF] px-4 text-sm focus:border-[#C5A880] focus:ring-2 focus:ring-[#C5A880]/15 outline-none transition"
            />
          </div>
          <div>
            <label className="text-xs text-[#76726B] mb-1.5 block">Notes</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional"
              data-testid="task-description-input"
              className="w-full h-12 rounded-xl border border-[#EAE5DF] px-4 text-sm focus:border-[#C5A880] focus:ring-2 focus:ring-[#C5A880]/15 outline-none transition"
            />
          </div>
          <div>
            <label className="text-xs text-[#76726B] mb-1.5 block">When</label>
            <Select value={phase} onValueChange={setPhase}>
              <SelectTrigger data-testid="task-phase-select" className="h-12 rounded-xl border-[#EAE5DF]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PHASE_ORDER.map((p) => (
                  <SelectItem value={p} key={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <button type="button" onClick={() => setOpen(false)} className="btn-ghost">
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={busy} data-testid="task-save-btn">
              {busy ? "Saving…" : "Add task"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Checklist() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    const { data } = await api.get("/tasks");
    setItems(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    (async () => {
      await reload();
      setLoading(false);
    })();
  }, []);

  const toggle = async (task, e) => {
    const next = !task.completed;
    // Optimistic update
    setItems((prev) => prev.map((t) => (t.id === task.id ? { ...t, completed: next } : t)));

    if (next) {
      celebrateAttending(originFromEvent(e?.nativeEvent || e));
    }

    try {
      await api.put(`/tasks/${task.id}`, {
        title: task.title,
        description: task.description || null,
        phase: task.phase,
        completed: next,
        order: task.order || 0,
      });
    } catch (err) {
      // Revert on failure
      setItems((prev) => prev.map((t) => (t.id === task.id ? { ...t, completed: !next } : t)));
      toast.error(formatApiError(err.response?.data?.detail) || err.message);
    }
  };

  const remove = async (task) => {
    await deleteWithUndo({
      path: "/tasks",
      item: task,
      body: {
        title: task.title,
        description: task.description || null,
        phase: task.phase,
        completed: !!task.completed,
        order: task.order || 0,
      },
      optimistic: () => setItems((prev) => prev.filter((t) => t.id !== task.id)),
      refresh: reload,
      label: "Task",
    });
  };

  const grouped = useMemo(() => {
    const g = {};
    items.forEach((t) => {
      const phase = t.phase || "Anytime";
      if (!g[phase]) g[phase] = [];
      g[phase].push(t);
    });
    // Sort each phase by order, then completed at the bottom
    Object.values(g).forEach((list) =>
      list.sort((a, b) => Number(a.completed) - Number(b.completed) || (a.order || 0) - (b.order || 0))
    );
    return g;
  }, [items]);

  const phases = useMemo(() => {
    const fromData = Object.keys(grouped);
    const ordered = PHASE_ORDER.filter((p) => fromData.includes(p));
    const extras = fromData.filter((p) => !PHASE_ORDER.includes(p));
    return [...ordered, ...extras];
  }, [grouped]);

  const completedCount = items.filter((t) => t.completed).length;
  const totalCount = items.length;
  const pct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  if (loading) {
    return (
      <div className="py-20 flex justify-center">
        <div className="h-10 w-10 rounded-full border-2 border-[#C5A880] border-t-transparent animate-spin" />
      </div>
    );
  }

  // Empty-state offering the choice: seed defaults OR start blank
  if (items.length === 0) {
    return (
      <div className="space-y-8" data-testid="checklist-page">
        <div>
          <span className="label-overline">Your plan</span>
          <h1 className="font-serif text-4xl mt-2">Planning Checklist</h1>
          <p className="text-[#5b574f] mt-1">
            Choose how you&apos;d like to start.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5" data-testid="checklist-empty-choice">
          <button
            type="button"
            data-testid="checklist-seed-defaults"
            onClick={async () => {
              try {
                await api.post("/tasks/seed-defaults");
                toast.success("34 starter tasks added");
                await reload();
              } catch (err) {
                toast.error(formatApiError(err.response?.data?.detail) || err.message);
              }
            }}
            className="soft-card p-7 text-left hover:border-[#9CB4A6] transition-all hover:-translate-y-0.5"
          >
            <div className="h-12 w-12 rounded-2xl bg-[#9CB4A6]/15 flex items-center justify-center mb-4">
              <Sparkles className="h-5 w-5 text-[#5e7c6b]" strokeWidth={1.5} />
            </div>
            <h3 className="font-serif text-xl text-[#2C2C2C]">Use our checklist</h3>
            <p className="text-sm text-[#5b574f] mt-2 leading-relaxed">
              We&apos;ll add 34 hand-picked wedding planning tasks across 7 timeline phases — from
              12 months out to the day of. Edit or remove anything you don&apos;t need.
            </p>
            <div className="mt-4 text-xs uppercase tracking-[0.18em] text-[#5e7c6b]">
              Add starter tasks →
            </div>
          </button>

          <NewTaskDialog
            phases={PHASE_ORDER}
            onCreated={reload}
            trigger={
              <button
                type="button"
                data-testid="checklist-start-blank"
                className="soft-card p-7 text-left hover:border-[#C5A880] transition-all hover:-translate-y-0.5 w-full"
              >
                <div className="h-12 w-12 rounded-2xl bg-[#C5A880]/15 flex items-center justify-center mb-4">
                  <ListChecks className="h-5 w-5 text-[#8a6e47]" strokeWidth={1.5} />
                </div>
                <h3 className="font-serif text-xl text-[#2C2C2C]">Start with my own</h3>
                <p className="text-sm text-[#5b574f] mt-2 leading-relaxed">
                  Add your first task and build the checklist your way. You can always come back
                  and import the defaults later.
                </p>
                <div className="mt-4 text-xs uppercase tracking-[0.18em] text-[#8a6e47]">
                  Add a task →
                </div>
              </button>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="checklist-page">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <span className="label-overline">Your plan</span>
          <h1 className="font-serif text-4xl mt-2">Planning Checklist</h1>
          <p className="text-[#5b574f] mt-1">
            A curated timeline of everything that needs doing — check off as you go.
          </p>
        </div>
        <NewTaskDialog phases={PHASE_ORDER} onCreated={reload} />
      </div>

      {/* Progress card */}
      <div className="soft-card p-6 lg:p-8" data-testid="checklist-progress">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <span className="label-overline">Overall progress</span>
            <h2 className="font-serif text-2xl mt-1.5">
              {completedCount} of {totalCount} done
            </h2>
          </div>
          <div className="text-right">
            <div className="font-serif text-3xl text-[#C5A880]">{Math.round(pct)}%</div>
            <div className="text-xs text-[#76726B]">complete</div>
          </div>
        </div>
        <div className="mt-5">
          <Progress value={pct} className="h-2 bg-[#EAE5DF]" />
        </div>
        {pct === 100 && totalCount > 0 && (
          <div className="mt-5 flex items-center gap-2 text-sm text-[#5e7c6b]">
            <Sparkles className="h-4 w-4" strokeWidth={1.5} />
            Every box ticked — go enjoy the day.
          </div>
        )}
      </div>

      {/* Phases */}
      <div className="space-y-8">
        {phases.map((phase) => {
          const tasks = grouped[phase] || [];
          const done = tasks.filter((t) => t.completed).length;
          return (
            <div key={phase} className="space-y-3" data-testid={`phase-${phase.replace(/\s|\W/g, "-")}`}>
              <div className="flex items-baseline justify-between">
                <h3 className="font-serif text-xl text-[#2C2C2C]">{phase}</h3>
                <span className="text-xs text-[#76726B]">
                  {done}/{tasks.length} done
                </span>
              </div>
              <div className="soft-card divide-y divide-[#EAE5DF] overflow-hidden">
                {tasks.map((t) => (
                  <div
                    key={t.id}
                    className={`flex items-start gap-3 px-5 py-4 group transition-colors ${
                      t.completed ? "bg-[#FAFAF7]" : "hover:bg-[#FAFAF7]"
                    }`}
                    data-testid={`task-row-${t.id}`}
                  >
                    <button
                      type="button"
                      onClick={(e) => toggle(t, e)}
                      data-testid={`task-toggle-${t.id}`}
                      className={`mt-0.5 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all ${
                        t.completed
                          ? "bg-[#9CB4A6] border-[#9CB4A6]"
                          : "border-[#C5A880] hover:bg-[#C5A880]/10"
                      }`}
                      aria-label={t.completed ? "Mark as not done" : "Mark as done"}
                    >
                      {t.completed && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div
                        className={`text-sm ${
                          t.completed
                            ? "text-[#9c958a] line-through"
                            : "text-[#2C2C2C] font-medium"
                        }`}
                      >
                        {t.title}
                      </div>
                      {t.description && (
                        <div className="text-xs text-[#76726B] mt-0.5">{t.description}</div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(t)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-full hover:bg-[#D48A8A]/15 text-[#a55656] transition-opacity"
                      data-testid={`task-delete-${t.id}`}
                      aria-label="Remove task"
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
