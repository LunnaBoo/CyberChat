export function SearchBar({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-1 border-b border-border px-2 py-1">
      <span className="text-dim">/?</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="filter contacts..."
        className="w-full"
      />
      {value && (
        <button onClick={() => onChange("")} className="text-dim">
          x
        </button>
      )}
    </div>
  );
}
