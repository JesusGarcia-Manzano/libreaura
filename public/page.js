
  let serviceEmailJs = "service_p1gef1a"
  let publicKey = "zwpiAkNTP3O-Pu5wt"
  let templateIDEmail = "template_ke6sxqa"
  // Configuración de tu proyecto
  const firebaseConfig = { 
    apiKey: "AIzaSyC7tdpXaE5bwRFPb8HLOHNtF0lf_skt7Ss", 
    authDomain: "bolsos-665b1.firebaseapp.com", 
    projectId: "bolsos-665b1", 
    storageBucket: "bolsos-665b1.firebasestorage.app", 
    messagingSenderId: "796560660034", 
    appId: "1:796560660034:web:7f529b4ed27314e0afbfdb", 
    measurementId: "G-K3RYL1GL6Z" 
  };

  // 2. INICIALIZACIÓN SEGURA (Evita el error de "No App created")
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  
  const auth = firebase.auth();
  const db = firebase.firestore();

  // Gestión de estado de autenticación
auth.onAuthStateChanged((user) => {
  let contentButton = document.getElementById('authBtn');
  
  if (user) {
    db.collection("usuarios").doc(user.uid).get().then(async (doc) => {
      if (doc.exists) {
        if (!contentButton.classList.contains('hidenContent')) contentButton.classList.add('hidenContent');
        const perfil = doc.data();
        contentButton.innerHTML = `
          <span id="userName">Bienvenido ${perfil.nombre.split(" ")[0]}</span>
          <span class="badge bg-primary" id="roolUserActive">${perfil.rol}</span>`;
        
        document.getElementById('btnRegModal').style.display = "none";
        document.getElementById('btnInitModal').style.display = "none";
        document.getElementById('btnPerfil').classList.remove('d-none');
        document.getElementById('footer-img-2').style.display = "block"
        
        configurarBotonPedidos(perfil);
        appData.rol = perfil.rol;
        appData.perfil = perfil;
        
        obtenerFavoritosDelUsuario();

        // --- LÓGICA DE CARRITO AL INICIAR SESIÓN ---
        await sincronizarCarritoAlLogin(user.uid);
        if (perfil.rol === 'administrador') {
          cargarProductosSegunRol('administrador', perfil);
          document.getElementById("inserImgAdmin").style.display = "block";
          document.getElementById("btnFooterupImaId").style.display = "block";
        } else {
          cargarProductosSegunRol(perfil.rol, perfil);
        }
      } else {
        // Al cerrar sesión, limpiamos el carrito local para privacidad
        appData.carrito = [];
        localStorage.removeItem('carrito_libreaura');
        updateCartUI();

        contentButton.innerHTML = `
          <button class="btn btn-sm btnIniciarSesion" data-bs-toggle="modal" data-bs-target="#regModal" id="btnRegModal">Registrarse</button>
          <button class="btn btn-sm btnRegistrarse" data-bs-toggle="modal" data-bs-target="#initModal" id="btnInitModal">Iniciar Sesion</button>`;
        
        cargarProductosSegunRol('visitante', appData);
        contentButton.classList.remove('hidenContent');
      }
    }).catch(err => console.error("Error al obtener perfil:", err));
  } else {
    // Al cerrar sesión, limpiamos el carrito local para privacidad
    appData.carrito = [];
    localStorage.removeItem('carrito_libreaura');
    updateCartUI();

    contentButton.innerHTML = `
      <button class="btn btn-sm btnIniciarSesion" data-bs-toggle="modal" data-bs-target="#regModal" id="btnRegModal">Registrarse</button>
      <button class="btn btn-sm btnRegistrarse" data-bs-toggle="modal" data-bs-target="#initModal" id="btnInitModal">Iniciar Sesion</button>`;
    
    cargarProductosSegunRol('visitante', appData);
    contentButton.classList.remove('hidenContent');
  }
});

// Función de Inicio de Sesión
function inicioSesionUser() {
  const email = document.getElementById('loginEmail').value;
  const pass = document.getElementById('loginPassword').value;

  const btn = event.submitter || document.querySelector('#initForm button[type="submit"]');
  const originalText = btn.innerHTML;

  btn.disabled = true;
  btn.innerHTML = `
    <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
    Procesando...`;

  auth.signInWithEmailAndPassword(email, pass)
    .then((userCredential) => {
      btn.disabled = false;
      btn.innerHTML = originalText;
      const regModal = bootstrap.Modal.getInstance(document.getElementById('initModal'));
      if (regModal) regModal.hide();
    })
    .catch((error) => {
      btn.disabled = false;
      btn.innerHTML = originalText;
      console.error("Error de login:", error.code);
      alert("Error: " + error.message);
    });
}

 // Función de apoyo para no saturar el onAuthStateChanged
async function sincronizarCarritoAlLogin(userId) {
  try {
    const cartDoc = await db.collection("carritos").doc(userId).get();
    let carritoNube = [];

    if (cartDoc.exists) {
      carritoNube = cartDoc.data().items || [];
    }

    // Obtenemos lo que el usuario agregó antes de loguearse
    const carritoLocal = JSON.parse(localStorage.getItem('carrito_libreaura')) || [];

    // Mezclamos ambos carritos evitando duplicar el mismo ID de producto
    // Nota: Esta lógica asume que el objeto tiene 'idProducto'
    const mapaCarrito = new Map();
    
    [...carritoNube, ...carritoLocal].forEach(item => {
      mapaCarrito.set(item.idProducto, item);
    });

    appData.carrito = Array.from(mapaCarrito.values());
    
    // Guardamos la versión final mezclada en ambos sitios
    localStorage.setItem('carrito_libreaura', JSON.stringify(appData.carrito));
    await db.collection("carritos").doc(userId).set({
      items: appData.carrito,
      ultimaActualizacion: firebase.firestore.FieldValue.serverTimestamp()
    });

    updateCartUI();
  } catch (error) {
    console.error("Error sincronizando carrito:", error);
  }
}

    let appData = {
        rol: 'visitante',
        usuario: null,
        productos: [],
        bolsos: [],
        llaveritos: [],
        ropa: [],
        sombreros: []
    };
    let cart = [];

    function renderizarTarjetaProducto(p, contenedor, perfil, idPedido) {
        const imagen = p.imagenes ? p.imagenes.split(',')[0] : '';
        const sinStock = parseInt(p.stock) <= 0;
        // VERIFICACIÓN: ¿Este producto está en mis favoritos?
        const esFav = idsFavoritosUser.includes(p.idProducto);
        // 3. Crear el HTML de la tarjeta (Card)
        if(!sinStock){
          
          contenedor.innerHTML += `
        <div class="card-item col-6 col-md-6 col-lg-3 mb-4">
          <div class="card card-product h-100 ${sinStock ? 'out-of-stock' : ''}">

            <img src="${imagen}" class="card-img-top product-img" style="cursor: pointer; object-fit: cover;"
                onclick="verDetalle('${idPedido}')">
            
            <div class="card-body d-flex flex-column">
              <h6 class="nameProducto text-truncate">${p.nombre}</h6>
              <p class="descripcionProduct small" style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                ${p.descripcion || ''}
              </p>
              <div class="contentInfoProducto d-flex justify-content-between align-items-center">
              
                <span class="priceProduct fw-bold fs-4">$${p.precio}<small>mxn</small></span>
              

              ${sinStock ?
                  '<div class="alert alert-danger p-1 text-center small mb-0">AGOTADO</div></div>' : `
                      <div class="actionsContentProduct d-flex gap-2">
                          <button id="fav-btn-${idPedido}" class="btn-icon-solo favorito" onclick="toggleFavorito('${idPedido}')">
                          <i class="bi bi-heart"></i>
                          </button>
                      <input type="number" id="qty-${idPedido}" class="form-control" value="1" min="1" max="${p.stock}" style="max-width: 60px; display: none;">
                          <button onclick="addToCart('${idPedido}')" class="btn-icon-solo card" title="Agregar al carrito">
                          <i class="bi bi-cart-fill"></i>
                          </button>
                      </div>
                  </div>
              `}

              ${perfil.rol === 'administrador' ? `
                <div class="accionsAdmin d-flex gap-1">
                  <button class="btn btn-warning btn-sm flex-fill" onclick="abrirEditor('${idPedido}')">
                    <i class="bi bi-pencil-square"></i>
                  </button>
                  <button class="btn btn-danger btn-sm flex-fill" onclick="confirmarEliminacion('${idPedido}')">
                    <i class="bi bi-trash"></i>
                  </button>
                </div>` : ''}
            </div>
          </div>
        </div>`;
        }
    }
    function renderizarTarjetallaverito(p, contenedor, perfil, idPedido) {
        const imagen = p.imagenes ? p.imagenes.split(',')[0] : '';
        const sinStock = parseInt(p.stock) <= 0;
        // VERIFICACIÓN: ¿Este producto está en mis favoritos?
        const esFav = idsFavoritosUser.includes(p.idProducto);
        // 3. Crear el HTML de la tarjeta (Card)
        contenedor.innerHTML += `
      <div class="card-item col-5 col-md-5 col-lg-2 mb-4">
          <img src="${imagen}" class="card-img-top product-img" style="cursor: pointer; object-fit: cover; height: 200px;"
            onclick="verDetalle('${idPedido}')">
          ${perfil.rol === 'administrador' ? `
            <div class="accionsAdmin d-flex gap-1">
              <button class="btn btn-warning btn-sm flex-fill" onclick="abrirEditor('${idPedido}')">
                <i class="bi bi-pencil-square"></i>
              </button>
              <button class="btn btn-danger btn-sm flex-fill" onclick="confirmarEliminacion('${idPedido}')">
                <i class="bi bi-trash"></i>
              </button>
            </div>` : ''}
      </div>`
    }

    function cargarProductosSegunRol(rolUsuario, perfil) {
        const contenedor = document.getElementById('contenedor-productos');
        contenedor.innerHTML = '<div class="text-center w-100">Cargando catálogo...</div>';
        appData.productos = [];
        appData.bolsos = [];
        appData.llaveritos = [];
        appData.ropa = [];
        appData.sombreros = [];
        let consulta = db.collection("productos");
        // Aplicamos la lógica de filtros
        if (rolUsuario === 'proveedor' || rolUsuario === 'clientes') {
            document.getElementById("roolUserActive").innerHTML = rolUsuario
        }
        if (rolUsuario === 'cliente') {
            document.querySelectorAll(".btn-proveedor-footer").forEach(item => {
                item.style = "display:block"
                item.innerHTML = "Cliente Mayorista"
            })
        }
        if (rolUsuario === 'administrador') {
            // Los administradores ven TODO, no añadimos filtros a la consulta
            console.log("Modo Admin: Viendo todos los productos");
        }
        else if (rolUsuario === 'proveedor') {
            // Los proveedores ven solo sus productos específicos
            consulta = consulta.where("tipoCliente", "==", "proveedor");
            document.querySelectorAll(".btn-proveedor-footer").forEach(item => {
                item.style = "display:block"
                item.innerHTML = "Cliente"
            })
        }
        else {
            // Clientes y visitantes ven solo productos de cliente
            consulta = consulta.where("tipoCliente", "==", "cliente");
        }

        // Ejecutamos la consulta final
        consulta.get()
            .then((querySnapshot) => {
                contenedor.innerHTML = '';
                if (querySnapshot.empty) {
                    contenedor.innerHTML = '<p class="text-center w-100">No hay productos disponibles para este perfil.</p>';
                    return;
                }

                // 1. Separar los productos por tipo

                querySnapshot.forEach((doc) => {
                    const p = doc.data();
                    p.idFirestore = doc.id; // Guardamos el ID por si lo necesitas

                    if (p.tipoProducto === 'bolsos') {
                        appData.bolsos.push(p);
                    } else if (p.tipoProducto === 'llavero') {
                        appData.llaveritos.push(p);
                    } else if (p.tipoProducto === 'ropa') {
                        appData.ropa.push(p);
                    } else if (p.tipoProducto === 'sobrero') {
                        appData.sombreros.push(p);
                    }

                    // Mantenemos tu actualización de datos global
                    appData.productos.push(p);
                });

                // 2. Intercalar (8 bolsos y 5 llaveritos)
                let i = 0;

                while (i < appData.productos.length) {
                    // Pintar hasta 8 bolsos
                    for (let count = 0; i < appData.productos.length; count++) {
                        renderizarTarjetaProducto(appData.productos[i], contenedor, perfil, appData.productos[i].idProducto);
                        i++;
                    }
                }
            })
            .catch((error) => {
                console.error("Error al filtrar productos:", error);
            });
    }



    function updateCartUI() {

        const btnFinalizar = document.getElementById('btnFinalizarCompra');
        const alertaProveedor = document.getElementById('alertaMinimoProveedor'); // Un nuevo div para el mensaje

        if (cart.length > 0) {
            btnFinalizar.disabled = false;

            // Si no está registrado, cambiamos el color o el texto para avisar
            if (appData.rol === 'visitante') {
                btnFinalizar.innerHTML = 'Regístrate para comprar';
                btnFinalizar.classList.replace('btn-success', 'btn-warning');
            } else {
                btnFinalizar.innerHTML = 'Finalizar Compra';
                btnFinalizar.classList.replace('btn-warning', 'btn-success');
            }
        } else {
            btnFinalizar.disabled = true;
        }

        let permiteCompra = true;
        let mensajeError = "";

        // 1. Validar solo si es proveedor
        if (appData.rol === 'proveedor') {
            cart.forEach(item => {
                if (item.cantidad < 4) {
                    permiteCompra = false;
                    mensajeError = `El producto "${item.nombre}" requiere un mínimo de 4 unidades para realizar la compra.`;
                }
            });
        }

        // 2. Controlar el botón de finalizar
        if (cart.length > 0 && permiteCompra) {
            btnFinalizar.disabled = false;
            if (alertaProveedor) alertaProveedor.classList.add('d-none');
        } else {
            btnFinalizar.disabled = true;
            if (alertaProveedor && cart.length > 0 && !permiteCompra) {
                alertaProveedor.innerText = mensajeError;
                alertaProveedor.classList.remove('d-none');
            }
        }

        const cartCount = document.getElementById('cartCount');
        cartCount.innerText = cart.reduce((a, b) => a + b.cantidad, 0);

        const body = document.getElementById('cartItems');
        let total = 0;

        body.innerHTML = cart.map((item, i) => {
            total += item.precio * item.cantidad;

            // Verificamos si este ítem ya alcanzó su stock máximo
            const reachesLimit = item.cantidad >= item.stock;
            return `
                <div class="d-flex justify-content-between align-items-center mb-3 border-bottom pb-2">
                    <div>
                    <div class="fw-bold">${item.nombre}</div>
                    <div class="small text-muted">$${item.precio} c/u</div>
                    </div>
                    <div class="text-end">
                    <div class="btn-group btn-group-sm mb-1">
                        <button class="btn btn-outline-secondary" onclick="cambiarCant(${i}, -1)">-</button>
                        <span class="btn btn-light disabled fw-bold" style="min-width: 40px;">${item.cantidad}</span>
                        <button class="btn btn-outline-secondary" 
                                onclick="cambiarCant(${i}, 1)" 
                                ${reachesLimit ? 'disabled title="Stock máximo alcanzado"' : ''}>
                        +
                        </button>
                    </div>
                    <div class="text-danger" style="font-size: 0.75rem;">
                        ${reachesLimit ? 'Máximo alcanzado' : ''}
                    </div>
                    <button class="btn btn-link btn-sm text-danger d-block w-100 p-0" onclick="eliminar(${i})">Eliminar</button>
                    </div>
                </div>`;
        }).join('');

        document.getElementById('cartTotal').innerText = `Total: $${total.toFixed(2)}`;
    }

    async function cambiarCant(i, delta) {
        const itemEnCarrito = cart[i];

        // --- (Aquí mantienes tu lógica de validación de stock) ---

        itemEnCarrito.cantidad += delta;

        if (itemEnCarrito.cantidad <= 0) {
            return eliminar(i);
        }

        // 1. Actualizar la interfaz inmediatamente para que el usuario vea el cambio
        updateCartUI();

        // --- 2. PERSISTENCIA DE DATOS ---

        // A. Guardar en LocalStorage (Para que no se pierda al recargar)
        localStorage.setItem('carrito_libreaura', JSON.stringify(cart));

        // B. Sincronizar con Firebase (Para persistencia en la cuenta del usuario)
        const user = firebase.auth().currentUser;
        if (user) {
            try {
                await db.collection("carritos").doc(user.uid).set({
                    items: cart,
                    ultimaActualizacion: firebase.firestore.FieldValue.serverTimestamp()
                });
            } catch (error) {
                console.error("Error al actualizar cantidad en la nube:", error);
            }
        }

        // --- 3. Lógica de habilitación de botones en la tienda ---
        const indexOriginal = appData.productos.findIndex(p =>
            p.rowIdx === itemEnCarrito.rowIdx && p.hojaOrigen === itemEnCarrito.hojaOrigen
        );

        if (indexOriginal !== -1) {
            const productoOriginal = appData.productos[indexOriginal];
            if (itemEnCarrito.cantidad < productoOriginal.stock) {
                const btn = document.querySelector(`button[onclick="addToCart(${indexOriginal})"]`);
                if (btn) {
                    btn.disabled = false;
                    btn.classList.replace('btn-secondary', 'btn-dark');
                    btn.innerText = "Agregar Carrito";
                }
            }
        }
    }

    async function eliminar(i) {
        // 1. Identificar qué producto estamos eliminando
        const itemAEliminar = cart[i];

        // 2. Buscar el índice de ese producto en la lista principal
        const indexOriginal = appData.productos.findIndex(p =>
            p.rowIdx === itemAEliminar.rowIdx && p.hojaOrigen === itemAEliminar.hojaOrigen
        );

        // 3. Eliminar el producto del array del carrito
        cart.splice(i, 1);

        // 4. Actualizar la interfaz del carrito (contador y lista)
        updateCartUI();

        // --- 5. PERSISTENCIA DE DATOS (Sincronización) ---

        // A. Actualizar LocalStorage inmediatamente
        localStorage.setItem('carrito_libreaura', JSON.stringify(cart));

        // B. Sincronizar con Firebase si el usuario está autenticado
        const user = firebase.auth().currentUser;
        if (user) {
            try {
                await db.collection("carritos").doc(user.uid).set({
                    items: cart,
                    ultimaActualizacion: firebase.firestore.FieldValue.serverTimestamp()
                });
                console.log("Carrito actualizado en la base de datos tras eliminar producto.");
            } catch (error) {
                console.error("Error al sincronizar eliminación con Firebase:", error);
            }
        }

        // 6. HABILITAR EL BOTÓN EN LA TIENDA
        if (indexOriginal !== -1) {
            const btn = document.querySelector(`button[onclick="addToCart(${indexOriginal})"]`);
            if (btn) {
                btn.disabled = false;
                btn.classList.replace('btn-secondary', 'btn-dark');
                btn.innerText = "Agregar Carrito";
            }

            const qtyInput = document.getElementById(`qty-${indexOriginal}`);
            if (qtyInput) qtyInput.value = 1;
        }

        mostrarNotificacion("Producto eliminado del carrito", "success");
    }

    function registrar(event) {
        // 0. Evitar que la página se recargue
        if (event) event.preventDefault();

        const btn = document.querySelector('#regForm button[type="submit"]');
        const originalText = btn.innerHTML;

        // 1. ACTIVAR LOADER
        btn.disabled = true;
        btn.innerHTML = `
        <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
        Procesando registro...
    `;

        // 2. CAPTURAR DATOS (Asegúrate de que estos IDs existan en tu HTML)
        const datos = {
            correo: document.getElementById('rEmail').value,
            pass: document.getElementById('rPass').value,
            nombre: document.getElementById('rNom').value,
            telefono: document.getElementById('rTel').value,
            direccion: document.getElementById('rDir').value,
            tipo: document.getElementById('rTipo').value,
            refIndi: document.getElementById("rIndRef").value
        };

        // 3. Crear el usuario en Authentication
        // NOTA: Usamos datos.correo y datos.pass
        firebase.auth().createUserWithEmailAndPassword(datos.correo, datos.pass)
            .then((userCredential) => {
                const user = userCredential.user;
                console.log("Cuenta creada:", user.uid);

                // 4. Guardar los datos adicionales en FIRESTORE
                // Usamos las propiedades del objeto 'datos'
                return db.collection("usuarios").doc(user.uid).set({
                    nombre: datos.nombre,
                    email: datos.correo,
                    telefono: datos.telefono,
                    direccion: datos.direccion,
                    indicaciones: datos.refIndi,
                    rol: datos.tipo,
                    fechaRegistro: new Date().toISOString()
                });
            })
            .then(() => {
                // RESTAURAR BOTÓN
                btn.disabled = false;
                btn.innerHTML = originalText;

                // MOSTRAR EL BOTÓN DE PERFIL
                const btnPerfil = document.getElementById('btnPerfil');
                if (btnPerfil) btnPerfil.classList.remove('d-none');

                // CERRAR MODAL DE REGISTRO
                const regModalElem = document.getElementById('regModal');
                if (regModalElem) {
                    const regModal = bootstrap.Modal.getInstance(regModalElem) || new bootstrap.Modal(regModalElem);
                    regModal.hide();
                }

                // MOSTRAR MODAL DE ÉXITO
                const exitoElem = document.getElementById('modalRegistroExitoso');
                if (exitoElem) {
                    const modalExito = new bootstrap.Modal(exitoElem);
                    modalExito.show();
                }
            })
            .catch((error) => {
                // IMPORTANTE: Restaurar botón si hay error
                btn.disabled = false;
                btn.innerHTML = originalText;
                console.error("Error íntegro:", error);
                mostrarNotificacion("Error al registrarse: " + error.message, "error");
            });
    }

async function checkOut() {
    // 1. VERIFICACIONES PREVIAS
    
    if (appData.rol === 'visitante') {
        const cartModal = bootstrap.Modal.getInstance(document.getElementById('cartModal'));
        if (cartModal) cartModal.hide();
        const modalRegistro = new bootstrap.Modal(document.getElementById('regModal'));
        modalRegistro.show();
        return;
    }

    if (cart.length === 0) return mostrarNotificacion("El carrito está vacío", "warning");

    const btn = document.getElementById("btnFinalizarCompra");
    const textoOriginal = btn.innerHTML;
    const user = firebase.auth().currentUser;

    // Bloquear botón y mostrar loader
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Procesando pedido...';

    try {
        // 2. GENERAR DATOS DEL PEDIDO
        const folio = "PED-" + Math.floor(Math.random() * 1000000000000);

        const pedidoData = {
            folio: folio,
            clienteId: user.uid,
            clienteNombre: appData.perfil.nombre || "Cliente",
            clienteEmail: user.email,
            productos: cart,
            total: cart.reduce((acc, item) => acc + (item.precio * item.cantidad), 0),
            fecha: firebase.firestore.FieldValue.serverTimestamp(),
            estado: "Pendiente"
        };

        // 3. GUARDAR PEDIDO EN FIREBASE
        await db.collection("pedidos").doc(folio).set(pedidoData);

        // 4. ACTUALIZAR STOCK EN FIRESTORE
        const batch = db.batch();
        cart.forEach(item => {
            const prodRef = db.collection("productos").doc(item.idProducto);
            batch.update(prodRef, {
                stock: firebase.firestore.FieldValue.increment(-item.cantidad)
            });
        });
        await batch.commit();

        // 6. FINALIZAR PROCESO EXITOSAMENTE (Cerrar carrito y limpiar)
        btn.disabled = false;
        btn.innerHTML = textoOriginal;

        // Cerrar Modal del Carrito
        const cartModalElement = document.getElementById('cartModal');
        const cartModal = bootstrap.Modal.getInstance(cartModalElement);
        if (cartModal) cartModal.hide();

        // Limpiar Carrito Local
        cart = [];
        localStorage.removeItem('carrito_libreaura');
        await db.collection("carritos").doc(user.uid).delete();
       // 5. ENVIAR CORREOS MEDIANTE GMAIL / EMAILJS
        // Usamos la función que adaptamos anteriormente
        //try {
        //    await enviarCorreoPedido(pedidoData);
        //} catch (errorMail) {
        //    console.warn("Pedido guardado, pero falló el envío del correo:", errorMail);
        //    mostrarNotificacion("Pedido registrado, pero hubo un detalle con el correo de confirmación.", "warning");
        //}
        updateCartUI();

        // Mostrar Modal de Éxito
        document.getElementById('folioExito').innerText = folio;
        const modalExito = new bootstrap.Modal(document.getElementById('modalCompraExitosa'));
        modalExito.show();

        // Recargar catálogo para ver el nuevo stock
        cargarProductosSegunRol(appData.rol, appData.perfil);

    } catch (error) {
        console.error("Error en checkout:", error);
        mostrarNotificacion("Error técnico: " + error.message, "error");
        btn.disabled = false;
        btn.innerHTML = textoOriginal;
    }
}

    // Variable global para guardar los datos del usuario actual
    let datosUsuarioActual = {};

    function abrirModalPerfil() {
        // Cargamos los datos que ya tenemos en appData (obtenidos al iniciar o registrar)
        // Nota: Asegúrate de que tu función getAppData en el servidor devuelva: nombre, telefono, direccion, rowIdx y hojaOrigen
        document.getElementById('pNombre').value = appData.perfil.nombre || "";
        document.getElementById('pTelefono').value = appData.perfil.telefono || "";
        document.getElementById('pDireccion').value = appData.perfil.direccion || "";
        document.getElementById('pIndicaciones').value = appData.perfil.indicaciones || "";
        document.getElementById('pRol').value = appData.perfil.rol || "";

        new bootstrap.Modal(document.getElementById('modalPerfil')).show();
    }

    async function guardarCambiosPerfil() {
        const btn = document.getElementById('btnGuardarPerfil');
        const originalText = btn.innerHTML;

        // 1. Verificar que haya un usuario con sesión activa
        const user = firebase.auth().currentUser;
        if (!user) {
            mostrarNotificacion("No hay una sesión activa. Por favor, inicia sesión.", "warning");
            return;
        }

        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Guardando...';

        // 2. Recolectar los datos del formulario
        const nuevosDatos = {
            nombre: document.getElementById('pNombre').value,
            telefono: document.getElementById('pTelefono').value,
            direccion: document.getElementById('pDireccion').value,
            indicaciones: document.getElementById('pIndicaciones').value,
        };

        try {
            // 3. Actualizar directamente en la colección 'usuarios' usando el UID del auth
            await db.collection("usuarios").doc(user.uid).update(nuevosDatos);

            // 4. Éxito: Actualizar interfaz y cerrar modal
            btn.disabled = false;
            btn.innerHTML = originalText;

            const modalPerfil = bootstrap.Modal.getInstance(document.getElementById('modalPerfil'));
            if (modalPerfil) modalPerfil.hide();

            mostrarNotificacion("Perfil actualizado correctamente", "success");

            // Actualizar datos globales en tu aplicación si los usas
            if (typeof perfil !== 'undefined') {
                perfil.nombre = nuevosDatos.nombre;
                // Actualizar otros campos si es necesario
            }

        } catch (error) {
            console.error("Error al actualizar perfil:", error);
            mostrarNotificacion("Hubo un error al guardar los cambios: " + error.message, "error");
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }

    let mostrandoPedidos = false;

    // 1. Configurar el botón al cargar la app
    function configurarBotonPedidos(perfil) {
        const btn = document.getElementById('btnVistaPedidos');
        if (perfil.rol === 'visitante') return;

        btn.classList.remove('d-none');
        btn.innerHTML = (perfil.rol === 'administrador') ? "📦 <span class='ocultaMobile'> Pedidos Solicitados</span>" : "🛍️ <span class='ocultaMobile'>Mis Compras</span>";
        document.getElementById('adminActions').innerHTML = perfil.rol === 'administrador' ? `
      <button class="btn btn-sm nuevosProductoadmin" data-bs-toggle="modal" data-bs-target="#modalNuevoProducto">
        + <span class="ocultaMobile agregarPorductos">Nuevos Productos </span>
      </button>` : '';
    }

    async function cargarDatosPedidos() {
        const container = document.getElementById('pedidos-container');
        container.innerHTML = '<div class="text-center p-5"><div class="spinner-border text-danger"></div><p>Cargando historial...</p></div>';

        try {
            let consulta;
            // 1. Definir la consulta según el rol
            if (appData.rol === 'administrador') {
                // El admin ve todos los pedidos, ordenados por fecha
                consulta = db.collection("pedidos").orderBy("fecha", "desc");
            } else {
                // El cliente solo ve los suyos
                const user = firebase.auth().currentUser;
                consulta = db.collection("pedidos")
                    .where("clienteId", "==", user.uid);
            }

            const snapshot = await consulta.get();

            let html = `<div class="d-flex justify-content-between align-items-center mb-4">
                        <h3>${appData.rol === 'administrador' ? '🛡️ Gestión de Pedidos' : '🛍️ Mis Compras'}</h3>
                        <button class="btn btn-outline-secondary btn-sm" onclick="cargarDatosPedidos()">Volver al catálogo</button>
                    </div>`;

            if (snapshot.empty) {
                container.innerHTML = html + '<div class="alert alert-light text-center">No se encontraron pedidos.</div>';
                return;
            }

            html += `<div class="table-responsive">
                    <table class="table table-hover mt-3" style="font-size: 0.9rem;">
                        <thead class="table-dark">
                            <tr>
                                <th>Folio</th>
                                <th>${appData.rol === 'administrador' ? 'Cliente' : 'Productos'}</th>
                                <th>Detalle Compra</th>
                                <th>Estatus</th>
                                <th>Pago</th>
                                <th>Total</th>
                                ${appData.rol === 'administrador' ? '<th>Acciones</th>' : ''}
                            </tr>
                        </thead>
                        <tbody>`;

            snapshot.forEach(doc => {
                const p = doc.data();
                const id = doc.id;

                // Convertimos el array de productos en un texto legible
                const detalleTexto = p.productos.map(prod => `- ${prod.nombre} (x${prod.cantidad}): ${prod.descripcion}`).join('<br>');

                html += `
                <tr>
                    <td><span class="badge bg-light text-dark border">${p.folio}</span></td>
                    <td>
                        <strong>${appData.rol === 'administrador' ? p.clienteNombre : 'Tu Pedido'}</strong><br>
                        <small class="text-muted">${p.clienteEmail}</small>
                    </td>
                    <td><small>${detalleTexto}</small></td>
                    <td><span class="badge ${p.estado === 'Entregado' ? 'bg-success' : 'bg-warning'}">${p.estado}</span></td>
                    <td><span class="badge ${p.pagoValidado ? 'bg-info' : 'bg-danger'}">${p.pagoValidado ? 'Pagado' : 'Pendiente'}</span></td>
                    <td class="fw-bold">$${p.total.toLocaleString()}</td>
                    ${appData.rol === 'administrador' ? `
                    <td>
                        <select class="form-select form-select-sm mb-1" onchange="actualizarEstadoPedido('${id}', 'estado', this.value)">
                            <option value="">Cambiar Estatus...</option>
                            <option value="Procesando">Procesando</option>
                            <option value="Entregado">Entregado</option>
                        </select>
                        <button class="btn btn-sm btn-primary w-100" onclick="actualizarEstadoPedido('${id}', 'pagoValidado', true)">Marcar Pagado</button>
                    </td>` : ''}
                </tr>`;
            });

            html += '</tbody></table></div>';
            container.innerHTML = html;

        } catch (error) {
            console.error("Error al cargar pedidos:", error);
            container.innerHTML = '<div class="alert alert-danger">Error al conectar con la base de datos de pedidos.</div>';
        }
    }
    async function actualizarEstadoPedido(idPedido, campo, valor) {
        try {
            const updateData = {};
            updateData[campo] = valor;

            await db.collection("pedidos").doc(idPedido).update(updateData);

            // Refrescamos la vista para ver los cambios
            cargarDatosPedidos();
        } catch (error) {
            mostrarNotificacion("Error al actualizar: " + error.message, "error");
        }
    }

    function gestionarNavegacion(vistaActual) {
        const btnProductos = document.getElementById('btn-nav-productos');
        const btnFavoritos = document.getElementById('favoritosbuttonId');
        const btnCarrito = document.getElementById('carritobutonId');
        const contTienda = document.getElementById('contenedor-productos');
        const contbanner = document.getElementById('banner-carousel-container');
        const contPedidos = document.getElementById('pedidos-container');
        const contFavoritos = document.getElementById('favoritos-container');

        // 1. Ocultar todos los contenedores primero
        contTienda.classList.add('d-none');
        contbanner.classList.add('d-none');
        if (contPedidos) contPedidos.classList.add('d-none');
        if (contFavoritos) contFavoritos.classList.add('d-none');
        // 2. Lógica de visibilidad del botón "Productos" en el Navbar
        if (vistaActual === 'tienda') {
            btnProductos.classList.add('d-none'); // Oculto si ya estoy en la tienda
            contTienda.classList.remove('d-none');
            contbanner.classList.remove('d-none');
            btnFavoritos.classList.remove('d-none');
        } else {
            btnProductos.classList.remove('d-none'); // Visible si estoy en favoritos o compras

            if (vistaActual === 'favoritos') {
                contFavoritos.classList.remove('d-none');
                btnFavoritos.classList.add('d-none');
            } else if (vistaActual === 'compras') {
                contPedidos.classList.remove('d-none');
            }
        }
    }

    function mostrarVistaTienda() {
        gestionarNavegacion('tienda');
        mostrandoFavoritos = false
    }

    async function mostrarVistaFavoritos() {
        gestionarNavegacion('favoritos');
        cargarFavoritos(); // Tu función que trae los datos de Firebase
    }

    function mostrarVistaCompras() {
        gestionarNavegacion('compras');
        cargarDatosPedidos(); // Tu función que trae las compras
    }

    // Variable global para rastrear favoritos del usuario actual
    let idsFavoritosUser = [];

    async function obtenerFavoritosDelUsuario() {
        const user = firebase.auth().currentUser;
        if (!user) {
            idsFavoritosUser = [];
            return;
        }

        try {
            const snapshot = await db.collection("favoritos")
                .where("userId", "==", user.uid)
                .get();

            // Guardamos solo los IDs de los productos en un array simple
            idsFavoritosUser = snapshot.docs.map(doc => doc.data().idProducto);
        } catch (error) {
            console.error("Error obteniendo IDs de favoritos:", error);
        }
    }

    // 1. Instanciar el menú de Bootstrap (ponlo al inicio de tu JS o dentro de un DOMContentLoaded)
const modalMenuCategorias = new bootstrap.Offcanvas(document.getElementById('menuCategorias'));

/**
 * Abre el menú lateral de categorías
 */
function abrirMenuCategorias() {
    modalMenuCategorias.show();
}

/**
 * Cierra el menú lateral de categorías
 */
function cerrarMenuCategorias() {
    modalMenuCategorias.hide();
}

function filtrarPorCategoria(categoria, productos) {
    const contenedor = document.getElementById('contenedor-productos');
    contenedor.innerHTML = '';
    let i = 0;
 
    if(productos.length !== 0){

      while (i < productos.length) {
          // Pintar hasta 8 bolsos
          for (let count = 0; i < productos.length; count++) {
              renderizarTarjetaProducto(productos[i], contenedor, appData, productos[i].idProducto);
              i++;
          }
      }
    } else { 
      contenedor.innerHTML = '<p class="text-center w-100">No hay productos disponibles.</p>'
    }
    // Aquí pones tu lógica de Firebase para filtrar (ej. consulta con .where())
    // ...
    
    // Al finalizar el filtrado, cierras el menú limpiamente
    cerrarMenuCategorias();
}


function generarFormularios() {
  const cantidad = document.getElementById('cantAbonar').value;
  const contenedor = document.getElementById('contenedorFormularios');
  contenedor.innerHTML = "";

  for (let i = 0; i < cantidad; i++) {
    contenedor.innerHTML += `
      <div class="border p-3 mb-3 rounded bg-white shadow-sm item-nuevo-producto" data-index="${i}">
        <h6>📦 Producto #${i + 1}</h6>
        <div class="row g-2">
          <div class="col-md-6">
            <input type="text" name="nombre" class="form-control mb-2" placeholder="Nombre del producto" required>
          </div>
          <div class="col-md-3">
            <input type="number" name="precio" class="form-control mb-2" placeholder="Precio" required>
          </div>
          <div class="col-md-3">
            <input type="number" name="stock" class="form-control mb-2" placeholder="Stock" required>
          </div>
          <div class="col-md-12">
            <textarea name="descripcion" class="form-control mb-2" placeholder="Descripción breve"></textarea>
          </div>
          <div class="col-md-6">
            <select name="cliente" class="form-select">
              <option value="cliente">Clientes</option>
              <option value="proveedor">Proveedores</option>
            </select>
          </div>
          <div class="col-md-6">
            <select 
              name="producto"
              class="form-select"
              id="nuevoBolsaCategoria" 
              onchange="selectProductOption(this.value, 'selectSubcategoria${i}')">
              
              <option value="bolsos">Bolsos</option>
              <option value="llavero">Llavero</option>
              <option value="sobrero">Sombrero</option>
              <option value="ropa">Ropa</option>
            </select>
          </div>
          
          <div class="col-md-6">
            <input type="file" name="imagen" class="form-control mb-2" accept="image/*" multiple>
          </div>
          <div class="col-md-6" style="display:none" id="selectSubcategoria${i}">
            <select name="BolsoCategoria" class="form-select">
              <option value="personalizado">Personalizado</option>
              <option value="elegante">Elegante</option>
              <option value="casual">Casual</option>
              <option value="mochila">Mochila</option>
              <option value="cartera">Cartera</option>
              <option value="divertida">Divertida</option>
              <option value="alternativa">Alternativa</option>
            </select>
          </div>
        </div>
      </div>`;
  }

  document.getElementById('pasoCantidad').classList.add('d-none');
  document.getElementById('pasoFormularios').classList.remove('d-none');
}

function selectProductOption(e, divSub){
  e === "bolsos" 
  ? document.getElementById(divSub).style.display = "block"
  : document.getElementById(divSub).style.display = "none"
}

async function guardarProductosMasivos() {
  const btn = document.getElementById('btnGuardarMasivo');
  
  const user = firebase.auth().currentUser; // 1. Validar usuario
  if (!user) return mostrarNotificacion("Debes iniciar sesión", "error");

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Subiendo imágenes e insertando...';

  const items = document.querySelectorAll('.item-nuevo-producto');
  
  try {
    const listaPromesas = Array.from(items).map(async (item) => {
      const fileInput = item.querySelector('[name="imagen"]');
      let urlsImagenes = [];
      const files = fileInput.files;
      if (files.length > 0) {
        // Subimos todas las imágenes del producto en paralelo
        const promesasImagenes = Array.from(files).map(file => subirAStorage(file));
        urlsImagenes = await Promise.all(promesasImagenes);
      }

      let sku = "SKU-" + Math.floor(Math.random() * 10000000000);
      
      return {
        idProducto: sku,
        nombre: item.querySelector('[name="nombre"]').value,
        precio: parseFloat(item.querySelector('[name="precio"]').value) || 0,
        stock: parseInt(item.querySelector('[name="stock"]').value) || 0,
        imagenes: urlsImagenes.join(','),
        descripcion: item.querySelector('[name="descripcion"]').value,
        tipoProducto: item.querySelector('[name="producto"]').value,
        tipoCliente: item.querySelector('[name="cliente"]').value,
        subCategoria: item.querySelector('[name="BolsoCategoria"]').value
      };
    });

    const productosParaSubir = await Promise.all(listaPromesas);

    // Guardar en Firestore (Batch Write)
    const batch = db.batch();
    productosParaSubir.forEach((producto) => {
      const nuevoRef = db.collection("productos").doc(producto.idProducto);
      batch.set(nuevoRef, producto);
    });

    await batch.commit();

    // Interfaz de éxito
    const modalForm = bootstrap.Modal.getInstance(document.getElementById('modalNuevoProducto'));
    if (modalForm) modalForm.hide();

    btn.disabled = false;
    btn.innerText = "Guardar Todos los Productos";
    resetFormularioMasivo();

    const modalExito = new bootstrap.Modal(document.getElementById('modalExitoCarga'));
    modalExito.show();

    cargarProductosSegunRol(appData.rol, appData.perfil);

  } catch (error) {
    console.error("Error en carga masiva:", error);
    mostrarNotificacion("Error: " + error.message, "error");
    btn.disabled = false;
    btn.innerText = "Reintentar Guardado";
  }
}

async function subirAStorage(file) {
  const storageRef = firebase.storage().ref();
  const nombreUnico = `productos/${Date.now()}_${file.name}`;
  const referencia = storageRef.child(nombreUnico);
  
  const snapshot = await referencia.put(file);
  return await snapshot.ref.getDownloadURL();
}

/**
 * Función auxiliar para convertir archivos a Base64
 */
function leerArchivoComoBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve({
      base64: e.target.result.split(',')[1], // Solo el contenido
      type: file.type,
      name: file.name
    });
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function resetFormularioMasivo() {
  document.getElementById('pasoCantidad').classList.remove('d-none');
  document.getElementById('pasoFormularios').classList.add('d-none');
  document.getElementById('formMasivo').reset();
}

// Al cargar la página o script
function inicializarCarrito() {
    const datosLocales = localStorage.getItem('carrito_libreaura');
    if (datosLocales) {
        // Llenamos nuestra variable global con lo que había en el navegador
        const contenidoRecuperado = JSON.parse(datosLocales);
        
        // Es importante vaciar y llenar el arreglo original para mantener referencias
        cart.length = 0; 
        cart.push(...contenidoRecuperado);
        
        updateCartUI();
    }
}

// Llamar inmediatamente
inicializarCarrito();

// 1. Función para preparar y mostrar el modal
function prepararCambioPerfil() {
    const user = firebase.auth().currentUser;
    if (!user) return mostrarNotificacion("Inicia sesión para continuar", "error");

    const rolActual = appData.perfil.rol; // Obtenemos el rol desde tu objeto global
    const modalTitle = document.getElementById('modalRolTitle');
    const modalMensaje = document.getElementById('modalRolMensaje');
    const boxBeneficios = document.getElementById('beneficiosMayorista');
    const btnConfirmar = document.getElementById('btnConfirmarCambio');

    if (rolActual === 'cliente') {
        modalTitle.innerText = "✨ ¡Conviértete en Mayorista!";
        modalMensaje.innerText = "¿Estás seguro que quieres cambiar tu perfil de cliente a cliente mayorista?";
        boxBeneficios.classList.remove('d-none');
        
    } else {
        modalTitle.innerText = "🔄 Volver a Cliente Estándar";
        modalMensaje.innerText = "¿Deseas regresar tu perfil a cliente estándar?";
        boxBeneficios.classList.add('d-none');
    }

    // Configuramos el evento click del botón de confirmación
    btnConfirmar.onclick = () => ejecutarCambioEnBD(user.uid, rolActual);

    // Abrimos el modal
    const myModal = new bootstrap.Modal(document.getElementById('modalToggleRol'));
    myModal.show();
}

// 2. Función que impacta la Base de Datos
async function ejecutarCambioEnBD(uid, rolActual) {
    const btn = document.getElementById('btnConfirmarCambio');
    const nuevoRol = (rolActual === 'cliente') ? 'proveedor' : 'cliente';

    try {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Procesando...';

        // Actualizar en Firebase Firestore
        await db.collection("usuarios").doc(uid).update({
            rol: nuevoRol
        });

        // Actualizar datos locales para que la UI reaccione
        appData.perfil.rol = nuevoRol;
        appData.rol = nuevoRol;

        mostrarNotificacion(`¡Perfil actualizado a ${nuevoRol}!`, "success");

        // Cerrar modal y refrescar la vista
        const modalEl = document.getElementById('modalToggleRol');
        bootstrap.Modal.getInstance(modalEl).hide();
        
        // Refrescamos los productos según el nuevo rol
        cargarProductosSegunRol(nuevoRol, appData.perfil);

    } catch (error) {
        console.error("Error al cambiar perfil:", error);
        mostrarNotificacion("No se pudo actualizar el perfil", "error");
    } finally {
        btn.disabled = false;
        btn.innerText = "Confirmar Cambio";
    }
}

const footerRef = db.collection("configuracion").doc("footer");

// 1. Cargar imágenes al iniciar
async function cargarFooter() {
    const doc = await footerRef.get();
    if (doc.exists) {
        const data = doc.data();
        
        // Verificamos que los elementos existan antes de asignar .src para evitar errores
        const img1 = document.querySelector("#footer-img-1 img");
        const img2 = document.querySelector("#footer-img-2 img");
        const img3 = document.querySelector("#footer-img-3 img");
        const navLogo = document.getElementById('nav-logo-dynamic');

        if (img1) img1.src = data.img1 || 'placeholder.png';
        if (img2) img2.src = data.img2 || 'placeholder.png';
        if (img3) img3.src = data.img3 || 'placeholder.png';
        if (navLogo) navLogo.src = data.navLogo || 'default-logo.png';
    }
}

// 2. Abrir modal y mostrar controles
async function abrirModalGestionFooter() {
    const doc = await footerRef.get();
    const data = doc.exists ? doc.data() : { img1: '', img2: '', img3: '', navLogo: '' };
    
    const container = document.getElementById('listaEdicionFooter');
    if (!container) return; // Seguridad
    container.innerHTML = '';

    // SECCIÓN NAVBAR
    container.innerHTML += `
        <div class="mb-4 p-3 border rounded border-primary" style="background-color: #f0f7ff;">
            <h6>Logo del Navbar (Cabecera)</h6>
             <img src="${data.navLogo || ''}" id="prev-nav-logo" class="img-thumbnail mb-2 d-block" style="height: 60px">
            <input type="file" class="form-control form-control-sm" id="file-nav-logo">
            <div class="d-flex gap-2">
                <button class="btn btn-primary btn-sm mt-2" onclick="subirImagenGeneral('navLogo', 'file-nav-logo')">Actualizar Logo</button>
                <button class="btn btn-outline-danger btn-sm mt-2" onclick="eliminarImagenConfig('navLogo')">Eliminar Logo</button>
            </div>
        </div>
        <hr>`;

    // SECCIÓN FOOTER
    for (let i = 1; i <= 3; i++) {
        container.innerHTML += `
            <div class="mb-4 p-3 border rounded">
                <h6>Imagen Footer ${i}</h6>
                <img src="${data['img'+i] || 'placeholder.png'}" class="img-thumbnail mb-2 d-block" style="height: 80px">
                <input type="file" class="form-control form-control-sm" id="file-footer-${i}" accept="image/*">
                <button class="btn btn-primary btn-sm mt-2" onclick="subirImagenGeneral('img${i}', 'file-footer-${i}')">Actualizar Imagen ${i}</button>
            </div>`;
    }

    const modalElement = document.getElementById('modalGestionFooter');
    if (modalElement) {
        const myModal = new bootstrap.Modal(modalElement);
        myModal.show();
    }
}

// 3. Función Genérica para subir
async function subirImagenGeneral(campoDoc, inputId) {
    const user = firebase.auth().currentUser;
    if (!user) return mostrarNotificacion("Inicia sesión primero", "error");

    const fileInput = document.getElementById(inputId);
    const file = fileInput ? fileInput.files[0] : null;
    if (!file) return mostrarNotificacion("Selecciona un archivo", "warning");

    try {
        const fileName = `${campoDoc}_${Date.now()}`;
        // Usamos la carpeta 'footer' que es la que probablemente ya tiene permisos
        const uploadTask = await firebase.storage().ref(`footer/${fileName}`).put(file);
        const url = await uploadTask.ref.getDownloadURL();

        const updateData = {};
        updateData[campoDoc] = url;

        await footerRef.set(updateData, { merge: true });

        mostrarNotificacion("Imagen actualizada con éxito", "success");
        cargarFooter();
        cerrarModalCorrectamente()
    } catch (error) {
        console.error("Error:", error);
        mostrarNotificacion("Error al subir imagen", "error");
    }
}

// 4. Eliminar
async function eliminarImagenConfig(campoDoc) {
    if (!confirm("¿Estás seguro de que quieres eliminar esta imagen?")) return;
    
    try {
        const updateData = {};
        updateData[campoDoc] = ""; 
        await footerRef.update(updateData);
        
        mostrarNotificacion("Imagen eliminada", "info");
        cargarFooter();
        abrirModalGestionFooter();
        cerrarModalCorrectamente()
    } catch (error) {
        console.error(error);
        mostrarNotificacion("Error al eliminar", "error");
    }
}

// Ejecutar carga inicial
cargarFooter();


    function abrirEditor(skuProducto) {
        const user = auth.currentUser;
        db.collection("usuarios").doc(user.uid).get().then((doc) => {
            // Si es admin, mostramos el modal de edición

            const producto = appData.productos.find(item => item.idProducto === skuProducto);
            let imagen = producto.imagenes ? producto.imagenes.split(',')[0] : '';
            document.getElementById('eNomSKU').value = producto.idProducto;
            document.getElementById('eNom').value = producto.nombre;
            document.getElementById('ePre').value = producto.precio;
            document.getElementById('eSto').value = producto.stock;
            document.getElementById('eDes').value = producto.descripcion;
            document.getElementById('ImgNom').src = imagen;
            document.getElementById('eTipoCliente').value = producto.tipoCliente;
            document.getElementById('eTipoProducto').value = producto.tipoProducto;
            document.getElementById('eTiposubCategoria').value = producto.subCategoria;
            prepararEdicion(producto.imagenes)
            new bootstrap.Modal(document.getElementById('editModal')).show();
        });
    }

    /**
     * Solicita confirmación antes de borrar
     */
    function confirmarEliminacion(sku) {
        const producto = appData.productos.find(item => item.idProducto === sku);

        if (!producto) {
            mostrarNotificacion("No pudimos encontrar tu producto", "warning");
            return;
        }
        if (confirm(`¿Estás seguro de que deseas eliminar permanentemente el producto "${producto.nombre}"?`)) {
            eliminarProductoServidor(sku);
        }
    }

    async function eliminarProductoServidor(idProducto) {
        let contentProdut = document.getElementById('contenedor-productos');
        let textoOriginal = contentProdut.innerHTML;

        contentProdut.innerHTML = '<div class="text-center w-100 py-5"><div class="spinner-border text-danger"></div><p>Eliminando archivos y producto...</p></div>';

        try {
            // 1. Obtener los datos del producto antes de borrarlo para tener las URLs de las fotos
            const docRef = db.collection("productos").doc(idProducto);
            const docSnap = await docRef.get();

            if (docSnap.exists) {
                const datos = docSnap.data();
                const fotos = datos.imagenes ? datos.imagenes.split(',').filter(url => url.trim() !== "") : [];

                // 2. Eliminar cada foto de Firebase Storage
                const promesasBorrado = fotos.map(async (url) => {
                    try {
                        // Solo intentar borrar si es una URL válida de Firebase
                        if (url.includes("firebasestorage.googleapis.com")) {
                            const refImagen = firebase.storage().refFromURL(url);
                            await refImagen.delete();
                            console.log("Imagen física eliminada de Storage");
                        }
                    } catch (err) {
                        console.warn("La imagen no se pudo borrar de Storage (tal vez ya no existía):", err);
                    }
                });

                // Esperamos a que terminen todos los borrados de Storage
                await Promise.all(promesasBorrado);
            }

            // 3. Ahora que las fotos se borraron (o se intentó), borramos el documento de Firestore
            await docRef.delete();

            // 4. Éxito
            mostrarNotificacion("Producto y fotos eliminados correctamente.", "success");
            cargarProductosSegunRol(appData.rol, appData.perfil);

        } catch (error) {
            console.error("Error crítico al eliminar:", error);
            mostrarNotificacion("Error al eliminar el producto", "error");
            contentProdut.innerHTML = textoOriginal; // Restauramos la vista original
        }
    }
async function addToCart(productId) {
    // 1. Buscamos el producto en el catálogo
    const p = appData.productos.find(item => item.idProducto === productId);

    if (!p) {
        mostrarNotificacion("Error: Producto no encontrado", "error");
        return;
    }

    // 2. Identificar cantidad (Modal o Tarjeta)
    const modalDetalleEl = document.getElementById('modalDetalle');
    const esDesdeModal = modalDetalleEl && modalDetalleEl.classList.contains('show');
    let cantidadAñadir = 0;

    if (esDesdeModal) {
        const qtyModal = document.getElementById('qtyDetalle');
        cantidadAñadir = parseInt(qtyModal.value) || 0;
    } else {
        const qtyInput = document.getElementById(`qty-${productId}`);
        cantidadAñadir = parseInt(qtyInput.value) || 0;
    }

    // 3. Validaciones
    if (cantidadAñadir <= 0) {
        mostrarNotificacion("Ingresa una cantidad válida", "warning");
        return;
    }

    // Usamos 'cart' (o appData.carrito según tu estructura)
    const itemEnCarrito = cart.find(item => item.idProducto === productId);
    const cantidadActualEnCarrito = itemEnCarrito ? itemEnCarrito.cantidad : 0;

    if ((cantidadActualEnCarrito + cantidadAñadir) > p.stock) {
        mostrarNotificacion(`Stock insuficiente. Máximo disponible: ${p.stock}`, "warning");
        return;
    }

    // 4. Lógica de inserción o suma
    if (itemEnCarrito) {
        itemEnCarrito.cantidad += cantidadAñadir;
    } else {
        cart.push({ ...p, cantidad: cantidadAñadir });
    }

    // --- 5. PERSISTENCIA ---
    
    // A. Guardar en LocalStorage (Para recargas de página)
    localStorage.setItem('carrito_libreaura', JSON.stringify(cart));

    // B. Guardar en Firebase (Para cierres de sesión/navegador)
    const user = firebase.auth().currentUser;
    if (user) {
        try {
            await db.collection("carritos").doc(user.uid).set({
                items: cart,
                ultimaActualizacion: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.error("Error al sincronizar con Firebase:", error);
        }
    }

    // 6. Actualizar UI y Limpieza
    updateCartUI();

    if (esDesdeModal) {
        const modalInstance = bootstrap.Modal.getInstance(modalDetalleEl);
        if (modalInstance) modalInstance.hide();
    } else {
        const qtyInput = document.getElementById(`qty-${productId}`);
        if (qtyInput) qtyInput.value = 1;
    }

    mostrarNotificacion(`¡${cantidadAñadir} unidad(es) añadida(s)!`, "success");
}

    function actualizarEstadoBotones(index) {
        const p = appData.productos[index];
        const btn = document.querySelector(`button[onclick="addToCart(${index})"]`);
        const itemEnCarrito = cart.find(item => item.rowIdx === p.rowIdx && item.hojaOrigen === p.hojaOrigen);
        const cantidadEnCarrito = itemEnCarrito ? itemEnCarrito.cantidad : 0;

        if (btn && cantidadEnCarrito >= p.stock) {
            btn.disabled = true;
            btn.classList.replace('btn-dark', 'btn-secondary');
            btn.innerText = "Límite alcanzado";
        }
    }

    function verDetalle(idPedido) {

        // 1. Buscamos el producto exacto en tu lista global mediante su ID
        // NOTA: Asegúrate de guardar el 'id' en tus objetos cuando haces el fetch de Firebase
        const producto = appData.productos.find(p => p.idProducto === idPedido);
        console.log("producto- > ", producto)
        if (!producto) {
            return mostrarNotificacion("No se encontró la información del producto", "error");
        }

        document.getElementById('detalleNombre').innerText = producto.nombre;
        document.getElementById('detalleDescripcion').innerText = producto.descripcion;
        document.getElementById('detallePrecio').innerText = `$${producto.precio}`;
        document.getElementById('detalleStock').innerText = `Stock disponible: ${producto.stock}`;

        // Configurar límites del input de cantidad
        const inputQty = document.getElementById('qtyDetalle');
        const btnSumar = document.getElementById('btnSumarDetalle');
        const btnRestar = document.getElementById('btnRestarDetalle');
        const avisoStock = document.getElementById('maxStockAviso');

        inputQty.value = 1;
        inputQty.max = producto.stock;
        avisoStock.innerText = `Máximo disponible: ${producto.stock} pzs`;

        // Lógica de botones +/-
        btnSumar.onclick = () => {
            let actual = parseInt(inputQty.value);
            if (actual < producto.stock) inputQty.value = actual + 1;
        };

        btnRestar.onclick = () => {
            let actual = parseInt(inputQty.value);
            if (actual > 1) inputQty.value = actual - 1;
        };

        // Manejo de Imágenes
        const listaIds = producto.imagenes.split(',');
        let carouselInner = document.getElementById('carouselImagenes');
        carouselInner.innerHTML = '';

        listaIds.forEach((idDrive, index) => {
            const activeClass = index === 0 ? 'active' : '';
            carouselInner.innerHTML += `
            <div class="carousel-item ${activeClass}">
                <img src="${idDrive.trim()}" class="d-block w-100 img-fluid rounded" style="height: 300px; object-fit: contain;">
            </div>`;
        });

        // Configurar botón de agregar
        const btnAgregar = document.getElementById('btnAgregarDesdeDetalle');
        btnAgregar.onclick = () => {
            const cantidadSeleccionada = parseInt(inputQty.value);

            // Sincronizamos con el input oculto de la tarjeta principal si es necesario
            // o simplemente pasamos el valor directamente a addToCart
            const qtyPrincipal = document.getElementById(`qty-${idPedido}`);
            if (qtyPrincipal) qtyPrincipal.value = cantidadSeleccionada;

            addToCart(idPedido);

            // Cerrar modal
            const modalInstance = bootstrap.Modal.getInstance(document.getElementById('modalDetalle'));
            modalInstance.hide();
        };

        new bootstrap.Modal(document.getElementById('modalDetalle')).show();
    }
    async function guardarEdicion() {
        const fileInput = document.getElementById('upNewImg');
        const files = fileInput.files;

        // 1. Obtener datos actuales del modal
        const idProducto = document.getElementById('eNomSKU').value;

        // Estas son las URLs que el usuario decidió MANTENER (las que no borró en el modal)
        let listaUrlsFinales = document.getElementById('editIdsActuales').value.split(',')
            .map(s => s.trim()).filter(s => s !== "");

        const btn = document.getElementById("saveChangeId");
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Actualizando...';

        try {
            // --- PARTE A: LIMPIEZA DE IMÁGENES BORRADAS ---
            // 2. Obtener las URLs que estaban originalmente en la base de datos para comparar
            const docActual = await db.collection("productos").doc(idProducto).get();
            const datosViejos = docActual.data();
            const urlsOriginales = datosViejos.imagenes ? datosViejos.imagenes.split(',') : [];

            // Identificar cuáles estaban antes pero ya no están en la lista final
            const urlsABorrar = urlsOriginales.filter(url => !listaUrlsFinales.includes(url));

            // Borrar físicamente de Storage
            const promesasBorrado = urlsABorrar.map(async (url) => {
                try {
                    // Solo intentamos borrar si es una URL de Firebase Storage
                    if (url.includes("firebasestorage.googleapis.com")) {
                        const ref = firebase.storage().refFromURL(url);
                        await ref.delete();
                        console.log("Archivo eliminado de Storage:", url);
                    }
                } catch (e) {
                    console.warn("No se pudo borrar el archivo físico (tal vez ya no existía):", e);
                }
            });
            await Promise.all(promesasBorrado);


            // --- PARTE B: SUBIDA DE NUEVAS IMÁGENES ---
            // 3. Subir las nuevas fotos seleccionadas
            if (files.length > 0) {
                const promesasSubida = Array.from(files).map(async (file) => {
                    const storageRef = firebase.storage().ref();
                    const nombreUnico = `productos/${Date.now()}_${file.name}`;
                    const referencia = storageRef.child(nombreUnico);

                    const snapshot = await referencia.put(file);
                    return await snapshot.ref.getDownloadURL();
                });

                const nuevasUrls = await Promise.all(promesasSubida);
                listaUrlsFinales = listaUrlsFinales.concat(nuevasUrls);
            }


            // --- PARTE C: ACTUALIZAR FIRESTORE ---

            const datosActualizados = {
                idProducto: idProducto,
                nombre: document.getElementById('eNom').value,
                precio: parseFloat(document.getElementById('ePre').value),
                stock: parseInt(document.getElementById('eSto').value),
                imagenes: listaUrlsFinales.join(','), // Guardamos la lista combinada y limpia
                descripcion: document.getElementById('eDes').value,
                tipoProducto: document.getElementById('eTipoProducto').value,
                tipoCliente: document.getElementById('eTipoCliente').value,
                subCategoria: document.getElementById('eTiposubCategoria').value
            };

            await db.collection("productos").doc(idProducto).update(datosActualizados);

            // Refrescar y cerrar
            cargarProductosSegunRol(appData.rol, appData.perfil);
            const modalEdicion = bootstrap.Modal.getInstance(document.getElementById('editModal'));
            if (modalEdicion) modalEdicion.hide();

            mostrarNotificacion("Producto actualizado y Storage optimizado", "success");

        } catch (error) {
            console.error("Error al editar:", error);
            mostrarNotificacion("Error: " + error.message, "error");
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
            fileInput.value = "";
        }
    }

    function prepararEdicion(imagenesStr) {
        // 1. Guardar los IDs actuales en el input oculto
        document.getElementById('editIdsActuales').value = imagenesStr;

        // 2. Mostrar miniaturas para saber qué hay
        const contenedor = document.getElementById('contenedorMiniaturasEdit');
        contenedor.innerHTML = '';

        if (imagenesStr) {
            const ids = imagenesStr.split(',');
            ids.forEach(id => {
                contenedor.innerHTML += `
        <div class="position-relative" id="mini-${id.trim()}">
          <img src="${id.trim()}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 5px;">
          <button type="button" class="butondeletedImg btn btn-danger btn-xs position-absolute top-0 end-0" onclick="eliminarImagenDeLista('${id.trim()}')">×</button>
        </div>`;
            });
        }

        // Abrir el modal de edición...
    }

    function eliminarImagenDeLista(id) {
        // Elimina la miniatura visualmente y del input oculto
        document.getElementById(`mini-${id}`).remove();
        let actuales = document.getElementById('editIdsActuales').value.split(',');
        actuales = actuales.filter(item => item.trim() !== id);
        document.getElementById('editIdsActuales').value = actuales.join(',');
    }

    function mostrarNotificacion(mensaje, tipo = 'error') {
        const modalEl = document.getElementById('modalAlerta');
        const tituloEl = document.getElementById('tituloAlerta');
        const mensajeEl = document.getElementById('mensajeAlerta');
        const iconoEl = document.getElementById('iconoAlerta');

        // Configuración según el tipo
        const configuracion = {
            error: {
                titulo: '❌ Error en el Sistema',
                icono: '⚠️',
                colorIcono: 'text-danger'
            },
            warning: {
                titulo: '⚠️ Atención',
                icono: '🔔',
                colorIcono: 'text-warning'
            },
            success: {
                titulo: '✅ Éxito',
                icono: '🎉',
                colorIcono: 'text-success'
            }
        };

        const config = configuracion[tipo] || configuracion.error;

        // Inyectar datos
        tituloEl.innerText = config.titulo;
        mensajeEl.innerText = mensaje;
        iconoEl.innerHTML = config.icono;
        iconoEl.className = `display-1 mb-3 ${config.colorIcono}`;

        // Mostrar el modal
        const modalBootstrap = new bootstrap.Modal(modalEl);
        modalBootstrap.show();
    }

async function toggleFavorito(idProducto) {
    const user = firebase.auth().currentUser;
    if (!user) {
        mostrarNotificacion("Inicia sesión para guardar favoritos ❤️", "warning");
        return;
    }

    const favoritoId = `${user.uid}_${idProducto}`;
    const favRef = db.collection("favoritos").doc(favoritoId);
    const btnIcono = document.querySelector(`#fav-btn-${idProducto} i`);

    try {
        const doc = await favRef.get();

        if (doc.exists) {
            // --- ELIMINAR ---
            
            // 1. Cambio visual del icono
            if (btnIcono) {
                btnIcono.classList.replace('bi-heart-fill', 'bi-heart');
            }

            // 2. ELIMINACIÓN FÍSICA DEL HTML (La solución que buscas)
            // Si el usuario está en la vista de favoritos, removemos la card
            const cardProducto = document.getElementById(`card-favorito-${idProducto}`);
            if (cardProducto) {
                cardProducto.style.opacity = '0'; // Efecto de desvanecimiento opcional
                setTimeout(() => cardProducto.remove(), 300); 
            }

            await favRef.delete();
            idsFavoritosUser = idsFavoritosUser.filter(id => id !== idProducto);
            mostrarNotificacion("Eliminado de favoritos", "success");

        } else {
            // --- AGREGAR ---
            // (Tu código de agregar se mantiene igual...)
            const producto = appData.productos.find(p => p.idProducto === idProducto);
            if (!producto) return;

            if (btnIcono) {
                btnIcono.classList.replace('bi-heart', 'bi-heart-fill');
            }
            await favRef.set({
                userId: user.uid,
                idProducto: idProducto,
                nombre: producto.nombre,
                precio: producto.precio,
                imagenes: producto.imagenes,
                descripcion: producto.descripcion,
                stock: producto.stock,
                fechaGuardado: firebase.firestore.FieldValue.serverTimestamp()
            });

            if (!idsFavoritosUser.includes(idProducto)) idsFavoritosUser.push(idProducto);
            mostrarNotificacion("¡Agregado! ❤️", "success");
        }

        // Si tienes una función que renderiza la lista, esto la refresca
        if (typeof mostrandoFavoritos !== 'undefined' && mostrandoFavoritos) {
             // Si no usas .remove(), podrías llamar a cargarFavoritos()
             // Pero llamar a la función puede ser lento, .remove() es instantáneo.
             cargarFavoritos()
        }

    } catch (error) {
        console.error("Error:", error);
        mostrarNotificacion("No se pudo procesar", "error");
        // ... (Tu lógica de revertir icono)
    }
}

    let mostrandoFavoritos = false;

    async function cargarFavoritos() {
      mostrandoFavoritos = true
        const user = firebase.auth().currentUser;
        const container = document.getElementById('favoritos-container');

        container.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h3>Mis Favoritos ❤️</h3>
        </div>
        <div id="grid-favoritos" class="row g-3">
            <div class="text-center p-5"><div class="spinner-border text-danger"></div></div>
        </div>`;

        const grid = document.getElementById('grid-favoritos');

        try {
            const snapshot = await db.collection("favoritos")
                .where("userId", "==", user.uid)
                .get();

            if (snapshot.empty) {
                grid.innerHTML = '<div class="col-12 text-center"><p class="text-muted">Aún no tienes productos guardados.</p></div>';
                return;
            }

            let html = '';
            snapshot.forEach(doc => {
                const item = doc.data();
                // Usamos la misma lógica de imagen que en tu catálogo
                const img = item.imagenes.split(",")[0];
                const id = item.idProducto;
                html += `
                <div class="col-6 col-md-6 col-lg-3">
                    <div class="card card-product h-100 shadow-sm border-0">
                        <button class="btn btn-light btn-sm shadow-sm" 
                                onclick="toggleFavorito('${id}')" 
                                style="position: absolute; top: 8px; right: 8px; z-index: 10; border-radius: 50%;">
                            <i class="bi bi-x-lg text-danger"></i>
                        </button>

                        <img src="${img}" class="card-img-top" style="height: 180px; object-fit: cover; cursor: pointer;" onclick="verDetalle('${id}')">
                        
                        <div class="card-body p-2 d-flex flex-column">
                            <h6 class="small text-truncate mb-1">${item.nombre}</h6>
                            <p class="mb-2 small">${item.descripcion}</p>
                            <p class="priceProduct mb-2 small">$${item.precio}</p>
                            
                            <div class="input-group input-group-sm mb-2">
                                <input type="number" id="qty-${id}" class="form-control" value="1" min="1" style="max-width: 50px; display: none;">
                                <button onclick="addToCart('${id}')" class="btn buttonFavCard flex-fill">
                                    <i class="bi bi-cart-plus-fill"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>`;
            });

            grid.innerHTML = html;

        } catch (error) {
            console.error("Error:", error);
            grid.innerHTML = '<div class="alert alert-danger">No se pudieron cargar los favoritos.</div>';
        }
    }

const bannerRef = db.collection("banner_imagenes"); //
const storageRef = firebase.storage().ref("banner_fotos"); //

// 1. Cargar el Carrusel en la Página Principal
async function cargarCarrusel() {
    const slidesContainer = document.getElementById('carousel-slides');
    const snapshot = await bannerRef.orderBy("fecha", "desc").get();
    
    let html = "";
    snapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        html += `
            <div class="carousel-item ${index === 0 ? 'active' : ''}">
                <img src="${data.url}" class="d-block w-100 imgcarruselBanner">
            </div>`;
    });
    slidesContainer.innerHTML = html || "<p class='text-center p-5'>No hay imágenes en el banner.</p>";
}

// 2. Abrir Modal y Listar Fotos para Editar (Versión Blindada)
async function abrirModalGestionBanner() {
    const listaGestion = document.getElementById('listaFotosGestion');
    if (!listaGestion) return;
    
    // Abrimos el modal inmediatamente para que el usuario no sienta que se "congeló" la página
    const modalElement = document.getElementById('modalGestionBanner');
    let myModal = bootstrap.Modal.getInstance(modalElement);
    if (!myModal) {
        myModal = new bootstrap.Modal(modalElement, { focus: false });
    }
    myModal.show();

    listaGestion.innerHTML = "<p class='text-center w-100'>Cargando imágenes del carrusel...</p>";
    
    try {
        const snapshot = await bannerRef.orderBy("fecha", "desc").get();
        let html = "";
        
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            
            // Limpiamos y escapamos las comillas simples de las rutas para evitar errores de sintaxis en el HTML string
            const docId = doc.id.trim();
            const storagePath = (data.storagePath || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");

            html += `
                <div class="col-4 col-md-3 position-relative mb-2">
                    <img src="${data.url}" class="img-thumbnail w-100" style="height: 100px; object-fit: cover;">
                    <button class="btn btn-danger btn-sm position-absolute top-0 end-0 m-1" 
                            type="button"
                            onclick="eliminarFotoBanner('${docId}', '${storagePath}')">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>`;
        });
        
        listaGestion.innerHTML = html || "<p class='text-center w-100 text-muted p-3'>No hay fotos en el banner</p>";
        
    } catch (error) {
        console.error("Error al listar banner:", error);
        listaGestion.innerHTML = "<p class='text-center text-danger w-100'>Error de permisos o lectura en la base de datos.</p>";
    }
}

// 3. Subir Nueva Foto a Storage y Firestore (Corregido de raíz)
async function subirFotoBanner() {
    const fileInput = document.getElementById('inputNuevaFoto');
    const file = fileInput ? fileInput.files[0] : null;
    if (!file) return mostrarNotificacion("Selecciona una imagen", "warning");

    try {
        const fileName = `${Date.now()}_${file.name}`;
        const path = `banner_fotos/${fileName}`; // Ruta de destino unificada

        // SOLUCIÓN: Subida directa usando la API global de Firebase apuntando a la ruta con carpeta
        const uploadTask = await firebase.storage().ref().child(path).put(file);
        const url = await uploadTask.ref.getDownloadURL();

        // Guardamos exactamente la misma estructura relacional en Firestore
        await bannerRef.add({
            url: url,
            storagePath: path, 
            fecha: firebase.firestore.FieldValue.serverTimestamp()
        });

        mostrarNotificacion("Imagen agregada al banner con éxito", "success");
        if (fileInput) fileInput.value = ""; // Limpiamos el selector de archivos

        // Refrescamos los componentes visuales de la página de forma limpia
        await abrirModalGestionBanner(); 
        if (typeof cargarCarrusel === "function") cargarCarrusel();
        
    } catch (error) {
        console.error("Error crítico al subir banner:", error);
        mostrarNotificacion("Error de permisos al intentar guardar la imagen", "error");
    }
}

// 4. Eliminar de Firestore y de Storage de manera consistente
async function eliminarFotoBanner(docId, storagePath) {
    if (!storagePath || storagePath === 'undefined' || storagePath === '') {
        return mostrarNotificacion("La imagen seleccionada no posee una ruta física válida en Storage", "error");
    }
    
    if (!confirm("¿Seguro que quieres eliminar esta imagen del carrusel?")) return;

    try {
        // 1. Eliminación física en Storage apuntando directo a la ruta guardada
        await firebase.storage().ref().child(storagePath).delete();
        
        // 2. Eliminación del documento relacional en la base de datos
        await bannerRef.doc(docId).delete();

        mostrarNotificacion("Imagen removida correctamente", "success");

        // Refrescamos los componentes visuales
        await abrirModalGestionBanner(); 
        if (typeof cargarCarrusel === "function") cargarCarrusel();
        
    } catch (error) {
        console.error("Error crítico al eliminar banner:", error);
        mostrarNotificacion("No se pudo completar la eliminación por restricciones de seguridad", "error");
    }
}

// Llamada inicial
cargarCarrusel();
function cerrarModalCorrectamente() {
    const modalEl = document.getElementById('modalGestionBanner');
    const modalInstance = bootstrap.Modal.getInstance(modalEl);
    
    if (modalInstance) {
        modalInstance.hide();
        
        // Refuerzo manual por si Bootstrap falla:
        modalEl.addEventListener('hidden.bs.modal', function () {
            const backdrop = document.querySelector('.modal-backdrop');
            if (backdrop) {
                backdrop.remove();
                document.body.style.overflow = 'auto'; // Devuelve el scroll a la página
                document.body.classList.remove('modal-open');
            }
        }, { once: true });
    }
}

async function enviarCorreoPedido(pedido) {
    const folio = pedido.folio;
    const totalFormateado = Number(pedido.total).toLocaleString('es-MX', { 
        style: 'currency', 
        currency: 'MXN' 
    });

    // 1. Crear la tabla de productos (Tu misma estructura)
    let tablaProductos = `
      <table style="width: 100%; border-collapse: collapse; font-family: sans-serif; font-size: 13px;">
        <tr style="background-color: #f8f9fa;">
          <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">📦 Producto</th>
          <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">📝 Descripción</th>
          <th style="padding: 10px; border: 1px solid #ddd; text-align: center;">Cant.</th>
          <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Subtotal</th>
        </tr>`;

    pedido.productos.forEach(p => {
        const subtotal = p.precio * p.cantidad;
        tablaProductos += `
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">${p.nombre}</td>
          <td style="padding: 10px; border: 1px solid #ddd; color: #666; font-style: italic;">${p.descripcion || "Sin descripción"}</td>
          <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${p.cantidad}</td>
          <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">$${subtotal.toFixed(2)}</td>
        </tr>`;
    });
    tablaProductos += `</table>`;

    // 2. DISEÑO PARA EL CLIENTE
    const htmlCliente = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px;">
        <h2 style="color: #28a745; text-align: center;">✅ CONFIRMACIÓN DE COMPRA</h2>
        <p>Hola <strong>${pedido.clienteNombre}</strong>, hemos registrado tu pedido con éxito.</p>
        <div style="background-color: #f9f9f9; border-left: 5px solid #28a745; padding: 15px; margin: 20px 0;">
          <span style="font-size: 18px;">🎫 <strong>FOLIO:</strong> ${folio}</span>
        </div>
        <p>🛍️ <strong>TU CARRITO:</strong></p>
        ${tablaProductos}
        <div style="text-align: right; margin-top: 20px;">
          <p style="font-size: 20px; color: #333;">💰 <strong>TOTAL A PAGAR:</strong> <span style="color: #28a745;">${totalFormateado}</span></p>
          <p style="color: #d9534f;">💳 <strong>ESTADO DE PAGO:</strong> Falta pago</p>
        </div>
        <div style="margin-top: 30px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px; background-color: #f8fafc;">
          <h3 style="color: #2563eb; margin-top: 0;">Datos de Pago (BBVA)</h3>
          <p style="margin: 5px 0;"><strong>Número de cuenta:</strong> 1575788351</p>
          <p style="margin: 5px 0;"><strong>CLABE Interbancaria:</strong> 012180015757883512</p>
          <p style="margin: 5px 0;"><strong>Número de tarjeta:</strong> 4152314453528153</p>
          <div style="margin-top: 15px; padding: 10px; background-color: #e0f2fe; border-radius: 5px; border: 1px solid #bae6fd; color: #0369a1;">
            Una vez realizada tu transferencia, envía el comprobante al: <strong>55 7504 4042</strong>
          </div>
        </div>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="font-size: 13px; color: #666; line-height: 1.6;">
          <strong>* IMPORTANTE:</strong><br>
          Estamos preparando tus productos. Te notificaremos por este medio cuando tu pedido cambie a "Pagado" o "Entregado".<br><br>
          ¡Gracias por tu preferencia!
        </p>
      </div>`;

    // 3. DISEÑO PARA EL ADMINISTRADOR
    const htmlAdmin = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 2px solid #d9534f; padding: 20px;">
        <h2 style="color: #d9534f; text-align: center;">🚨 NUEVO PEDIDO RECIBIDO</h2>
        <div style="background-color: #fff5f5; border: 1px solid #feb2b2; padding: 15px; border-radius: 8px;">
          <p style="margin: 5px 0;">📌 <strong>DATOS DEL PEDIDO</strong></p>
          <hr style="border: 0; border-top: 1px solid #feb2b2;">
          <p><strong>Folio:</strong> ${folio}</p>
          <p><strong>Cliente:</strong> ${pedido.clienteNombre} (${pedido.clienteEmail})</p>
          <p><strong>Total:</strong> ${totalFormateado}</p>
          <p><strong>Estatus:</strong> Solicitado</p>
        </div>
        <p style="margin-top: 20px;">📦 <strong>DETALLE DE PRODUCTOS:</strong></p>
        ${tablaProductos}
        <p style="text-align: center; margin-top: 25px; font-size: 13px; color: #555;">
          <i>Acceda al sistema administrativo para gestionar la entrega y validar el pago.</i>
        </p>
      </div>`;

    try {
        let infoEmailAdmini = {
            to_email: 'lauvillalobosc1@gmail.com',
            subject_dinamico: "🚨 Nuevo Pedido - " + folio,
            html_contenido: htmlAdmin
        }
        // Enviar al Administrador
        await emailjs.send(serviceEmailJs, templateIDEmail, infoEmailAdmini, publicKey);

        // Enviar al Cliente
        let infoEmialCliente = {
            to_email: pedido.clienteEmail,
            subject_dinamico: "✅ Confirmación de tu pedido - " + folio,
            html_contenido: htmlCliente
        }
        if (pedido.clienteEmail) {
            await emailjs.send(serviceEmailJs, templateIDEmail, infoEmialCliente, publicKey);
        }

        console.log("¡Correos enviados con éxito!");
    } catch (error) {
        console.error("Error al enviar con EmailJS:", error);
        throw error; // Re-lanzar para que el checkout sepa que falló
    }
}
