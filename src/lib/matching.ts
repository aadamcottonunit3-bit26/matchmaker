import { incomeFit } from "@/lib/income";

/**
 * Two-tier matching.
 *  Tier 1 (hard filters) runs in Postgres: `select * from match_candidates()`.
 *  Tier 2 (weighted score) runs here on the candidates returned by Tier 1.
 */

export interface MatchProfile {
  id: string;
  education: string | null;
  profession: string | null;
  monthly_income_pkr: number | null;
  family_background: string | null;
  lifestyle: Record<string, string>;
  pref_education: string | null;
  pref_profession: string | null;
  pref_income_min_pkr: number | null;
  pref_income_max_pkr: number | null;
  pref_family: string | null;
  pref_lifestyle: Record<string, string>;
}

export interface ScoreBreakdown {
  education: number;
  profession: number;
  income: number;
  family: number;
  lifestyle: number;
}

export interface ScoredMatch<T extends MatchProfile = MatchProfile> {
  profile: T;
  /** 0-100 */
  percent: number;
  breakdown: ScoreBreakdown;
}

/** Tunable weights (sum = 100). Move to a DB settings table later if admins need to edit them. */
export const WEIGHTS = {
  education: 25,
  profession: 20,
  income: 20,
  family: 15,
  lifestyle: 20,
} as const;

const EDUCATION_RANK: Record<string, number> = {
  matric: 1,
  intermediate: 2,
  bachelors: 3,
  masters: 4,
  mphil: 5,
  phd: 6,
};

const FAMILY_RANK: Record<string, number> = {
  lower_middle: 1,
  middle: 2,
  upper_middle: 3,
  upper: 4,
};

const norm = (v: string | null | undefined) => (v ?? "").trim().toLowerCase();

/** Ordinal closeness: 1 when equal, falling by 1/maxGap per step. Unknown => neutral 0.5. */
function ordinalScore(
  a: string | null,
  b: string | null,
  rank: Record<string, number>,
  maxGap: number
): number {
  const ra = rank[norm(a)];
  const rb = rank[norm(b)];
  if (ra === undefined || rb === undefined) return 0.5;
  return Math.max(0, 1 - Math.abs(ra - rb) / maxGap);
}

/** How well `candidate` satisfies what `me` is looking for (one direction). */
function scoreOneWay(me: MatchProfile, cand: MatchProfile): ScoreBreakdown {
  // Education: if I stated a preference, compare to it; otherwise compare to my own level
  const eduTarget = me.pref_education ?? me.education;
  const education =
    ordinalScore(cand.education, eduTarget, EDUCATION_RANK, 3) * WEIGHTS.education;

  // Profession: exact match with preference = full, unspecified preference = neutral
  let profession: number;
  if (!me.pref_profession) profession = 0.5;
  else profession = norm(cand.profession) === norm(me.pref_profession) ? 1 : 0.2;

  // Income: inside the wished-for range = full; below it = proportional; far above = slightly lower
  const income = incomeFit(me.pref_income_min_pkr, me.pref_income_max_pkr, cand.monthly_income_pkr);

  const familyTarget = me.pref_family ?? me.family_background;
  const family = ordinalScore(cand.family_background, familyTarget, FAMILY_RANK, 3) * WEIGHTS.family;

  // Lifestyle: share of my stated lifestyle preferences the candidate matches
  const prefs = Object.entries(me.pref_lifestyle ?? {});
  let lifestyle: number;
  if (prefs.length === 0) lifestyle = 0.5;
  else {
    const hits = prefs.filter(
      ([k, v]) => norm(cand.lifestyle?.[k]) === norm(v)
    ).length;
    lifestyle = hits / prefs.length;
  }

  return {
    education,
    profession: profession * WEIGHTS.profession,
    income: income * WEIGHTS.income,
    family,
    lifestyle: lifestyle * WEIGHTS.lifestyle,
  };
}

const sum = (b: ScoreBreakdown) =>
  b.education + b.profession + b.income + b.family + b.lifestyle;

/**
 * Score one candidate against me. Final % = 70% how well they fit my wishes
 * + 30% how well I fit theirs (mutual compatibility).
 */
export function scoreMatch<T extends MatchProfile>(me: MatchProfile, cand: T): ScoredMatch<T> {
  const mine = scoreOneWay(me, cand);
  const theirs = scoreOneWay(cand, me);
  const percent = Math.round(sum(mine) * 0.7 + sum(theirs) * 0.3);
  return { profile: cand, percent: Math.min(100, Math.max(0, percent)), breakdown: mine };
}

/** Rank Tier-1 candidates by Tier-2 score, highest first. */
export function rankMatches<T extends MatchProfile>(me: MatchProfile, candidates: T[]): ScoredMatch<T>[] {
  return candidates
    .map((c) => scoreMatch(me, c))
    .sort((a, b) => b.percent - a.percent);
}
