// Works out a cart from the database's prices and stock, never from what
// the browser sends. Used for the cart page and again when placing the order.

const toPaise = (rupees) => Math.round(rupees * 100);
const toRupees = (paise) => paise / 100;

function problemFor(packSize, quantity) {
  if (!packSize || !packSize.available) return 'This item is no longer sold.';
  if (packSize.stock === 0) return 'Out of stock.';
  if (packSize.stock < quantity) return 'Not enough stock. Please lower the quantity.';
  return null;
}

function toCartLine(packSize, quantity, problem) {
  return {
    packSizeId: packSize.id,
    productId: packSize.productId,
    productName: packSize.productName,
    brand: packSize.brand,
    packLabel: packSize.label,
    categoryName: packSize.categoryName,
    imagePath: packSize.imagePath,
    quantity,
    unitPrice: packSize.price,
    maximumRetailPrice: packSize.maximumRetailPrice,
    lineTotal: toRupees(toPaise(packSize.price) * quantity),
    problem,
  };
}

// Free above the zone's "free delivery above" amount, if it has one.
export function deliveryChargeFor(zone, itemsTotal) {
  if (itemsTotal === 0) return 0;
  if (zone.freeDeliveryAbove !== null && itemsTotal >= zone.freeDeliveryAbove) return 0;
  return zone.deliveryCharge;
}

// items: [{ packSizeId, quantity }]; packSizes: rows from findPackSizesForCart.
// Only lines without a problem count towards the totals.
export function priceCart(items, packSizes, zone) {
  const packSizeById = new Map(packSizes.map((packSize) => [packSize.id, packSize]));
  const lines = [];
  const removedPackSizeIds = [];
  for (const { packSizeId, quantity } of items) {
    const packSize = packSizeById.get(packSizeId);
    if (!packSize) removedPackSizeIds.push(packSizeId);
    else lines.push(toCartLine(packSize, quantity, problemFor(packSize, quantity)));
  }
  const itemsTotalPaise = lines.filter((line) => !line.problem).reduce((sum, line) => sum + toPaise(line.lineTotal), 0);
  const itemsTotal = toRupees(itemsTotalPaise);
  const deliveryCharge = deliveryChargeFor(zone, itemsTotal);
  return {
    lines,
    removedPackSizeIds,
    hasProblems: removedPackSizeIds.length > 0 || lines.some((line) => line.problem),
    itemsTotal,
    deliveryCharge,
    fullDeliveryCharge: zone.deliveryCharge,
    total: toRupees(itemsTotalPaise + toPaise(deliveryCharge)),
    minimumOrderValue: zone.minimumOrderValue,
    freeDeliveryAbove: zone.freeDeliveryAbove,
    meetsMinimum: itemsTotal >= zone.minimumOrderValue,
  };
}
