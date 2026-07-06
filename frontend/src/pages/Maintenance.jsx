import { Heart, Wrench } from "lucide-react";

export default function Maintenance() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{ background: "#FAFAFA" }}
      data-testid="maintenance-page"
    >
      <div className="max-w-md w-full text-center">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
          style={{ background: "#FBF5EC", border: "1px solid #E8CBA5" }}
        >
          <Wrench size={28} strokeWidth={1.5} style={{ color: "#C5A880" }} />
        </div>

        <div className="flex items-center justify-center gap-2 mb-3">
          <Heart size={16} strokeWidth={1.5} style={{ color: "#C5A880" }} fill="#C5A880" />
          <span
            className="font-serif text-xl"
            style={{ fontFamily: "'Playfair Display', serif", color: "#2C2C2C" }}
          >
            Lumière
          </span>
        </div>

        <h1
          className="text-3xl sm:text-4xl font-serif mb-4"
          style={{ fontFamily: "'Playfair Display', serif", color: "#2C2C2C" }}
        >
          Down for maintenance
        </h1>

        <p className="text-base mb-2" style={{ color: "#76726B", lineHeight: 1.7 }}>
          We're making a few improvements behind the scenes. Your budget, guests,
          and vendor data are safe — we'll be back shortly.
        </p>

        <p className="text-sm mt-6" style={{ color: "#9c958a" }}>
          Check back in a few minutes.
        </p>
      </div>
    </div>
  );
}
