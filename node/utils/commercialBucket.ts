/**
 * Normaliza el salesChannel del orderForm a un bucket de persistencia.
 * - Canal "5" → bucket propio (ej. política comercial / binding distinto).
 * - "1", vacío, "default" u otro valor → mismo bucket (tradicional + default).
 */
export function commercialBucketFromSalesChannel(
  salesChannel: string | null | undefined
): '1' | '5' {
  const raw = (salesChannel ?? '').trim().toLowerCase()
  if (raw === '5') return '5'
  if (raw === 'default' || raw === '' || raw === '1') return '1'
  return '1'
}

export function vbaseKeyCrossDeviceCart(
  userId: string,
  salesChannel: string | null | undefined
): string {
  const bucket = commercialBucketFromSalesChannel(salesChannel)
  return `${userId}__xcb_${bucket}`
}
