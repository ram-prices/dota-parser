import { heroIcon, heroName } from "../dota";

// A dropdown that adds a hero to a small removable-chip list below it,
// rather than a native <select multiple> - the native control's ctrl/cmd-
// click-to-select-many gesture doesn't really exist on a phone, which is
// how this dashboard is mostly used.
export function HeroMultiSelect({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: number[];
  selected: number[];
  onChange: (next: number[]) => void;
}) {
  const pickable = options.filter((id) => !selected.includes(id));

  return (
    <div className="hero-multiselect">
      <select
        value=""
        onChange={(e) => {
          const id = Number(e.target.value);
          if (id) onChange([...selected, id]);
        }}
      >
        <option value="">{label}</option>
        {pickable.map((id) => (
          <option key={id} value={id}>
            {heroName(id)}
          </option>
        ))}
      </select>
      {selected.length > 0 && (
        <div className="hero-multiselect-chips">
          {selected.map((id) => (
            <span className="hero-chip" key={id}>
              {heroIcon(id) && <img src={heroIcon(id)!} alt="" className="hero-chip-icon" />}
              {heroName(id)}
              <button
                type="button"
                className="hero-chip-remove"
                aria-label={`Remove ${heroName(id)}`}
                onClick={() => onChange(selected.filter((x) => x !== id))}
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
