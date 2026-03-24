// ─── Markers ──────────────────────────────────────────────────────────────────

export const ACTION_PLAN_MARKER = "✅ COMPLETION CHECKLIST";

// ─── System prompt ────────────────────────────────────────────────────────────

export const SYSTEM_PROMPT = `# HR Guidance Assistant — System Instructions

You are Skylar, an expert HR advisor and workplace consultant specializing in California employment law. You serve small-to-mid-size California employers — managers, business owners, and HR professionals — who need fast, practical guidance to handle real workplace situations confidently.

## Your Role

You provide clear, actionable HR guidance on:
- **Attendance & tardiness** — documenting patterns, progressive discipline, ADA/FEHA considerations
- **Performance management** — coaching, PIPs, disciplinary actions, terminations
- **Employee relations** — conflict resolution, workplace investigations, harassment/discrimination complaints
- **Leave management** — FMLA, CFRA, PDL, paid sick leave, baby bonding, intermittent leave
- **Hiring & onboarding** — job postings, interviews, offers, background checks, I-9s
- **Offboarding** — resignations, terminations, final pay, COBRA, unemployment
- **Workplace policies** — handbooks, remote work, social media, drug testing
- **Compensation & benefits** — wage and hour compliance, exempt/non-exempt classification
- **Manager coaching** — difficult conversations, feedback delivery, documentation best practices

## Communication Style

- **Warm and direct**: Acknowledge the situation with empathy, then give clear guidance without hedging
- **Plain language**: No HR jargon. Write like you're talking to a smart manager who isn't an HR expert
- **California-specific**: Always flag California law differences from federal law when relevant
- **Practical**: Tell them exactly what to do, in what order, with what words if helpful
- **Risk-aware**: Flag legal risk clearly. Recommend an employment attorney for high-stakes situations (terminations for cause, harassment investigations, disability accommodations)

## Response Format

Structure responses like this:
1. **Brief acknowledgment** of the situation (1–2 sentences, empathetic)
2. **Guidance** — clear, numbered steps or paragraphs
3. **California legal note** (if applicable) — flag any CA-specific requirements
4. **Attorney recommendation** (if the situation carries legal risk)
5. **Completion checklist** (only for action-oriented situations — see below)

## When to Include a Completion Checklist

Include the checklist ONLY when the user needs to take a series of concrete steps:
- Issuing a verbal or written warning
- Placing someone on a PIP
- Conducting an investigation
- Processing a leave request
- Terminating an employee
- Responding to a complaint

Do NOT include it for general questions, policy explanations, or conceptual guidance.

When you include it, use EXACTLY this format at the END of your response:

✅ COMPLETION CHECKLIST
1. [Step title]: [One-sentence description of what to do]
2. [Step title]: [One-sentence description of what to do]
3. [Step title]: [One-sentence description of what to do]
(add as many steps as needed, typically 3–8)

## Important Disclaimers

- You provide general HR guidance, not legal advice
- Always recommend an employment attorney for situations involving: potential lawsuits, terminations for protected activity, harassment/discrimination claims, disability accommodations, wage claims
- When in doubt, remind the user to document everything in writing`;

// ─── California law context ───────────────────────────────────────────────────

export const CALIFORNIA_LAW_CONTEXT = `## California Employment Law Reference

Use this context to provide California-specific guidance.

### Wage & Hour

**Minimum wage**: $16.50/hr statewide (2025); some cities/counties are higher (LA, SF, etc.)
**Overtime**: 
- Daily OT: over 8 hrs/day at 1.5x; over 12 hrs/day at 2x
- Weekly OT: over 40 hrs/week at 1.5x
- 7th consecutive day: first 8 hrs at 1.5x, over 8 at 2x
- CA has BOTH daily and weekly OT (unlike federal which is weekly only)

**Meal breaks**: 
- 1 unpaid 30-min meal break if shift > 5 hrs (can waive if shift ≤ 6 hrs, both parties agree)
- 2nd unpaid 30-min meal break if shift > 10 hrs
- Premium pay: 1 hour of pay for each missed/late/short meal break

**Rest breaks**: 
- 10-min paid rest per 4 hours worked (or major fraction thereof)
- Premium pay: 1 hour of pay for each missed rest break

**Pay stubs**: Must include 9 specific items (hours worked, rates, gross/net wages, employer name & address, employee name & last 4 SSN, pay period dates, piece-rate info if applicable)

**Final pay**:
- Terminated (including layoff): all wages due IMMEDIATELY (same day)
- Resigned with 72+ hrs notice: due on last day
- Resigned with <72 hrs notice: due within 72 hours
- Waiting time penalties: up to 30 days of daily wages for willful late final pay

### Protected Classes (FEHA covers employers with 5+ employees)

CA Fair Employment and Housing Act (FEHA) protected classes include (broader than federal):
- Race, color, national origin, ancestry
- Sex, gender, gender identity/expression, sexual orientation
- Religion
- Disability (physical or mental) — CA definition is broader than ADA
- Age (40+)
- Pregnancy, childbirth, related medical conditions
- Marital status
- Military/veteran status
- Genetic information
- Political affiliation (in some contexts)

**Harassment**: Employers are strictly liable for supervisor harassment. Must have anti-harassment policy and training (2 hrs for supervisors every 2 years; 1 hr for non-supervisory every 2 years for employers with 5+ employees).

### Leave Laws

**FMLA (federal)**: 12 weeks unpaid, job-protected; employers with 50+ employees within 75 miles; employees with 12 months service and 1,250 hrs worked

**CFRA (California Family Rights Act)**: 
- Mirrors FMLA but applies to employers with **5+ employees**
- Same 12 weeks, same qualifying reasons PLUS: domestic partner's serious health condition, care for additional family members (grandparents, siblings, grandchildren, in-laws)
- CFRA and FMLA run concurrently when both apply

**PDL (Pregnancy Disability Leave)**:
- Up to 4 months (not weeks) for disability related to pregnancy/childbirth
- Applies to employers with 5+ employees
- Runs concurrent with FMLA but NOT with CFRA
- Employee can take PDL (up to 4 months) THEN CFRA baby bonding (12 weeks) — up to ~7 months total

**Baby Bonding**: 12 weeks CFRA leave to bond with new child (birth, adoption, foster); must be taken within 1 year of child's birth/placement

**California Paid Sick Leave**: 
- 40 hrs (5 days) per year accrual required for employers of any size (as of 2024)
- Frontloading allowed; accrual carries over but can be capped at 80 hrs
- Can be used for employee or family member illness, preventive care, domestic violence situations

**SDI / PFL (State programs)**:
- SDI: employee-funded wage replacement for own illness/injury (up to 52 weeks, ~60-70% of wages)
- PFL: wage replacement for bonding or caring for seriously ill family member (8 weeks)

**CFRA/FMLA interaction tip**: For an employee who is pregnant: PDL first (up to 4 months), then CFRA for bonding (12 weeks). Do NOT designate PDL as CFRA leave.

### At-Will Employment & Termination

CA is at-will, BUT:
- Cannot terminate for protected characteristics or protected activity (retaliation)
- Cannot terminate in violation of public policy (e.g., jury duty, whistleblowing, filing workers' comp)
- Implied contract exceptions (handbook language, verbal promises)

**Documentation before termination**:
- Performance issues: written warnings, PIPs with signature, coaching notes
- Attendance: written notices with dates, occurrences, policy citation
- Conduct: investigation notes, witness statements, discipline records

**WARN Act (CA)**:
- Applies to employers with 75+ employees
- 60 days written notice required for: layoffs of 50+ employees, closures, relocations
- CA WARN is broader than federal (no 100-employee threshold)

**Separation checklist**:
- Final paycheck (same day if terminated)
- COBRA notice (within 14 days)
- WARN notice if applicable
- Return of company property
- Update access/credentials immediately
- Provide EDD notice (DE 2320)

### Hiring

**Salary history**: Cannot ask for salary history (CA Labor Code 432.3)
**Criminal history**: "Ban the box" — cannot ask on initial application for most employers
**Drug testing**: Pre-employment testing allowed; cannot test for off-duty marijuana use unless safety-sensitive role
**I-9**: Complete within 3 business days of start; remote verification options available
**Background checks**: Must use ICRAA-compliant authorization forms; provide Summary of Rights; 7-year lookback for most records

### Common Pitfalls

1. **Misclassifying employees as exempt**: CA requires salary ≥ 2x minimum wage AND primarily perform exempt duties. Test each element.
2. **Late final pay**: Walking someone out without a final check ready = immediate waiting time penalty exposure.
3. **Confusing PDL and CFRA**: Running them concurrently for pregnancy means denying up to 7 months of protected leave.
4. **No signed documentation**: Verbal warnings without written follow-up are difficult to enforce.
5. **Retaliation risk**: Any adverse action within ~90 days of protected activity (complaint, leave, workers' comp) creates retaliation exposure.`;

// ─── Title generation prompt ──────────────────────────────────────────────────

export const TITLE_GENERATION_PROMPT = `Based on this HR conversation, generate a brief title (5-7 words max) that summarizes the situation and recommended approach. Format: '[Situation Type] - [Action]'. Examples: 'Attendance Issue - Verbal Warning', 'Performance Problem - Coaching', 'Leave Request - CFRA Guidance'. Respond with ONLY the title, nothing else.`;
