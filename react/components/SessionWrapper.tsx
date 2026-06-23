import React, { FC, useState, useEffect } from 'react'
import { useRenderSession } from 'vtex.session-client'
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
  if (error || loading || !session || orderLoading || !data) {
    console.log("entro")
    return null
  }
  const sessionData = session as any
  const { profile, store } = sessionData.namespaces
  const activeSalesChannel = store?.channel?.value || orderForm?.salesChannel?.toString() || "1"
  const { isAutomatic, strategy } = settings

  const isAuthenticated = profile?.isAuthenticated.value === 'true'

  if (!isAuthenticated) {
    return null
  }
  
  const userId = profile?.id.value
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
