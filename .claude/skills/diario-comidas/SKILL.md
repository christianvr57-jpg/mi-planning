---
name: diario-comidas
description: Registrar lo que el usuario ha comido en la app "Mi planning". Úsalo siempre que cuente lo que ha comido o bebido ("hoy he comido…", "ayer cené…", "añade un yogur"), o pida corregir o borrar un día del diario de comidas.
---

# Diario de comidas

El usuario te cuenta lo que ha comido. Tú estimas calorías y macros, lo guardas en la app y lo publicas. Él no copia nada: la app lee `data/diario.json` al abrirse y muestra la tabla del día en **Comida**.

Responde siempre en español de España, breve.

## 1. Interpretar el mensaje

- **Fecha**: hoy en Europe/Madrid salvo que diga otra ("ayer", "el jueves", una fecha). Compruébala con `TZ=Europe/Madrid date +%F`; no la supongas, porque el servidor puede estar en UTC.
- **Alimentos**: un elemento por alimento, con cantidad (`q`) tal como la dijo o como la supones ("≈20 g", "1 mediano", "2 rebanadas").
- **Raciones**: si no da cantidad, usa una ración normal en España y márcalo con "≈". Pregunta solo si la duda cambia el total en más de ~300 kcal (por ejemplo, pasta en seco o ya cocida). En ese caso, guarda igualmente con la opción más probable y pregunta al final.
- **Comidas (`m`)**: rellénalo ("Desayuno", "Comida", "Merienda", "Cena", "Antes de entrenar"…) solo si el usuario lo indica o es evidente por cómo lo cuenta. Si no, omítelo.
- **Valores**: kcal, proteína (`p`), hidratos (`c`) y grasa (`f`) en gramos, con valores de referencia habituales (etiquetas de marcas españolas cuando las nombre, BEDCA/USDA en el resto). Que kcal ≈ 4·p + 4·c + 9·f, con un margen de ±10 %.

## 2. Guardar y publicar

Trabaja en la raíz del repositorio de la app (christianvr57-jpg/mi-planning). En el PC es `D:\PROYECTOS\PLANIFICADOR DEPORTIVO\app`; en una sesión en la nube, la carpeta clonada. La app publicada sale de la rama `main`.

1. Escribe un JSON temporal fuera del repositorio (tu scratchpad o `/tmp`):
   ```json
   { "items": [ { "m": "Desayuno", "n": "Tostadas de pan Panrico", "q": "2 rebanadas", "k": 150, "p": 6, "c": 28, "f": 2 } ],
     "note": "Supuesto: milanesas de ≈120 g." }
   ```
   `note` es opcional: úsala para los supuestos importantes, en una frase.
2. Ejecuta el script desde la raíz del repositorio:
   - `node tools/diario.mjs set AAAA-MM-DD <json>`: el día completo. Usa también `set` para corregir, con la lista entera corregida.
   - `node tools/diario.mjs add AAAA-MM-DD <json>`: para añadir a un día ya registrado ("además me he tomado…").
   - `node tools/diario.mjs del AAAA-MM-DD`: para borrar un día.
   - `node tools/diario.mjs show AAAA-MM-DD`: para ver lo guardado y el objetivo.

   El script imprime el total, el objetivo del día según el entreno del plan y la diferencia. Usa esas cifras en tu respuesta.
3. Publica. El usuario ya autorizó publicar este archivo sin preguntar. Antes de cambiar nada, ponte al día con `git fetch origin main && git rebase origin/main` (o `git pull --rebase origin main`), y después:
   ```
   git add data/diario.json
   git -c user.name="christianvr57-jpg" -c user.email="christianvr57-jpg@users.noreply.github.com" commit -m "Diario de comidas: AAAA-MM-DD" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
   git push origin HEAD:main
   ```
   Lo que cuenta es que el commit llegue a `main`. Si el push a `main` se rechaza, ponte al día otra vez y reintenta una vez. Si sigue rechazado (por ejemplo, permiso denegado), no lo subas a otra rama: dile al usuario el error exacto.
   No toques ni publiques ningún otro archivo: si `git status` muestra otros cambios, déjalos sin añadir.

## 3. Responder

Corto, para leer en el móvil:
- Una tabla con Alimento | kcal | P | H | G y la fila de total.
- Una línea: objetivo del día (tipo de día y entreno) y diferencia, por ejemplo «Día de pierna: objetivo 4.200 kcal → te faltan 1.660 (sobre todo hidratos)».
- Como mucho 1–2 ideas concretas para cuadrar lo que falta, si es de hoy y todavía puede comer.
- Los supuestos importantes, en una frase.
- Termina con «Guardado en la app ✓» cuando el push haya ido bien. Si falló, dilo.
