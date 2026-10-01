/**
 * Medicine & Brand Validation, Normalization, Cross-Field & Duplicate Utility
 * Pharmacological Inventory System
 */

/**
 * Normalizes a string by trimming, converting to lowercase, collapsing whitespace,
 * and standardizing dosage unit spacing (e.g. "10 mg" -> "10mg").
 * 
 * @param {string} str 
 * @returns {string}
 */
export function normalize(str) {
    if (!str) return '';
    return String(str)
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/(\d)\s+(mg|ml|g|mcg|%)/gi, '$1$2');
}

export const normalizeMedicineName = normalize;

/**
 * Extracts the base name from a medicine/brand string by stripping numbers and unit specifications.
 * e.g., "Aspirin 10mg" -> "aspirin", "Paracetamol 500mg" -> "paracetamol"
 * 
 * @param {string} str 
 * @returns {string}
 */
export function getBaseName(str) {
    if (!str) return '';
    return normalize(str)
        .replace(/\d+(\.\d+)?\s*(mg|ml|g|mcg|%)?/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Calculates similarity between two strings, returning a float between 0 (completely different) and 1 (identical).
 * Uses Levenshtein distance with typo-tolerant near-match boosting for brand & medicine names.
 * 
 * @param {string} a 
 * @param {string} b 
 * @returns {number}
 */
export function similarity(a, b) {
    const s1 = normalize(a);
    const s2 = normalize(b);
    if (s1 === s2) return 1.0;
    if (!s1.length || !s2.length) return 0.0;

    const len1 = s1.length;
    const len2 = s2.length;

    const matrix = Array(len2 + 1).fill(null).map(() => Array(len1 + 1).fill(null));
    for (let i = 0; i <= len1; i++) matrix[0][i] = i;
    for (let j = 0; j <= len2; j++) matrix[j][0] = j;

    for (let j = 1; j <= len2; j++) {
        for (let i = 1; i <= len1; i++) {
            const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
            matrix[j][i] = Math.min(
                matrix[j][i - 1] + 1,       // insertion
                matrix[j - 1][i] + 1,       // deletion
                matrix[j - 1][i - 1] + cost  // substitution
            );
        }
    }

    const dist = matrix[len2][len1];
    const maxLen = Math.max(len1, len2);
    const rawRatio = 1 - (dist / maxLen);

    // Boost similarity for single-edit / single-character typos (e.g. "canva" vs "canvaa", "asprin" vs "aspirin")
    if (dist === 1 && Math.min(len1, len2) >= 4) {
        return Math.max(0.92, rawRatio);
    }
    if (dist === 2 && Math.min(len1, len2) >= 8) {
        return Math.max(0.91, rawRatio);
    }

    return rawRatio;
}

/**
 * Medicine Name Field Validation
 * 
 * Rule 1: Required (trim leading/trailing spaces before checking).
 * Rule 2: Length between 1 and 100 characters.
 * Rule 3: Must contain at least one letter (A-Z or a-z).
 * Rule 4: Allowed characters: Letters, Numbers, Spaces, and $ % @ - / . & + ( )
 * Rule 5: Combined Regex: ^(?=.*[a-zA-Z])[a-zA-Z0-9\s$%@\-\/\.&+()]{1,100}$
 * 
 * @param {string} value 
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateMedicineName(value) {
    if (value === null || value === undefined) {
        return { valid: false, error: 'Medicine name is required.' };
    }

    const trimmed = String(value).trim();
    if (trimmed.length === 0) {
        return { valid: false, error: 'Medicine name is required.' };
    }

    if (trimmed.length > 100) {
        return { valid: false, error: 'Medicine name cannot exceed 100 characters.' };
    }

    const hasLetter = /[a-zA-Z]/.test(trimmed);
    if (!hasLetter) {
        return { valid: false, error: 'Medicine name must contain at least one letter.' };
    }

    const allowedCharsRegex = /^[a-zA-Z0-9\s$%@\-\/\.&+()]+$/;
    if (!allowedCharsRegex.test(trimmed)) {
        return { valid: false, error: 'Medicine name contains invalid characters.' };
    }

    const combinedRegex = /^(?=.*[a-zA-Z])[a-zA-Z0-9\s$%@\-\/\.&+()]{1,100}$/;
    if (!combinedRegex.test(trimmed)) {
        return { valid: false, error: 'Medicine name contains invalid characters.' };
    }

    return { valid: true };
}

/**
 * Unit Price Field Validation
 * 
 * Rule 1: Required (trim leading/trailing spaces before checking).
 * Rule 2: Numeric Only (must be valid number, no letters, no commas, no currency text like "Rs. 32").
 * Rule 3: Must Be Greater Than Zero (> 0; negative -> "Unit price cannot be negative.", 0 -> "Unit price must be greater than 0.").
 * Rule 4: Max Value <= 1,000,000 ("Unit price seems too high. Please check.").
 * Rule 5: Decimal Places <= 2 ("Unit price can have at most 2 decimal places.").
 * Rule 6: Auto-Formatting (format to 2 decimal places on blur: "32" -> "32.00").
 * Rule 7: Regex: ^\d+(\.\d{1,2})?$
 * 
 * @param {string|number} value 
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateUnitPrice(value) {
    if (value === null || value === undefined) {
        return { valid: false, error: 'Unit price is required.' };
    }

    const trimmed = String(value).trim();

    // Rule 1: Required
    if (trimmed.length === 0) {
        return { valid: false, error: 'Unit price is required.' };
    }

    // Rule 3 (part 1): Negative check
    if (/^-/.test(trimmed)) {
        return { valid: false, error: 'Unit price cannot be negative.' };
    }

    // Rule 2: Numeric Only (no letters, symbols, commas, or spaces)
    const isNumericFormat = /^\d+(\.\d+)?$/.test(trimmed);
    if (!isNumericFormat) {
        return { valid: false, error: 'Unit price must be a number.' };
    }

    const num = Number(trimmed);

    // Rule 3 (part 2): Must be greater than 0
    if (num === 0) {
        return { valid: false, error: 'Unit price must be greater than 0.' };
    }

    // Rule 4: Max Value 1,000,000
    if (num > 1000000) {
        return { valid: false, error: 'Unit price seems too high. Please check.' };
    }

    // Rule 5: Maximum 2 decimal places
    if (trimmed.includes('.')) {
        const decimals = trimmed.split('.')[1];
        if (decimals && decimals.length > 2) {
            return { valid: false, error: 'Unit price can have at most 2 decimal places.' };
        }
    }

    return { valid: true };
}

/**
 * Formats a valid unit price to 2 decimal places (e.g. "32" -> "32.00", "32.5" -> "32.50").
 * 
 * @param {string|number} value 
 * @returns {string}
 */
export function formatUnitPrice(value) {
    const val = validateUnitPrice(value);
    if (!val.valid) return String(value).trim();
    const num = Number(String(value).trim());
    return num.toFixed(2);
}

/**
 * Pills in One Card Field Validation
 * 
 * Rule 1: Required (trim leading/trailing spaces before checking).
 * Rule 2: Integer Only (No Decimals) -> "Pills in one card must be a whole number."
 * Rule 3: Numeric Only (digits only 0-9, no letters, commas, spaces, or scientific notation) -> "Pills in one card must be a number."
 * Rule 4: Must Be Greater Than Zero (>= 1; 0 -> "Pills in one card must be at least 1.", negative -> "Pills in one card cannot be negative.")
 * Rule 5: Max Value <= 1000 -> "Pills in one card seems too high. Please check."
 * Rule 6: No Leading Zeros (e.g. "010") -> "Remove leading zeros."
 * Rule 7: Regex Combined: ^(1000|[1-9]\d{0,2})$
 * 
 * @param {string|number} value 
 * @returns {{ valid: boolean, error?: string }}
 */
export function validatePillsInCard(value) {
    if (value === null || value === undefined) {
        return { valid: false, error: 'Number of pills is required.' };
    }

    const trimmed = String(value).trim();

    // Rule 1: Required
    if (trimmed.length === 0) {
        return { valid: false, error: 'Number of pills is required.' };
    }

    // Rule 4 (part 1): Negative check
    if (/^-/.test(trimmed)) {
        return { valid: false, error: 'Pills in one card cannot be negative.' };
    }

    // Rule 2: Integer Only (Decimal check)
    if (trimmed.includes('.')) {
        return { valid: false, error: 'Pills in one card must be a whole number.' };
    }

    // Rule 6: Leading zeros check (e.g. "010")
    if (/^0\d+/.test(trimmed)) {
        return { valid: false, error: 'Remove leading zeros.' };
    }

    // Rule 3: Numeric Only (digits 0-9 only, no letters, commas, spaces, 1e2)
    if (!/^\d+$/.test(trimmed)) {
        return { valid: false, error: 'Pills in one card must be a number.' };
    }

    const num = Number(trimmed);

    // Rule 4 (part 2): Must be at least 1
    if (num === 0) {
        return { valid: false, error: 'Pills in one card must be at least 1.' };
    }

    // Rule 5: Max Value 1000
    if (num > 1000) {
        return { valid: false, error: 'Pills in one card seems too high. Please check.' };
    }

    return { valid: true };
}

/**
 * One Card Price Field Validation
 * 
 * - Optional field (can be auto-calculated).
 * - Cannot be negative -> "Card price cannot be negative."
 * - Numeric only -> "Card price must be a number."
 * - Must be greater than 0 -> "Card price must be greater than 0."
 * - Max 2 decimal places -> "Card price can have at most 2 decimal places."
 * 
 * @param {string|number} value 
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateCardPrice(value) {
    if (value === null || value === undefined) {
        return { valid: true };
    }

    const trimmed = String(value).trim();
    if (trimmed.length === 0) {
        return { valid: true };
    }

    if (/^-/.test(trimmed)) {
        return { valid: false, error: 'Card price cannot be negative.' };
    }

    const isNumericFormat = /^\d+(\.\d+)?$/.test(trimmed);
    if (!isNumericFormat) {
        return { valid: false, error: 'Card price must be a number.' };
    }

    const num = Number(trimmed);
    if (num === 0) {
        return { valid: false, error: 'Card price must be greater than 0.' };
    }

    if (num > 10000000) {
        return { valid: false, error: 'Card price seems too high. Please check.' };
    }

    if (trimmed.includes('.')) {
        const decimals = trimmed.split('.')[1];
        if (decimals && decimals.length > 2) {
            return { valid: false, error: 'Card price can have at most 2 decimal places.' };
        }
    }

    return { valid: true };
}

/**
 * Formats valid card price to 2 decimal places (e.g. "320" -> "320.00").
 * 
 * @param {string|number} value 
 * @returns {string}
 */
export function formatCardPrice(value) {
    const val = validateCardPrice(value);
    if (!val.valid) return String(value).trim();
    const trimmed = String(value).trim();
    if (trimmed.length === 0) return '';
    const num = Number(trimmed);
    return num.toFixed(2);
}

/**
 * Brand Name Field Validation
 * 
 * Rule 1: Required (trim leading/trailing spaces before checking).
 * Rule 2: Min Length 2, Max Length 100 characters.
 * Rule 3: Must contain at least one letter (A-Z or a-z).
 * Rule 4: Allowed characters: Letters, Numbers, Spaces, and & - . ' , ( )
 * Rule 5: Combined Regex: ^(?=.*[a-zA-Z])[a-zA-Z0-9\s&\-'.,()]{2,100}$
 * 
 * @param {string} value 
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateBrandName(value) {
    if (value === null || value === undefined) {
        return { valid: false, error: 'Brand name is required.' };
    }

    const trimmed = String(value).trim();

    // Rule 1: Required
    if (trimmed.length === 0) {
        return { valid: false, error: 'Brand name is required.' };
    }

    // Rule 2: Length
    if (trimmed.length < 2) {
        return { valid: false, error: 'Brand name must be at least 2 characters.' };
    }
    if (trimmed.length > 100) {
        return { valid: false, error: 'Brand name cannot exceed 100 characters.' };
    }

    // Rule 3: Must Contain At Least One Letter
    const hasLetter = /[a-zA-Z]/.test(trimmed);
    if (!hasLetter) {
        return { valid: false, error: 'Brand name must contain at least one letter.' };
    }

    // Rule 4: Allowed Characters: Letters, Numbers, Spaces, and & - . ' , ( )
    // Blocks $ % @ / + #
    const allowedCharsRegex = /^[a-zA-Z0-9\s&\-'.,()]+$/;
    if (!allowedCharsRegex.test(trimmed)) {
        return { valid: false, error: 'Brand name contains invalid characters.' };
    }

    // Rule 5: Combined Regex
    const combinedRegex = /^(?=.*[a-zA-Z])[a-zA-Z0-9\s&\-'.,()]{2,100}$/;
    if (!combinedRegex.test(trimmed)) {
        return { valid: false, error: 'Brand name contains invalid characters.' };
    }

    return { valid: true };
}

/**
 * Cross-Field Validation (Brand vs Medicine Name)
 * 
 * Rule 6: Brand Name != Medicine Name (Exact Match) -> Hard Block
 * Rule 7: Same Base, Different Strength -> ALLOW
 * Rule 8: Near Match (Fuzzy) -> SOFT WARNING
 * 
 * @param {string} medicineName 
 * @param {string} brandName 
 * @returns {{ valid: boolean, error?: string, warning?: string }}
 */
export function validateMedicineVsBrand(medicineName, brandName) {
    if (!medicineName || !brandName) return { valid: true };

    const normMed = normalize(medicineName);
    const normBrand = normalize(brandName);

    // Rule 6: Brand Name != Medicine Name (Exact Match) -> Hard Block
    if (normMed === normBrand) {
        return { valid: false, error: 'Brand name and medicine name cannot be identical.' };
    }

    // Rule 7: Same Base, Different Strength -> ALLOW
    const baseMed = getBaseName(medicineName);
    const baseBrand = getBaseName(brandName);
    if (baseMed && baseBrand && baseMed === baseBrand) {
        if (normMed !== normBrand) {
            return { valid: true }; // Allowed (different strengths)
        }
    }

    // Rule 8: Near Match (Fuzzy) -> SOFT WARNING
    const sim = similarity(medicineName, brandName);
    if (sim > 0.90) {
        return {
            valid: true,
            warning: 'Brand name and medicine name look very similar. Continue?'
        };
    }

    return { valid: true };
}

/**
 * Duplicate Detection Across Inventory
 * 
 * Level 1: Exact Duplicate -> HARD BLOCK
 *   normalize(newMed) === normalize(existingMed) AND normalize(newBrand) === normalize(existingBrand)
 * Level 2: Near Duplicate (Typos) -> SOFT WARNING
 *   similarity(newMed, existingMed) > 0.90 AND similarity(newBrand, existingBrand) > 0.90 AND not exact
 * Level 3: Unique -> ALLOW
 * 
 * @param {Object} newEntry - { name, brandName, ... }
 * @param {Array} inventory - Array of existing medicine objects
 * @param {number|string|null} editingId - ID of item currently being edited
 * @returns {{ type: 'DUPLICATE' | 'NEAR_DUPLICATE' | 'UNIQUE', error?: string, warning?: string, existingItem?: Object }}
 */
export function checkDuplicate(newEntry, inventory, editingId = null) {
    if (!newEntry || !newEntry.name || !newEntry.brandName || !Array.isArray(inventory)) {
        return { type: 'UNIQUE' };
    }

    const normNewName = normalize(newEntry.name);
    const normNewBrand = normalize(newEntry.brandName);

    for (const existing of inventory) {
        if (editingId && String(existing.id) === String(editingId)) {
            continue;
        }

        const normExtName = normalize(existing.name);
        const normExtBrand = normalize(existing.brandName || '');

        const nameExact = normNewName === normExtName;
        const brandExact = normNewBrand === normExtBrand;

        // Level 1: Exact Duplicate -> HARD BLOCK
        if (nameExact && brandExact) {
            return {
                type: 'DUPLICATE',
                error: 'This medicine already exists in inventory (same name + same brand).',
                existingItem: existing
            };
        }

        // Different strength of same base medicine (e.g., 10mg vs 20mg) => UNIQUE product (ALLOW)
        const baseNew = getBaseName(newEntry.name);
        const baseExt = getBaseName(existing.name);
        if (baseNew && baseExt && baseNew === baseExt && normNewName !== normExtName) {
            continue; // Different strength is allowed as unique product
        }

        // Level 2: Near Duplicate (Typos) -> SOFT WARNING
        const nameSim = similarity(newEntry.name, existing.name);
        const brandSim = similarity(newEntry.brandName, existing.brandName || '');

        if (nameSim > 0.90 && brandSim > 0.90 && !(nameExact && brandExact)) {
            return {
                type: 'NEAR_DUPLICATE',
                warning: 'This looks similar to an existing entry. Add anyway?',
                existingItem: existing
            };
        }
    }

    // Level 3: Unique -> ALLOW
    return { type: 'UNIQUE' };
}

/**
 * Predefined Storage Requirement Options
 */
export const DEFAULT_STORAGE_OPTIONS = [
    { value: 'room_temp', label: '🌡️ Normal Room Temp. (<25°C)' },
    { value: 'cool_dry', label: '🌤️ Cool & Dry Place (<25°C)' },
    { value: 'refrigerated', label: '❄️ Refrigerated (2°C – 8°C)' },
    { value: 'frozen', label: '🧊 Frozen (Below -18°C)' },
    { value: 'protect_light', label: '☀️ Protect from Light' },
    { value: 'protect_moist', label: '💧 Protect from Moisture' },
    { value: 'keep_children', label: '👶 Keep Out of Reach of Children' },
    { value: 'original_pack', label: '📦 Store in Original Container' }
];

/**
 * Validates selected storage requirement.
 * 
 * @param {string} value 
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateStorageRequirement(value) {
    if (value === null || value === undefined) {
        return { valid: false, error: 'Storage requirement is required.' };
    }

    if (Array.isArray(value)) {
        if (value.length === 0) {
            return { valid: false, error: 'Storage requirement is required.' };
        }
        return { valid: true };
    }

    const trimmed = String(value).trim();
    if (trimmed.length === 0 || trimmed === 'Select storage requirement' || trimmed === '__PLACEHOLDER__') {
        return { valid: false, error: 'Storage requirement is required.' };
    }

    return { valid: true };
}

/**
 * Validates a custom storage option name before creation.
 * 
 * Rules:
 * 1. Required (not empty after trim) -> "Storage option name is required."
 * 2. Min length 3 -> "Must be at least 3 characters."
 * 3. Max length 100 -> "Cannot exceed 100 characters."
 * 4. Must contain at least 1 letter -> "Must contain at least one letter."
 * 5. Allowed chars: Letters, Numbers, Spaces, and - . , ( ) / ° % -> "Contains invalid characters."
 * 6. No duplicates: case-insensitive check against existing options -> "This storage option already exists."
 * 
 * @param {string} value 
 * @param {Array} existingOptions 
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateCustomStorageOption(value, existingOptions = []) {
    if (value === null || value === undefined) {
        return { valid: false, error: 'Storage option name is required.' };
    }

    const trimmed = String(value).trim();

    // Rule 1: Required
    if (trimmed.length === 0) {
        return { valid: false, error: 'Storage option name is required.' };
    }

    // Rule 2: Min Length 3
    if (trimmed.length < 3) {
        return { valid: false, error: 'Must be at least 3 characters.' };
    }

    // Rule 3: Max Length 100
    if (trimmed.length > 100) {
        return { valid: false, error: 'Cannot exceed 100 characters.' };
    }

    // Rule 4: Must contain at least one letter
    const hasLetter = /[a-zA-Z]/.test(trimmed);
    if (!hasLetter) {
        return { valid: false, error: 'Must contain at least one letter.' };
    }

    // Rule 5: Allowed characters check (supports hyphens, en-dash, em-dash, temperature symbols, etc.)
    const allowedRegex = /^[a-zA-Z0-9\s\-–—.,()\/°%]+$/;
    if (!allowedRegex.test(trimmed)) {
        return { valid: false, error: 'Contains invalid characters.' };
    }

    // Rule 6: Duplicate check (case-insensitive & emoji-tolerant)
    const cleanStr = (str) =>
        String(str || '')
            .replace(/[^\w\s°%()\-–—.,\/]/gi, '')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();

    const targetClean = cleanStr(trimmed);

    const isDuplicate = existingOptions.some((opt) => {
        const labelClean = cleanStr(opt.label);
        const valueClean = cleanStr(opt.value);
        return labelClean === targetClean || valueClean === targetClean;
    });

    if (isDuplicate) {
        return { valid: false, error: 'This storage option already exists.' };
    }

    return { valid: true };
}

/**
 * Formats a Date object or date string into "mm/dd/yyyy".
 * 
 * @param {Date|string} dateInput 
 * @returns {string}
 */
export function formatDate(dateInput) {
    if (!dateInput) return '';
    const str = String(dateInput).trim();
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
        return str;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
        const [yyyy, mm, dd] = str.split('-');
        return `${mm}/${dd}/${yyyy}`;
    }
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '';
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
}

/**
 * Safely parses a date string ("mm/dd/yyyy", "yyyy-mm-dd", ISO, etc.) into a Date object at 00:00:00.
 * Rejects invalid calendar dates like 02/30/2026 or 13/01/2026.
 * 
 * @param {Date|string} input 
 * @returns {Date|null}
 */
export function parseDateString(input) {
    if (!input) return null;
    if (input instanceof Date) {
        if (isNaN(input.getTime())) return null;
        const copy = new Date(input);
        copy.setHours(0, 0, 0, 0);
        return copy;
    }
    const str = String(input).trim();
    if (!str) return null;

    let year, month, day;
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
        const [mStr, dStr, yStr] = str.split('/');
        month = parseInt(mStr, 10);
        day = parseInt(dStr, 10);
        year = parseInt(yStr, 10);
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
        const [yStr, mStr, dStr] = str.split('-');
        year = parseInt(yStr, 10);
        month = parseInt(mStr, 10);
        day = parseInt(dStr, 10);
    } else {
        const d = new Date(str);
        if (isNaN(d.getTime())) return null;
        year = d.getFullYear();
        month = d.getMonth() + 1;
        day = d.getDate();
    }

    if (month < 1 || month > 12) return null;
    if (day < 1 || day > 31) return null;

    const dateObj = new Date(year, month - 1, day);
    if (
        dateObj.getFullYear() !== year ||
        dateObj.getMonth() !== month - 1 ||
        dateObj.getDate() !== day
    ) {
        return null;
    }

    dateObj.setHours(0, 0, 0, 0);
    return dateObj;
}

/**
 * Calculates daysRemaining and returns a short-dated stock warning object if expiry is within 30 days.
 * 
 * WARNING TIERS:
 * - Tier 1: Expires Today (daysRemaining === 0)
 *   Severity: HIGH (red/orange)
 *   Message: "⚠️ This medicine expires TODAY. Are you sure you want to add it?"
 * 
 * - Tier 2: Critical (< 7 days)
 *   Severity: HIGH (red/orange)
 *   Message: "⚠️ This medicine expires in X days. This is very short-dated stock. Are you sure?"
 * 
 * - Tier 3: Warning (7 to 30 days)
 *   Severity: MEDIUM (yellow/orange)
 *   Message: "⚠️ This medicine expires in X days. Add anyway?"
 * 
 * - Tier 4: No Warning (> 30 days)
 *   returns null
 * 
 * @param {Date|string} expiryDate 
 * @param {Date|string} [refDate=new Date()] 
 * @returns {{ tier: 'TODAY'|'CRITICAL'|'WARNING', severity: 'high'|'medium', daysRemaining: number, message: string } | null}
 */
export function getShortDatedWarning(expiryDate, refDate = new Date()) {
    if (!expiryDate) return null;

    const parsedExpiry = parseDateString(expiryDate);
    if (!parsedExpiry) return null;

    const today = parseDateString(refDate) || new Date(refDate);
    if (isNaN(today.getTime())) return null;

    today.setHours(0, 0, 0, 0);
    const expiry = new Date(parsedExpiry);
    expiry.setHours(0, 0, 0, 0);

    const msPerDay = 1000 * 60 * 60 * 24;
    const daysRemaining = Math.round((expiry.getTime() - today.getTime()) / msPerDay);

    // Tier 1: Today (daysRemaining === 0)
    if (daysRemaining === 0) {
        return {
            tier: 'TODAY',
            severity: 'high',
            daysRemaining: 0,
            message: '⚠️ This medicine expires TODAY. Are you sure you want to add it?'
        };
    }

    // Tier 2: Critical (< 7 days)
    if (daysRemaining > 0 && daysRemaining < 7) {
        return {
            tier: 'CRITICAL',
            severity: 'high',
            daysRemaining,
            message: `⚠️ This medicine expires in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}. This is very short-dated stock. Are you sure?`
        };
    }

    // Tier 3: Warning (7 to 30 days)
    if (daysRemaining >= 7 && daysRemaining <= 30) {
        return {
            tier: 'WARNING',
            severity: 'medium',
            daysRemaining,
            message: `⚠️ This medicine expires in ${daysRemaining} days. Add anyway?`
        };
    }

    // Tier 4: No warning (> 30 days or past)
    return null;
}

/**
 * Checks if a date is short-dated (expiring within 30 days).
 * 
 * @param {Date|string} selectedDate 
 * @param {Date} [refDate] 
 * @returns {{ isShort: boolean, daysRemaining: number }}
 */
export function isShortDated(selectedDate, refDate = new Date()) {
    const warning = getShortDatedWarning(selectedDate, refDate);
    return {
        isShort: !!warning,
        daysRemaining: warning ? warning.daysRemaining : 0
    };
}

/**
 * Validates the Expiry Date field according to rules:
 * Rule 1: Required
 * Rule 2: Valid Date Format
 * Rule 3 & 5: Future Date (today or later)
 * Rule 4: Max 10 years in the future
 * Rule 6-8: Soft Warnings for Short Expiry (0 days, <7 days, 7-30 days)
 * 
 * @param {Date|string} selectedDate 
 * @param {Date} [refDate] 
 * @returns {{ valid: boolean, error?: string, warning?: string, warningType?: string, shortDatedWarning?: Object, daysUntilExpiry?: number }}
 */
export function validateExpiryDate(selectedDate, refDate = new Date()) {
    // Rule 1: Required
    if (selectedDate === null || selectedDate === undefined || String(selectedDate).trim() === '') {
        return { valid: false, error: 'Expiry date is required.' };
    }

    // Rule 2: Valid Date Format
    const parsed = parseDateString(selectedDate);
    if (!parsed) {
        return { valid: false, error: 'Please enter a valid date.' };
    }

    const today = parseDateString(refDate) || new Date(refDate);
    today.setHours(0, 0, 0, 0);

    // Rule 3 & 5: Must be a future date (or today)
    if (parsed < today) {
        return { valid: false, error: 'Expiry date cannot be in the past.' };
    }

    // Rule 4: Maximum future range (10 years from today)
    const maxDate = new Date(today);
    maxDate.setFullYear(maxDate.getFullYear() + 10);

    if (parsed > maxDate) {
        return { valid: false, error: 'Expiry date is too far in the future. Please check.' };
    }

    // Hard validations passed. Check for soft warnings
    const warningObj = getShortDatedWarning(selectedDate, refDate);
    if (warningObj) {
        return {
            valid: true,
            warning: warningObj.message,
            warningType: warningObj.tier,
            shortDatedWarning: warningObj,
            daysUntilExpiry: warningObj.daysRemaining
        };
    }

    return { valid: true };
}

/**
 * Legacy compatibility export for single-medicine duplicate check
 */
export function isDuplicateMedicine(newMed, existingMedicines, editingId = null) {
    const result = checkDuplicate(newMed, existingMedicines, editingId);
    return result.type === 'DUPLICATE' || result.type === 'NEAR_DUPLICATE';
}


export const SELLING_UNITS = [
    { value: 'PILLS', label: 'Pills / Tablets', autoCalc: true, autoCalcField: 'oneCardPrice' },
    { value: 'BOTTLE', label: 'Bottle / Syrup', autoCalc: false },
    { value: 'TUBE', label: 'Tube / Cream', autoCalc: false },
    { value: 'SACHET', label: 'Sachet / Powder', autoCalc: true, autoCalcField: 'boxPrice' },
    { value: 'VIAL', label: 'Injection / Vial', autoCalc: true, autoCalcField: 'boxPrice' },
    { value: 'DROPS', label: 'Drops', autoCalc: false },
    { value: 'INHALER', label: 'Inhaler', autoCalc: false },
    { value: 'CUSTOM', label: 'Custom Unit', autoCalc: false }
];

export const UnitFieldConfig = {
    PILLS: {
        qtyKey: 'pillsInCard',
        qtyLabel: 'PILLS IN ONE CARD *',
        qtyPlaceholder: 'e.g. 10',
        qtyMax: 1000,
        qtyErrorMsg: 'Pills in one card',
        priceKey: 'unitPrice',
        priceLabel: 'UNIT PRICE (PER PILL RS.) *',
        pricePlaceholder: 'e.g. 32.00',
        autoCalcKey: 'oneCardPrice',
        autoCalcLabel: 'ONE CARD PRICE (RS.)',
        hasAutoCalc: true
    },
    BOTTLE: {
        qtyKey: 'bottleSize',
        qtyLabel: 'BOTTLE SIZE (ML) *',
        qtyPlaceholder: 'e.g. 100',
        qtyMax: 5000,
        qtyErrorMsg: 'Bottle size (ml)',
        priceKey: 'pricePerBottle',
        priceLabel: 'PRICE PER BOTTLE (RS.) *',
        pricePlaceholder: 'e.g. 250.00',
        hasAutoCalc: false
    },
    TUBE: {
        qtyKey: 'tubeWeight',
        qtyLabel: 'TUBE WEIGHT (G) *',
        qtyPlaceholder: 'e.g. 20',
        qtyMax: 1000,
        qtyErrorMsg: 'Tube weight (g)',
        priceKey: 'pricePerTube',
        priceLabel: 'PRICE PER TUBE (RS.) *',
        pricePlaceholder: 'e.g. 85.00',
        hasAutoCalc: false
    },
    SACHET: {
        qtyKey: 'sachetsPerBox',
        qtyLabel: 'SACHETS PER BOX *',
        qtyPlaceholder: 'e.g. 10',
        qtyMax: 100,
        qtyErrorMsg: 'Sachets per box',
        priceKey: 'pricePerSachet',
        priceLabel: 'PRICE PER SACHET (RS.) *',
        pricePlaceholder: 'e.g. 15.00',
        autoCalcKey: 'boxPrice',
        autoCalcLabel: 'BOX PRICE (RS.)',
        hasAutoCalc: true
    },
    VIAL: {
        qtyKey: 'vialsPerBox',
        qtyLabel: 'VIALS PER BOX *',
        qtyPlaceholder: 'e.g. 5',
        qtyMax: 100,
        qtyErrorMsg: 'Vials per box',
        priceKey: 'pricePerVial',
        priceLabel: 'PRICE PER VIAL (RS.) *',
        pricePlaceholder: 'e.g. 400.00',
        autoCalcKey: 'boxPrice',
        autoCalcLabel: 'BOX PRICE (RS.)',
        hasAutoCalc: true
    },
    DROPS: {
        qtyKey: 'volumeMl',
        qtyLabel: 'VOLUME (ML) *',
        qtyPlaceholder: 'e.g. 10',
        qtyMax: 5000,
        qtyErrorMsg: 'Volume (ml)',
        priceKey: 'pricePerBottle',
        priceLabel: 'PRICE PER BOTTLE (RS.) *',
        pricePlaceholder: 'e.g. 120.00',
        hasAutoCalc: false
    },
    INHALER: {
        qtyKey: 'puffsPerInhaler',
        qtyLabel: 'PUFFS PER INHALER *',
        qtyPlaceholder: 'e.g. 200',
        qtyMax: 500,
        qtyErrorMsg: 'Puffs per inhaler',
        priceKey: 'pricePerInhaler',
        priceLabel: 'PRICE PER INHALER (RS.) *',
        pricePlaceholder: 'e.g. 350.00',
        hasAutoCalc: false
    },
    CUSTOM: {
        qtyKey: 'unitName',
        qtyLabel: 'UNIT NAME *',
        qtyPlaceholder: 'e.g., Strip, Packet, Box',
        isCustomName: true,
        priceKey: 'pricePerUnit',
        priceLabel: 'PRICE PER UNIT (RS.) *',
        pricePlaceholder: 'e.g. 120.00',
        hasAutoCalc: false
    }
};


export function validateSellingUnitPrice(value, fieldLabel = "Price") {
    if (value === null || value === undefined) {
        return { valid: false, error: `${fieldLabel} is required.` };
    }
    const trimmed = String(value).trim();
    if (trimmed.length === 0) {
        return { valid: false, error: `${fieldLabel} is required.` };
    }
    if (/^-/.test(trimmed)) {
        return { valid: false, error: `${fieldLabel} cannot be negative.` };
    }
    const isNumericFormat = /^\d+(\.\d+)?$/.test(trimmed);
    if (!isNumericFormat) {
        return { valid: false, error: `${fieldLabel} must be a number.` };
    }
    const num = Number(trimmed);
    if (num === 0) {
        return { valid: false, error: `${fieldLabel} must be greater than 0.` };
    }
    if (num > 1000000) {
        return { valid: false, error: `${fieldLabel} seems too high. Please check.` };
    }
    if (trimmed.includes(".")) {
        const decimals = trimmed.split(".")[1];
        if (decimals && decimals.length > 2) {
            return { valid: false, error: `${fieldLabel} can have at most 2 decimal places.` };
        }
    }
    return { valid: true };
}

export function formatSellingUnitPrice(value, fieldLabel = "Price") {
    const val = validateSellingUnitPrice(value, fieldLabel);
    if (!val.valid) return String(value || "").trim();
    const num = Number(String(value).trim());
    return num.toFixed(2);
}

export function validateSellingUnitQty(value, fieldLabel = "Quantity", maxLimit = 1000) {
    if (value === null || value === undefined) {
        return { valid: false, error: `${fieldLabel} is required.` };
    }
    const trimmed = String(value).trim();
    if (trimmed.length === 0) {
        return { valid: false, error: `${fieldLabel} is required.` };
    }
    if (/^-/.test(trimmed)) {
        return { valid: false, error: `${fieldLabel} cannot be negative.` };
    }
    if (trimmed.includes(".")) {
        return { valid: false, error: `${fieldLabel} must be a whole number.` };
    }
    if (/^0\d+/.test(trimmed)) {
        return { valid: false, error: "Remove leading zeros." };
    }
    if (!/^\d+$/.test(trimmed)) {
        return { valid: false, error: `${fieldLabel} must be a number.` };
    }
    const num = Number(trimmed);
    if (num === 0) {
        return { valid: false, error: `${fieldLabel} must be at least 1.` };
    }
    if (num > maxLimit) {
        return { valid: false, error: `${fieldLabel} seems too high. Please check.` };
    }
    return { valid: true };
}

export function validateCustomUnitName(value) {
    if (value === null || value === undefined) {
        return { valid: false, error: "Unit name is required." };
    }
    const trimmed = String(value).trim();
    if (trimmed.length === 0) {
        return { valid: false, error: "Unit name is required." };
    }
    if (trimmed.length < 2) {
        return { valid: false, error: "Unit name must be at least 2 characters." };
    }
    if (trimmed.length > 30) {
        return { valid: false, error: "Unit name cannot exceed 30 characters." };
    }
    const hasLetter = /[a-zA-Z]/.test(trimmed);
    if (!hasLetter) {
        return { valid: false, error: "Unit name must contain at least one letter." };
    }
    const allowedRegex = /^[a-zA-Z0-9\s&\-'.,()]+$/;
    if (!allowedRegex.test(trimmed)) {
        return { valid: false, error: "Unit name contains invalid characters." };
    }
    const combinedRegex = /^(?=.*[a-zA-Z])[a-zA-Z0-9\s&\-'.,()]{2,30}$/;
    if (!combinedRegex.test(trimmed)) {
        return { valid: false, error: "Unit name contains invalid characters." };
    }
    return { valid: true };
}
