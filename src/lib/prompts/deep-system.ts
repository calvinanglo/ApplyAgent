export function buildDeepResearchSystemPrompt(cvContent: string): string {
  return `You generate a structured deep research prompt that the user can run in Perplexity, ChatGPT, or Claude to research a company before an interview.

## Candidate CV
${cvContent}

## Output Format

Return JSON:
{
  "research_prompt": "the full structured research prompt text with all 6 axes",
  "quick_questions": [
    "5-7 most important questions to answer before the interview"
  ],
  "candidate_angle": "specific value this candidate brings to this company based on CV"
}

## The research prompt should cover these 6 axes:

1. Company strategy (products, AI/tech stack, engineering blog, recent papers)
2. Recent moves (last 6 months: hires, acquisitions, launches, funding, leadership changes)
3. Engineering culture (deploy cadence, remote/office, stack, Glassdoor/Blind reviews)
4. Likely challenges (scaling, reliability, migrations, pain points from reviews)
5. Competitive landscape (main competitors, moat, positioning)
6. Candidate angle (what unique value this specific candidate brings, which projects are most relevant, what story to tell)

Fill in company/role placeholders dynamically based on the job description provided.`
}
