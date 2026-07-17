import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { Firestore, collection, query, orderBy, where, getDocs, getDoc, doc, updateDoc } from '@angular/fire/firestore';
import { Auth, authState } from '@angular/fire/auth';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Firebase } from './../../services/firebase/firebase'
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-lista-compras',
  imports: [CommonModule, RouterLink],
  templateUrl: './lista-compras.html',
  styleUrl: './lista-compras.scss',
})
export class ListaComprasComponente implements OnInit {
  private firestore = inject(Firestore);
  firebaseService = inject(Firebase);
  private auth = inject(Auth);

  pedidos = signal<any[]>([]);
  cargando = signal<boolean>(true);


  // Filtros calculados
  pedidosEntregados = computed(() => this.pedidos().filter(p => p.estado === 'Entregado'));
  pedidosPendientesEntrega = computed(() => this.pedidos().filter(p => p.estado !== 'Entregado'));
  pedidosPendientesPago = computed(() => this.pedidos().filter(p => !p.pagoValidado));

  // Estadísticas
  totalEntregados = computed(() => this.pedidosEntregados().length);
  totalPendientesPago = computed(() => this.pedidosPendientesPago().length);
  totalPendientesEntrega = computed(() => this.pedidosPendientesEntrega().length);
  rolUsuario = computed(() => this.firebaseService.userData()?.rol);

  async ngOnInit() {
    
    this.cargando.set(true);

    try {
      const user = await firstValueFrom(authState(this.auth));

      if (user) {
        if (!this.firebaseService.userData()) {
          const docRef = doc(this.firestore, 'usuarios', user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            this.firebaseService.userData.set(docSnap.data());
          }
        }

        // IMPORTANTE: Agrega los paréntesis () aquí para leer el valor actual

        await this.cargarDatosPedidos(user.uid);
      } else {
        this.cargando.set(false);
      }
    } catch (error) {
      this.cargando.set(false);
    }
  }

  async cargarDatosPedidos(uid: string) {
    try {
      const colRef = collection(this.firestore, 'pedidos');
      const esAdmin = this.firebaseService.userData()?.rol === 'administrador';
      let q;
      
      if (esAdmin) {
        q = query(colRef, orderBy('fecha', 'desc'));
      } else {
        q = query(colRef, where('clienteId', '==', uid), orderBy('fecha', 'desc'));
      }
      
      const snapshot = await getDocs(q);
      const datos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      this.pedidos.set(datos);
      console.log("Datos cargados:", datos); // Verifica esto en consola
    } catch (error) {
      console.error("Error crítico en cargarDatosPedidos:", error);
    } finally {
      // ESTO es lo que apaga el spinner, pase lo que pase
      this.cargando.set(false);
    }
  }

  async actualizarEstado(idPedido: string, campo: string, valor: any) {
    try {
      const pedidoRef = doc(this.firestore, 'pedidos', idPedido);

      // 1. Optimistic UI: Actualizamos la señal local antes de Firestore
      this.pedidos.update(lista =>
        lista.map(p => p.id === idPedido ? { ...p, [campo]: valor } : p)
      );

      // 2. Actualizamos en Firebase
      await updateDoc(pedidoRef, { [campo]: valor });

      console.log(`Pedido ${idPedido} actualizado.`);

      // Nota: No es obligatorio llamar a cargarDatosPedidos() si la actualización 
      // local fue exitosa, pero si necesitas sincronizar fechas o datos calculados 
      // en el servidor, mantén la línea siguiente:
      // await this.cargarDatosPedidos(this.auth.currentUser?.uid || '');

    } catch (error: any) {
      console.error("Error al actualizar, revirtiendo cambios:", error);
      // Si falla, recargamos para recuperar el estado real del servidor
      await this.cargarDatosPedidos(this.auth.currentUser?.uid || '');
    }
  }
}