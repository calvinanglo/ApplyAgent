import { redirect } from 'next/navigation'

export default async function CoverLetterRedirect({
  searchParams,
}: {
  searchParams: Promise<{ report_id?: string }>
}) {
  const params = await searchParams
  const target = params.report_id
    ? `/resume?tab=cover-letter&report_id=${params.report_id}`
    : '/resume?tab=cover-letter'
  redirect(target)
}
