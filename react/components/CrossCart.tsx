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
  salesChannel: string
}

const CrossCart: FC<Props> = ({ userId, isAutomatic, strategy, showToast, userType,
    salesChannel }) => {
  const {
    orderForm,
    initialFetchComplete,
    setOrderForm
  } = useOrderForm() as OrderFormContext
  const uniqueUserId = `${userId}_SC${salesChannel}`;
  const { rootPath = '' } = useRuntime()

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
    fetchPolicy: 'no-cache',
  })

  const [saveCurrentCart] = useMutation<Success, NewCrossCart>(SAVE_ID_BY_USER)

  const [replaceCart, { error, loading: mutationLoading }] = useMutation<
    NewOrderForm | null,
    ReplaceCartVariables
  >(MUTATE_CART)
  
  useEffect(() => {
    
    if (!userId || !salesChannel) return
     console.log(uniqueUserId, "uniqueUserId")
    getSavedCart({
      variables: {
        userId: uniqueUserId,
        nullOnEmpty: !isAutomatic,
        userType
      },
    })
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderForm.id, uniqueUserId, userId])
  console.log(initialFetchComplete, userId, orderForm.id, orderForm.items.length,"fuera de useeffect")
  useEffect(() => {
    console.log("entro a useEffect 1")
  if (!initialFetchComplete) return
 console.log("entro a useEffect")
  const handleVisibilityChange = async () => {
    console.log("entro handleVisilityChange")
    if (document.visibilityState !== 'visible') return
    console.log("entro handleVisilityChange 1")
      try {
        const response = await axios.get(
          insertRootPath(rootPath, `/api/checkout/pub/orderForm/${orderForm.id}`)
        )
        console.log("responsedata",response)
        const updatedOrderForm = response.data
        if (updatedOrderForm.items.length > orderForm.items.length) {
          console.log("entre if")
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
  }, [initialFetchComplete, userId, orderForm.id, orderForm.items.length])
  const handleDeclineMerge = async () => {
    challengeActive && setChallenge(false)

    await saveCurrentCart({
      variables: {
        userId: uniqueUserId,
        orderFormId: hasItems ? orderForm.id : null,
        userType
      },
    })
  }

  const handleMerge = async () => {
    console.log("entro a handle merge")
    if (!data?.id || hasMerged) return
    console.log("entro2 a handle merge")
    const isUnion = orderForm.items.length > 0
    setRecoveryType(isUnion ? 'unir' : 'retomar')
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
        userId: uniqueUserId,
        nullOnEmpty: !isAutomatic,
        userType,
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
       if (!initialFetchComplete) return 
      saveCurrentCart({
        variables: {
          userId: uniqueUserId,
          orderFormId: hasItems ? orderForm.id : null,
          userType
        },
      })

      return
    }

    const equalCarts = crossCart === orderForm.id
    
    if (!equalCarts) {
      if (!isAutomatic) {
        setChallenge(true)
      } else {
        handleMerge()
      }
      return
    }

    if (!hasItems && !isAutomatic) {
      
      setTimeout(() => {
        if (!orderForm.items.length) { 
          saveCurrentCart({
            variables: { userId, orderFormId: null, userType },
          })
        }
      }, 2000)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, data, hasItems, initialFetchComplete, orderForm.id, uniqueUserId])

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
