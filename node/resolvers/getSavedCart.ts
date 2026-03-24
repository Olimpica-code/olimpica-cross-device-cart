import { APP_NAME } from '../constants'
import {
  commercialBucketFromSalesChannel,
  vbaseKeyCrossDeviceCart,
} from '../utils/commercialBucket'

/**
 * Retrieve a previous session OrderForm ID for el mismo bucket de salesChannel.
 */
export const getSavedCart = async (
  _: unknown,
  {
    userId,
    nullOnEmpty,
    userType,
    salesChannel,
  }: {
    userId: string
    nullOnEmpty: boolean
    userType: string
    salesChannel?: string | null
  },
  { clients: { vbase, checkoutIO } }: Context
): Promise<string | null> => {
  if (userType === 'CALL_CENTER_OPERATOR') {
    return null
  }

  const key = vbaseKeyCrossDeviceCart(userId, salesChannel)
  let orderFormId: string | null = await vbase.getJSON(APP_NAME, key, true)

  if (
    !orderFormId &&
    commercialBucketFromSalesChannel(salesChannel) === '1'
  ) {
    orderFormId = await vbase.getJSON(APP_NAME, userId, true)
  }

  if (nullOnEmpty && orderFormId) {
    const savedItems = await checkoutIO.getItems(orderFormId)

    if (!savedItems.length) {
      return null
    }
  }

  return orderFormId
}
