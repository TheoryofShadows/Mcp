/**
 * Buyer discoverability: purchasable listings before blocked paid ones.
 * Stable among peers so popular/newest/rating/trending order is preserved.
 *
 * `purchasable !== false` (true, undefined, null) sorts before `=== false`.
 * Free tools are never blocked, so they stay with the purchasable group.
 */
export function sortPurchasableFirst(tools = []) {
  return [...tools].sort((a, b) => {
    const aBlocked = a?.purchasable === false ? 1 : 0;
    const bBlocked = b?.purchasable === false ? 1 : 0;
    return aBlocked - bBlocked;
  });
}
