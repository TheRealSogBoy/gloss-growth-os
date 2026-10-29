# Meta Marketing API · Gloss Growth

MVP de creación desde Work, con llamadas directas a Graph API v26.0. Sin Windsor ni publicación por navegador. Implementado, pendiente de aceptación contra una cuenta real: no hay credenciales de Meta configuradas en esta entrega.

## Alcance

Work interpreta el lenguaje natural y construye un plan JSON revisable. El conector crea una campaña de interacción (`OUTCOME_ENGAGEMENT`), un conjunto optimizado para conversaciones de WhatsApp y hasta diez anuncios de imagen o video. Campaña, conjunto y anuncios se crean `PAUSED` y se leen de nuevo para verificar el estado. No existe comando de activación ni actualización de objetos existentes.

Un objeto PAUSED ya existe en Meta; no es un borrador local de Ads Manager. Las piezas publicitarias se crean mediante `object_story_spec` sin publicar un post orgánico. Meta puede revisar las piezas aunque estén pausadas. El presupuesto diario se configura a nivel conjunto; admite COP, USD, EUR y MXN, en centésimas para la API. El límite `maxDailyMinor` debe definirse por cuenta. La estimación del periodo no es un tope contractual ni una garantía de gasto diario. Para WhatsApp el píxel se muestra como no aplicable; no se ofrece falsamente optimización por conversiones web.

La pantalla `/meta-ads` permite revisar archivos de plan y consultar las cuentas autorizadas de los últimos siete días completos. Requiere login existente y una lista de usuarios autorizados en servidor. No se suman monedas diferentes. Sin tokens muestra conexión pendiente, sin métricas ficticias.

## Lo que solo puede completar el titular en Meta

1. Entrar a [Meta for Developers](https://developers.facebook.com/apps/), crear o identificar la app de negocio y añadir el caso de uso de Marketing API. Asociarla al portafolio empresarial correspondiente.
2. Comprobar en **App Review / Permissions and Features** los permisos `ads_management` y `ads_read`. Para administrar cuentas de clientes, revisar y obtener Advanced Access; ser administrador de las cuentas no sustituye este requisito. Completar verificación del negocio, políticas de privacidad/eliminación, demostración y revisión que Meta solicite. No hay plazo de aprobación garantizado.
3. Asignar a la persona o usuario del sistema los activos reales: cuentas publicitarias, páginas, Instagram cuando aplique y acceso al destino de WhatsApp. El número debe estar vinculado a la página usada por el anuncio. Un token de usuario del sistema no hereda automáticamente tus seis cuentas personales.
4. Generar un token de usuario o de usuario del sistema con permisos y activos mínimos. Las pantallas de la app determinan su vigencia. Un token sin expiración anunciada también puede revocarse. Confirmar vigencia y permisos con el depurador oficial. Para descubrir páginas/negocios pueden requerirse permisos adicionales; solicitarlos solo según el flujo real. Crear anuncios de WhatsApp no equivale a enviar mensajes por WhatsApp Cloud API.
5. Introducir token y secreto de la app únicamente en el formulario local oculto o en variables sensibles de Vercel. No enviarlos al chat. Confirmar IDs y moneda de cada cuenta, página, número y límite de presupuesto. Empezar con una cuenta; agregar las restantes después de la prueba pausada.

## Preparación local (Node 24, Windows)

Copiar `accounts.example.json` a `.local/accounts.json`. Reemplazar todos los campos; la plantilla está deliberadamente bloqueada. Añadir una entrada por cuenta. `maxDailyMinor: 2000000` representa 20.000 COP, no 2 millones de pesos. `tokenEnv` permite un token distinto por cliente o el mismo token autorizado para varias entradas. No poner tokens en el JSON.

Desde PowerShell, con interacción del usuario:

```powershell
./integrations/meta/secrets.ps1 -Action save
./integrations/meta/secrets.ps1 -Action run -CliArgs @('doctor', 'cliente-confirmado')
./integrations/meta/secrets.ps1 -Action run -CliArgs @('assets', 'cliente-confirmado')
```

DPAPI cifra los secretos para el usuario actual de Windows. El script los descifra solo para el proceso hijo y limpia su entorno al terminar. `.local/` está excluido de Git. No copiar esta carpeta a backups públicos. Revocar/reemplazar los tokens en Meta cuando sea necesario y volver a ejecutar `save`. En otros sistemas usar variables de entorno inyectadas por un gestor de secretos.

## Flujo operativo

Pedir a Work: «Prepara una campaña de WhatsApp para [cliente], [presupuesto diario y moneda], [fechas], [ciudad/público], [ubicaciones] y estas piezas. Muéstrame la revisión antes de crearla pausada». Work debe seguir `AGENTS.md` en esta carpeta.

```powershell
./integrations/meta/secrets.ps1 -Action run -CliArgs @('locations', 'cliente-confirmado', 'Roldanillo')
./integrations/meta/secrets.ps1 -Action run -CliArgs @('image', 'cliente-confirmado', 'C:/ruta/imagen.jpg')
./integrations/meta/secrets.ps1 -Action run -CliArgs @('video', 'cliente-confirmado', 'C:/ruta/video.mp4')
./integrations/meta/secrets.ps1 -Action run -CliArgs @('video-status', 'cliente-confirmado', 'ID_DEVUELTO')
node integrations/meta/cli.mjs preview integrations/meta/.local/plan.json
./integrations/meta/secrets.ps1 -Action run -CliArgs @('create', 'integrations/meta/.local/plan.json', 'DIGEST_REVISADO')
```

La revisión no usa credenciales ni escribe en Meta. Guardar su salida en un JSON permite revisarla en `/meta-ads`. La aprobación de crear PAUSED se registra en la conversación; el digest vincula la ejecución al plan exacto, pero no sustituye el consentimiento humano ni es una firma de aprobación. El único operador con acceso local puede ejecutar el comando. No es una API pública de escritura.

Formato del plan (ejemplo de estructura, NO campaña autorizada; resolver datos reales):

```json
{
  "account": "cliente-confirmado",
  "name": "Nombre confirmado",
  "dailyBudget": "20000",
  "startTime": "2030-01-01T00:00:00-05:00",
  "endTime": "2030-01-08T00:00:00-05:00",
  "specialAdCategories": [],
  "pixelId": null,
  "targeting": {"geo_locations": {"cities": [{"key": "ID_REAL", "radius": 10, "distance_unit": "kilometer"}]}, "age_min": 25, "age_max": 60},
  "placements": {"publisher_platforms": ["facebook"], "facebook_positions": ["feed"]},
  "ads": [{"name": "Nombre", "message": "Texto aprobado", "title": "Título aprobado", "imageHash": "HASH_REAL"}]
}
```

Para video, reemplazar `imageHash` por `videoId` y `thumbnailHash`. Se admiten PNG/JPEG hasta 30 MB y MP4/MOV hasta 100 MB en el MVP. Se suben desde el equipo directamente a Meta; no pasan por el límite de cuerpo de Vercel. La carga actual es simple, no reanudable por fragmentos. Archivos mayores requieren ampliar el cargador. Si un video sigue procesándose, el conector bloquea la creación.

Antes de crear, se comprueban cuenta/moneda/estado/permisos e imágenes/videos de la cuenta. Meta es la autoridad final de compatibilidad de objetivos, públicos, ubicaciones, páginas y WhatsApp. Una validación local no garantiza aceptación. Consultar `ad-preview CUENTA AD_ID` después de crear para obtener la previsualización oficial; no ejecutar HTML devuelto sin aislamiento.

## Fallos, duplicados y auditoría

Cada plan tiene un registro local ligado al digest y un bloqueo exclusivo. Cada paso se guarda y sincroniza a disco **antes** de escribir en Meta. Si hay timeout o respuesta dudosa, queda pendiente y no se reintenta automáticamente. Los pasos confirmados no se repiten. No borrar registros para «arreglar» una ejecución: primero reconciliar en Meta por cuenta, nombres, hora e IDs y comprobar PAUSED. Los archivos son auditoría operativa local, no un registro inmutable. Si cambias de equipo hay que preservar los registros. Un plan con nuevo digest puede crear una campaña nueva: verificar duplicados al solicitarlo.

## Vercel: panel de lectura

Proyecto existente: `gloss-growth-os`. Configurar exclusivamente en servidor: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `META_ALLOWED_USER_IDS` (UUID de usuarios autorizados, separados por coma), `META_ACCOUNTS_JSON` (mismo formato sin tokens), `META_APP_SECRET` y las variables `META_TOKEN_*` indicadas en cada cuenta. Nunca usar prefijo `VITE_` para secretos. No hace falta `service_role` ni migración de base de datos.

El endpoint valida la sesión con Supabase Auth en cada petición, aplica la lista de UUID del servidor y solo admite GET. Las credenciales permanecen en servidor. Configurar un token `ads_read` separado para el dashboard cuando sea posible. No hay renovación automática de tokens, caché histórica ni dashboard de atribución avanzada. No se habilitaron nuevos servicios de pago.

## Validación y limitaciones de entrega

Ejecutar `node --test tests/meta.test.mjs`, `npm run build` y lint de los archivos cambiados. Las pruebas usan transporte simulado; no prueban aprobación de Meta ni entrega de anuncios. La aceptación real exige: credenciales, permisos, vínculo página–WhatsApp, carga de una imagen y video, creación PAUSED, readback y previsualización oficial. No activar para probar.

No incluidos: activación, presupuestos a nivel campaña, conversiones web/píxel, categorías especiales, carruseles, campañas con varios conjuntos, OAuth multiusuario, renovación automática, almacenamiento central de borradores ni editor de campañas dentro del dashboard. Son ampliaciones del MVP, no funcionalidades que se deban dar por conectadas.

## Fuentes verificadas el 29 de octubre de 2026

- [Colección oficial de Meta en Postman: requisitos y acceso avanzado](https://www.postman.com/meta/facebook-marketing-api/collection/0zr4mes/facebook-marketing-api-mapi).
- [SDK oficial: versión v26.0](https://github.com/facebook/facebook-python-business-sdk/blob/main/facebook_business/apiconfig.py).
- [SDK oficial: AdAccount](https://github.com/facebook/facebook-python-business-sdk/blob/main/facebook_business/adobjects/adaccount.py), [AdSet](https://github.com/facebook/facebook-python-business-sdk/blob/main/facebook_business/adobjects/adset.py), [campos de WhatsApp](https://github.com/facebook/facebook-python-business-sdk/blob/main/facebook_business/adobjects/adpromotedobject.py).
- [Meta: inicio](https://developers.facebook.com/docs/marketing-api/get-started/), [WhatsApp](https://developers.facebook.com/docs/marketing-api/ads/click-to-whatsapp/), [changelog](https://developers.facebook.com/docs/graph-api/changelog/). Estas páginas exigieron login o devolvieron 429 durante la investigación; verificar las restricciones finales desde la app autenticada.
- [Supabase: validación de usuario en servidor](https://supabase.com/docs/reference/javascript/auth-getuser).
