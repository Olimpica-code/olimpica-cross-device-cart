import { APP_NAME } from '../constants'
import {
  commercialBucketFromSalesChannel,
  vbaseKeyCrossDeviceCart,
} from '../utils/commercialBucket'

/**
 * Listens to the event "order-created" from the broadcaster.
 * If the owner of the order has a cross cart reference stored with
 * the same orderForm ID, we delete it (por bucket de salesChannel + legacy).
 */
export async function updateSavedCartReference(ctx: StatusChangeContext) {
  const {
    body: { orderId, userType },
    vtex: { logger },
    clients: { oms, vbase },
  } = ctx

  if (userType === 'CALL_CENTER_OPERATOR') {
    logger.info({
      message: `Is Call center Operator`,
    })
    return
  }

  try {
    const customerOrder = await oms.order(orderId)

    const {
      orderFormId,
      clientProfileData: { userProfileId },
    } = customerOrder

    const salesChannel =
      (customerOrder as { salesChannel?: string }).salesChannel ?? '1'

    const key = vbaseKeyCrossDeviceCart(userProfileId, salesChannel)
    const crossCartReference: string | null = await vbase.getJSON(
      APP_NAME,
      key,
      true
    )

    if (crossCartReference === orderFormId) {
      await vbase.saveJSON(APP_NAME, key, null)

      logger.info({
        message: `Cross Device Cart reference removed for user ${userProfileId} (key ${key})`,
      })
    }

    if (commercialBucketFromSalesChannel(salesChannel) === '1') {
      const legacyRef: string | null = await vbase.getJSON(
        APP_NAME,
        userProfileId,
        true
      )

      if (legacyRef === orderFormId) {
        await vbase.saveJSON(APP_NAME, userProfileId, null)

        logger.info({
          message: `Cross Device Cart legacy reference removed for user ${userProfileId}`,
        })
      }
    }
  } catch (error) {
    logger.error({
      orderId,
      message: 'There was a problem removing the reference for this order.',
      data: error,
    })
  }
}
