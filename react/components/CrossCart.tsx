import React, { FC, useEffect, useState } from 'react'
import { useLazyQuery, useMutation } from 'react-apollo'
import { useIntl } from 'react-intl'
import { useRuntime } from 'vtex.render-runtime'
import { useOrderForm } from 'vtex.order-manager/OrderForm'
import axios from 'axios'

import GET_ID_BY_USER from '../graphql/getSavedCart.gql'
import SAVE_ID_BY_USER from '../graphql/saveCurrentCart.gql'
import MUTATE_CART from '../graphql/replaceCart.gql'
import ChallengeBlock from './ChallengeBlock'
import CartRecoveredBanner from './CartRecoveredBanner'
import insertRootPath from '../utils/insertRootPath'

interface Props {
  userId: string
  isAutomatic: boolean
  showToast: (toast: ToastParam) => void
  strategy: Strategy
  userType: string
}

const CrossCart: FC<Props> = ({ userId, isAutomatic, strategy, showToast, userType }) => {
  const {
    orderForm,
    initialFetchComplete,
    setOrderForm,
  } = useOrderForm() as OrderFormContext

  const { rootPath = '' } = useRuntime()

  const [hasMerged, setMergeStatus] = useState(false)
  const [challengeActive, setChallenge] = useState(false)
  const [recoveredBannerVisible, setRecoveredBannerVisible] = useState(false)
  const intl = useIntl()

  const hasItems = orderForm.items.length
  const salesChannel = orderForm.salesChannel

  const [getSavedCart, { data, loading }] = useLazyQuery<
    CrossCartData,
    CrossCartVars
  >(GET_ID_BY_USER, {
    fetchPolicy: 'no-cache',
  })

  const [saveCurrentCart] = useMutation<Success, NewCrossCart>(SAVE_ID_BY_USER)

  const [replaceCart, { error, loading: mutationLoading }] = useMutation<
    NewOrderForm | null,
    ReplaceCartVariables
  >(MUTATE_CART)

  /* No esperar initialFetchComplete ni orderForm.id: si no, data queda undefined y el otro effect nunca guarda referencia */
  useEffect(() => {
    if (!userId) return

    getSavedCart({
      variables: {
        userId,
        nullOnEmpty: !isAutomatic,
        userType,
        salesChannel: salesChannel ?? undefined,
      },
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, isAutomatic, userType, salesChannel])

  const handleDeclineMerge = async () => {
    challengeActive && setChallenge(false)

    await saveCurrentCart({
      variables: {
        userId,
        orderFormId: hasItems ? orderForm.id : null,
        userType,
        salesChannel: salesChannel ?? undefined,
      },
    })
  }

  const handleMerge = async () => {
    if (!data?.id || hasMerged) return

    setMergeStatus(true)

    const mutationResult = await replaceCart({
      variables: {
        currentCart: orderForm.id,
        savedCart: data.id,
        strategy,
        userType
      },
    })

    if (error || !mutationResult.data || !mutationResult.data.newOrderForm) {
      error && console.error(error)

      showToast({
        message: intl.formatMessage({ id: 'store/crossCart.toast.error' }),
      })

      return
    }

    try {
      const orderFormURLWithRootPath = insertRootPath(
        rootPath,
        `/api/checkout/pub/orderForm/${data.id}`
      )

      await axios.post(
        orderFormURLWithRootPath,
        {},
        {
          headers: {
            'set-cookie': `checkout.vtex.com=__ofid=${data.id}`,
          },
        }
      )
    } catch (e) {
      challengeActive && setChallenge(false)

      showToast({
        message: intl.formatMessage({ id: 'store/crossCart.toast.error' }),
      })

      return
    }

    const { newOrderForm } = mutationResult.data

    setOrderForm(newOrderForm)

    challengeActive && setChallenge(false)

    setRecoveredBannerVisible(true)

    getSavedCart({
      variables: {
        userId,
        nullOnEmpty: !isAutomatic,
        userType,
        salesChannel: salesChannel ?? undefined,
      },
    })
  }

  useEffect(() => {
    if (
      loading ||
      !data ||
      !initialFetchComplete ||
      orderForm?.id === 'default-order-form'
    )
      return

    const crossCart = data?.id !== 'default-order-form' && data?.id

    if (!crossCart) {
      saveCurrentCart({
        variables: {
          userId,
          orderFormId: orderForm.id,
          userType,
          salesChannel: salesChannel ?? undefined,
        },
      })

      return
    }

    const equalCarts = crossCart === orderForm.id

    if (!equalCarts) {
      !isAutomatic && setChallenge(true)
      isAutomatic && handleMerge()

      return
    }

    if (!hasItems && !isAutomatic) {
      saveCurrentCart({
        variables: {
          userId,
          orderFormId: null,
          userType,
          salesChannel: salesChannel ?? undefined,
        },
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- saveCurrentCart / handleMerge omitidos a propósito (evitar bucles)
  }, [
    loading,
    data,
    hasItems,
    initialFetchComplete,
    orderForm.id,
    salesChannel,
    userId,
    userType,
    isAutomatic,
  ])

  return (
    <>
      {recoveredBannerVisible && (
        <CartRecoveredBanner onDismiss={() => setRecoveredBannerVisible(false)} />
      )}
      {challengeActive && !isAutomatic && (
        <ChallengeBlock
          handleAccept={handleMerge}
          handleDecline={handleDeclineMerge}
          mutationLoading={mutationLoading}
        />
      )}
    </>
  )
}

export { CrossCart }
