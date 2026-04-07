export default function ApplicationsLoading() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="h-16 animate-pulse rounded-lg border bg-muted" />
      ))}
    </div>
  )
}
