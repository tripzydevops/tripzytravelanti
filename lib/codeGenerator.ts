/**
 * Generate unique redemption codes for deals
 * Format: [CATEGORY_PREFIX][VENDOR_INITIAL]-[TIMESTAMP]
 * Example: DINL-L7K9M2 (Dining, Luna Cafe)
 */

export function generateRedemptionCode(category: string, vendor?: string): string {
    // Extract 3-letter category prefix
    const prefix = category
        .toUpperCase()
        .replace(/[^A-Z]/g, '') // Remove non-letters
        .slice(0, 3)
        .padEnd(3, 'X'); // Pad if too short

    // Optional vendor initial (first letter)
    const vendorInitial = vendor
        ? vendor.trim().charAt(0).toUpperCase()
        : '';

    // Generate unique timestamp-based ID (base36 for compactness)
    const timestamp = Date.now().toString(36).toUpperCase();

    return `${prefix}${vendorInitial}-${timestamp}`;
}

/**
 * Examples:
 * generateRedemptionCode('Dining', 'Luna Cafe') → "DINL-L7K9M2"
 * generateRedemptionCode('Travel') → "TRA-M3N8P1"
 * generateRedemptionCode('Wellness & Spa', 'Relax Studio') → "WELR-N4P2Q7"
 */
