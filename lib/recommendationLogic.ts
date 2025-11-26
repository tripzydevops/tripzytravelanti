import { GoogleGenAI } from "@google/genai";
import { User, Deal } from '../types';

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
export async function getAIRecommendations(user: User, allDeals: Deal[]): Promise<Deal[]> {
    // 1. Analyze user
    const analysis = analyzeUserPreferences(user, allDeals);

    // If no history, return random or popular deals (fallback logic handled by caller or here)
    // For now, let's try to get recommendations even with empty history if possible, 
    // but better to filter out deals they've already used/saved to avoid redundancy.

    const redeemedOrSavedIds = new Set([
        ...(user.savedDeals || []),
        ...(user.redemptions?.map(r => r.dealId) || [])
    ]);

    const candidateDeals = allDeals.filter(d => !redeemedOrSavedIds.has(d.id));

    if (candidateDeals.length === 0) return [];

    // 2. Construct Prompt
    // We'll send a simplified version of deals to save tokens
    const dealsJson = candidateDeals.map(d => ({
        id: d.id,
        title: d.title,
        category: d.category,
        price: d.discountedPrice,
        vendor: d.vendor,
        description: d.description.substring(0, 100) // Truncate for brevity
    }));

    const userProfile = {
        favorites: analysis.favoriteCategories,
        avgSpend: analysis.averageSpending,
        topVendors: analysis.preferredVendors
    };

    const prompt = `
    You are a smart recommendation engine for a travel and lifestyle deals app.
    
    User Profile:
    ${JSON.stringify(userProfile, null, 2)}

    Available Deals:
    ${JSON.stringify(dealsJson, null, 2)}

    Task:
    Select the top 3 deals that this user would be most interested in based on their profile.
    If the profile is empty, select 3 diverse and popular-sounding deals.
    
    Return ONLY a JSON array of the 3 matching deal IDs. Example: ["123", "456", "789"]
    Do not include any markdown formatting or explanation.
  `;

    try {
        // 3. Call Gemini
        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash-exp',
            contents: prompt
        });

        const text = response.text.trim();
        // Clean up potential markdown code blocks
        const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();

        const recommendedIds: string[] = JSON.parse(cleanJson);

        // 4. Map back to full deal objects
        const recommendations = allDeals.filter(d => recommendedIds.includes(d.id));
        return recommendations;

    } catch (error) {
        console.error("AI Recommendation failed:", error);
        // Fallback: Return top 3 deals from favorite category, or just first 3
        if (analysis.favoriteCategories.length > 0) {
            return candidateDeals
                .filter(d => analysis.favoriteCategories.includes(d.category))
                .slice(0, 3);
        }
        return candidateDeals.slice(0, 3);
    }
}
