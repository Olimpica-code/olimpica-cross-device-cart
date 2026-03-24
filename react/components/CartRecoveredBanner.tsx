import React, { FC } from 'react'
import { FormattedMessage } from 'react-intl'
import { ButtonWithIcon, IconClose } from 'vtex.styleguide'

import './CartRecoveredBanner.css'
import { usePixel } from 'vtex.pixel-manager'
import { useCssHandles } from 'vtex.css-handles'
import { useDevice } from 'vtex.device-detector'
import { useRuntime } from 'vtex.render-runtime'

import { OPEN_MINICART_PIXEL_ID } from '../constants/openMinicartPixel'
import insertRootPath from '../utils/insertRootPath'

const CART_ICON_PATH = '/arquivos/shopping_cart_FILL0_wght500_GRAD0_opsz48.svg'

/** Azul marca (mismo tono que “Ver carrito” / icono en diseño Olimpica). */
const BRAND_BLUE = '#005CA9'
const BANNER_RADIUS = '8px'

const messageTextStyle: React.CSSProperties = {
  fontSize: '12px',
  textTransform: 'none',
}

const CSS_HANDLES = [
  'cartRecoveredBanner',
  'cartRecoveredBannerInner',
  'cartRecoveredBannerIcon',
  'cartRecoveredBannerIconImg',
  'cartRecoveredBannerText',
  'cartRecoveredBannerTitle',
  'cartRecoveredBannerSubtitle',
  'cartRecoveredBannerActions',
  'cartRecoveredBannerViewCart',
  'cartRecoveredBannerDismiss',
] as const

interface Props {
  onDismiss: () => void
}

const closeIcon = <IconClose />

const CartRecoveredBanner: FC<Props> = ({ onDismiss }) => {
  const { push } = usePixel()
  const handles = useCssHandles(CSS_HANDLES)
  const { device } = useDevice()
  const { rootPath = '' } = useRuntime()
  const isPhone = device === 'phone'
  const cartIconSrc = insertRootPath(rootPath, CART_ICON_PATH)

  const handleViewCart = () => {
    push({
      id: OPEN_MINICART_PIXEL_ID,
      event: 'addToCart',
      items: [],
    })
    onDismiss()
  }

  return (
    <div
      className={`${handles.cartRecoveredBanner} fixed left-0 right-0 ph4-ns`}
      style={{
        top: isPhone ? '4.5rem' : '5.5rem',
        pointerEvents: 'auto',
        zIndex: 10000,
      }}
    >
      <div
        className={`${handles.cartRecoveredBannerInner} mw7 center bg-base br3 shadow-1 ba b--muted-4 flex items-center justify-around pa3 ph4-ns`}
        style={{
          flexDirection: 'row',
          flexWrap: 'nowrap',
          width: '100%',
          maxWidth: '90%',
          marginLeft: 'auto',
          marginRight: 'auto',
        }}
      >
    <div
      className={`${handles.cartRecoveredBannerIcon} flex items-center justify-center`}
          style={{
            flexShrink: 0,
            minWidth: '2.75rem',
            minHeight: '2.75rem',
            backgroundColor: BRAND_BLUE,
            borderRadius: BANNER_RADIUS,
          }}
        >
          <img
            src={cartIconSrc}
            alt=""
            className={handles.cartRecoveredBannerIconImg}
            style={{
              width: '24px',
              height: '24px',
              objectFit: 'contain',
              display: 'block',
              filter: 'brightness(0) invert(1)',
            }}
            aria-hidden
          />
        </div>
        <div
          className={`${handles.cartRecoveredBannerText} tl pr2 mr1`}
          style={{
            flex: '1 1 auto',
            minWidth: 0,
            paddingLeft: 16,
          }}
        >
          <div
            className={`${handles.cartRecoveredBannerTitle} fw6`}
            style={messageTextStyle}
          >
            <FormattedMessage id="store/crossCart.recovered.title" />
          </div>
          <div
            className={`${handles.cartRecoveredBannerSubtitle} mt1 c-muted-1`}
            style={messageTextStyle}
          >
            <FormattedMessage id="store/crossCart.recovered.subtitle" />
          </div>
        </div>
        <div
          className={`${handles.cartRecoveredBannerActions} flex items-center justify-around ph1`}
          style={{
            flexDirection: 'row',
            flexWrap: 'nowrap',
            flexShrink: 0,
            gap: '0.5rem',
          }}
        >
          <button
            type="button"
            className={handles.cartRecoveredBannerViewCart}
            onClick={handleViewCart}
            style={{
              ...messageTextStyle,
              margin: 0,
              padding: '0.5rem 0.875rem',
              lineHeight: 1.25,
              fontFamily: 'inherit',
              fontWeight: 700,
              cursor: 'pointer',
              WebkitAppearance: 'none',
              appearance: 'none',
              border: `1px solid ${BRAND_BLUE}`,
              backgroundColor: BRAND_BLUE,
              color: '#fff',
              borderRadius: BANNER_RADIUS,
            }}
          >
            <FormattedMessage id="store/crossCart.recovered.viewCart" />
          </button>
          <div className={handles.cartRecoveredBannerDismiss}>
            <ButtonWithIcon
              variation="tertiary"
              size="small"
              icon={closeIcon}
              onClick={onDismiss}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default CartRecoveredBanner
