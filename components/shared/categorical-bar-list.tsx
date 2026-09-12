interface BarListItem {
  label: string;
  value: number;
  color: string;
}

export function CategoricalBarList({ items }: { items: BarListItem[] }) {
  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-3">
          <span className="w-24 shrink-0 truncate text-sm text-muted-foreground">
            {item.label}
          </span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full"
              style={{
                width: `${(item.value / max) * 100}%`,
                backgroundColor: item.color,
              }}
            />
          </div>
          <span className="w-6 shrink-0 text-right text-sm font-medium tabular-nums text-foreground">
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}
