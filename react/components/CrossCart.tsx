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
  userType: string,
  salesChannel: string
}

const CrossCart: FC<Props> = ({ userId, isAutomatic, strategy, showToast, userType, salesChannel }) => {
  const {
    orderForm,
    initialFetchComplete,
    setOrderForm,
  } = useOrderForm() as OrderFormContext
  const uniqueUserId = `${userId}_SC${salesChannel}`;
 const { rootPath = '', page } = useRuntime()

  const [hasMerged, setMergeStatus] = useState(false)
  const [challengeActive, setChallenge] = useState(false)
  const [recoveredBannerVisible, setRecoveredBannerVisible] = useState(false)
  const [recoveryType, setRecoveryType] = useState<'retomar' | 'unir'>('retomar')
  const intl = useIntl()

  const hasItems = orderForm.items.length
  
  const [getSavedCart, { data, loading }] = useLazyQuery<
    CrossCartData,
    CrossCartVars
  >(GET_ID_BY_USER, {
    fetchPolicy: 'no-cache'
  })
  
  const [saveCurrentCart] = useMutation<Success, NewCrossCart>(SAVE_ID_BY_USER)

  const [replaceCart, { error, loading: mutationLoading }] = useMutation<
    NewOrderForm | null,
    ReplaceCartVariables
  >(MUTATE_CART)
  
  useEffect(() => {
    if (page !== 'store.orderplaced') return

    const cleanAndRenewCart = async () => {
        try {
            const response = await fetch(
                insertRootPath(rootPath, '/api/checkout/pub/orderForm?forceNewCart=true')
            )
            const newOrderForm = await response.json()
            
            await saveCurrentCart({
                variables: {
                    userId: uniqueUserId,
                    orderFormId: newOrderForm.id,
                    userType,
                },
            })

          
          setOrderForm(newOrderForm)

        } catch (e) {
            console.error('[ERROR RENEWING CART]', e)
        }
    }

    cleanAndRenewCart()


  }, [page])
  useEffect(() => {
    if (!initialFetchComplete || !uniqueUserId) return
    const handleVisibilityChange = async () => {
    if (document.visibilityState !== 'visible') return
    try {
        const response = await axios.get(
          insertRootPath(rootPath, `/api/checkout/pub/orderForm/${orderForm.id}`)
        )
        const updatedOrderForm = response.data
        if (updatedOrderForm.items.length > orderForm.items.length) {
          setOrderForm(updatedOrderForm)
          setRecoveryType('retomar')
          setRecoveredBannerVisible(true)
        }
      } catch (e) {
        console.error('Error al refrescar orderForm:', e)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleVisibilityChange)
    }
  }, [initialFetchComplete, uniqueUserId, orderForm.id, orderForm.items.length])
  
  useEffect(() => {
    if (page === 'store.orderplaced') return
    getSavedCart({
      variables: {
        userId:uniqueUserId,
        nullOnEmpty: !isAutomatic,
        userType
      },
    })
  }, [uniqueUserId])
  
  const handleDeclineMerge = async () => {
    challengeActive && setChallenge(false)

    await saveCurrentCart({
      variables: {
        userId:uniqueUserId,
        orderFormId: hasItems ? orderForm.id : null,
        userType
      },
    })
  }

  const handleMerge = async () => {
    if (!data?.id || hasMerged) return

    const preMergeOrderFormId = orderForm.id
    const preMergeItemIds = new Set(orderForm.items.map(i => i.id))
    const isUnion = orderForm.items.length > 0
    const arrItems = orderForm?.items ?? [];
    const isArrastrandoCarroDeOtraTienda = arrItems.some(() => {
      
      if (String(salesChannel) === "5" ) return true;
      if (String(salesChannel) === "1" ) return true; 
      return false;
    });

    const finalRecoveryType = isArrastrandoCarroDeOtraTienda ? 'retomar' : (isUnion ? 'unir' : 'retomar');
    const finalStrategy = isArrastrandoCarroDeOtraTienda ? 'COMBINE' : strategy;
    
    setRecoveryType(finalRecoveryType)
    setMergeStatus(true)

    const mutationResult = await replaceCart({
      variables: {
        currentCart: orderForm.id,
        savedCart: data.id,
        strategy: finalStrategy,
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
    let { newOrderForm } = mutationResult.data
    
    try {
      const { data: latestTransientCart } = await axios.get(
        insertRootPath(rootPath, `/api/checkout/pub/orderForm/${preMergeOrderFormId}`)
      )
      const itemsAddedDuringMerge = (latestTransientCart?.items ?? []).filter(
        (item:any) => !preMergeItemIds.has(item.id)
      )

      if (itemsAddedDuringMerge.length > 0) {
        const { data: reconciledOrderForm } = await axios.post(
          insertRootPath(rootPath, `/api/checkout/pub/orderForm/${newOrderForm.id}/items`),
          {
            orderItems: itemsAddedDuringMerge.map((item:any) => ({
              id: item.id,
              seller: item.seller,
              quantity: item.quantity,
            })),
          }
        )
        newOrderForm = reconciledOrderForm
      }
    } catch (e) {
      console.error('[ERROR RECONCILIANDO ITEMS AGREGADOS DURANTE EL MERGE]', e)
    }
    setOrderForm(newOrderForm)
    challengeActive && setChallenge(false)

    setRecoveredBannerVisible(true)

    getSavedCart({
      variables: {
        userId:uniqueUserId,
        nullOnEmpty: !isAutomatic,
        userType,
      },
    })
  }

  useEffect(() => {
    if (page === 'store.orderplaced') return
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
          userId: uniqueUserId,
          orderFormId: orderForm.id,
          userType
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
          userId:uniqueUserId,
          orderFormId: null,
          userType
        },
      })
    }
  }, [loading, data, hasItems, initialFetchComplete, orderForm.id])
  
  return (
    <>
      {recoveredBannerVisible && (
        <CartRecoveredBanner 
          onDismiss={() => setRecoveredBannerVisible(false)} 
          type={recoveryType}
        />
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