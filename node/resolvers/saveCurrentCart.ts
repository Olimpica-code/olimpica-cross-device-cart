import { APP_NAME } from '../constants'
import {
  commercialBucketFromSalesChannel,
  vbaseKeyCrossDeviceCart,
} from '../utils/commercialBucket'

/**
 * Store an OrderForm ID reference for a specific user, por bucket de salesChannel
 * (canal 5 separado; canal 1, default y vacío comparten bucket).
 */
export const saveCurrentCart = async (
  _: any,
  {
    userId,
    orderFormId,
    userType,
    salesChannel,
  }: {
    userId: string
    orderFormId: string | null
    userType: string
    salesChannel?: string | null
  },
  { clients: { vbase, checkoutIO } }: Context
): Promise<string> => {
  if (userType === 'CALL_CENTER_OPERATOR') {
    return 'Not saved is call center operator'
  }

  let effectiveChannel: string | null | undefined = salesChannel ?? undefined

  if (orderFormId) {
    try {
      const fromOrder = await checkoutIO.getOrderFormSalesChannel(orderFormId)
      effectiveChannel = fromOrder ?? salesChannel ?? undefined
    } catch {
      /* Si checkout-graphql no expone salesChannel o falla, usar el canal enviado por el cliente */
      effectiveChannel = salesChannel ?? undefined
    }
  }

  const key = vbaseKeyCrossDeviceCart(userId, effectiveChannel)

  await vbase.saveJSON(APP_NAME, key, orderFormId)

  if (commercialBucketFromSalesChannel(effectiveChannel) === '1') {
    const legacy = await vbase.getJSON(APP_NAME, userId, true)
    if (legacy !== null && legacy !== undefined) {
      await vbase.saveJSON(APP_NAME, userId, null)
    }
  }

  return 'success'
}
