import { Car, Croissant, Dumbbell, Home, Scissors, Stethoscope, Utensils, Wrench } from "lucide-react";

const hunts = [
  { icon: Stethoscope, q: "Dentists", city: "Mumbai" },
  { icon: Dumbbell, q: "Gyms", city: "Austin" },
  { icon: Croissant, q: "Bakeries", city: "Berlin" },
  { icon: Home, q: "Realtors", city: "Dubai" },
  { icon: Scissors, q: "Salons", city: "London" },
  { icon: Car, q: "Car detailing", city: "Toronto" },
  { icon: Utensils, q: "Restaurants", city: "Pune" },
  { icon: Wrench, q: "Plumbers", city: "Sydney" },
];

/** Endless strip of example searches, standing in for customer logos until there are real ones. */
export function Marquee() {
  const row = [...hunts, ...hunts];
  return (
    <div className="border-y border-neutral-100 py-5">
      <p className="mb-4 text-center text-xs font-medium tracking-widest text-neutral-400 uppercase">
        Hunts you can run today
      </p>
      <div className="group relative overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)]">
        <div className="flex w-max animate-marquee gap-3 group-hover:[animation-play-state:paused]">
          {row.map((h, i) => (
            <span
              key={i}
              className="flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm whitespace-nowrap"
            >
              <h.icon className="size-4 text-neutral-500" />
              <span className="font-medium">{h.q}</span>
              <span className="text-neutral-400">in {h.city}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
