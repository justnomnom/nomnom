/**
 * Decide whether to DEFER the initial viewport (bbox) fetch on the map view.
 *
 * The map emits its real viewport bounds on `onLoad`; that first emit syncs `fetchedBbox`
 * from the Portugal-wide preview bbox to the actual rendered bounds. If we fetch *before*
 * that emit lands, we fetch the stale preview bbox and then immediately refetch once the real
 * bounds arrive — the "searches twice when you open the map" bug. Hold the fetch until either
 * the real bounds have been received, or there is no map at all (no Mapbox token) so no bounds
 * will ever come and the preview bbox is the only thing to fetch against.
 *
 * Pure + dependency-free so it can be unit tested without a React/Mapbox harness.
 *
 * @param {{ homeLocalityReady: boolean, hasReceivedInitialBounds: boolean, hasMapToken: boolean }} args
 * @returns {boolean} true = hold the fetch; false = safe to fetch now
 */
export function shouldDeferInitialBboxFetch({
  homeLocalityReady,
  hasReceivedInitialBounds,
  hasMapToken,
}) {
  // Home locality feeds the sponsor match in the RPC — never fetch before it resolves.
  if (!homeLocalityReady) return true;
  // With a live map, wait for its first real-bounds emit so the single fetch is correct.
  if (hasMapToken && !hasReceivedInitialBounds) return true;
  return false;
}
