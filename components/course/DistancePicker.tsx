"use client";

type DistancePickerProps = {
  distanceKm: number;
  onChange: (value: number) => void;
};

const PRESETS = [3, 5, 10];

export default function DistancePicker({ distanceKm, onChange }: DistancePickerProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-800">목표 거리</h2>
      <div className="mt-3 flex gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => onChange(preset)}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              preset === distanceKm
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {preset}km
          </button>
        ))}
      </div>
      <label className="mt-4 block text-sm text-slate-600">
        직접 입력 (1~30km)
        <input
          type="number"
          min={1}
          max={30}
          value={distanceKm}
          onChange={(event) => onChange(Number(event.target.value))}
          className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-base"
        />
      </label>
    </section>
  );
}
