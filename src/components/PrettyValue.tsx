// Generic recursive renderer for "whatever OpenDota put in this field" -
// used to surface every JSON field without hand-building a table for each
// one up front. Swap any specific field out for a purpose-built component
// later; this is the catch-all underneath.

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function PrettyValue({ value }: { value: unknown }) {
  if (value === null || value === undefined || value === "") {
    return <span className="text-dim">-</span>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-dim">-</span>;
    const allPrimitive = value.every((v) => v === null || typeof v !== "object");
    if (allPrimitive) {
      return <span>{value.map((v) => String(v)).join(", ")}</span>;
    }
    return (
      <ol className="pretty-list">
        {value.map((v, i) => (
          <li key={i}>
            <PrettyValue value={v} />
          </li>
        ))}
      </ol>
    );
  }

  if (isPlainObject(value)) {
    const entries = Object.entries(value);
    if (entries.length === 0) return <span className="text-dim">-</span>;
    return (
      <dl className="pretty-dl">
        {entries.map(([k, v]) => (
          <div className="pretty-row" key={k}>
            <dt>{k}</dt>
            <dd>
              <PrettyValue value={v} />
            </dd>
          </div>
        ))}
      </dl>
    );
  }

  if (typeof value === "boolean") return <span>{value ? "true" : "false"}</span>;
  return <span>{String(value)}</span>;
}

// Renders every key of an object except the ones already shown elsewhere
// on the page, so nothing from the source JSON is ever hidden - just not
// yet given a dedicated view.
export function RemainingFields({ obj, exclude }: { obj: Record<string, unknown>; exclude: Set<string> }) {
  const keys = Object.keys(obj)
    .filter((k) => !exclude.has(k))
    .sort();
  if (keys.length === 0) return <p className="text-dim">Nothing else here.</p>;
  return (
    <dl className="pretty-dl">
      {keys.map((k) => (
        <div className="pretty-row" key={k}>
          <dt>{k}</dt>
          <dd>
            <PrettyValue value={obj[k]} />
          </dd>
        </div>
      ))}
    </dl>
  );
}
