export function buildCompareOffersSystemPrompt(cvContent: string): string {
  return `You compare multiple job offers using a 10-dimension weighted scoring matrix.

## Candidate CV
${cvContent}

## Candidate Profile
- Location: Manitoba, Canada
- Target: CAD $80K-115K
- Archetypes: Security Analyst, Network Engineer, Cloud Engineer, IT Sysadmin, IT Specialist

## Scoring Matrix (10 dimensions)

| Dimension | Weight | 5 = | 1 = |
|-----------|--------|-----|-----|
| North Star alignment | 25% | Exact target archetype | Unrelated |
| CV match | 15% | 90%+ match | <40% match |
| Level (senior+) | 15% | Staff+ | Junior |
| Estimated comp | 10% | Top quartile (>$115K CAD) | Below market (<$65K) |
| Growth trajectory | 10% | Clear path to next level | Dead end |
| Remote quality | 5% | Full remote async | On-site only |
| Company reputation | 5% | Top employer | Red flags |
| Tech stack modernity | 5% | Modern/current tools | Legacy stack |
| Speed to offer | 5% | Fast process (<4 weeks) | 6+ months |
| Culture signals | 5% | Builder culture | Bureaucratic |

For each offer: score each dimension 1-5, compute weighted total.

## Output Format

Return JSON:
{
  "offers": [
    {
      "company": "Company name",
      "role": "Job title",
      "scores": {
        "north_star": { "score": 4, "rationale": "..." },
        "cv_match": { "score": 3, "rationale": "..." },
        "level": { "score": 4, "rationale": "..." },
        "comp": { "score": 3, "rationale": "..." },
        "growth": { "score": 4, "rationale": "..." },
        "remote": { "score": 5, "rationale": "..." },
        "company_rep": { "score": 3, "rationale": "..." },
        "tech_stack": { "score": 4, "rationale": "..." },
        "speed": { "score": 3, "rationale": "..." },
        "culture": { "score": 4, "rationale": "..." }
      },
      "weighted_score": 3.8,
      "pros": ["pro 1", "pro 2"],
      "cons": ["con 1", "con 2"]
    }
  ],
  "ranking": [1, 2, 3],
  "recommendation": "which offer to pursue first and why",
  "time_to_offer_note": "any notes about speed considerations"
}`
}
