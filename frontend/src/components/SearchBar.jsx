export default function SearchBar({ value, onChange, placeholder }) {
  return (
    <input
      className="search-bar"
      type="text"
      value={value}
      placeholder={placeholder || "Search..."}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}