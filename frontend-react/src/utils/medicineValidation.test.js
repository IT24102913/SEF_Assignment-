import test from 'node:test';
import assert from 'node:assert/strict';
import {
    SELLING_UNITS,
    UnitFieldConfig,
    validateSellingUnitPrice,
    formatSellingUnitPrice,
    validateSellingUnitQty,
    validateCustomUnitName,
    validateMedicineName,
    validateBrandName,
    validateUnitPrice,
    formatUnitPrice,
    validatePillsInCard,
    validateCardPrice,
    formatCardPrice,
    validateStorageRequirement,
    validateCustomStorageOption,
    DEFAULT_STORAGE_OPTIONS,
    normalize,
    getBaseName,
    similarity,
    validateMedicineVsBrand,
    checkDuplicate,
    formatDate,
    parseDateString,
    isShortDated,
    getShortDatedWarning,
    validateExpiryDate
} from './medicineValidation.js';

test('Storage Requirement Field Selection Validation', () => {
    assert.equal(validateStorageRequirement('room_temp').valid, true);
    assert.equal(validateStorageRequirement('refrigerated').valid, true);
    assert.equal(validateStorageRequirement('custom_amber_bottle').valid, true);
    assert.equal(validateStorageRequirement(['room_temp', 'protect_light']).valid, true);

    assert.deepEqual(validateStorageRequirement(''), { valid: false, error: 'Storage requirement is required.' });
    assert.deepEqual(validateStorageRequirement([]), { valid: false, error: 'Storage requirement is required.' });
    assert.deepEqual(validateStorageRequirement('Select storage requirement'), { valid: false, error: 'Storage requirement is required.' });
});

test('Custom Storage Option Creation Validation', () => {
    // Pass cases
    assert.equal(validateCustomStorageOption('Store in Amber Bottle', DEFAULT_STORAGE_OPTIONS).valid, true);
    assert.equal(validateCustomStorageOption('Keep in dark place', DEFAULT_STORAGE_OPTIONS).valid, true);
    assert.equal(validateCustomStorageOption('Away from sunlight (below 20°C)', DEFAULT_STORAGE_OPTIONS).valid, true);

    // Block cases
    assert.deepEqual(validateCustomStorageOption('AB', DEFAULT_STORAGE_OPTIONS), { valid: false, error: 'Must be at least 3 characters.' });
    assert.deepEqual(validateCustomStorageOption('123', DEFAULT_STORAGE_OPTIONS), { valid: false, error: 'Must contain at least one letter.' });
    assert.deepEqual(validateCustomStorageOption('$$$', DEFAULT_STORAGE_OPTIONS), { valid: false, error: 'Must contain at least one letter.' });
    assert.deepEqual(validateCustomStorageOption('', DEFAULT_STORAGE_OPTIONS), { valid: false, error: 'Storage option name is required.' });
    assert.deepEqual(validateCustomStorageOption('   ', DEFAULT_STORAGE_OPTIONS), { valid: false, error: 'Storage option name is required.' });

    // Duplicate cases (case-insensitive & emoji insensitive)
    assert.deepEqual(validateCustomStorageOption('Refrigerated (2°C – 8°C)', DEFAULT_STORAGE_OPTIONS), { valid: false, error: 'This storage option already exists.' });
    assert.deepEqual(validateCustomStorageOption('refrigerated (2°C – 8°C)', DEFAULT_STORAGE_OPTIONS), { valid: false, error: 'This storage option already exists.' });

    // Exceeds 100 chars
    const longOpt = 'A'.repeat(101);
    assert.deepEqual(validateCustomStorageOption(longOpt, DEFAULT_STORAGE_OPTIONS), { valid: false, error: 'Cannot exceed 100 characters.' });

    // Invalid character @
    assert.deepEqual(validateCustomStorageOption('Store@Home', DEFAULT_STORAGE_OPTIONS), { valid: false, error: 'Contains invalid characters.' });
});

test('One Card Price Field Validation & Auto-Formatting', () => {
    // Pass cases
    assert.equal(validateCardPrice('').valid, true);
    assert.equal(validateCardPrice('320').valid, true);
    assert.equal(formatCardPrice('320'), '320.00');

    assert.equal(validateCardPrice('320.5').valid, true);
    assert.equal(formatCardPrice('320.5'), '320.50');

    // Block cases
    assert.deepEqual(validateCardPrice('-5'), { valid: false, error: 'Card price cannot be negative.' });
    assert.deepEqual(validateCardPrice('0'), { valid: false, error: 'Card price must be greater than 0.' });
    assert.deepEqual(validateCardPrice('abc'), { valid: false, error: 'Card price must be a number.' });
    assert.deepEqual(validateCardPrice('320.999'), { valid: false, error: 'Card price can have at most 2 decimal places.' });
});

test('Pills in One Card Field Validation', () => {
    // Pass cases
    assert.equal(validatePillsInCard('10').valid, true);
    assert.equal(validatePillsInCard('15').valid, true);
    assert.equal(validatePillsInCard('1').valid, true);
    assert.equal(validatePillsInCard('1000').valid, true);

    // Block cases
    assert.deepEqual(validatePillsInCard('1001'), { valid: false, error: 'Pills in one card seems too high. Please check.' });
    assert.deepEqual(validatePillsInCard('0'), { valid: false, error: 'Pills in one card must be at least 1.' });
    assert.deepEqual(validatePillsInCard('-5'), { valid: false, error: 'Pills in one card cannot be negative.' });
    assert.deepEqual(validatePillsInCard('10.5'), { valid: false, error: 'Pills in one card must be a whole number.' });
    assert.deepEqual(validatePillsInCard('abc'), { valid: false, error: 'Pills in one card must be a number.' });
    assert.deepEqual(validatePillsInCard('10a'), { valid: false, error: 'Pills in one card must be a number.' });
    assert.deepEqual(validatePillsInCard(''), { valid: false, error: 'Number of pills is required.' });
    assert.deepEqual(validatePillsInCard('   '), { valid: false, error: 'Number of pills is required.' });
    assert.deepEqual(validatePillsInCard('010'), { valid: false, error: 'Remove leading zeros.' });
    assert.deepEqual(validatePillsInCard('1,000'), { valid: false, error: 'Pills in one card must be a number.' });
    assert.deepEqual(validatePillsInCard('10 15'), { valid: false, error: 'Pills in one card must be a number.' });
    assert.deepEqual(validatePillsInCard('1e2'), { valid: false, error: 'Pills in one card must be a number.' });
});

test('Unit Price Field Validation & Auto-Formatting', () => {
    // Pass cases & auto-formatting
    assert.equal(validateUnitPrice('32').valid, true);
    assert.equal(formatUnitPrice('32'), '32.00');

    assert.equal(validateUnitPrice('32.00').valid, true);
    assert.equal(formatUnitPrice('32.00'), '32.00');

    assert.equal(validateUnitPrice('32.5').valid, true);
    assert.equal(formatUnitPrice('32.5'), '32.50');

    assert.equal(validateUnitPrice('32.99').valid, true);
    assert.equal(formatUnitPrice('32.99'), '32.99');

    assert.equal(validateUnitPrice('0.01').valid, true);
    assert.equal(formatUnitPrice('0.01'), '0.01');

    assert.equal(validateUnitPrice('1000000').valid, true);
    assert.equal(formatUnitPrice('1000000'), '1000000.00');

    // Block cases
    assert.deepEqual(validateUnitPrice('1000000.01'), { valid: false, error: 'Unit price seems too high. Please check.' });
    assert.deepEqual(validateUnitPrice('0'), { valid: false, error: 'Unit price must be greater than 0.' });
    assert.deepEqual(validateUnitPrice('-5'), { valid: false, error: 'Unit price cannot be negative.' });
    assert.deepEqual(validateUnitPrice('abc'), { valid: false, error: 'Unit price must be a number.' });
    assert.deepEqual(validateUnitPrice('32.999'), { valid: false, error: 'Unit price can have at most 2 decimal places.' });
    assert.deepEqual(validateUnitPrice(''), { valid: false, error: 'Unit price is required.' });
    assert.deepEqual(validateUnitPrice('   '), { valid: false, error: 'Unit price is required.' });
    assert.deepEqual(validateUnitPrice('Rs. 32'), { valid: false, error: 'Unit price must be a number.' });
    assert.deepEqual(validateUnitPrice('32,000'), { valid: false, error: 'Unit price must be a number.' });
    assert.deepEqual(validateUnitPrice('3 2'), { valid: false, error: 'Unit price must be a number.' });
});

test('Part 5: Brand Name Field Validation', () => {
    const validInputs = [
        'Cipla Laboratories',
        "Dr. Reddy's",
        'Johnson & Johnson',
        'Merck Sharp & Dohme',
        'Sun Pharma (India)',
        'Abbott India Ltd.',
        'GSK',
        'Pfizer',
        '3M Pharmaceuticals',
        'Cipla   Laboratories',
        'CIPLA LABORATORIES'
    ];

    for (const input of validInputs) {
        const res = validateBrandName(input);
        assert.equal(res.valid, true, `Expected brand "${input}" to be valid but got error: ${res.error}`);
    }

    // Invalid cases
    assert.deepEqual(validateBrandName('A'), { valid: false, error: 'Brand name must be at least 2 characters.' });
    assert.deepEqual(validateBrandName(''), { valid: false, error: 'Brand name is required.' });
    assert.deepEqual(validateBrandName('   '), { valid: false, error: 'Brand name is required.' });
    assert.deepEqual(validateBrandName('$$$'), { valid: false, error: 'Brand name must contain at least one letter.' });
    assert.deepEqual(validateBrandName('123'), { valid: false, error: 'Brand name must contain at least one letter.' });

    // Invalid character blocks ($, %, @, /, +, #)
    const invalidCharInputs = ['Cipla#Labs', 'Cipla@Labs', 'Cipla$Labs', 'Cipla/Labs', 'Cipla+Labs'];
    for (const input of invalidCharInputs) {
        const res = validateBrandName(input);
        assert.equal(res.valid, false, `Expected "${input}" to be blocked for invalid characters`);
        assert.equal(res.error, 'Brand name contains invalid characters.');
    }

    // Exceeds 100 characters
    const longName = 'A'.repeat(101);
    assert.deepEqual(validateBrandName(longName), { valid: false, error: 'Brand name cannot exceed 100 characters.' });
});

test('Part 4 & 5: Normalization & getBaseName & similarity', () => {
    assert.equal(normalize('Cipla   Laboratories'), 'cipla laboratories');
    assert.equal(normalize('CIPLA LABORATORIES'), 'cipla laboratories');
    assert.equal(normalize('Aspirin 10 mg'), 'aspirin 10mg');

    assert.equal(getBaseName('Aspirin 10mg'), 'aspirin');
    assert.equal(getBaseName('Paracetamol 500mg'), 'paracetamol');
    assert.equal(getBaseName('Aspirin 20mg'), 'aspirin');

    assert.equal(similarity('Aspirin 10mg', 'Aspirin 10mg'), 1.0);
    assert.ok(similarity('Aspirin 10mg', 'Asprin 10mg') > 0.90, 'Typos in medicine name should yield > 0.90 similarity');
    assert.ok(similarity('Canva', 'Canvaa') > 0.90, 'Typos in brand name should yield > 0.90 similarity');
});

test('Part 5: Cross-Field Validation (Brand vs Medicine Name)', () => {
    // Medicine: "Aspirin 10mg", Brand: "Aspirin 10mg" -> Block (exact match)
    const res1 = validateMedicineVsBrand('Aspirin 10mg', 'Aspirin 10mg');
    assert.equal(res1.valid, false);
    assert.equal(res1.error, 'Brand name and medicine name cannot be identical.');

    // Medicine: "Aspirin 10mg", Brand: "Aspirin 20mg" -> Allow (different strength)
    const res2 = validateMedicineVsBrand('Aspirin 10mg', 'Aspirin 20mg');
    assert.equal(res2.valid, true);

    // Medicine: "Aspirin 10mg", Brand: "Cipla" -> Allow
    const res3 = validateMedicineVsBrand('Aspirin 10mg', 'Cipla');
    assert.equal(res3.valid, true);

    // Medicine: "Aspirin 10mg", Brand: "Asprin 10mg" -> Warn (typo)
    const res4 = validateMedicineVsBrand('Aspirin 10mg', 'Asprin 10mg');
    assert.equal(res4.valid, true);
    assert.ok(res4.warning && res4.warning.includes('look very similar'));

    // Medicine: "Cipla", Brand: "Cipla" -> Block (exact match)
    const res5 = validateMedicineVsBrand('Cipla', 'Cipla');
    assert.equal(res5.valid, false);
    assert.equal(res5.error, 'Brand name and medicine name cannot be identical.');
});

test('Part 5: Duplicate Detection Across Inventory', () => {
    const inventory = [
        { id: 101, brandName: 'Canva', name: 'Aspirin 10mg' }
    ];

    // Canva + Aspirin 10mg => HARD BLOCK (DUPLICATE)
    const case1 = checkDuplicate({ brandName: 'Canva', name: 'Aspirin 10mg' }, inventory);
    assert.equal(case1.type, 'DUPLICATE');

    // Canva + Aspirin 10 mg => HARD BLOCK (DUPLICATE)
    const case2 = checkDuplicate({ brandName: 'Canva', name: 'Aspirin 10 mg' }, inventory);
    assert.equal(case2.type, 'DUPLICATE');

    // canva + aspirin 10mg => HARD BLOCK (DUPLICATE)
    const case3 = checkDuplicate({ brandName: 'canva', name: 'aspirin 10mg' }, inventory);
    assert.equal(case3.type, 'DUPLICATE');

    // Canva + Aspirin 20mg => ALLOW (UNIQUE)
    const case4 = checkDuplicate({ brandName: 'Canva', name: 'Aspirin 20mg' }, inventory);
    assert.equal(case4.type, 'UNIQUE');

    // Bayer + Aspirin 10mg => ALLOW (UNIQUE)
    const case5 = checkDuplicate({ brandName: 'Bayer', name: 'Aspirin 10mg' }, inventory);
    assert.equal(case5.type, 'UNIQUE');

    // Bayer + Aspirin 20mg => ALLOW (UNIQUE)
    const case6 = checkDuplicate({ brandName: 'Bayer', name: 'Aspirin 20mg' }, inventory);
    assert.equal(case6.type, 'UNIQUE');

    // Canva + Paracetamol 10mg => ALLOW (UNIQUE)
    const case7 = checkDuplicate({ brandName: 'Canva', name: 'Paracetamol 10mg' }, inventory);
    assert.equal(case7.type, 'UNIQUE');

    // Canva + Asprin 10mg => WARN (NEAR_DUPLICATE)
    const case8 = checkDuplicate({ brandName: 'Canva', name: 'Asprin 10mg' }, inventory);
    assert.equal(case8.type, 'NEAR_DUPLICATE');

    // Canvaa + Aspirin 10mg => WARN (NEAR_DUPLICATE)
    const case9 = checkDuplicate({ brandName: 'Canvaa', name: 'Aspirin 10mg' }, inventory);
    assert.equal(case9.type, 'NEAR_DUPLICATE');
});

test('Expiry Date Field Validation & Short-Dated Stock Warning Tiers', () => {
    // Reference date: Today = 09/28/2026
    const refToday = new Date('2026-09-28T00:00:00');

    // --- Table Test Cases ---

    // 1. 09/28/2026 (0 days) -> Tier 1 TODAY warning
    const warnToday = getShortDatedWarning('09/28/2026', refToday);
    assert.deepEqual(warnToday, {
        tier: 'TODAY',
        severity: 'high',
        daysRemaining: 0,
        message: '⚠️ This medicine expires TODAY. Are you sure you want to add it?'
    });
    const resToday = validateExpiryDate('09/28/2026', refToday);
    assert.equal(resToday.valid, true);
    assert.equal(resToday.warningType, 'TODAY');

    // 2. 09/29/2026 (1 day) -> Tier 2 CRITICAL warning
    const warn1Day = getShortDatedWarning('09/29/2026', refToday);
    assert.deepEqual(warn1Day, {
        tier: 'CRITICAL',
        severity: 'high',
        daysRemaining: 1,
        message: '⚠️ This medicine expires in 1 day. This is very short-dated stock. Are you sure?'
    });

    // 3. 10/01/2026 (3 days) -> Tier 2 CRITICAL warning
    const warn3Days = getShortDatedWarning('10/01/2026', refToday);
    assert.deepEqual(warn3Days, {
        tier: 'CRITICAL',
        severity: 'high',
        daysRemaining: 3,
        message: '⚠️ This medicine expires in 3 days. This is very short-dated stock. Are you sure?'
    });

    // 4. 10/04/2026 (6 days) -> Tier 2 CRITICAL warning
    const warn6Days = getShortDatedWarning('10/04/2026', refToday);
    assert.deepEqual(warn6Days, {
        tier: 'CRITICAL',
        severity: 'high',
        daysRemaining: 6,
        message: '⚠️ This medicine expires in 6 days. This is very short-dated stock. Are you sure?'
    });

    // 5. 10/05/2026 (7 days) -> Tier 3 WARNING modal
    const warn7Days = getShortDatedWarning('10/05/2026', refToday);
    assert.deepEqual(warn7Days, {
        tier: 'WARNING',
        severity: 'medium',
        daysRemaining: 7,
        message: '⚠️ This medicine expires in 7 days. Add anyway?'
    });

    // 6. 10/15/2026 (17 days) -> Tier 3 WARNING modal
    const warn17Days = getShortDatedWarning('10/15/2026', refToday);
    assert.deepEqual(warn17Days, {
        tier: 'WARNING',
        severity: 'medium',
        daysRemaining: 17,
        message: '⚠️ This medicine expires in 17 days. Add anyway?'
    });

    // 7. 10/28/2026 (30 days) -> Tier 3 WARNING modal
    const warn30Days = getShortDatedWarning('10/28/2026', refToday);
    assert.deepEqual(warn30Days, {
        tier: 'WARNING',
        severity: 'medium',
        daysRemaining: 30,
        message: '⚠️ This medicine expires in 30 days. Add anyway?'
    });

    // 8. 10/29/2026 (31 days) -> Tier 4 No Warning (null)
    assert.equal(getShortDatedWarning('10/29/2026', refToday), null);
    const res31Days = validateExpiryDate('10/29/2026', refToday);
    assert.equal(res31Days.valid, true);
    assert.equal(res31Days.warning, undefined);

    // 9. 12/31/2026 (94 days) -> Tier 4 No Warning (null)
    assert.equal(getShortDatedWarning('12/31/2026', refToday), null);
    const res94Days = validateExpiryDate('12/31/2026', refToday);
    assert.equal(res94Days.valid, true);
    assert.equal(res94Days.warning, undefined);

    // 10. 09/27/2026 (-1 day) -> Hard validation error (Past date)
    assert.deepEqual(validateExpiryDate('09/27/2026', refToday), {
        valid: false,
        error: 'Expiry date cannot be in the past.'
    });

    // 11. 02/30/2026 (invalid date) -> Hard validation error
    assert.deepEqual(validateExpiryDate('02/30/2026', refToday), {
        valid: false,
        error: 'Please enter a valid date.'
    });

    // 12. 01/01/2040 (> 10 years in future) -> Hard validation error
    assert.deepEqual(validateExpiryDate('01/01/2040', refToday), {
        valid: false,
        error: 'Expiry date is too far in the future. Please check.'
    });

    // 13. (empty) -> Required error
    assert.deepEqual(validateExpiryDate('', refToday), { valid: false, error: 'Expiry date is required.' });
    assert.deepEqual(validateExpiryDate(null, refToday), { valid: false, error: 'Expiry date is required.' });

    // Date formatting & helper check
    assert.equal(formatDate('2026-10-15'), '10/15/2026');
    assert.equal(isShortDated('10/15/2026', refToday).isShort, true);
    assert.equal(isShortDated('10/29/2026', refToday).isShort, false);
});


test('Flexible Selling Unit Configurations & Auto-Calc Rules', () => {
    assert.equal(SELLING_UNITS.length, 8);
    assert.equal(SELLING_UNITS.find(u => u.value === 'PILLS').autoCalc, true);
    assert.equal(SELLING_UNITS.find(u => u.value === 'SACHET').autoCalc, true);
    assert.equal(SELLING_UNITS.find(u => u.value === 'VIAL').autoCalc, true);
    
    assert.equal(SELLING_UNITS.find(u => u.value === 'BOTTLE').autoCalc, false);
    assert.equal(SELLING_UNITS.find(u => u.value === 'TUBE').autoCalc, false);
    assert.equal(SELLING_UNITS.find(u => u.value === 'DROPS').autoCalc, false);
    assert.equal(SELLING_UNITS.find(u => u.value === 'INHALER').autoCalc, false);
    assert.equal(SELLING_UNITS.find(u => u.value === 'CUSTOM').autoCalc, false);

    assert.equal(UnitFieldConfig.PILLS.qtyMax, 1000);
    assert.equal(UnitFieldConfig.BOTTLE.qtyMax, 5000);
    assert.equal(UnitFieldConfig.TUBE.qtyMax, 1000);
    assert.equal(UnitFieldConfig.SACHET.qtyMax, 100);
    assert.equal(UnitFieldConfig.VIAL.qtyMax, 100);
    assert.equal(UnitFieldConfig.DROPS.qtyMax, 5000);
    assert.equal(UnitFieldConfig.INHALER.qtyMax, 500);
});

test('Selling Unit Price Validation & Auto-Formatting', () => {
    assert.equal(validateSellingUnitPrice('250.00', 'Price per Bottle').valid, true);
    assert.equal(formatSellingUnitPrice('250', 'Price per Bottle'), '250.00');

    assert.deepEqual(validateSellingUnitPrice('', 'Price per Bottle'), { valid: false, error: 'Price per Bottle is required.' });
    assert.deepEqual(validateSellingUnitPrice('-10', 'Price per Tube'), { valid: false, error: 'Price per Tube cannot be negative.' });
    assert.deepEqual(validateSellingUnitPrice('0', 'Price per Vial'), { valid: false, error: 'Price per Vial must be greater than 0.' });
    assert.deepEqual(validateSellingUnitPrice('1000001', 'Price per Unit'), { valid: false, error: 'Price per Unit seems too high. Please check.' });
    assert.deepEqual(validateSellingUnitPrice('10.999', 'Price per Unit'), { valid: false, error: 'Price per Unit can have at most 2 decimal places.' });
});

test('Selling Unit Quantity Validation', () => {
    assert.equal(validateSellingUnitQty('100', 'Bottle size', 5000).valid, true);
    assert.equal(validateSellingUnitQty('20', 'Tube weight', 1000).valid, true);
    assert.equal(validateSellingUnitQty('10', 'Sachets per box', 100).valid, true);
    assert.equal(validateSellingUnitQty('5', 'Vials per box', 100).valid, true);
    assert.equal(validateSellingUnitQty('200', 'Puffs per inhaler', 500).valid, true);

    assert.deepEqual(validateSellingUnitQty('101', 'Sachets per box', 100), { valid: false, error: 'Sachets per box seems too high. Please check.' });
    assert.deepEqual(validateSellingUnitQty('0', 'Bottle size', 5000), { valid: false, error: 'Bottle size must be at least 1.' });
    assert.deepEqual(validateSellingUnitQty('10.5', 'Puffs per inhaler', 500), { valid: false, error: 'Puffs per inhaler must be a whole number.' });
    assert.deepEqual(validateSellingUnitQty('010', 'Bottle size', 5000), { valid: false, error: 'Remove leading zeros.' });
});

test('Custom Unit Name Validation', () => {
    assert.equal(validateCustomUnitName('Strip').valid, true);
    assert.equal(validateCustomUnitName('Packet (Large)').valid, true);

    assert.deepEqual(validateCustomUnitName(''), { valid: false, error: 'Unit name is required.' });
    assert.deepEqual(validateCustomUnitName('A'), { valid: false, error: 'Unit name must be at least 2 characters.' });
    assert.deepEqual(validateCustomUnitName('123'), { valid: false, error: 'Unit name must contain at least one letter.' });
    assert.deepEqual(validateCustomUnitName('Strip@Box'), { valid: false, error: 'Unit name contains invalid characters.' });
});
