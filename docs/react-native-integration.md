# Integracion React Native (Cross Device Cart)

Esta guia resume como integrar la app `olimpica.cross-device-cart` desde React Native.

## Estado actual validado

- El flujo base esta operativo para usuarios logueados.
- APIs disponibles: `getSavedCart`, `saveCurrentCart`, `replaceCart`, `getAppSettings`.
- Persistencia actual: una referencia de carrito por `userId` en VBase.
- Filtro actual por `userType`: si es `CALL_CENTER_OPERATOR`, no guarda ni recupera.
- Nota: en el estado actual del repo, la separacion por `salesChannel` no esta aplicada en schema/resolvers.

## Endpoint unico (GraphQL privado VTEX)

Usa siempre este endpoint:

`POST https://{workspace}--{account}.myvtex.com/_v/private/graphql/v1?app=olimpica.cross-device-cart@0.1.0`

Ejemplo:

`https://harm5--olimpica.myvtex.com/_v/private/graphql/v1?app=olimpica.cross-device-cart@0.1.0`

### Headers requeridos

- `Content-Type: application/json`
- `Accept: application/json`
- `VtexIdclientAutCookie: <token-usuario-logueado>`
- `X-Vtex-Use-Https: true`

## APIs necesarias para mobile

### 1) Obtener settings del app

Se recomienda leerlo al iniciar para saber modo y estrategia.

```graphql
query getAppSettings {
  settings: getAppSettings {
    isAutomatic
    strategy
  }
}
```

### 2) Consultar carrito guardado por usuario

```graphql
query getSavedCart($userId: String!, $nullOnEmpty: Boolean, $userType: String) {
  id: getSavedCart(userId: $userId, nullOnEmpty: $nullOnEmpty, userType: $userType)
}
```

Variables ejemplo:

```json
{
  "userId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "nullOnEmpty": true,
  "userType": "STORE_USER"
}
```

### 3) Guardar referencia del carrito actual

```graphql
mutation saveCurrentCart($userId: String!, $orderFormId: String, $userType: String) {
  saveCurrentCart(userId: $userId, orderFormId: $orderFormId, userType: $userType)
}
```

Variables ejemplo:

```json
{
  "userId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "orderFormId": "f7b6f0e5-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "userType": "STORE_USER"
}
```

Para limpiar referencia, enviar `"orderFormId": null`.

### 4) Recuperar/combinar carrito

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

Variables ejemplo:

```json
{
  "savedCart": "saved-orderform-id",
  "currentCart": "current-orderform-id",
  "strategy": "REPLACE",
  "userType": "STORE_USER"
}
```

`strategy` soporta: `REPLACE`, `ADD`, `COMBINE`.

## Flujo recomendado en React Native (MVP)

1. Login usuario y obtener `userId`.
2. Llamar `getAppSettings`.
3. Llamar `getSavedCart(userId, nullOnEmpty = !isAutomatic, userType)`.
4. Si viene `id` y es distinto al carrito actual:
   - Modo automatico: `replaceCart`.
   - Modo manual: mostrar CTA "Continuar carrito".
5. Si usuario rechaza: `saveCurrentCart` con carrito actual (o `null` si vacio).
6. Si acepta: `replaceCart` y refrescar estado local con `newOrderForm`.

## Archivo Postman

Coleccion lista para importar:

`postman/olimpica-cross-device-cart.postman_collection.json`
