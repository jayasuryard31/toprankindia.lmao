/**
 * The "stop looking at the city — enter it" CTA. Sits above the map surface.
 */
export default function EnterCityButton({ onClick, hidden }) {
  if (hidden) return null;
  return (
    <button
      onClick={onClick}
      className="group relative flex items-center gap-2 sm:gap-2.5 pl-3.5 pr-4 sm:pl-4 sm:pr-5
                 py-2 sm:py-2.5 rounded-full
                 bg-gradient-to-r from-coral to-orange-500 text-white shadow-feather-coral
                 hover:-translate-y-0.5 active:scale-95 transition-transform cursor-pointer
                 border border-white/25 whitespace-nowrap"
    >
      <span className="relative flex h-2 w-2 sm:h-2.5 sm:w-2.5">
        <span className="absolute inline-flex h-full w-full rounded-full bg-white opacity-70 animate-ping" />
        <span className="relative inline-flex rounded-full h-2 w-2 sm:h-2.5 sm:w-2.5 bg-white" />
      </span>
      <span className="text-xs sm:text-sm font-black uppercase tracking-wider">Enter City</span>
      <span className="text-[10px] font-semibold text-white/80 hidden lg:inline">
        walk it in 3rd person
      </span>
      <svg
        viewBox="0 0 24 24"
        className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:translate-x-0.5 transition-transform"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
      >
        <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
