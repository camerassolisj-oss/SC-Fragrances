# SC Fragrances: tu tienda de decants

Una tienda en línea minimalista que no necesita servidor ni base de datos. Incluye:

- Catálogo con los **67 perfumes de tu PDF**: fotos, notas olfativas y precios de 5 ml y 10 ml.
- Búsqueda, filtros por género, marca y nota olfativa, y orden por precio, nombre o novedades.
- **Carrito**: el pedido se manda a tu WhatsApp (9181102598) con todo el detalle y el total.
- **Favoritos**: se guardan en el navegador de cada cliente.
- Vista de detalle de cada perfume, con un botón para preguntar por WhatsApp.
- Secciones de cómo comprar, preguntas frecuentes y contacto, con un formulario de **quejas y sugerencias** que abre un correo dirigido a camerassolisj@gmail.com.
- Botón flotante de WhatsApp y enlace a Instagram.
- **Panel privado (`admin.html`)** para editar todo sin tocar código.

## Estructura

```
index.html          ← la tienda
admin.html          ← tu panel privado
data/productos.js   ← TODOS los datos (perfumes, precios, contacto…)
img/productos/      ← fotos de los perfumes
css/  js/           ← diseño y funcionamiento (no necesitas tocarlos)
```

## Cómo publicarla gratis (GitHub Pages)

1. Crea una cuenta en github.com y un repositorio nuevo, por ejemplo `sc-fragrances`.
2. Pulsa **Add file → Upload files** y arrastra **todo el contenido** de esta carpeta (no la carpeta en sí).
3. Ve a **Settings → Pages**. En *Source* elige `Deploy from a branch`, después `main` y `/ (root)`, y guarda.
4. En uno o dos minutos tu tienda estará en `https://TU-USUARIO.github.io/sc-fragrances/`.

Otra opción: arrastra la carpeta en **app.netlify.com/drop**.

## Cómo editar la tienda (solo tú)

1. Abre `https://…/admin.html`.
2. **La primera vez crea una contraseña.** Guárdala bien.
3. Edita lo que quieras:
   - **Perfumes**: agrega, edita, duplica, elimina, cambia el orden, marca como agotado, destacado o nuevo, cambia precios y agrega presentaciones (por ejemplo “Frasco 100 ml”), notas, descripción y foto.
   - **Tienda y contacto**: nombre, eslogan, textos, WhatsApp, correo, Instagram, moneda e información de envío.
4. Revisa los cambios con **Vista previa**. Solo tú los ves.
5. Pulsa **Descargar productos.js** y súbelo a la carpeta `data/` de tu repositorio en GitHub (*Add file → Upload files*). Reemplaza el archivo anterior. En un par de minutos tus clientes verán los cambios.

> **¿Por qué solo tú puedes editar?** Los cambios solo llegan a la tienda cuando subes `productos.js` a tu cuenta de GitHub o Netlify, y solo tú tienes acceso a ella. La contraseña del panel es una barrera adicional. Publica `productos.js` una vez después de crearla para que quede guardada en tu sitio.

### Fotos

- Si subes una foto desde el panel, se recorta y se guarda dentro de `productos.js`. Es práctico para unas cuantas.
- Si vas a agregar muchas fotos, súbelas a `img/productos/` en GitHub y en el panel escribe la ruta, por ejemplo `img/productos/mi-perfume.jpg`. Lo ideal es una foto vertical de 560 × 700 px.

### Respaldos

En **Publicar y respaldos** puedes exportar tu catálogo como `.json` e importarlo después.

## Probarla en tu computadora

Abre `index.html` con doble clic. Para que el panel funcione igual que en internet, puedes correr `python3 -m http.server` dentro de la carpeta y entrar a `http://localhost:8000`.
