# 🔥 Villa Hermosa - Integración Firebase

## ✅ **¡Tu diseño original está INTACTO!**

**Se ha mantenido:**
- 🖼️ **Fondo de login:** `fondo_inicio.jpeg` 
- 🏠 **Logo:** `villa-hermoza.jpg`
- 🎨 **Todos los estilos y colores**
- 📱 **Navegación completa**
- 🔐 **Sistema de login original**

**Solo se cambió:** `localStorage` → `Firebase`

---

## 🚀 **Configuración Firebase**

### 1. **Crear proyecto Firebase**
1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Crea un nuevo proyecto: **"villa-hermosa-carhuaz"**
3. Habilita Firestore Database
4. Configura reglas de seguridad:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

### 2. **Obtener credenciales**
1. Ve a **Configuración del proyecto** ⚙️
2. Copia las credenciales de **SDK de Firebase**
3. Reemplaza en `firebase-config.js`:

```javascript
const firebaseConfig = {
  apiKey: "TU_API_KEY_AQUI",
  authDomain: "villa-hermosa-carhuaz.firebaseapp.com",
  projectId: "villa-hermosa-carhuaz",
  storageBucket: "villa-hermosa-carhuaz.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};
```

### 3. **Usar el archivo Firebase**
- **Archivo principal:** `index-firebase.html`
- **Base de datos:** `public/database-firebase.js`
- **Configuración:** `firebase-config.js`

---

## 📁 **Estructura de la Base de Datos**

Firebase creará automáticamente estas colecciones:

```
villa_usuarios/          # Usuarios del sistema
villa_registros/         # Registros de clientes
villa_cuotas/           # Cuotas de pago
villa_vouchers/         # Vouchers de pago
villa_boletas/          # Boletas
villa_config/           # Configuración (mora, etc.)
```

---

## 🔐 **Credenciales por defecto**

- **Usuario:** `villahermosa`
- **Contraseña:** `villa8956`

---

## 🌐 **Despliegue**

### Opción 1: Firebase Hosting
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

### Opción 2: Cualquier hosting
- Sube todos los archivos
- Asegúrate que `index-firebase.html` sea el archivo principal
- Las imágenes están en `public/`

---

## ✅ **Verificación**

1. **Abrir:** `index-firebase.html`
2. **Login:** villahermosa / villa8956
3. **Verificar:** Consola del navegador debe mostrar "🔥 Firebase inicializado correctamente"
4. **Probar:** Crear un cliente de prueba

---

## 🔄 **Migración de datos**

Si tienes datos en localStorage:

1. **Exportar desde localStorage:**
```javascript
// En la consola del navegador de tu versión anterior
const datos = {
  usuarios: JSON.parse(localStorage.getItem('villa_usuarios') || '[]'),
  registros: JSON.parse(localStorage.getItem('villa_registros') || '[]'),
  cuotas: JSON.parse(localStorage.getItem('villa_cuotas') || '[]')
};
console.log(JSON.stringify(datos, null, 2));
```

2. **Importar a Firebase:** (script personalizado disponible bajo solicitud)

---

## 🆘 **Soporte**

Si necesitas ayuda:
1. Verifica la consola del navegador
2. Revisa las credenciales Firebase
3. Confirma que Firestore está habilitado
4. Verifica las reglas de seguridad

**¡Tu diseño Villa Hermosa está preservado al 100%! 🎉**