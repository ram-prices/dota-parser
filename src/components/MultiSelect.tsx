// Same "pick from a dropdown, get a removable chip" pattern as
// HeroMultiSelect, generalized for any option list that isn't hero-shaped
// (no icon) - e.g. Game Mode. Kept as a separate component rather than
// having HeroMultiSelect wrap this, so the already-shipped hero filters
// don't need touching.
export function MultiSelect<T extends string | number>({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  selected: T[];
  onChange: (next: T[]) => void;
}) {
  const pickable = options.filter((o) => !selected.includes(o.value));
  const selectedOptions = selected.map((v) => options.find((o) => o.value === v)).filter((o): o is { value: T; label: string } => Boolean(o));

  return (
    <div className="hero-multiselect">
      <select
        value=""
        onChange={(e) => {
          const picked = pickable.find((o) => String(o.value) === e.target.value);
          if (picked) onChange([...selected, picked.value]);
        }}
      >
        <option value="">{label}</option>
        {pickable.map((o) => (
          <option key={String(o.value)} value={String(o.value)}>
            {o.label}
          </option>
        ))}
      </select>
      {selectedOptions.length > 0 && (
        <div className="hero-multiselect-chips">
          {selectedOptions.map((o) => (
            <span className="hero-chip" key={String(o.value)}>
              {o.label}
              <button
                type="button"
                className="hero-chip-remove"
                aria-label={`Remove ${o.label}`}
                onClick={() => onChange(selected.filter((v) => v !== o.value))}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
