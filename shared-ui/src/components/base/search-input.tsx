import { SearchLg } from "@untitledui/icons";

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

/** Search field for a table toolbar. Filtering stays in the page that owns the data. */
export function SearchInput({ value, onChange, placeholder = "Suchen" }: SearchInputProps) {
  return (
    <div className="relative w-full md:w-80">
      <SearchLg className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-fg-quaternary" />
      <input
        type="search"
        value={value}
        aria-label={placeholder}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg bg-primary py-2 pr-3.5 pl-11 text-md text-primary shadow-xs ring-1 ring-primary outline-focus-ring ring-inset placeholder:text-placeholder focus:outline-2 focus:-outline-offset-2"
      />
    </div>
  );
}
