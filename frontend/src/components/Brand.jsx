import { HeartPulse } from "lucide-react";

export const Brand = ({ size = "default" }) => {
  const isLarge = size === "large";
  return (
    <div className="flex items-center gap-3" data-testid="himponi-brand">
      <div
        className={`${
          isLarge ? "h-12 w-12" : "h-10 w-10"
        } rounded-xl teal-gradient flex items-center justify-center text-white shadow-md`}
      >
        <HeartPulse className={isLarge ? "h-6 w-6" : "h-5 w-5"} />
      </div>
      <div className="leading-tight">
        <div className={`font-display font-bold ${isLarge ? "text-xl" : "text-base"} text-slate-900`}>
          HIMPONI
        </div>
        <div className={`${isLarge ? "text-xs" : "text-[10px]"} uppercase tracking-wider text-teal-700`}>
          DKI Jakarta
        </div>
      </div>
    </div>
  );
};

export default Brand;
