import React, { FC, useState, useEffect } from 'react'
import { SessionSuccess, useRenderSession } from 'vtex.session-client'
import { useOrderForm } from 'vtex.order-manager/OrderForm'
import { ToastConsumer } from 'vtex.styleguide'
import { useQuery } from 'react-apollo'
import { CrossCart } from './CrossCart'
import getAppSettings from '../graphql/getAppSettings.gql'

const SessionWrapper: FC = () => {
  const { loading, session, error } = useRenderSession()
  const { loading: orderLoading, orderForm} = useOrderForm()
  const { userType } = orderForm
 
  const [settings, setAppSettings] = useState({} as AppSettings)
  
  const { data } = useQuery<AppSettingsData>(getAppSettings, {
    ssr: false,
  })
 
  useEffect(() => {
    if (!data) {
      return
    }

    setAppSettings(data.settings)
  }, [data])
  console.log(session,userType,orderLoading,data,"sessionwrapper")
  if (error || loading || !session || orderLoading || !data) {
    console.log("entro")
    return null
  }
  console.log("hola")
  const {
    namespaces: { profile },
  } = session as SessionSuccess

  const { isAutomatic, strategy } = settings

  const isAuthenticated = profile?.isAuthenticated.value === 'true'

  if (!isAuthenticated) {
    return null
  }

  const userId = profile?.id.value
  console.log(userId,"idusuario")
  const getSalesChannelFromCookie = () => {
    try {
      const segmentCookie = document.cookie
        .split('; ')
        .find(row => row.startsWith('vtex_segment='))
        ?.split('=')[1]

      if (segmentCookie) {
        const decoded = JSON.parse(atob(segmentCookie))
        return decoded.channel?.toString()
      }
    } catch (e) {
      console.error('Error al decodificar vtex_segment:', e)
    }
    // Fallback por si la cookie falla: mirar el path
    return window.location.pathname.includes('/flash') ? "5" : "1"
  }
  const activeSalesChannel = getSalesChannelFromCookie()
  return (
    <ToastConsumer>
      {({ showToast }: { showToast: (toast: ToastParam) => void }) => (
        <CrossCart
          showToast={showToast}
          userId={userId}
          isAutomatic={isAutomatic}
          userType={userType}
          strategy={strategy}
          salesChannel={activeSalesChannel}
        />
      )}
    </ToastConsumer>
  )
}

export { SessionWrapper }
