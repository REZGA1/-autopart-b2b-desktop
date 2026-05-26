export default function ValidatedBadge({ validated }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${
        validated
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-border bg-card text-muted-foreground'
      }`}
      title={validated ? 'Validated' : 'Not validated'}
      aria-label={validated ? 'Validated' : 'Not validated'}
    >
      <span
        className={`h-2.5 w-2.5 rounded-full ${validated ? 'bg-emerald-500' : 'bg-red-500'}`}
        aria-hidden
      />
      Validate
    </span>
  )
}

