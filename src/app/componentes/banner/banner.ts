import { Component, inject, signal, OnInit, PLATFORM_ID, OnDestroy } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Firebase } from '../../services/firebase/firebase'; 
import { Firestore, addDoc, deleteDoc, doc, collection, serverTimestamp } from '@angular/fire/firestore';
import { Storage, ref, uploadBytes, getDownloadURL, deleteObject } from '@angular/fire/storage';
export interface Banner {
  id: string;
  url: string;
  storagePath: string;
}

@Component({
  selector: 'app-banner',
  imports: [],
  templateUrl: './banner.html',
  styleUrl: './banner.scss',
})
export class BannerComponent implements OnInit, OnDestroy {

  firebaseService = inject(Firebase); 
  private firestore = inject(Firestore);
  private storage = inject(Storage);
  private platformId = inject(PLATFORM_ID);

  banners = signal<Banner[]>([]);
  cargando = signal<boolean>(false);
  
  mostrarModal = signal<boolean>(false);
  
  // Control nativo del carrusel
  currentIndex = signal<number>(0);
  private intervaloRotacion: any;

  ngOnInit() {    
    this.cargarCarrusel();
  }

  ngOnDestroy() {
    // Limpiamos el intervalo si el componente se destruye para evitar fugas de memoria
    this.detenerRotacion();
  }

  // --- LÓGICA DEL CARRUSEL ---

  async cargarCarrusel() {
    this.cargando.set(true);
    try {
      const bannersData = await this.firebaseService.getBannerImg();
      this.banners.set(bannersData as Banner[]);
      
      // Solo iniciamos la rotación si estamos en el navegador y hay imágenes
      if (isPlatformBrowser(this.platformId) && this.banners().length > 1) {
        this.iniciarRotacion();
      }
    } catch (error) {
      console.error("Error al cargar banners:", error);
    } finally {
      this.cargando.set(false);
    }
  }

  iniciarRotacion() {
    this.detenerRotacion(); // Evita múltiples intervalos
    this.intervaloRotacion = setInterval(() => {
      this.siguiente();
    }, 5000); // Rota cada 5 segundos (5000ms)
  }

  detenerRotacion() {
    if (this.intervaloRotacion) {
      clearInterval(this.intervaloRotacion);
    }
  }

  siguiente() {
    this.currentIndex.update(i => (i + 1) % this.banners().length);
    this.reiniciarTemporizador();
  }

  anterior() {
    this.currentIndex.update(i => i === 0 ? this.banners().length - 1 : i - 1);
    this.reiniciarTemporizador();
  }

  reiniciarTemporizador() {
    if (isPlatformBrowser(this.platformId)) {
      this.iniciarRotacion();
    }
  }

  // --- LÓGICA DEL MODAL Y ADMINISTRACIÓN ---

  abrirModalGestionBanner() {
    this.mostrarModal.set(true);
    this.cargarCarrusel(); 
  }

  cerrarModal() {
    this.mostrarModal.set(false);
  }

  async subirFotoBanner(event: any) {
    const file = event.target.files[0];
    if (!file) return alert("Selecciona una imagen");

    try {
      this.cargando.set(true);
      const fileName = `${Date.now()}_${file.name}`;
      const path = `banner_fotos/${fileName}`;
      
      const storageRef = ref(this.storage, path);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      const bannerCollection = collection(this.firestore, 'banner_imagenes');
      await addDoc(bannerCollection, {
        url: url,
        storagePath: path,
        fecha: serverTimestamp()
      });

      alert("Imagen agregada con éxito");
      this.cargarCarrusel(); 
    } catch (error) {
      console.error("Error al subir:", error);
      alert("Error al intentar guardar la imagen");
    }
  }

  async eliminarFotoBanner(id: string, storagePath: string) {
    if (!storagePath) return alert("Ruta inválida");
    if (!confirm("¿Seguro que quieres eliminar esta imagen?")) return;

    try {
      this.cargando.set(true);
      const fileRef = ref(this.storage, storagePath);
      await deleteObject(fileRef);

      const docRef = doc(this.firestore, 'banner_imagenes', id);
      await deleteDoc(docRef);

      alert("Imagen removida correctamente");
      this.currentIndex.set(0); // Reiniciamos el índice por seguridad
      this.cargarCarrusel(); 
    } catch (error) {
      console.error("Error al eliminar:", error);
      alert("No se pudo completar la eliminación");
    }
  }

}
