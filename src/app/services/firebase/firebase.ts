import { inject, Injectable, signal, PLATFORM_ID } from '@angular/core';
import { Firestore, collection, getDocs, doc, getDoc, updateDoc, deleteDoc, setDoc, arrayUnion, arrayRemove, onSnapshot, increment } from '@angular/fire/firestore';
import { Auth, authState, User } from '@angular/fire/auth';
import { isPlatformBrowser } from '@angular/common';
import { Storage, ref, uploadBytes, getDownloadURL, deleteObject, ref as storageRef } from '@angular/fire/storage';
import { FirebaseApp } from '@angular/fire/app'

@Injectable({
  providedIn: 'root' // Esto hace que el servicio esté disponible en toda la app
})
export class Firebase {

  private auth = inject(Auth);
  currentUser = signal<User | null>(null);
  private platformId = inject(PLATFORM_ID);
  configuracion = signal<any | null>(null);
  private firebaseApp = inject(FirebaseApp);
  private storage = inject(Storage);
  private dataBaseFirebase = inject(Firestore)

  esAdministrador(): boolean {
    // Asumiendo que 'rol' es el campo en tu base de datos (ajusta si se llama diferente, ej: 'admin' o 'tipo')
    return this.userData()?.rol === 'administrador';
  }

  // Este observable emitirá el objeto 'user' si está logueado, o 'null' si no lo está
  public readonly authState = authState(this.auth);
  productos = signal<any[]>([]);
  async cargarProductos() {
    if (isPlatformBrowser(this.platformId)) {
      const querySnapshot = await getDocs(collection(this.dataBaseFirebase, "productos"));
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      this.productos.set(data); // Guardamos en la señal
    }
  }
  async getImagenes() {
    if (isPlatformBrowser(this.platformId)) {
      const querySnapshot = await getDocs(collection(this.dataBaseFirebase, "configuracion"));
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (data.length > 0) {
        this.configuracion.set(data[0]); // Guardamos el primer documento de configuración
      }
    }
  }
  private async cargarDatosCompletos(uid: string) {
    const docRef = doc(this.dataBaseFirebase, 'usuarios', uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      this.userData.set(docSnap.data());
    }
  }

  async getBannerImg() {
    const querySnapshot = await getDocs(collection(this.dataBaseFirebase, "banner_imagenes"))
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async editarProducto(id: string, datos: any) {
    const docRef = doc(this.dataBaseFirebase, 'productos', id);
    await updateDoc(docRef, datos);
    await this.cargarProductos(); // Refresca la señal después de editar
  }

  async eliminarProducto(id: string, imagenes: string) {
    // 1. Eliminar imágenes de Storage
    if (imagenes) {
      const urls = imagenes.split(',');
      for (const url of urls) {
        try {
          // Obtenemos la referencia al archivo mediante su URL
          const desertRef = storageRef(this.storage, url);
          await deleteObject(desertRef);
        } catch (error) {
          console.error("Error al eliminar imagen de Storage:", error);
          // Continuamos aunque una imagen falle
        }
      }
    }

    // 2. Eliminar documento de Firestore
    const docRef = doc(this.dataBaseFirebase, 'productos', id);
    await deleteDoc(docRef);
  }

  async toggleFavorito(uid: string, idProducto: string, yaEraFavorito: boolean) {
    const userDocRef = doc(this.dataBaseFirebase, 'usuarios', uid);

    if (yaEraFavorito) {
      // Si ya era favorito, lo quitamos del arreglo
      await updateDoc(userDocRef, {
        favoritos: arrayRemove(idProducto)
      });
    } else {
      // Si no era, lo agregamos al arreglo
      await updateDoc(userDocRef, {
        favoritos: arrayUnion(idProducto)
      });
    }

    // Recargamos los datos del usuario para que el corazón en pantalla cambie de color
    await this.cargarDatosCompletos(uid);
  }

  userData = signal<any | null>(null);

  // 2. MODIFICA EL CONSTRUCTOR para que guarde el usuario en la señal
  constructor() {
    this.getImagenes();
    if (isPlatformBrowser(this.platformId)) {
authState(this.auth).subscribe(user => {
        this.currentUser.set(user);
        if (user) {
            this.loadUserData(user.uid);
        } else {
            this.userData.set(null);
        }
    });
    }
  }


  async actualizarCarritoUsuario(uid: string, carrito: any[]) {
    const userRef = doc(this.dataBaseFirebase, 'usuarios', uid);
    await updateDoc(userRef, { carrito: carrito });
  }

  // Crea el registro de la compra en la colección "pedidos"
  async crearPedido(pedidoData: any, idPersonalizado: string) {
    const pedidoRef = doc(this.dataBaseFirebase, 'pedidos', idPersonalizado);

    // Guardamos los datos en esa referencia específica
    return await setDoc(pedidoRef, pedidoData);
  }

  async cargarConfiguracion() {
    if (isPlatformBrowser(this.platformId)) {
      const querySnapshot = await getDocs(collection(this.dataBaseFirebase, "configuracion"));
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      if (data.length > 0) {
        // Guardamos todo el objeto (incluyendo el ID de Firestore) en la señal
        this.configuracion.set(data[0]);
      }
    }
  }

  async actualizarConfiguracion(campo: string, url: string) {
    const configActual = this.configuracion();

    // Verificamos que tengamos el ID cargado en la señal
    if (!configActual || !configActual.id) {
      console.error("Error: No se encontró el ID del documento en la configuración");
      return;
    }

    // Usamos el ID dinámico obtenido de la colección
    const configRef = doc(this.dataBaseFirebase, 'configuracion', configActual.id);

    await updateDoc(configRef, {
      [campo]: url // Actualiza dinámicamente navLogo, img1, etc.
    });
  }

  async subirArchivoStorage(file: File): Promise<string> {
    try {

      // Creamos la referencia usando la instancia inyectada
      const nombreArchivo = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      const storageRef = ref(this.storage, `productos/${nombreArchivo}`);


      // Subimos
      const snapshot = await uploadBytes(storageRef, file);

      // Obtenemos URL
      return await getDownloadURL(snapshot.ref);

    } catch (error) {
      throw error;
    }
  }

  async agregarProducto(producto: any) {
    const colRef = collection(this.dataBaseFirebase, 'productos');
    // Asegúrate de incluir el ID del documento si el idProducto es manual, 
    // o deja que Firebase lo genere automáticamente.
    const docRef = doc(colRef, producto.idProducto);
    await setDoc(docRef, producto);
  }

  async eliminarArchivoStorage(url: string) {
    try {
      const desertRef = storageRef(this.storage, url);
      await deleteObject(desertRef);
      console.log("Archivo eliminado de Storage:", url);
    } catch (error) {
      console.error("Error al eliminar archivo de Storage:", error);
      throw error;
    }
  }

  private unsubscribeUser: any = null;

async loadUserData(uid: string) {
  if (this.unsubscribeUser) this.unsubscribeUser();
  const userRef = doc(this.dataBaseFirebase, 'usuarios', uid);

  this.unsubscribeUser = onSnapshot(userRef, (docSnap) => {
    if (docSnap.exists()) {
      // Si el documento existe, guardamos los datos
      this.userData.set(docSnap.data()); 
    } else {
      // NUEVO: Si el documento no existe en BD, evitamos que se quede atascado en null
      // y le asignamos un rol por defecto.
      this.userData.set({ rol: 'cliente' }); 
      console.warn("El usuario no tiene documento en Firestore aún.");
    }
  });
}

  async cambiarRolUsuario(uid: string, rolActual: string | undefined | null) {
    
    const rolNormalizado = (rolActual || 'cliente').toLowerCase();
    const nuevoRol = (rolNormalizado === 'cliente') ? 'proveedor' : 'cliente';

    // AQUÍ VEMOS EL ID EXACTO QUE INTENTAS MODIFICAR

    const userRef = doc(this.dataBaseFirebase, 'usuarios', uid);
    await setDoc(userRef, { rol: nuevoRol }, { merge: true });

    return nuevoRol;
  }

  // En firebase.service.ts
  async actualizarUsuario(uid: string, data: any) {
    const userRef = doc(this.dataBaseFirebase, 'usuarios', uid);
    await updateDoc(userRef, data);
    // Actualizamos la señal local para que el header y otras vistas se refresquen
    this.userData.update(current => ({ ...current, ...data }));
  }

  // En firebase.service.ts
  async descontarStock(idProducto: string, cantidad: number) {
    console.log(cantidad);

    const productoRef = doc(this.dataBaseFirebase, 'productos', idProducto);
    // decrementa usando un número negativo con increment
    await updateDoc(productoRef, {
      stock: increment(-cantidad)
    });
  }
}
