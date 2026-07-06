import { Heart } from "lucide-react";

export default function Maintenance() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{ background: "#FAFAFA" }}
      data-testid="maintenance-page"
    >
      <div className="max-w-lg w-full text-center">
        <div className="flex items-center justify-center gap-2 mb-5">
          <Heart size={20} strokeWidth={1.5} style={{ color: "#C5A880" }} fill="#C5A880" />
          <span
            className="font-serif text-2xl"
            style={{ fontFamily: "'Playfair Display', serif", color: "#2C2C2C" }}
          >
            Lumière
          </span>
        </div>

        <h1
          className="text-4xl sm:text-5xl font-serif mb-5"
          style={{ fontFamily: "'Playfair Display', serif", color: "#2C2C2C" }}
        >
          Down for maintenance
        </h1>

        <p className="text-lg mb-3" style={{ color: "#76726B", lineHeight: 1.7 }}>
          We're making a few improvements behind the scenes. Your budget, guests,
          and vendor data are safe — we'll be back shortly.
        </p>

        <p className="text-base mt-7" style={{ color: "#9c958a" }}>
          Check back in a few minutes.
        </p>
      </div>
    </div>
  );
}
