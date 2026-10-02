/**
 * Returns the adaptive display configuration (Price Line, Pack Line, Buttons)
 * based on the medicine's selling unit.
 */
export function getDisplayConfig(med = {}) {
    const sellingUnit = (med.sellingUnit || med.SellingUnit || 'PILLS').toUpperCase();

    switch (sellingUnit) {
        case 'PILLS': {
            const unitPrice = Number(med.unitPrice ?? med.price ?? 0);
            const pillsInCard = Number(med.pillsInCard ?? med.pillsPerCard ?? 10);
            const oneCardPrice = Number(med.oneCardPrice ?? med.cardPrice ?? (unitPrice * pillsInCard));
            return {
                sellingUnit: 'PILLS',
                priceLine: `Rs. ${unitPrice.toFixed(2)} / pill`,
                packLine: `Card (${pillsInCard} pills): Rs. ${oneCardPrice.toFixed(2)}`,
                unitPrice,
                packPrice: oneCardPrice,
                buttons: [
                    { label: '+ Pill', unitType: 'Pill', qty: 1, isPack: false, price: unitPrice },
                    { label: '+ Card', unitType: 'Card', qty: pillsInCard, isPack: true, price: oneCardPrice }
                ]
            };
        }
        case 'BOTTLE': {
            const pricePerBottle = Number(med.pricePerBottle ?? med.price ?? 0);
            const bottleSize = Number(med.bottleSize ?? 100);
            return {
                sellingUnit: 'BOTTLE',
                priceLine: `Rs. ${pricePerBottle.toFixed(2)} / bottle`,
                packLine: `Size: ${bottleSize} ml`,
                unitPrice: pricePerBottle,
                buttons: [
                    { label: '+ Bottle', unitType: 'Bottle', qty: 1, isPack: false, price: pricePerBottle }
                ]
            };
        }
        case 'TUBE': {
            const pricePerTube = Number(med.pricePerTube ?? med.price ?? 0);
            const tubeWeight = Number(med.tubeWeight ?? 20);
            return {
                sellingUnit: 'TUBE',
                priceLine: `Rs. ${pricePerTube.toFixed(2)} / tube`,
                packLine: `Weight: ${tubeWeight} g`,
                unitPrice: pricePerTube,
                buttons: [
                    { label: '+ Tube', unitType: 'Tube', qty: 1, isPack: false, price: pricePerTube }
                ]
            };
        }
        case 'SACHET': {
            const pricePerSachet = Number(med.pricePerSachet ?? med.price ?? 0);
            const sachetsPerBox = Number(med.sachetsPerBox ?? 10);
            const boxPrice = Number(med.boxPrice ?? (pricePerSachet * sachetsPerBox));
            return {
                sellingUnit: 'SACHET',
                priceLine: `Rs. ${pricePerSachet.toFixed(2)} / sachet`,
                packLine: `Box (${sachetsPerBox} sachets): Rs. ${boxPrice.toFixed(2)}`,
                unitPrice: pricePerSachet,
                packPrice: boxPrice,
                buttons: [
                    { label: '+ Sachet', unitType: 'Sachet', qty: 1, isPack: false, price: pricePerSachet },
                    { label: '+ Box', unitType: 'Box', qty: sachetsPerBox, isPack: true, price: boxPrice }
                ]
            };
        }
        case 'VIAL': {
            const pricePerVial = Number(med.pricePerVial ?? med.price ?? 0);
            const vialsPerBox = Number(med.vialsPerBox ?? 5);
            const boxPrice = Number(med.boxPrice ?? (pricePerVial * vialsPerBox));
            return {
                sellingUnit: 'VIAL',
                priceLine: `Rs. ${pricePerVial.toFixed(2)} / vial`,
                packLine: `Box (${vialsPerBox} vials): Rs. ${boxPrice.toFixed(2)}`,
                unitPrice: pricePerVial,
                packPrice: boxPrice,
                buttons: [
                    { label: '+ Vial', unitType: 'Vial', qty: 1, isPack: false, price: pricePerVial },
                    { label: '+ Box', unitType: 'Box', qty: vialsPerBox, isPack: true, price: boxPrice }
                ]
            };
        }
        case 'DROPS': {
            const pricePerBottle = Number(med.pricePerBottle ?? med.price ?? 0);
            const volumeMl = Number(med.volumeMl ?? 10);
            return {
                sellingUnit: 'DROPS',
                priceLine: `Rs. ${pricePerBottle.toFixed(2)} / bottle`,
                packLine: `Volume: ${volumeMl} ml`,
                unitPrice: pricePerBottle,
                buttons: [
                    { label: '+ Bottle', unitType: 'Bottle', qty: 1, isPack: false, price: pricePerBottle }
                ]
            };
        }
        case 'INHALER': {
            const pricePerInhaler = Number(med.pricePerInhaler ?? med.price ?? 0);
            const puffsPerInhaler = Number(med.puffsPerInhaler ?? 200);
            return {
                sellingUnit: 'INHALER',
                priceLine: `Rs. ${pricePerInhaler.toFixed(2)} / inhaler`,
                packLine: `Puffs: ${puffsPerInhaler}`,
                unitPrice: pricePerInhaler,
                buttons: [
                    { label: '+ Inhaler', unitType: 'Inhaler', qty: 1, isPack: false, price: pricePerInhaler }
                ]
            };
        }
        case 'CUSTOM': {
            const unitName = med.unitName || med.UnitName || 'Unit';
            const pricePerUnit = Number(med.pricePerUnit ?? med.price ?? 0);
            return {
                sellingUnit: 'CUSTOM',
                priceLine: `Rs. ${pricePerUnit.toFixed(2)} / ${unitName.toLowerCase()}`,
                packLine: '',
                unitPrice: pricePerUnit,
                buttons: [
                    { label: `+ ${unitName}`, unitType: unitName, qty: 1, isPack: false, price: pricePerUnit }
                ]
            };
        }
        default: {
            const unitPrice = Number(med.unitPrice ?? med.price ?? 0);
            const pillsInCard = Number(med.pillsInCard ?? med.pillsPerCard ?? 10);
            const oneCardPrice = Number(med.oneCardPrice ?? med.cardPrice ?? (unitPrice * pillsInCard));
            return {
                sellingUnit: 'PILLS',
                priceLine: `Rs. ${unitPrice.toFixed(2)} / pill`,
                packLine: `Card (${pillsInCard} pills): Rs. ${oneCardPrice.toFixed(2)}`,
                unitPrice,
                packPrice: oneCardPrice,
                buttons: [
                    { label: '+ Pill', unitType: 'Pill', qty: 1, isPack: false, price: unitPrice },
                    { label: '+ Card', unitType: 'Card', qty: pillsInCard, isPack: true, price: oneCardPrice }
                ]
            };
        }
    }
}
