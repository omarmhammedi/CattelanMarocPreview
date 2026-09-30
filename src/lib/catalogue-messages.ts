interface CatalogueFailure { code?: string; message?: string; }
interface CatalogueErrorLabels { error?: string; unavailable?: string; }

const recoveryCodes = new Set(['RATE_LIMITED', 'INVALID_REQUEST', 'INVALID_SOURCE', 'REQUEST_CONFLICT', 'ORIGIN_REJECTED']);

/** Keep editorial error copy, except when the API gives a specific recovery action. */
export function catalogueFailureMessage(failure: CatalogueFailure | undefined, labels: CatalogueErrorLabels): string {
  if (failure?.code === 'CATALOGUE_UNAVAILABLE') return labels.unavailable || labels.error || failure.message || '';
  if (failure?.code && recoveryCodes.has(failure.code) && failure.message) return failure.message;
  return labels.error || failure?.message || '';
}
