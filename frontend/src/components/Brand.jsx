const LOGO_URL =
  "https://customer-assets.emergentagent.com/job_onco-nurses-dki/artifacts/oeon7zuo_logo%20himponi.png";

export const Brand = ({ size = "default", variant = "default" }) => {
  const isLarge = size === "large";
  const onDark = variant === "onDark";
  return (
    <div className="flex items-center gap-3" data-testid="himponi-brand">
      <div
        className={`${
          isLarge ? "h-14 w-14" : "h-11 w-11"
        } rounded-2xl bg-white border border-pink-100 shadow-sm flex items-center justify-center overflow-hidden p-1`}
      >
        <img
          src={LOGO_URL}
          alt="IONA - Indonesian Oncology Nurses Association"
          className="h-full w-full object-contain"
        />
      </div>
      <div className="leading-tight">
        <div
          className={`font-display font-bold ${isLarge ? "text-xl" : "text-base"} ${
            onDark ? "text-white" : "text-fuchsia-900"
          }`}
        >
          HIMPONI
        </div>
        <div
          className={`${isLarge ? "text-[11px]" : "text-[10px]"} uppercase tracking-[0.18em] ${
            onDark ? "text-pink-100" : "text-fuchsia-700"
          }`}
        >
          DKI Jakarta · IONA
        </div>
      </div>
    </div>
  );
};

export default Brand;
