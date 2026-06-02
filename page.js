

    // Inicialización de EmailJS
    let serviceEmailJs = "service_p1gef1a";
    let publicKey = "zwpiAkNTP3O-Pu5wt";
    let templateIDEmail = "template_ke6sxqa";
    
    (function(){
       emailjs.init(publicKey);
    })();

    // Configuración de tu proyecto de Firebase
    const firebaseConfig = { 
      apiKey: "AIzaSyC7tdpXaE5bwRFPb8HLOHNtF0lf_skt7Ss", 
      authDomain: "bolsos-665b1.firebaseapp.com", 
      projectId: "bolsos-665b1", 
      storageBucket: "bolsos-665b1.firebasestorage.app", 
      messagingSenderId: "796560660034", 
      appId: "1:796560660034:web:7f529b4ed27314e0afbfdb", 
      measurementId: "G-K3RYL1GL6Z" 
    };

    // Inicialización Segura
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    
    const auth = firebase.auth();
    const db = firebase.firestore();

    // Estado de la Aplicación
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
    let idsFavoritosUser = [];
    let mostrandoFavoritos = false;
    let mostrandoPedidos = false;

    const bannerRef = db.collection("banner_imagenes");

    // ==========================================
    //      GESTIÓN DE SESIÓN Y COMPORTAMIENTO
    // ==========================================

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
            document.getElementById('footer-img-2').style.display = "block";
            
            configurarBotonPedidos(perfil);
            appData.rol = perfil.rol;
            appData.perfil = perfil;
            
            await obtenerFavoritosDelUsuario();
            await sincronizarCarritoAlLogin(user.uid);

            if (perfil.rol === 'administrador') {
              cargarProductosSegunRol('administrador', perfil);
              document.getElementById("inserImgAdmin").style.display = "block";
              document.getElementById("btnFooterupImaId").style.display = "block";
            } else {
              cargarProductosSegunRol(perfil.rol, perfil);
            }
          } else {
            cerrarSesionLimpieza();
          }
        }).catch(err => console.error("Error al obtener perfil:", err));
      } else {
        cerrarSesionLimpieza();
      }
    });

    function cerrarSesionLimpieza() {
      let contentButton = document.getElementById('authBtn');
      cart = [];
      localStorage.removeItem('carrito_libreaura');
      updateCartUI();

      contentButton.innerHTML = `
        <button class="btn btn-sm btn-warning btnIniciarSesion" data-bs-toggle="modal" data-bs-target="#regModal" id="btnRegModal">Registrarse</button>
        <button class="btn btn-sm btn-warning btnRegistrarse" data-bs-toggle="modal" data-bs-target="#initModal" id="btnInitModal">Iniciar Sesión</button>`;
      
      cargarProductosSegunRol('visitante', appData);
      contentButton.classList.remove('hidenContent');
      
      document.getElementById('btnRegModal').style.display = "block";
      document.getElementById('btnInitModal').style.display = "block";
      document.getElementById('btnPerfil').classList.add('d-none');
      document.getElementById('footer-img-2').style.display = "none";
      document.getElementById('adminActions').innerHTML = '';
      document.getElementById('btnVistaPedidos').classList.add('d-none');
    }

    function inicioSesionUser() {
      const email = document.getElementById('loginEmail').value;
      const pass = document.getElementById('loginPassword').value;
      const btn = document.querySelector('#initForm button[type="submit"]');
      const originalText = btn.innerHTML;

      btn.disabled = true;
      btn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status"></span> Procesando...`;

      auth.signInWithEmailAndPassword(email, pass)
        .then(() => {
          btn.disabled = false;
          btn.innerHTML = originalText;
          const regModal = bootstrap.Modal.getInstance(document.getElementById('initModal'));
          if (regModal) regModal.hide();
        })
        .catch((error) => {
          btn.disabled = false;
          btn.innerHTML = originalText;
          console.error("Error de login:", error.code);
          mostrarNotificacion("Error: " + error.message, "error");
        });
    }

    async function sincronizarCarritoAlLogin(userId) {
      try {
        const cartDoc = await db.collection("carritos").doc(userId).get();
        let carritoNube = [];

        if (cartDoc.exists) {
          carritoNube = cartDoc.data().items || [];
        }

        const carritoLocal = JSON.parse(localStorage.getItem('carrito_libreaura')) || [];
        const mapaCarrito = new Map();
        
        [...carritoNube, ...carritoLocal].forEach(item => {
          mapaCarrito.set(item.idProducto, item);
        });

        cart = Array.from(mapaCarrito.values());
        localStorage.setItem('carrito_libreaura', JSON.stringify(cart));
        
        await db.collection("carritos").doc(userId).set({
          items: cart,
          ultimaActualizacion: firebase.firestore.FieldValue.serverTimestamp()
        });

        updateCartUI();
      } catch (error) {
        console.error("Error sincronizando carrito:", error);
      }
    }

    // ==========================================
    //      RENDERIZADO DEL CATÁLOGO
    // ==========================================

    function renderizarTarjetaProducto(p, contenedor, perfil, idPedido) {
        const imagen = p.imagenes ? p.imagenes.split(',')[0] : '';
        const sinStock = parseInt(p.stock) <= 0;
        
        if (!sinStock) {
          contenedor.innerHTML += `
            <div class="card-item col-6 col-md-6 col-lg-3 mb-4">
              <div class="card card-product h-100">
                <img src="${imagen}" class="card-img-top product-img" style="cursor: pointer; object-fit: cover; height: 250px;"
                    onclick="verDetalle('${idPedido}')">
                
                <div class="card-body d-flex flex-column">
                  <h6 class="nameProducto text-truncate">${p.nombre}</h6>
                  <p class="descripcionProduct small" style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                    ${p.descripcion || ''}
                  </p>
                  <div class="contentInfoProducto d-flex justify-content-between align-items-center mt-auto">
                    <span class="priceProduct fw-bold fs-4">$${p.precio}<small>mxn</small></span>
                    
                    <div class="actionsContentProduct d-flex gap-2">
                        <button id="fav-btn-${idPedido}" class="btn-icon-solo favorito" onclick="toggleFavorito('${idPedido}')">
                          <i class="bi ${idsFavoritosUser.includes(idPedido) ? 'bi-heart-fill' : 'bi-heart'}"></i>
                        </button>
                        <input type="number" id="qty-${idPedido}" class="form-control" value="1" min="1" max="${p.stock}" style="max-width: 60px; display: none;">
                        <button onclick="addToCart('${idPedido}')" class="btn-icon-solo card" title="Agregar al carrito">
                          <i class="bi bi-cart-fill"></i>
                        </button>
                    </div>
                  </div>

                  ${appData.rol === 'administrador' ? `
                    <div class="accionsAdmin d-flex gap-1 mt-3">
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

    function cargarProductosSegunRol(rolUsuario, perfil) {
        const contenedor = document.getElementById('contenedor-productos');
        contenedor.innerHTML = '<div class="text-center w-100 py-5"><div class="spinner-border text-danger"></div><p>Cargando catálogo...</p></div>';
        
        appData.productos = [];
        appData.bolsos = [];
        appData.llaveritos = [];
        appData.ropa = [];
        appData.sombreros = [];
        
        let consulta = db.collection("productos");

        if (rolUsuario === 'proveedor' || rolUsuario === 'clientes') {
            const roolUserEl = document.getElementById("roolUserActive");
            if (roolUserEl) roolUserEl.innerHTML = rolUsuario;
        }
        if (rolUsuario === 'cliente') {
            document.querySelectorAll(".btn-proveedor-footer").forEach(item => {
                item.style.display = "block";
                item.innerHTML = "Cliente Mayorista";
            });
        }
        
        if (rolUsuario === 'administrador') {
            console.log("Modo Admin: Leyendo todos los productos");
        } else if (rolUsuario === 'proveedor') {
            consulta = consulta.where("tipoCliente", "==", "proveedor");
            document.querySelectorAll(".btn-proveedor-footer").forEach(item => {
                item.style.display = "block";
                item.innerHTML = "Cliente";
            });
        } else {
            consulta = consulta.where("tipoCliente", "==", "cliente");
        }

        consulta.get()
            .then((querySnapshot) => {
                contenedor.innerHTML = '';
                if (querySnapshot.empty) {
                    contenedor.innerHTML = '<p class="text-center w-100 text-muted py-5">No hay productos disponibles para este perfil.</p>';
                    return;
                }

                querySnapshot.forEach((doc) => {
                    const p = doc.data();
                    p.idFirestore = doc.id;

                    if (p.tipoProducto === 'bolsos') {
                        appData.bolsos.push(p);
                    } else if (p.tipoProducto === 'llavero') {
                        appData.llaveritos.push(p);
                    } else if (p.tipoProducto === 'ropa') {
                        appData.ropa.push(p);
                    } else if (p.tipoProducto === 'sobrero') {
                        appData.sombreros.push(p);
                    }
                    appData.productos.push(p);
                });

                appData.productos.forEach((prod) => {
                    renderizarTarjetaProducto(prod, contenedor, perfil, prod.idProducto);
                });
            })
            .catch((error) => {
                console.error("Error al filtrar productos:", error);
                contenedor.innerHTML = '<p class="text-center w-100 text-danger">Error de permisos o conexión en Firestore.</p>';
            });
    }

    // ==========================================
    //      GESTIÓN DE DETALLES (BLINDADO)
    // ==========================================

    function verDetalle(idPedido) {
        const producto = appData.productos.find(p => p.idProducto === idPedido);
        if (!producto) {
            return mostrarNotificacion("No se encontró la información del producto", "error");
        }

        // Inyección de textos segura (Sin SyntaxError por comillas)
        document.getElementById('detalleNombre').innerText = producto.nombre;
        document.getElementById('detalleDescripcion').innerText = producto.descripcion || 'Sin descripción disponible';
        document.getElementById('detallePrecio').innerText = `$${producto.precio}`;
        document.getElementById('detalleStock').innerText = `Stock disponible: ${producto.stock}`;

        const inputQty = document.getElementById('qtyDetalle');
        const btnSumar = document.getElementById('btnSumarDetalle');
        const btnRestar = document.getElementById('btnRestarDetalle');
        const avisoStock = document.getElementById('maxStockAviso');

        inputQty.value = 1;
        inputQty.max = producto.stock;
        avisoStock.innerText = `Máximo disponible: ${producto.stock} pzs`;

        btnSumar.onclick = () => {
            let actual = parseInt(inputQty.value);
            if (actual < producto.stock) inputQty.value = actual + 1;
        };

        btnRestar.onclick = () => {
            let actual = parseInt(inputQty.value);
            if (actual > 1) inputQty.value = actual - 1;
        };

        // Renderizado del carrusel de fotos
        const listaIds = (producto.imagenes || '').split(',');
        let carouselInner = document.getElementById('carouselImagenes');
        carouselInner.innerHTML = '';

        listaIds.forEach((idDrive, index) => {
            if (!idDrive.trim()) return;
            const activeClass = index === 0 ? 'active' : '';
            carouselInner.innerHTML += `
            <div class="carousel-item ${activeClass}">
                <img src="${idDrive.trim()}" class="d-block w-100 img-fluid rounded" style="height: 300px; object-fit: contain;">
            </div>`;
        });

        const btnAgregar = document.getElementById('btnAgregarDesdeDetalle');
        btnAgregar.onclick = () => {
            const cantidadSeleccionada = parseInt(inputQty.value);
            const qtyPrincipal = document.getElementById(`qty-${idPedido}`);
            if (qtyPrincipal) qtyPrincipal.value = cantidadSeleccionada;

            addToCart(idPedido);

            const modalInstance = bootstrap.Modal.getOrCreateInstance(document.getElementById('modalDetalle'));
            if (modalInstance) modalInstance.hide();
        };

        const myModal = bootstrap.Modal.getOrCreateInstance(document.getElementById('modalDetalle'));
        myModal.show();
    }

    // ==========================================
    //            GESTIÓN DEL CARRITO
    // ==========================================

    async function addToCart(productId) {
        const p = appData.productos.find(item => item.idProducto === productId);

        if (!p) {
            mostrarNotificacion("Error: Producto no encontrado", "error");
            return;
        }

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

        if (cantidadAñadir <= 0) {
            mostrarNotificacion("Ingresa una cantidad válida", "warning");
            return;
        }

        const itemEnCarrito = cart.find(item => item.idProducto === productId);
        const cantidadActualEnCarrito = itemEnCarrito ? itemEnCarrito.cantidad : 0;

        if ((cantidadActualEnCarrito + cantidadAñadir) > p.stock) {
            mostrarNotificacion(`Stock insuficiente. Máximo disponible: ${p.stock}`, "warning");
            return;
        }

        if (itemEnCarrito) {
            itemEnCarrito.cantidad += cantidadAñadir;
        } else {
            cart.push({ ...p, cantidad: cantidadAñadir });
        }

        // Persistencia
        localStorage.setItem('carrito_libreaura', JSON.stringify(cart));

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

        updateCartUI();

        if (esDesdeModal) {
            const modalInstance = bootstrap.Modal.getOrCreateInstance(modalDetalleEl);
            if (modalInstance) modalInstance.hide();
        } else {
            const qtyInput = document.getElementById(`qty-${productId}`);
            if (qtyInput) qtyInput.value = 1;
        }

        mostrarNotificacion(`¡${cantidadAñadir} unidad(es) añadida(s)!`, "success");
    }

    function updateCartUI() {
        const btnFinalizar = document.getElementById('btnFinalizarCompra');
        const alertaProveedor = document.getElementById('alertaMinimoProveedor');

        if (cart.length > 0) {
            btnFinalizar.disabled = false;
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

        if (appData.rol === 'proveedor') {
            cart.forEach(item => {
                if (item.cantidad < 4) {
                    permiteCompra = false;
                    mensajeError = `El producto "${item.nombre}" requiere mínimo 4 unidades.`;
                }
            });
        }

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
                          <button class="btn btn-outline-secondary" onclick="cambiarCant(${i}, 1)" ${reachesLimit ? 'disabled' : ''}>+</button>
                      </div>
                      <div class="text-danger" style="font-size: 0.75rem;">
                          ${reachesLimit ? 'Máximo alcanzado' : ''}
                      </div>
                      <button class="btn btn-link btn-sm text-danger d-block w-100 p-0 text-decoration-none" onclick="eliminar(${i})">Eliminar</button>
                    </div>
                </div>`;
        }).join('');

        document.getElementById('cartTotal').innerText = `Total: $${total.toFixed(2)}`;
    }

    async function cambiarCant(i, delta) {
        const itemEnCarrito = cart[i];
        itemEnCarrito.cantidad += delta;

        if (itemEnCarrito.cantidad <= 0) {
            return eliminar(i);
        }

        updateCartUI();
        localStorage.setItem('carrito_libreaura', JSON.stringify(cart));

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
    }

    async function eliminar(i) {
        cart.splice(i, 1);
        updateCartUI();
        localStorage.setItem('carrito_libreaura', JSON.stringify(cart));

        const user = firebase.auth().currentUser;
        if (user) {
            try {
                await db.collection("carritos").doc(user.uid).set({
                    items: cart,
                    ultimaActualizacion: firebase.firestore.FieldValue.serverTimestamp()
                });
            } catch (error) {
                console.error("Error al sincronizar eliminación con Firebase:", error);
            }
        }
        mostrarNotificacion("Producto eliminado del carrito", "success");
    }

    // ==========================================
    //       REGISTRO E INICIO DE SESIÓN
    // ==========================================

    function registrar(event) {
        if (event) event.preventDefault();

        const btn = document.querySelector('#regForm button[type="submit"]');
        const originalText = btn.innerHTML;

        btn.disabled = true;
        btn.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Procesando registro...`;

        const datos = {
            correo: document.getElementById('rEmail').value,
            pass: document.getElementById('rPass').value,
            nombre: document.getElementById('rNom').value,
            telefono: document.getElementById('rTel').value,
            direccion: document.getElementById('rDir').value,
            tipo: document.getElementById('rTipo').value,
            refIndi: document.getElementById("rIndRef").value
        };

        firebase.auth().createUserWithEmailAndPassword(datos.correo, datos.pass)
            .then((userCredential) => {
                const user = userCredential.user;
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
                btn.disabled = false;
                btn.innerHTML = originalText;

                const regModalElem = document.getElementById('regModal');
                const regModal = bootstrap.Modal.getOrCreateInstance(regModalElem);
                if (regModal) regModal.hide();

                const exitoElem = document.getElementById('modalRegistroExitoso');
                const modalExito = bootstrap.Modal.getOrCreateInstance(exitoElem);
                if (modalExito) modalExito.show();
            })
            .catch((error) => {
                btn.disabled = false;
                btn.innerHTML = originalText;
                console.error("Error al registrarse:", error);
                mostrarNotificacion("Error al registrarse: " + error.message, "error");
            });
    }

    // ==========================================
    //      PROCESAMIENTO DE COMPRA (CHECKOUT)
    // ==========================================

    async function checkOut() {
        if (appData.rol === 'visitante') {
            const cartModal = bootstrap.Modal.getOrCreateInstance(document.getElementById('cartModal'));
            if (cartModal) cartModal.hide();
            const modalRegistro = bootstrap.Modal.getOrCreateInstance(document.getElementById('regModal'));
            modalRegistro.show();
            return;
        }

        if (cart.length === 0) return mostrarNotificacion("El carrito está vacío", "warning");

        const btn = document.getElementById("btnFinalizarCompra");
        const textoOriginal = btn.innerHTML;
        const user = firebase.auth().currentUser;

        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Guardando pedido...';

        try {
            const folio = "PED-" + Math.floor(Math.random() * 1000000000000);
            const totalCompra = cart.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);

            const pedidoData = {
                folio: folio,
                clienteId: user.uid,
                clienteNombre: appData.perfil.nombre || "Cliente",
                clienteEmail: user.email,
                productos: cart,
                total: totalCompra,
                fecha: firebase.firestore.FieldValue.serverTimestamp(),
                estado: "Pendiente",
                pagoValidado: false
            };

            // 1. Guardamos el pedido en Firebase Firestore
            await db.collection("pedidos").doc(folio).set(pedidoData);

            // 2. Decrementamos el stock físico en base de datos
            const batch = db.batch();
            cart.forEach(item => {
                const prodRef = db.collection("productos").doc(item.idProducto);
                batch.update(prodRef, {
                    stock: firebase.firestore.FieldValue.increment(-item.cantidad)
                });
            });
            await batch.commit();

            // 3. ENVIAR CORREOS MEDIANTE EMAILJS (Directo del navegador sin Apps Script)
            try {
                await enviarCorreoPedido(pedidoData);
            } catch (errorMail) {
                console.warn("Pedido guardado, pero EmailJS falló:", errorMail);
            }

            // 4. Limpieza de carrito y UI
            cart = [];
            localStorage.removeItem('carrito_libreaura');
            await db.collection("carritos").doc(user.uid).delete();
            
            btn.disabled = false;
            btn.innerHTML = textoOriginal;

            const cartModal = bootstrap.Modal.getOrCreateInstance(document.getElementById('cartModal'));
            if (cartModal) cartModal.hide();

            updateCartUI();

            document.getElementById('folioExito').innerText = folio;
            const modalExito = bootstrap.Modal.getOrCreateInstance(document.getElementById('modalCompraExitosa'));
            if (modalExito) modalExito.show();

            cargarProductosSegunRol(appData.rol, appData.perfil);

        } catch (error) {
            console.error("Error en checkout:", error);
            mostrarNotificacion("Error técnico: " + error.message, "error");
            btn.disabled = false;
            btn.innerHTML = textoOriginal;
        }
    }

    // ==========================================
    //      GESTIÓN DE FAVORITOS & PERFIL
    // ==========================================

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
                if (btnIcono) {
                    btnIcono.classList.replace('bi-heart-fill', 'bi-heart');
                }
                const cardProducto = document.getElementById(`card-favorito-${idProducto}`);
                if (cardProducto) {
                    cardProducto.style.opacity = '0';
                    setTimeout(() => cardProducto.remove(), 300); 
                }

                await favRef.delete();
                idsFavoritosUser = idsFavoritosUser.filter(id => id !== idProducto);
                mostrarNotificacion("Eliminado de favoritos", "success");
            } else {
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

            if (mostrandoFavoritos) {
                cargarFavoritos();
            }

        } catch (error) {
            console.error("Error favorito:", error);
            mostrarNotificacion("No se pudo procesar la acción", "error");
        }
    }

    async function cargarFavoritos() {
        mostrandoFavoritos = true;
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
                grid.innerHTML = '<div class="col-12 text-center py-5"><p class="text-muted">Aún no tienes productos guardados en tus favoritos.</p></div>';
                return;
            }

            let html = '';
            snapshot.forEach(doc => {
                const item = doc.data();
                const img = item.imagenes.split(",")[0];
                const id = item.idProducto;
                html += `
                <div class="col-6 col-md-6 col-lg-3" id="card-favorito-${id}">
                    <div class="card card-product h-100 shadow-sm border-0">
                        <button class="btn btn-light btn-sm shadow-sm" 
                                onclick="toggleFavorito('${id}')" 
                                style="position: absolute; top: 8px; right: 8px; z-index: 10; border-radius: 50%;">
                            <i class="bi bi-x-lg text-danger"></i>
                        </button>

                        <img src="${img}" class="card-img-top" style="height: 180px; object-fit: cover; cursor: pointer;" onclick="verDetalle('${id}')">
                        
                        <div class="card-body p-2 d-flex flex-column">
                            <h6 class="small text-truncate mb-1">${item.nombre}</h6>
                            <p class="mb-2 small text-truncate">${item.descripcion}</p>
                            <p class="priceProduct mb-2 small">$${item.precio}</p>
                            
                            <div class="input-group input-group-sm mb-2 mt-auto">
                                <button onclick="addToCart('${id}')" class="btn buttonFavCard flex-fill">
                                    <i class="bi bi-cart-plus-fill"></i> Agregar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>`;
            });

            grid.innerHTML = html;

        } catch (error) {
            console.error("Error al cargar favoritos:", error);
            grid.innerHTML = '<div class="alert alert-danger">No se pudieron cargar los favoritos.</div>';
        }
    }

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
            idsFavoritosUser = snapshot.docs.map(doc => doc.data().idProducto);
        } catch (error) {
            console.error("Error obteniendo IDs de favoritos:", error);
        }
    }

    function abrirModalPerfil() {
        document.getElementById('pNombre').value = appData.perfil.nombre || "";
        document.getElementById('pTelefono').value = appData.perfil.telefono || "";
        document.getElementById('pDireccion').value = appData.perfil.direccion || "";
        document.getElementById('pIndicaciones').value = appData.perfil.indicaciones || "";
        document.getElementById('pRol').value = appData.perfil.rol || "";

        const myModal = bootstrap.Modal.getOrCreateInstance(document.getElementById('modalPerfil'));
        myModal.show();
    }

    async function guardarChangesPerfil() {
        const btn = document.getElementById('btnGuardarPerfil');
        const originalText = btn.innerHTML;
        const user = firebase.auth().currentUser;
        if (!user) return;

        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Guardando...';

        const nuevosDatos = {
            nombre: document.getElementById('pNombre').value,
            telefono: document.getElementById('pTelefono').value,
            direccion: document.getElementById('pDireccion').value,
            indicaciones: document.getElementById('pIndicaciones').value,
        };

        try {
            await db.collection("usuarios").doc(user.uid).update(nuevosDatos);
            appData.perfil.nombre = nuevosDatos.nombre;
            appData.perfil.telefono = nuevosDatos.telefono;
            appData.perfil.direccion = nuevosDatos.direccion;
            appData.perfil.indicaciones = nuevosDatos.indicaciones;

            btn.disabled = false;
            btn.innerHTML = originalText;

            const modalPerfil = bootstrap.Modal.getOrCreateInstance(document.getElementById('modalPerfil'));
            if (modalPerfil) modalPerfil.hide();

            mostrarNotificacion("Perfil actualizado correctamente", "success");
        } catch (error) {
            console.error("Error perfil:", error);
            mostrarNotificacion("Error: " + error.message, "error");
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }

    // ==========================================
    //          SECCIÓN GESTIÓN DE PEDIDOS
    // ==========================================

    function configurarBotonPedidos(perfil) {
        const btn = document.getElementById('btnVistaPedidos');
        if (perfil.rol === 'visitante') return;

        btn.classList.remove('d-none');
        btn.innerHTML = (perfil.rol === 'administrador') ? "📦 <span class='ocultaMobile'> Pedidos Recibidos</span>" : "🛍️ <span class='ocultaMobile'>Mis Compras</span>";
        
        document.getElementById('adminActions').innerHTML = perfil.rol === 'administrador' ? `
          <button class="btn btn-sm nuevosProductoadmin" data-bs-toggle="modal" data-bs-target="#modalNuevoProducto">
            + <span class="ocultaMobile">Nuevos Productos</span>
          </button>` : '';
    }

    async function cargarDatosPedidos() {
        const container = document.getElementById('pedidos-container');
        container.innerHTML = '<div class="text-center p-5"><div class="spinner-border text-danger"></div><p>Cargando historial...</p></div>';

        try {
            let consulta;
            if (appData.rol === 'administrador') {
                consulta = db.collection("pedidos").orderBy("fecha", "desc");
            } else {
                const user = firebase.auth().currentUser;
                consulta = db.collection("pedidos").where("clienteId", "==", user.uid);
            }

            const snapshot = await consulta.get();

            let html = `
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h3>${appData.rol === 'administrador' ? '🛡️ Gestión de Pedidos' : '🛍️ Mis Compras'}</h3>
                    <button class="btn btn-outline-secondary btn-sm" onclick="mostrarVistaTienda()">Volver al catálogo</button>
                </div>`;

            if (snapshot.empty) {
                container.innerHTML = html + '<div class="alert alert-light text-center">No se encontraron pedidos en tu cuenta.</div>';
                return;
            }

            html += `
            <div class="table-responsive">
                <table class="table table-hover mt-3" style="font-size: 0.9rem;">
                    <thead class="table-dark">
                        <tr>
                            <th>Folio</th>
                            <th>${appData.rol === 'administrador' ? 'Cliente' : 'Info'}</th>
                            <th>Productos</th>
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
                const detalleTexto = p.productos.map(prod => `- ${prod.nombre} (x${prod.cantidad})`).join('<br>');

                html += `
                <tr>
                    <td><span class="badge bg-light text-dark border">${p.folio}</span></td>
                    <td>
                        <strong>${appData.rol === 'administrador' ? p.clienteNombre : 'Tu Compra'}</strong><br>
                        <small class="text-muted">${p.clienteEmail}</small>
                    </td>
                    <td><small>${detalleTexto}</small></td>
                    <td><span class="badge ${p.estado === 'Entregado' ? 'bg-success' : 'bg-warning'}">${p.estado}</span></td>
                    <td><span class="badge ${p.pagoValidado ? 'bg-info' : 'bg-danger'}">${p.pagoValidado ? 'Pagado' : 'Pendiente'}</span></td>
                    <td class="fw-bold">$${p.total.toLocaleString()}</td>
                    ${appData.rol === 'administrador' ? `
                    <td>
                        <select class="form-select form-select-sm mb-1" onchange="actualizarEstadoPedido('${id}', 'estado', this.value)">
                            <option value="">Estatus...</option>
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
            container.innerHTML = '<div class="alert alert-danger">Error de permisos en la lectura de pedidos.</div>';
        }
    }

    async function actualizarEstadoPedido(idPedido, campo, valor) {
        try {
            const updateData = {};
            updateData[campo] = valor;
            await db.collection("pedidos").doc(idPedido).update(updateData);
            cargarDatosPedidos();
        } catch (error) {
            mostrarNotificacion("Error al actualizar: " + error.message, "error");
        }
    }

    // ==========================================
    //           NAVEGACIÓN INTERNA (SPA)
    // ==========================================

    function gestionarNavegacion(vistaActual) {
        const btnProductos = document.getElementById('btn-nav-productos');
        const btnFavoritos = document.getElementById('favoritosbuttonId');
        const contTienda = document.getElementById('contenedor-productos');
        const contbanner = document.getElementById('banner-carousel-container');
        const contPedidos = document.getElementById('pedidos-container');
        const contFavoritos = document.getElementById('favoritos-container');

        contTienda.classList.add('d-none');
        contbanner.classList.add('d-none');
        contPedidos.classList.add('d-none');
        contFavoritos.classList.add('d-none');

        if (vistaActual === 'tienda') {
            btnProductos.classList.add('d-none');
            contTienda.classList.remove('d-none');
            contbanner.classList.remove('d-none');
            btnFavoritos.classList.remove('d-none');
        } else {
            btnProductos.classList.remove('d-none');
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
        mostrandoFavoritos = false;
    }

    function mostrarVistaFavoritos() {
        gestionarNavegacion('favoritos');
        cargarFavoritos();
    }

    function mostrarVistaCompras() {
        gestionarNavegacion('compras');
        cargarDatosPedidos();
    }

    // ==========================================
    //       FILTRADO POR CATEGORÍAS (MENÚ)
    // ==========================================

    function abrirMenuCategorias() {
        const menuEl = document.getElementById('menuCategorias');
        const instance = bootstrap.Offcanvas.getOrCreateInstance(menuEl);
        if (instance) instance.show();
    }

    function cerrarMenuCategorias() {
        const menuEl = document.getElementById('menuCategorias');
        const instance = bootstrap.Offcanvas.getOrCreateInstance(menuEl);
        if (instance) instance.hide();
    }

    function filtrarPorCategoria(categoria, productosFiltrados) {
        const contenedor = document.getElementById('contenedor-productos');
        contenedor.innerHTML = '';
        
        mostrarVistaTienda();

        if (productosFiltrados && productosFiltrados.length !== 0) {
            productosFiltrados.forEach((prod) => {
                renderizarTarjetaProducto(prod, contenedor, appData.perfil, prod.idProducto);
            });
        } else { 
            contenedor.innerHTML = '<p class="text-center w-100 text-muted py-5">No hay productos disponibles en esta categoría.</p>';
        }
        
        cerrarMenuCategorias();
    }

    // ==========================================
    //           GESTIÓN DE PRODUCTOS
    // ==========================================

    function abrirEditor(skuProducto) {
        const user = auth.currentUser;
        db.collection("usuarios").doc(user.uid).get().then((doc) => {
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
            
            const subCatEl = document.getElementById('eTiposubCategoria');
            subCatEl.value = producto.subCategoria || 'casual';
            if (producto.tipoProducto === 'bolsos') {
                subCatEl.style.display = 'block';
            } else {
                subCatEl.style.display = 'none';
            }

            prepararEdicion(producto.imagenes);
            const myModal = bootstrap.Modal.getOrCreateInstance(document.getElementById('editModal'));
            myModal.show();
        });
    }

    function confirmarEliminacion(sku) {
        const producto = appData.productos.find(item => item.idProducto === sku);
        if (!producto) return;
        if (confirm(`¿Estás seguro de eliminar el producto "${producto.nombre}"?`)) {
            eliminarProductoServidor(sku);
        }
    }

    async function eliminarProductoServidor(idProducto) {
        let contentProdut = document.getElementById('contenedor-productos');
        let textoOriginal = contentProdut.innerHTML;

        contentProdut.innerHTML = '<div class="text-center w-100 py-5"><div class="spinner-border text-danger"></div><p>Eliminando producto...</p></div>';

        try {
            const docRef = db.collection("productos").doc(idProducto);
            const docSnap = await docRef.get();

            if (docSnap.exists) {
                const datos = docSnap.data();
                const fotos = datos.imagenes ? datos.imagenes.split(',').filter(url => url.trim() !== "") : [];

                const promesasBorrado = fotos.map(async (url) => {
                    try {
                        if (url.includes("firebasestorage.googleapis.com")) {
                            const refImagen = firebase.storage().refFromURL(url);
                            await refImagen.delete();
                        }
                    } catch (err) {
                        console.warn("La imagen no se pudo borrar de Storage:", err);
                    }
                });
                await Promise.all(promesasBorrado);
            }

            await docRef.delete();
            mostrarNotificacion("Producto y fotos eliminados correctamente.", "success");
            cargarProductosSegunRol(appData.rol, appData.perfil);

        } catch (error) {
            console.error("Error crítico al eliminar:", error);
            mostrarNotificacion("Error al eliminar el producto", "error");
            contentProdut.innerHTML = textoOriginal;
        }
    }

    async function guardarEdicion() {
        const fileInput = document.getElementById('upNewImg');
        const files = fileInput.files;
        const idProducto = document.getElementById('eNomSKU').value;

        let listaUrlsFinales = document.getElementById('editIdsActuales').value.split(',')
            .map(s => s.trim()).filter(s => s !== "");

        const btn = document.getElementById("saveChangeId");
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Actualizando...';

        try {
            const docActual = await db.collection("productos").doc(idProducto).get();
            const datosViejos = docActual.data();
            const urlsOriginales = datosViejos.imagenes ? datosViejos.imagenes.split(',') : [];

            const urlsABorrar = urlsOriginales.filter(url => !listaUrlsFinales.includes(url));

            const promesasBorrado = urlsABorrar.map(async (url) => {
                try {
                    if (url.includes("firebasestorage.googleapis.com")) {
                        const ref = firebase.storage().refFromURL(url);
                        await ref.delete();
                    }
                } catch (e) {
                    console.warn("La imagen física ya no existía en Storage:", e);
                }
            });
            await Promise.all(promesasBorrado);

            if (files.length > 0) {
                const promesasSubida = Array.from(files).map(async (file) => {
                    const storageRefObj = firebase.storage().ref();
                    const nombreUnico = `productos/${Date.now()}_${file.name}`;
                    const referencia = storageRefObj.child(nombreUnico);
                    const snapshot = await referencia.put(file);
                    return await snapshot.ref.getDownloadURL();
                });

                const nuevasUrls = await Promise.all(promesasSubida);
                listaUrlsFinales = listaUrlsFinales.concat(nuevasUrls);
            }

            const datosActualizados = {
                idProducto: idProducto,
                nombre: document.getElementById('eNom').value,
                precio: parseFloat(document.getElementById('ePre').value),
                stock: parseInt(document.getElementById('eSto').value),
                imagenes: listaUrlsFinales.join(','),
                descripcion: document.getElementById('eDes').value,
                tipoProducto: document.getElementById('eTipoProducto').value,
                tipoCliente: document.getElementById('eTipoCliente').value,
                subCategoria: document.getElementById('eTiposubCategoria').value
            };

            await db.collection("productos").doc(idProducto).update(datosActualizados);

            cargarProductosSegunRol(appData.rol, appData.perfil);
            const modalEdicion = bootstrap.Modal.getOrCreateInstance(document.getElementById('editModal'));
            if (modalEdicion) modalEdicion.hide();

            mostrarNotificacion("Producto actualizado con éxito", "success");

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
        document.getElementById('editIdsActuales').value = imagenesStr;
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
    }

    function eliminarImagenDeLista(id) {
        const el = document.getElementById(`mini-${id}`);
        if (el) el.remove();
        let actuales = document.getElementById('editIdsActuales').value.split(',');
        actuales = actuales.filter(item => item.trim() !== id);
        document.getElementById('editIdsActuales').value = actuales.join(',');
    }

    // ==========================================
    //          CARGA MASIVA Y COMPLEMENTOS
    // ==========================================

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
                <select name="producto" class="form-select" onchange="selectProductOption(this.value, 'selectSubcategoria${i}')">
                  <option value="bolsos">Bolsos</option>
                  <option value="llavero">Llavero</option>
                  <option value="sobrero">Sombrero</option>
                  <option value="ropa">Ropa</option>
                </select>
              </div>
              
              <div class="col-md-6">
                <input type="file" name="imagen" class="form-control mb-2" accept="image/*" multiple required>
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
      const el = document.getElementById(divSub);
      if (el) {
        el.style.display = (e === "bolsos") ? "block" : "none";
      }
    }

    async function guardarProductosMasivos() {
      const btn = document.getElementById('btnGuardarMasivo');
      const user = firebase.auth().currentUser;
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
            const promesasImagenes = Array.from(files).map(file => subirAStorage(file));
            urlsImagenes = await Promise.all(promesasImagenes);
          }

          let sku = "SKU-" + Math.floor(Math.random() * 1000000000);
          const subCatVal = item.querySelector('[name="BolsoCategoria"]') ? item.querySelector('[name="BolsoCategoria"]').value : '';
          
          return {
            idProducto: sku,
            nombre: item.querySelector('[name="nombre"]').value,
            precio: parseFloat(item.querySelector('[name="precio"]').value) || 0,
            stock: parseInt(item.querySelector('[name="stock"]').value) || 0,
            imagenes: urlsImagenes.join(','),
            descripcion: item.querySelector('[name="descripcion"]').value,
            tipoProducto: item.querySelector('[name="producto"]').value,
            tipoCliente: item.querySelector('[name="cliente"]').value,
            subCategoria: subCatVal
          };
        });

        const productosParaSubir = await Promise.all(listaPromesas);

        // Firestore batch setup
        const batch = db.batch();
        productosParaSubir.forEach((producto) => {
          const nuevoRef = db.collection("productos").doc(producto.idProducto);
          batch.set(nuevoRef, producto);
        });

        await batch.commit();

        const modalForm = bootstrap.Modal.getInstance(document.getElementById('modalNuevoProducto'));
        if (modalForm) modalForm.hide();

        btn.disabled = false;
        btn.innerText = "Guardar Todos los Productos";
        resetFormularioMasivo();

        const modalExito = bootstrap.Modal.getOrCreateInstance(document.getElementById('modalExitoCarga'));
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
      const storageRefObj = firebase.storage().ref();
      const nombreUnico = `productos/${Date.now()}_${file.name}`;
      const referencia = storageRefObj.child(nombreUnico);
      const snapshot = await referencia.put(file);
      return await snapshot.ref.getDownloadURL();
    }

    function resetFormularioMasivo() {
      document.getElementById('pasoCantidad').classList.remove('d-none');
      document.getElementById('pasoFormularios').classList.add('d-none');
      document.getElementById('formMasivo').reset();
    }

    // ==========================================
    //      GESTIÓN DE IMÁGENES DEL BANNER
    // ==========================================

    async function cargarCarrusel() {
        const slidesContainer = document.getElementById('carousel-slides');
        if (!slidesContainer) return;
        
        try {
            const snapshot = await bannerRef.orderBy("fecha", "desc").get();
            let html = "";
            snapshot.docs.forEach((doc, index) => {
                const data = doc.data();
                html += `
                    <div class="carousel-item ${index === 0 ? 'active' : ''}">
                        <img src="${data.url}" class="d-block w-100 imgcarruselBanner">
                    </div>`;
            });
            slidesContainer.innerHTML = html || "<p class='text-center p-5 text-muted'>No hay imágenes en el banner actualmente.</p>";
        } catch (err) {
            console.error("Error al cargar banner carrusel:", err);
            slidesContainer.innerHTML = "<p class='text-center p-5 text-danger'>Inicia sesión o revisa la base de datos.</p>";
        }
    }

    async function abrirModalGestionBanner() {
        const listaGestion = document.getElementById('listaFotosGestion');
        if (!listaGestion) return;
        
        const modalElement = document.getElementById('modalGestionBanner');
        const myModal = bootstrap.Modal.getOrCreateInstance(modalElement);
        myModal.show();

        listaGestion.innerHTML = "<p class='text-center w-100'>Cargando imágenes...</p>";
        
        try {
            const snapshot = await bannerRef.orderBy("fecha", "desc").get();
            let html = "";
            
            snapshot.docs.forEach(doc => {
                const data = doc.data();
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
            
            listaGestion.innerHTML = html || "<p class='text-center w-100 text-muted p-3'>No hay imágenes.</p>";
        } catch (error) {
            console.error("Error banner gestion:", error);
            listaGestion.innerHTML = "<p class='text-center text-danger w-100'>Inicia sesión con credenciales administrativas.</p>";
        }
    }

    async function subirFotoBanner() {
        const fileInput = document.getElementById('inputNuevaFoto');
        const file = fileInput ? fileInput.files[0] : null;
        if (!file) return mostrarNotificacion("Selecciona una imagen", "warning");

        try {
            const fileName = `${Date.now()}_${file.name}`;
            const path = `banner_fotos/${fileName}`;

            // SOLUCIÓN PERMISOS: Directo usando el path unificado
            const uploadTask = await firebase.storage().ref().child(path).put(file);
            const url = await uploadTask.ref.getDownloadURL();

            await bannerRef.add({
                url: url,
                storagePath: path, 
                fecha: firebase.firestore.FieldValue.serverTimestamp()
            });

            mostrarNotificacion("Banner agregado correctamente", "success");
            if (fileInput) fileInput.value = "";

            await abrirModalGestionBanner();
            cargarCarrusel();
            cerrarModalCorrectamente();
        } catch (error) {
            console.error("Error subida banner:", error);
            mostrarNotificacion("Error de almacenamiento. Revisa reglas de Storage.", "error");
        }
    }

    async function eliminarFotoBanner(docId, storagePath) {
        if (!storagePath || storagePath === 'undefined') {
            return mostrarNotificacion("La foto no posee un path físico válido.", "error");
        }
        
        if (!confirm("¿Deseas remover esta foto del carrusel?")) return;

        try {
            await firebase.storage().ref().child(storagePath).delete();
            await bannerRef.doc(docId).delete();

            mostrarNotificacion("Imagen removida correctamente", "success");
            await abrirModalGestionBanner();
            cargarCarrusel();
            cerrarModalCorrectamente();
        } catch (error) {
            console.error("Error al borrar banner:", error);
            mostrarNotificacion("Error de permisos al eliminar", "error");
        }
    }

    // ==========================================
    //      GESTIÓN DE IMÁGENES DEL FOOTER
    // ==========================================

    const footerRef = db.collection("configuracion").doc("footer");

    async function cargarFooter() {
        const doc = await footerRef.get();
        if (doc.exists) {
            const data = doc.data();
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

    async function abrirModalGestionFooter() {
        const doc = await footerRef.get();
        const data = doc.exists ? doc.data() : { img1: '', img2: '', img3: '', navLogo: '' };
        const container = document.getElementById('listaEdicionFooter');
        if (!container) return;
        
        container.innerHTML = '';
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

        for (let i = 1; i <= 3; i++) {
            container.innerHTML += `
                <div class="mb-4 p-3 border rounded">
                    <h6>Imagen Footer ${i}</h6>
                    <img src="${data['img'+i] || 'placeholder.png'}" class="img-thumbnail mb-2 d-block" style="height: 80px">
                    <input type="file" class="form-control form-control-sm" id="file-footer-${i}" accept="image/*">
                    <button class="btn btn-primary btn-sm mt-2" onclick="subirImagenGeneral('img${i}', 'file-footer-${i}')">Actualizar Imagen ${i}</button>
                </div>`;
        }

        const myModal = bootstrap.Modal.getOrCreateInstance(document.getElementById('modalGestionFooter'));
        myModal.show();
    }

    async function subirImagenGeneral(campoDoc, inputId) {
        const fileInput = document.getElementById(inputId);
        const file = fileInput ? fileInput.files[0] : null;
        if (!file) return mostrarNotificacion("Selecciona un archivo", "warning");

        try {
            const fileName = `${campoDoc}_${Date.now()}`;
            const uploadTask = await firebase.storage().ref(`footer/${fileName}`).put(file);
            const url = await uploadTask.ref.getDownloadURL();

            const updateData = {};
            updateData[campoDoc] = url;

            await footerRef.set(updateData, { merge: true });

            mostrarNotificacion("Configuración actualizada", "success");
            cargarFooter();
            cerrarModalCorrectamente();
        } catch (error) {
            console.error(error);
            mostrarNotificacion("Error al subir imagen general", "error");
        }
    }

    async function eliminarImagenConfig(campoDoc) {
        if (!confirm("¿Deseas eliminar esta imagen de configuración?")) return;
        try {
            const updateData = {};
            updateData[campoDoc] = ""; 
            await footerRef.update(updateData);
            
            mostrarNotificacion("Imagen removida", "info");
            cargarFooter();
            abrirModalGestionFooter();
            cerrarModalCorrectamente();
        } catch (error) {
            console.error(error);
            mostrarNotificacion("Error al eliminar", "error");
        }
    }

    // ==========================================
    //      ENVÍO DE EMAILS DIRECTOS (EMAILJS)
    // ==========================================

    async function enviarCorreoPedido(pedido) {
        const folio = pedido.folio;
        const totalFormateado = Number(pedido.total).toLocaleString('es-MX', { 
            style: 'currency', 
            currency: 'MXN' 
        });

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
          </div>`;

        const htmlAdmin = `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 2px solid #d9534f; padding: 20px;">
            <h2 style="color: #d9534f; text-align: center;">🚨 NUEVO PEDIDO RECIBIDO</h2>
            <div style="background-color: #fff5f5; border: 1px solid #feb2b2; padding: 15px; border-radius: 8px;">
              <p><strong>Folio:</strong> ${folio}</p>
              <p><strong>Cliente:</strong> ${pedido.clienteNombre} (${pedido.clienteEmail})</p>
              <p><strong>Total:</strong> ${totalFormateado}</p>
            </div>
            <p style="margin-top: 20px;">📦 <strong>DETALLE:</strong></p>
            ${tablaProductos}
          </div>`;

        try {
            let infoEmailAdmin = {
                to_email: 'lauvillalobosc1@gmail.com',
                subject_dinamico: "🚨 Nuevo Pedido - " + folio,
                html_contenido: htmlAdmin
            };
            await emailjs.send(serviceEmailJs, templateIDEmail, infoEmailAdmin, publicKey);

            if (pedido.clienteEmail) {
                let infoEmailCliente = {
                    to_email: pedido.clienteEmail,
                    subject_dinamico: "✅ Confirmación de tu pedido - " + folio,
                    html_contenido: htmlCliente
                };
                await emailjs.send(serviceEmailJs, templateIDEmail, infoEmailCliente, publicKey);
            }
            console.log("Correos disparados con éxito a través de EmailJS!");
        } catch (error) {
            console.error("Error al enviar con EmailJS:", error);
            throw error;
        }
    }

    // ==========================================
    //            UTILERÍAS DE CONTROL
    // ==========================================

    function mostrarNotificacion(mensaje, tipo = 'error') {
        const modalEl = document.getElementById('modalAlerta');
        const tituloEl = document.getElementById('tituloAlerta');
        const mensajeEl = document.getElementById('mensajeAlerta');
        const iconoEl = document.getElementById('iconoAlerta');

        const configuracion = {
            error: { titulo: '❌ Error en el Sistema', icono: '⚠️', colorIcono: 'text-danger' },
            warning: { titulo: '⚠️ Atención', icono: '🔔', colorIcono: 'text-warning' },
            success: { titulo: '✅ Éxito', icono: '🎉', colorIcono: 'text-success' }
        };

        const config = configuracion[tipo] || configuracion.error;

        tituloEl.innerText = config.titulo;
        mensajeEl.innerText = mensaje;
        iconoEl.innerHTML = config.icono;
        iconoEl.className = `display-1 mb-3 ${config.colorIcono}`;

        const modalBootstrap = bootstrap.Modal.getOrCreateInstance(modalEl);
        modalBootstrap.show();
    }

    function cerrarModalCorrectamente() {
        const backdrop = document.querySelector('.modal-backdrop');
        if (backdrop) {
            backdrop.remove();
            document.body.style.overflow = 'auto';
            document.body.classList.remove('modal-open');
        }
    }

    // Inicializaciones al arrancar
    window.onload = function() {
        cargarCarrusel();
        cargarFooter();
        
        // Recuperar carrito local si existe
        const datosLocales = localStorage.getItem('carrito_libreaura');
        if (datosLocales) {
            cart = JSON.parse(datosLocales);
            updateCartUI();
        }
    };