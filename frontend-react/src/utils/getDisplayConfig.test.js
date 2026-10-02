import test from 'node:test';
import assert from 'node:assert/strict';
import { getDisplayConfig } from './getDisplayConfig.js';

test('getDisplayConfig - Case A: Pills / Tablets', () => {
    const med = { sellingUnit: 'PILLS', unitPrice: 100, pillsInCard: 10, oneCardPrice: 1000 };
    const config = getDisplayConfig(med);
    assert.equal(config.priceLine, 'Rs. 100.00 / pill');
    assert.equal(config.packLine, 'Card (10 pills): Rs. 1000.00');
    assert.equal(config.buttons.length, 2);
    assert.equal(config.buttons[0].label, '+ Pill');
    assert.equal(config.buttons[1].label, '+ Card');
});

test('getDisplayConfig - Case B: Bottle / Syrup', () => {
    const med = { sellingUnit: 'BOTTLE', pricePerBottle: 250, bottleSize: 100 };
    const config = getDisplayConfig(med);
    assert.equal(config.priceLine, 'Rs. 250.00 / bottle');
    assert.equal(config.packLine, 'Size: 100 ml');
    assert.equal(config.buttons.length, 1);
    assert.equal(config.buttons[0].label, '+ Bottle');
});

test('getDisplayConfig - Case C: Tube / Cream', () => {
    const med = { sellingUnit: 'TUBE', pricePerTube: 85, tubeWeight: 20 };
    const config = getDisplayConfig(med);
    assert.equal(config.priceLine, 'Rs. 85.00 / tube');
    assert.equal(config.packLine, 'Weight: 20 g');
    assert.equal(config.buttons.length, 1);
    assert.equal(config.buttons[0].label, '+ Tube');
});

test('getDisplayConfig - Case D: Sachet / Powder', () => {
    const med = { sellingUnit: 'SACHET', pricePerSachet: 15, sachetsPerBox: 10, boxPrice: 150 };
    const config = getDisplayConfig(med);
    assert.equal(config.priceLine, 'Rs. 15.00 / sachet');
    assert.equal(config.packLine, 'Box (10 sachets): Rs. 150.00');
    assert.equal(config.buttons.length, 2);
    assert.equal(config.buttons[0].label, '+ Sachet');
    assert.equal(config.buttons[1].label, '+ Box');
});

test('getDisplayConfig - Case E: Injection / Vial', () => {
    const med = { sellingUnit: 'VIAL', pricePerVial: 400, vialsPerBox: 5, boxPrice: 2000 };
    const config = getDisplayConfig(med);
    assert.equal(config.priceLine, 'Rs. 400.00 / vial');
    assert.equal(config.packLine, 'Box (5 vials): Rs. 2000.00');
    assert.equal(config.buttons.length, 2);
    assert.equal(config.buttons[0].label, '+ Vial');
    assert.equal(config.buttons[1].label, '+ Box');
});

test('getDisplayConfig - Case F: Drops', () => {
    const med = { sellingUnit: 'DROPS', pricePerBottle: 120, volumeMl: 10 };
    const config = getDisplayConfig(med);
    assert.equal(config.priceLine, 'Rs. 120.00 / bottle');
    assert.equal(config.packLine, 'Volume: 10 ml');
    assert.equal(config.buttons.length, 1);
    assert.equal(config.buttons[0].label, '+ Bottle');
});

test('getDisplayConfig - Case G: Inhaler', () => {
    const med = { sellingUnit: 'INHALER', pricePerInhaler: 350, puffsPerInhaler: 200 };
    const config = getDisplayConfig(med);
    assert.equal(config.priceLine, 'Rs. 350.00 / inhaler');
    assert.equal(config.packLine, 'Puffs: 200');
    assert.equal(config.buttons.length, 1);
    assert.equal(config.buttons[0].label, '+ Inhaler');
});

test('getDisplayConfig - Case H: Custom Unit', () => {
    const med = { sellingUnit: 'CUSTOM', pricePerUnit: 20, unitName: 'Strip' };
    const config = getDisplayConfig(med);
    assert.equal(config.priceLine, 'Rs. 20.00 / strip');
    assert.equal(config.packLine, '');
    assert.equal(config.buttons.length, 1);
    assert.equal(config.buttons[0].label, '+ Strip');
});
