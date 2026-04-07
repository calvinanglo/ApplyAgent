export default function EvaluateLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      <div className="h-48 animate-pulse rounded-lg border bg-muted" />
      <div className="h-12 w-40 animate-pulse rounded bg-muted" />
    </div>
  )
}
