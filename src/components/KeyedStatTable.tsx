// Renders a dict like { "npc_dota_hero_axe": 4200, "npc_dota_creep_lane": 900 }
// as a sorted top-N table - used for damage/damage_taken/killed/killed_by/item_uses.
export function KeyedStatTable({
  data,
  resolveLabel,
  limit = 8,
}: {
  data: Record<string, number> | undefined;
  resolveLabel: (key: string) => string;
  limit?: number;
}) {
  const entries = Object.entries(data ?? {})
    .filter(([, v]) => typeof v === "number" && v !== 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);

  if (entries.length === 0) return <p className="text-dim small">No data.</p>;

  return (
    <table className="log-table keyed-stat-table">
      <tbody>
        {entries.map(([k, v]) => (
          <tr key={k}>
            <td>{resolveLabel(k)}</td>
            <td>{v.toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
