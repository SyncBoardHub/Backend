export default function BrandMark({ className = '' }) {
  return (
    <span className={`product-mark ${className}`.trim()} aria-hidden="true">
      <svg viewBox="0 0 32 32" focusable="false">
        <path d="M8 7.5h11.5A4.5 4.5 0 0 1 24 12v8.5a4.5 4.5 0 0 1-4.5 4.5H8a3 3 0 0 1-3-3v-11a3 3 0 0 1 3-3Z" />
        <path d="M10 12h8M10 16h8M10 20h5" />
        <circle cx="24" cy="8" r="3.5" />
      </svg>
    </span>
  );
}
