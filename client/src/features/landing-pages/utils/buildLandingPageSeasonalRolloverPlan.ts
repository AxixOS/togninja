// Phase 6: Build Landing Page Seasonal Rollover Plan

export interface SeasonalRolloverSuggestion {
  originalPageTitle: string;
  suggestedNewTitle: string;
  season: string;
  suggestedLaunchMonth: number;
  suggestedLaunchYear: number;
  reasoning: string;
  actionLabel: string;
}

export interface SeasonalRolloverPlan {
  landingPageId: string;
  suggestions: SeasonalRolloverSuggestion[];
  generatedAt: string;
}

const SEASONAL_KEYWORDS: Record<string, { months: number[]; label: string }> = {
  easter: { months: [2, 3], label: 'Easter' },
  christmas: { months: [10, 11], label: 'Christmas' },
  mothers_day: { months: [4], label: "Mother's Day" },
  fathers_day: { months: [5], label: "Father's Day" },
  valentines: { months: [1], label: "Valentine's Day" },
  halloween: { months: [9], label: 'Halloween' },
  new_year: { months: [11, 12], label: 'New Year' },
  spring: { months: [2, 3], label: 'Spring' },
  summer: { months: [5, 6], label: 'Summer' },
  autumn: { months: [8, 9], label: 'Autumn' },
  winter: { months: [10, 11], label: 'Winter' },
  back_to_school: { months: [7, 8], label: 'Back to School' },
  black_friday: { months: [10], label: 'Black Friday' },
};

export function detectSeasonalKeywords(title: string): string[] {
  const lower = title.toLowerCase();
  const matched: string[] = [];
  for (const [key, config] of Object.entries(SEASONAL_KEYWORDS)) {
    const searchTerms = key.replace(/_/g, ' ').split(' ');
    if (searchTerms.some(term => lower.includes(term)) || lower.includes(config.label.toLowerCase())) {
      matched.push(key);
    }
  }
  return matched;
}

export function buildSeasonalRolloverPlan(
  landingPageId: string,
  pageTitle: string,
  publishedAt: string | null,
): SeasonalRolloverPlan {
  const detectedSeasons = detectSeasonalKeywords(pageTitle);
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed

  const suggestions: SeasonalRolloverSuggestion[] = detectedSeasons.map(seasonKey => {
    const config = SEASONAL_KEYWORDS[seasonKey];
    const prepMonth = config.months[0]; // earliest prep month (0-indexed in our map, but stored 1-indexed style)
    let launchYear = currentYear;
    // If the prep month has passed this year, schedule for next year
    if (currentMonth >= prepMonth) {
      launchYear = currentYear + 1;
    }

    return {
      originalPageTitle: pageTitle,
      suggestedNewTitle: `${pageTitle} ${launchYear}`,
      season: config.label,
      suggestedLaunchMonth: prepMonth + 1, // 1-indexed for display
      suggestedLaunchYear: launchYear,
      reasoning: `This page appears to be a ${config.label} campaign. Relaunching before ${config.label} ${launchYear} could drive repeat business.`,
      actionLabel: `Schedule ${config.label} ${launchYear} Relaunch`,
    };
  });

  return {
    landingPageId,
    suggestions,
    generatedAt: new Date().toISOString(),
  };
}
