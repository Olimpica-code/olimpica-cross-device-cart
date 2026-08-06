# Cross Device Cart

App de VTEX IO para persistir y recuperar el carrito de compras entre dispositivos o sesiones.

## Resumen

La app guarda una referencia del carrito por usuario y la recupera cuando el cliente vuelve a autenticarse desde otro dispositivo o una nueva sesion. El comportamiento puede ser automatico o manual, y soporta distintas estrategias para resolver el merge del carrito.

## Funcionalidades

- Guarda la referencia del carrito en VBase.
- Recupera el carrito del usuario al iniciar sesion.
- Permite recuperar, agregar o combinar items.
- Puede funcionar en modo automatico o manual.
- Muestra un banner de confirmacion o recuperacion en storefront.
- Incluye panel de administracion para ajustar el comportamiento.

## Como funciona

1. El usuario inicia sesion.
2. La app obtiene sus settings globales.
3. Busca el carrito guardado para ese usuario.
4. Si existe un carrito distinto al actual:
   - en modo automatico, ejecuta la recuperacion;
   - en modo manual, muestra una barra de accion.
5. Si el usuario rechaza la accion, se mantiene la referencia del carrito actual.
6. Si el usuario acepta, se ejecuta el merge y se actualiza el order form.

## Datos que persiste

- Referencia del carrito por usuario en VBase.
- Settings de la app en VBase.

## Integraciones y dependencias

- `vtex.session-client`
- `vtex.order-manager`
- `vtex.checkout-graphql`
- `vtex.render-runtime`
- `vtex.styleguide`
- `vtex.css-handles`
- `vtex.device-detector`
- `vtex.pixel-manager`

## Estructura del proyecto

- `react/`: componente de tienda, banner y panel admin.
- `node/`: resolvers, eventos y logica de backend.
- `admin/`: ruta y navegacion del panel.
- `docs/`: guia de integracion para React Native.
- `public/metadata/`: metadatos y licencias.

### react/components

La carpeta `react/components` contiene el flujo visual principal de la app:

- `SessionWrapper.tsx`: obtiene la sesion, valida que el usuario este autenticado, carga los settings y monta el flujo principal.
- `CrossCart.tsx`: orquesta la logica central; consulta el carrito guardado, ejecuta el merge, sincroniza el order form y muestra notificaciones.
- `ChallengeBlock.tsx`: barra manual de confirmacion para aceptar o rechazar la recuperacion del carrito.
- `CartRecoveredBanner.tsx`: banner de confirmacion cuando el carrito fue recuperado o combinado; tambien dispara la apertura del minicart.
- `CartRecoveredBanner.css`: estilos especificos del banner.
- `admin/AdminPanel.tsx`: interfaz de administracion para cambiar modo automatico/manual y la estrategia de merge.

En conjunto, estos componentes separan la experiencia de autenticacion, recuperacion, confirmacion y feedback visual.

## Configuracion

### 1. Instalar la app

Instala la app en tu cuenta VTEX IO y agregala como peer dependency en el `manifest.json` del theme:

```json
"peerDependencies": {
  "vtex.cross-device-cart": "1.x"
}
```

### 2. Agregar el bloque en el header

Agrega el bloque `cross-device-cart` como hijo del header en desktop y mobile:

```json
"header-layout.desktop": {
  "children": [
    "cross-device-cart"
  ]
}
```

```json
"header-layout.mobile": {
  "children": [
    "cross-device-cart"
  ]
}
```

## Panel de administracion

Rutas disponibles:

- `/admin/cross-device-cart`
- `/admin/app/cross-device-cart`

Desde ahi puedes configurar:

- **Automatico**: el carrito se recupera sin pedir accion al usuario.
- **Manual**: se muestra una barra de confirmacion para aceptar o rechazar.
- **Estrategias de merge**:
  - `REPLACE`: reemplaza el carrito actual con el guardado.
  - `ADD`: agrega items faltantes.
  - `COMBINE`: combina cantidades de items coincidentes.

## Flujo tecnico

### Backend

- `getAppSettings`: devuelve la configuracion guardada o los valores por defecto.
- `getSavedCart`: devuelve el `orderFormId` guardado para el usuario.
- `saveCurrentCart`: persiste la referencia del carrito actual.
- `replaceCart`: obtiene el carrito guardado y lo aplica sobre el carrito actual segun la estrategia.

### Evento

- `updateOnCreatedOrder`: limpia la referencia del carrito cuando se crea una orden asociada al mismo `orderFormId`.

### Reglas importantes

- Los usuarios `CALL_CENTER_OPERATOR` no guardan ni recuperan carrito.
- Si el carrito guardado esta vacio y `nullOnEmpty` es verdadero, `getSavedCart` devuelve `null`.
- Al finalizar una compra, la app genera un nuevo carrito y vuelve a guardar la referencia.

## API GraphQL

### Consultar settings

```graphql
query getAppSettings {
  settings: getAppSettings {
    isAutomatic
    strategy
  }
}
```

### Consultar carrito guardado

```graphql
query getSavedCart($userId: String!, $nullOnEmpty: Boolean, $userType: String) {
  id: getSavedCart(userId: $userId, nullOnEmpty: $nullOnEmpty, userType: $userType)
}
```

### Guardar carrito actual

```graphql
mutation saveCurrentCart($userId: String!, $orderFormId: String, $userType: String) {
  saveCurrentCart(userId: $userId, orderFormId: $orderFormId, userType: $userType)
}
```

### Recuperar o combinar carrito

```graphql
mutation replaceCart(
  $savedCart: String!
  $currentCart: String!
  $strategy: Strategy!
  $userType: String
) {
  newOrderForm: replaceCart(
    savedCart: $savedCart
    currentCart: $currentCart
    strategy: $strategy
    userType: $userType
  )
}
```

## Integracion React Native

La guia tecnica esta en:

- `docs/react-native-integration.md`

## Scripts utiles

```bash
yarn lint
yarn test
```

## Notas operativas

- El flujo esta pensado para usuarios autenticados.
- El carrito puede variar segun `salesChannel`.
- El banner de recuperacion se muestra cuando se detecta un cambio de carrito o una fusion exitosa.
