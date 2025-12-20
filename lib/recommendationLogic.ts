import { User, Deal } from '../types';
import { querySimilarDeals, rankDeals } from './vectorService';
import { getEngagementLogs } from './supabaseService';

// Initialize Gemini lazily inside the function

interface UserAnalysis {
    favoriteCategories: string[];
    averageSpending: number;
    preferredVendors: string[];
}

/**
 * Analyzes the user's redemption and saved deal history to build a preference profile.
 */
export function analyzeUserPreferences(user: User, allDeals: Deal[]): UserAnalysis {
    const relevantDealIds = new Set([
        ...(user.savedDeals || []),
        ...(user.redemptions?.map(r => r.dealId) || [])
    ]);

    const relevantDeals = allDeals.filter(d => relevantDealIds.has(d.id));

    if (relevantDeals.length === 0) {
        return {
            favoriteCategories: [],
            averageSpending: 0,
            preferredVendors: []
        };
    }

    const categoryCounts: Record<string, number> = {};
    const vendorCounts: Record<string, number> = {};
    let totalSpending = 0;
    let spendingCount = 0;

    relevantDeals.forEach(deal => {
        // Category counting
        categoryCounts[deal.category] = (categoryCounts[deal.category] || 0) + 1;

        // Vendor counting
        vendorCounts[deal.vendor] = (vendorCounts[deal.vendor] || 0) + 1;

        // Spending analysis
        if (deal.discountedPrice > 0) {
            totalSpending += deal.discountedPrice;
            spendingCount++;
        }
    });

    // Sort categories by frequency
    const favoriteCategories = Object.entries(categoryCounts)
        .sort(([, a], [, b]) => b - a)
        .map(([cat]) => cat)
        .slice(0, 3); // Top 3

    // Sort vendors by frequency
    const preferredVendors = Object.entries(vendorCounts)
        .sort(([, a], [, b]) => b - a)
        .map(([vendor]) => vendor)
        .slice(0, 3); // Top 3

    const averageSpending = spendingCount > 0 ? totalSpending / spendingCount : 0;

    return {
        favoriteCategories,
        averageSpending,
        preferredVendors
    };
}

/**
 * Uses Gemini to recommend deals based on the user's profile and available deals.
 */
export async function getAIRecommendations(
    user: User,
    allDeals: Deal[],
    preferences?: { travelStyle: string; budget: string }
): Promise<Deal[]> {
    // 1. Analyze user
    const analysis = analyzeUserPreferences(user, allDeals);

    const redeemedOrSavedIds = new Set([
        ...(user.savedDeals || []),
        ...(user.redemptions?.map(r => r.dealId) || [])
    ]);

    // 2. RETRIEVE: Use Vector Search to find relevant candidates
    let candidateDeals = allDeals.filter(d => !redeemedOrSavedIds.has(d.id));

    // Attempt to get similar deals from Pinecone based on engagement
    try {
        const logs = await getEngagementLogs(user.id, 5);
        if (logs && logs.length > 0) {
            const context = logs.map((l: any) =>
                `${l.event_type} on ${l.deals?.title || 'item'} in category ${l.deals?.category || 'unknown'}`
            ).join(', ');

            const similarIds = await querySimilarDeals(context, 20);
            if (similarIds.length > 0) {
                const vectorCandidates = candidateDeals.filter(d => similarIds.includes(d.id));
                if (vectorCandidates.length > 5) {
                    candidateDeals = vectorCandidates;
                }
            }
        }
    } catch (err) {
        console.warn("Vector search failed, falling back to basic filtering:", err);
    }

    if (candidateDeals.length === 0) return [];

    // 3. RANK: Construct Prompt for Gemini with a smaller, more relevant set
    const dealsJson = candidateDeals.slice(0, 20).map(d => ({
        id: d.id,
        title: d.title,
        category: d.category,
        price: d.discountedPrice,
        vendor: d.vendor,
        description: d.description.substring(0, 100)
    }));

    const userProfile = {
        favorites: analysis.favoriteCategories,
        avgSpend: analysis.averageSpending,
        topVendors: analysis.preferredVendors,
        explicitPreferences: preferences
    };

    const prompt = `
    You are a smart recommendation engine for a travel and lifestyle deals app.
    
    User Profile (Past behavior and preferences):
    ${JSON.stringify(userProfile, null, 2)}

    Candidates (Pre-filtered by vector similarity):
    ${JSON.stringify(dealsJson, null, 2)}

    Task:
    Select the top 3 deals that this user would be most interested in.
    
    Prioritize matches for:
    - Travel Style: ${preferences?.travelStyle || 'Any'}
    - Budget: ${preferences?.budget || 'Any'}

    Return ONLY a JSON array of the 3 matching deal IDs. Example: ["123", "456", "789"]
  `;

    // 4. Call Gemini via Secure Edge Function
    try {
        const recommendedIds = await rankDeals(prompt);

        if (recommendedIds && recommendedIds.length > 0) {
            const recommendations = allDeals.filter(d => recommendedIds.includes(d.id));
            if (recommendations.length > 0) {
                return recommendations;
            }
        }
    } catch (error) {
        console.error("AI Recommendation failed:", error);
        // Fall through to fallback logic below
    }

    // Fallback Logic
    let fallbackDeals = candidateDeals;

    // Filter by travel style if available (simple keyword match on category or description)
    if (preferences?.travelStyle) {
        const style = preferences.travelStyle.toLowerCase();
        const styleMatches = fallbackDeals.filter(d =>
            d.category.toLowerCase().includes(style) ||
            d.description.toLowerCase().includes(style) ||
            (style === 'beach' && (d.title.toLowerCase().includes('beach') || d.title.toLowerCase().includes('resort'))) ||
            (style === 'mountain' && (d.title.toLowerCase().includes('mountain') || d.title.toLowerCase().includes('ski'))) ||
            (style === 'city' && (d.title.toLowerCase().includes('city') || d.title.toLowerCase().includes('hotel'))) ||
            (style === 'adventure' && (d.title.toLowerCase().includes('adventure') || d.title.toLowerCase().includes('tour')))
        );
        if (styleMatches.length > 0) {
            fallbackDeals = styleMatches;
        }
    }

    // Then filter by favorites if we still have generic deals
    if (analysis.favoriteCategories.length > 0 && fallbackDeals.length === candidateDeals.length) {
        return fallbackDeals
            .filter(d => analysis.favoriteCategories.includes(d.category))
            .slice(0, 3);
    }

    return fallbackDeals.slice(0, 3);
}
