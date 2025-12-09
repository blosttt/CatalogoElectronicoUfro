class CatalogoUFRO {
    constructor() {
        this.token = localStorage.getItem('authToken');
        this.usuario = JSON.parse(localStorage.getItem('usuario') || 'null');
        this.items = [];
        this.categorias = [];
        
        // Propiedades para paginación
        this.currentPage = 1;
        this.itemsPerPage = 3;
        this.totalItems = 0;
        this.totalPages = 1;
        this.isLoading = false;
        
        // 🔄 NUEVAS PROPIEDADES PARA SOLICITUDES
        this.solicitudes = [];
        this.currentSolicitudPage = 1;
        this.solicitudesPerPage = 20;
        this.totalSolicitudes = 0;
        this.solicitudesStats = {
            total_solicitudes: 0,
            pendientes: 0,
            en_proceso: 0,
            aprobadas: 0,
            rechazadas: 0,
            completadas: 0
        };
        this.solicitudActualId = null; // Para manejar solicitud actual en modal
        
        this.init();
    }

    init() {
        this.configurarEventos();
        this.verificarAutenticacion();
    }

    // 1. CAMBIAR MÉTODO VERIFICAR AUTENTICACIÓN
    verificarAutenticacion() {
        const token = localStorage.getItem('authToken');
        const usuarioData = localStorage.getItem('usuario');
        
        console.log('🔍 Verificando autenticación...');
        console.log('   Token en localStorage:', token ? 'PRESENTE' : 'AUSENTE');
        console.log('   Usuario en localStorage:', usuarioData ? 'PRESENTE' : 'AUSENTE');
        
        if (!token) {
            console.log('👻 No hay token, mostrando como invitado');
            this.mostrarComoInvitado();
        } else {
            console.log('🔑 Token encontrado, verificando...');
            this.token = token;
            this.usuario = JSON.parse(usuarioData || 'null');
            this.verificarToken();
        }
    }

    // Mostrar como invitado
    mostrarComoInvitado() {
        console.log('👻 Configurando modo invitado...');
        
        // Limpiar cualquier token residual
        this.token = null;
        if (localStorage.getItem('authToken')) {
            localStorage.removeItem('authToken');
        }
        
        // Mostrar header de invitado y ocultar navbar
        document.getElementById('invitadoHeader').classList.remove('d-none');
        document.getElementById('mainNavbar').classList.add('d-none');
        document.getElementById('mainContent').classList.remove('d-none');
        document.getElementById('invitadoInfo').classList.remove('d-none');
        
        // Mostrar mensaje de invitado
        const invitadoMessage = document.getElementById('invitadoMessage');
        if (invitadoMessage) {
            invitadoMessage.classList.remove('d-none');
        }
        
        // Configurar usuario como invitado
        this.usuario = { rol: 'invitado', username: 'Invitado' };
        this.actualizarUIUsuario();
        
        // 🔄 LIMPIAR cualquier dato de usuario previo
        this.items = [];
        this.cargarDatosIniciales();
        
        // Ocultar estadísticas y solicitudes para invitado
        this.mostrarOcultarEstadisticas();
        this.mostrarOcultarSolicitudes();
        
        console.log('✅ Modo invitado activado');
    }

    // 4. ACTUALIZAR CONFIGURACIÓN DE EVENTOS
    configurarEventos() {
        // Login
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            this.login({ username, password });
        });

        // Logout/Login - Comportamiento diferente según estado
        document.getElementById('btnLogout').addEventListener('click', () => {
            if (this.usuario.rol === 'invitado') {
                // Si es invitado, mostrar modal de login
                this.mostrarLogin();
            } else {
                // Si está logueado, cerrar sesión
                this.cerrarSesion();
            }
        });

        // Filtros
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.aplicarFiltros();
        });

        document.getElementById('categoryFilter').addEventListener('change', (e) => {
            this.aplicarFiltros();
        });

        document.getElementById('statusFilter').addEventListener('change', (e) => {
            this.aplicarFiltros();
        });

        // Nuevo item
        document.getElementById('btnNewItem').addEventListener('click', () => {
            this.mostrarModalNuevoItem();
        });

        document.getElementById('btnSaveItem').addEventListener('click', () => {
            this.guardarNuevoItem();
        });

        // Actualizar item
        document.getElementById('btnUpdateItem').addEventListener('click', () => {
            this.actualizarItem();
        });

        // 🔄 NUEVOS EVENTOS PARA SOLICITUDES
        
        // Enviar solicitud desde modal
        document.getElementById('btnEnviarSolicitud')?.addEventListener('click', () => {
            this.enviarSolicitud();
        });

        // Actualizar lista de solicitudes
        document.getElementById('btnActualizarSolicitudes')?.addEventListener('click', () => {
            const estado = document.getElementById('solicitudEstadoFilter')?.value || '';
            this.cargarSolicitudes(estado);
        });

        // Cambiar filtro de estado de solicitudes
        document.getElementById('solicitudEstadoFilter')?.addEventListener('change', (e) => {
            const estado = e.target.value;
            this.cargarSolicitudes(estado, 1);
        });

        // Acciones en modal de solicitud
        document.getElementById('btnAprobarSolicitud')?.addEventListener('click', () => {
            this.cambiarEstadoSolicitud('aprobada');
        });

        document.getElementById('btnRechazarSolicitud')?.addEventListener('click', () => {
            this.cambiarEstadoSolicitud('rechazada');
        });

        document.getElementById('btnEliminarSolicitud')?.addEventListener('click', () => {
            this.eliminarSolicitudConfirmado();
        });
    }

    // 2. ACTUALIZAR MÉTODO MOSTRAR APLICACIÓN
    async mostrarAplicacion() {
        const loginModal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
        if (loginModal) loginModal.hide();

        // Ocultar header de invitado y mostrar navbar para usuarios logueados
        document.getElementById('invitadoHeader').classList.add('d-none');
        document.getElementById('invitadoInfo').classList.add('d-none');
        
        if (this.usuario.rol !== 'invitado') {
            document.getElementById('mainNavbar').classList.remove('d-none');
            
            // Ocultar mensaje de invitado cuando el usuario está logueado
            const invitadoMessage = document.getElementById('invitadoMessage');
            if (invitadoMessage) {
                invitadoMessage.classList.add('d-none');
            }
        }
        
        document.getElementById('mainContent').classList.remove('d-none');
        
        this.actualizarUIUsuario();
        await this.cargarDatosIniciales();
        
        // 🔄 NUEVO: Mostrar/ocultar estadísticas según el rol
        this.mostrarOcultarEstadisticas();
        this.mostrarOcultarSolicitudes();
    }

    // 🔄 MOSTRAR U OCULTAR ESTADÍSTICAS SEGÚN ROL
    mostrarOcultarEstadisticas() {
        const statsSection = document.getElementById('statsSection');
        
        if (!statsSection) return;
        
        // Mostrar estadísticas SOLO si el usuario está logueado (no es invitado)
        if (this.usuario.rol !== 'invitado') {
            statsSection.classList.remove('d-none');
            console.log('📊 Mostrando estadísticas para usuario logueado');
        } else {
            statsSection.classList.add('d-none');
            console.log('👻 Ocultando estadísticas para invitado');
        }
    }

    // 🔄 MOSTRAR U OCULTAR SECCIÓN DE SOLICITUDES SEGÚN ROL
    mostrarOcultarSolicitudes() {
        const solicitudesSection = document.getElementById('solicitudesSection');
        
        if (!solicitudesSection) return;
        
        // Mostrar sección de solicitudes SOLO si el usuario está logueado (no es invitado)
        if (this.usuario.rol !== 'invitado') {
            solicitudesSection.classList.remove('d-none');
            console.log('📋 Mostrando sección de solicitudes para usuario logueado');
            
            // Cargar solicitudes iniciales
            this.cargarSolicitudes();
        } else {
            solicitudesSection.classList.add('d-none');
            console.log('👻 Ocultando sección de solicitudes para invitado');
        }
    }

    // 3. ACTUALIZAR MÉTODO ACTUALIZAR UI USUARIO
    actualizarUIUsuario() {
        const userInfo = document.getElementById('userInfo');
        const btnLogout = document.getElementById('btnLogout');
        const btnNewItem = document.getElementById('btnNewItem');
        const invitadoMessage = document.getElementById('invitadoMessage');

        if (this.usuario.rol === 'invitado') {
            // Para invitado: mostrar botón de login
            userInfo.innerHTML = `
                <span class="user-badge role-invitado">
                    <i class="fas fa-user me-1"></i>Invitado
                </span>
            `;
            btnLogout.innerHTML = '<i class="fas fa-sign-in-alt me-1"></i>Iniciar Sesión';
            btnNewItem.classList.add('d-none');
            
            // Mostrar mensaje solo para invitados
            if (invitadoMessage) {
                invitadoMessage.classList.remove('d-none');
            }
        } else {
            // Para usuarios logueados
            userInfo.innerHTML = `
                <span class="user-badge role-${this.usuario.rol}">
                    <i class="fas fa-user me-1"></i>${this.usuario.username} (${this.usuario.rol})
                </span>
            `;
            btnLogout.innerHTML = '<i class="fas fa-sign-out-alt me-1"></i>Salir';
            
            // Ocultar mensaje para usuarios logueados
            if (invitadoMessage) {
                invitadoMessage.classList.add('d-none');
            }
            
            // Mostrar botón nuevo item solo para admin y usuario
            if (this.usuario.rol === 'admin' || this.usuario.rol === 'usuario') {
                btnNewItem.classList.remove('d-none');
            } else {
                btnNewItem.classList.add('d-none');
            }
        }
    }

    // 5. ACTUALIZAR CERRAR SESIÓN
    cerrarSesion() {
        console.log('🔐 Iniciando cierre de sesión...');
        
        // 1. Limpiar todo el almacenamiento local
        localStorage.removeItem('authToken');
        localStorage.removeItem('usuario');
        
        // 2. Limpiar sessionStorage también
        sessionStorage.clear();
        
        // 3. Limpiar variables en memoria
        this.token = null;
        this.usuario = null;
        this.items = [];
        this.categorias = [];
        this.solicitudes = [];
        this.currentPage = 1;
        this.totalItems = 0;
        this.totalPages = 1;
        
        console.log('✅ Datos limpiados, redirigiendo...');
        
        // 4. Forzar recarga COMPLETA con parámetros anti-cache
        setTimeout(() => {
            // Agregar timestamp para evitar cache
            const timestamp = new Date().getTime();
            const currentUrl = window.location.href.split('?')[0];
            const newUrl = `${currentUrl}?nocache=${timestamp}`;
            
            // Redirección forzada
            window.location.href = newUrl;
        }, 500);
        
        this.mostrarToast('Sesión cerrada correctamente', 'info');
    }

    // 6. ACTUALIZAR MOSTRAR LOGIN
    mostrarLogin() {
        const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
        loginModal.show();
    }

    async verificarToken() {
        try {
            const response = await this.fetchAutenticado('/api/auth/verificar');
            
            if (!response.ok) {
                throw new Error('Token inválido');
            }

            const data = await response.json();
            this.usuario = data.usuario;
            this.mostrarAplicacion();
            
        } catch (error) {
            console.error('Error verificando token:', error);
            this.cerrarSesion();
        }
    }

    async cargarDatosIniciales() {
        try {
            // Siempre cargar categorías e items
            await Promise.all([
                this.cargarCategorias(),
                this.cargarItems()
            ]);
            
            // 🔄 SOLO cargar estadísticas y solicitudes si el usuario está logueado
            if (this.usuario.rol !== 'invitado') {
                await this.cargarEstadisticas();
                // Las solicitudes ya se cargan en mostrarOcultarSolicitudes()
            }
        } catch (error) {
            this.mostrarToast('Error al cargar datos iniciales', 'error');
        }
    }

    async cargarCategorias() {
        try {
            // Para invitados usar ruta pública, para logueados usar ruta protegida
            const url = this.usuario.rol === 'invitado' ? '/api/public/categories' : '/api/categorias';
            const response = await fetch(url);
            
            if (!response.ok) throw new Error('Error al cargar categorías');
            
            this.categorias = await response.json();
            this.mostrarCategoriasEnFiltros();
        } catch (error) {
            console.error('Error cargando categorías:', error);
        }
    }

    mostrarCategoriasEnFiltros() {
        const categorySelects = [
            document.getElementById('categoryFilter'),
            document.getElementById('categoria_id'),
            document.getElementById('edit-categoria_id')
        ];

        categorySelects.forEach(select => {
            if (select) {
                // Limpiar opciones excepto la primera
                while (select.options.length > 1) {
                    select.remove(1);
                }

                // Agregar categorías
                this.categorias.forEach(categoria => {
                    const option = document.createElement('option');
                    option.value = categoria.id;
                    option.textContent = categoria.nombre;
                    select.appendChild(option);
                });
            }
        });
    }

    async cargarItems(filtros = {}, page = 1) {
        if (this.isLoading) return;
        
        this.isLoading = true;
        this.mostrarLoadingState(true);
        
        try {
            // Para invitados usar ruta pública, para logueados usar ruta protegida
            let baseUrl = this.usuario.rol === 'invitado' ? '/api/public/items' : '/api/items';
            
            const params = new URLSearchParams();
            if (filtros.busqueda) params.append('busqueda', filtros.busqueda);
            if (filtros.categoria_id) params.append('categoria_id', filtros.categoria_id);
            if (filtros.estado) params.append('estado', filtros.estado);
            
            // 🔄 PARÁMETROS DE PAGINACIÓN
            params.append('page', page);
            params.append('limit', this.itemsPerPage);
            
            const url = `${baseUrl}?${params.toString()}`;

            const response = this.usuario.rol === 'invitado' ? 
                await fetch(url) : 
                await this.fetchAutenticado(url);

            if (!response.ok) throw new Error('Error al cargar items');
            
            const result = await response.json();
            
            // 🔄 ACTUALIZAR DATOS DE PAGINACIÓN
            if (result.success && result.pagination) {
                this.items = result.data;
                this.currentPage = result.pagination.currentPage;
                this.totalPages = result.pagination.totalPages;
                this.totalItems = result.pagination.totalItems;
            } else {
                // Fallback para respuestas sin paginación
                this.items = result;
                this.currentPage = 1;
                this.totalPages = 1;
                this.totalItems = this.items.length;
            }
            
            this.mostrarItems();
            this.mostrarPaginacion();
            
        } catch (error) {
            console.error('Error cargando items:', error);
            this.mostrarToast('Error al cargar items', 'error');
        } finally {
            this.isLoading = false;
            this.mostrarLoadingState(false);
        }
    }

    mostrarItems() {
        const grid = document.getElementById('itemsGrid');
        if (!grid) return;

        if (this.items.length === 0) {
            grid.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="fas fa-box-open fa-3x text-muted mb-3"></i>
                    <h4 class="text-muted">No se encontraron items</h4>
                    <p class="text-muted">Intenta con otros filtros o agrega nuevos items.</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = this.items.map(item => this.crearCardItem(item)).join('');
    }

    crearCardItem(item) {
        const categoria = this.categorias.find(cat => cat.id === item.categoria_id) || { nombre: 'Sin categoría' };
        
        // Determinar qué botones mostrar según el rol
        const puedeEditar = this.usuario.rol === 'admin' || this.usuario.rol === 'usuario';
        const puedeEliminar = this.usuario.rol === 'admin';
        
        // Ocultar ubicación para invitados
        const mostrarUbicacion = this.usuario.rol !== 'invitado';
        
        // Verificar si tiene imágenes
        const tieneImagenes = item.imagenes && item.imagenes.length > 0;
        
        // Ruta correcta para imagen principal
        const primeraImagen = tieneImagenes ? `/uploads/items/${item.imagenes[0].filename}` : null;
        
        return `
            <div class="col-md-4 mb-4">
                <div class="card item-card h-100 item-card-with-images">
                    ${tieneImagenes ? `
                        <div class="card-img-container">
                            <img src="${primeraImagen}" 
                                class="card-img-top item-image-responsive" 
                                alt="${item.nombre}"
                                loading="lazy"
                                onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                            <div class="item-image-placeholder" style="display: none;">
                                <i class="fas fa-image"></i>
                                <span>Imagen no disponible</span>
                            </div>
                        </div>
                    ` : `
                        <div class="item-image-placeholder">
                            <i class="fas fa-box-open"></i>
                            <span>Sin imagen</span>
                        </div>
                    `}
                    
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h6 class="card-title text-truncate">${item.nombre}</h6>
                            <span class="badge ${this.obtenerClaseEstado(item.estado)}">${item.estado}</span>
                        </div>
                        
                        <p class="card-text text-muted small item-description">${item.descripcion || 'Sin descripción'}</p>
                        
                        <div class="item-info small">
                            <div><strong>Código:</strong> ${item.codigo_ufro}</div>
                            <div><strong>Categoría:</strong> ${categoria.nombre}</div>
                            ${mostrarUbicacion ? `<div><strong>Ubicación:</strong> ${item.ubicacion_bodega}</div>` : ''}
                            <div><strong>Cantidad:</strong> ${item.cantidad}</div>
                            ${item.valor_aproximado ? `<div><strong>Valor:</strong> $${item.valor_aproximado.toLocaleString()}</div>` : ''}
                            ${tieneImagenes ? `<div><strong>Imágenes:</strong> ${item.imagenes.length}</div>` : ''}
                        </div>
                    </div>
                    
                    <div class="card-footer bg-transparent">
                        <div class="btn-group w-100">
                            <!-- Botón Detalles - Siempre visible -->
                            <button class="btn btn-outline-primary btn-sm" onclick="catalogoApp.mostrarDetallesItem(${item.id})">
                                <i class="fas fa-eye me-1"></i>Detalles
                            </button>
                            
                            <!-- 🔄 BOTÓN SOLICITAR - Solo para invitados -->
                            ${this.usuario.rol === 'invitado' ? `
                            <button class="btn btn-outline-info btn-sm" onclick="catalogoApp.mostrarModalSolicitud(${item.id})">
                                <i class="fas fa-hand-paper me-1"></i>Solicitar
                            </button>
                            ` : ''}
                            
                            <!-- Botón Editar - Solo para admin y usuario -->
                            ${puedeEditar ? `
                            <button class="btn btn-outline-warning btn-sm" onclick="catalogoApp.mostrarModalEdicion(${item.id})">
                                <i class="fas fa-edit me-1"></i>Editar
                            </button>
                            ` : ''}
                            
                            <!-- Botón Eliminar - Solo para admin -->
                            ${puedeEliminar ? `
                            <button class="btn btn-outline-danger btn-sm" onclick="catalogoApp.solicitarEliminacionItem(${item.id})">
                                <i class="fas fa-trash me-1"></i>Eliminar
                            </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    obtenerClaseEstado(estado) {
        const clases = {
            'bueno': 'bg-success',
            'regular': 'bg-warning',
            'malo': 'bg-danger',
            'inactivo': 'bg-secondary'
        };
        return clases[estado] || 'bg-secondary';
    }

    async cargarEstadisticas() {
        try {
            // Para usuarios logueados usar ruta protegida
            const url = '/api/items/stats';  
            
            console.log('📊 Cargando estadísticas desde:', url);
            
            const response = await this.fetchAutenticado(url);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Error ${response.status}: ${errorText}`);
            }
            
            const result = await response.json();
            console.log('📊 Respuesta completa de estadísticas:', result);
            
            this.mostrarEstadisticas(result);
            
        } catch (error) {
            console.error('❌ Error cargando estadísticas:', error);
            this.mostrarToast('Error al cargar estadísticas', 'error');
            
            // 🔄 FALLBACK: Intentar con ruta pública si falla la protegida
            console.log('🔄 Intentando con ruta pública...');
            try {
                const responsePublic = await fetch('/api/public/items/stats/estadisticas');
                if (responsePublic.ok) {
                    const statsPublic = await responsePublic.json();
                    console.log('📊 Estadísticas de ruta pública:', statsPublic);
                    this.mostrarEstadisticas(statsPublic);
                }
            } catch (fallbackError) {
                console.error('❌ Fallback también falló:', fallbackError);
            }
        }
    }

    mostrarEstadisticas(stats) {
        const statsContainer = document.getElementById('statsCards');
        if (!statsContainer) return;

        console.log('📊 Procesando estadísticas para mostrar:', stats);

        // 🔄 CORRECCIÓN: Manejar diferentes estructuras de respuesta
        let datosEstadisticas = stats;
        
        // Si la respuesta tiene la propiedad 'stats', usar esa
        if (stats.stats && typeof stats.stats === 'object') {
            datosEstadisticas = stats.stats;
            console.log('📊 Usando datos de stats.stats');
        }
        // Si la respuesta tiene la propiedad 'data', usar esa  
        else if (stats.data && typeof stats.data === 'object') {
            datosEstadisticas = stats.data;
            console.log('📊 Usando datos de stats.data');
        }
        // Si no, usar el objeto directamente
        else {
            console.log('📊 Usando stats directamente');
        }

        // 🔄 CORRECCIÓN: Asegurar que los valores sean números
        const totalItems = parseInt(datosEstadisticas.total_items || 0);
        const totalBuenos = parseInt(datosEstadisticas.total_buenos || 0);
        const totalRegulares = parseInt(datosEstadisticas.total_regulares || 0);
        const totalMalos = parseInt(datosEstadisticas.total_malos || 0);
        const totalInactivos = parseInt(datosEstadisticas.total_inactivos || 0);
        const valorTotal = parseFloat(datosEstadisticas.valor_total || 0);

        console.log('📊 Valores procesados:', {
            totalItems, totalBuenos, totalRegulares, 
            totalMalos, totalInactivos, valorTotal
        });

        statsContainer.innerHTML = `
            <div class="col-md-2">
                <div class="stat-card">
                    <div class="stat-number">${totalItems}</div>
                    <div class="stat-label">Total Items</div>
                </div>
            </div>
            <div class="col-md-2">
                <div class="stat-card">
                    <div class="stat-number text-success">${totalBuenos}</div>
                    <div class="stat-label">En Buen Estado</div>
                </div>
            </div>
            <div class="col-md-2">
                <div class="stat-card">
                    <div class="stat-number text-warning">${totalRegulares}</div>
                    <div class="stat-label">Estado Regular</div>
                </div>
            </div>
            <div class="col-md-2">
                <div class="stat-card">
                    <div class="stat-number text-danger">${totalMalos}</div>
                    <div class="stat-label">En Mal Estado</div>
                </div>
            </div>
            <div class="col-md-2">
                <div class="stat-card">
                    <div class="stat-number text-secondary">${totalInactivos}</div>
                    <div class="stat-label">Inactivos</div>
                </div>
            </div>
            <div class="col-md-2">
                <div class="stat-card">
                    <div class="stat-number text-primary">$${valorTotal.toLocaleString()}</div>
                    <div class="stat-label">Valor Total</div>
                </div>
            </div>
        `;
        
        console.log('✅ Estadísticas mostradas correctamente en la UI');
    }

    // LOGIN Y AUTENTICACIÓN
    async login(credenciales, esInvitado = false) {
        try {
            if (esInvitado) {
                // Login como invitado
                this.token = null;
                this.usuario = { rol: 'invitado', username: 'Invitado' };
                this.mostrarAplicacion();
                this.mostrarToast('Modo invitado activado', 'success');
                return;
            }

            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(credenciales)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error en login');
            }

            this.token = data.token;
            this.usuario = data.usuario;

            localStorage.setItem('authToken', this.token);
            localStorage.setItem('usuario', JSON.stringify(this.usuario));

            this.mostrarAplicacion();
            this.mostrarToast(`Bienvenido ${this.usuario.username}`, 'success');

        } catch (error) {
            this.mostrarErrorLogin(error.message);
        }
    }

    mostrarErrorLogin(mensaje) {
        const errorDiv = document.getElementById('loginError');
        errorDiv.textContent = mensaje;
        errorDiv.classList.remove('d-none');
    }

    // FETCH AUTENTICADO MEJORADO (soporta FormData)
    async fetchAutenticado(url, options = {}) {
        if (!this.token) {
            throw new Error('No autenticado');
        }

        const config = {
            ...options,
            headers: {
                'Authorization': `Bearer ${this.token}`,
                // NO establecer Content-Type cuando se envía FormData, el navegador lo hará automáticamente
                ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
                ...options.headers
            }
        };

        try {
            const response = await fetch(url, config);
            
            if (response.status === 401) {
                this.mostrarToast('Sesión expirada', 'error');
                this.cerrarSesion();
                throw new Error('Sesión expirada');
            }

            if (response.status === 403) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Acceso denegado. Permisos insuficientes.');
            }

            return response;
        } catch (error) {
            console.error('Error en fetch autenticado:', error);
            throw error;
        }
    }

    aplicarFiltros() {
        const filtros = {
            busqueda: document.getElementById('searchInput').value,
            categoria_id: document.getElementById('categoryFilter').value,
            estado: document.getElementById('statusFilter').value
        };
        
        // 🔄 SIEMPRE VOLVER A PÁGINA 1 AL APLICAR FILTROS
        this.currentPage = 1;
        this.cargarItems(filtros, 1);
    }

    // 🔄 MOSTRAR/OCULTAR ESTADO DE CARGA
    mostrarLoadingState(mostrar) {
        const grid = document.getElementById('itemsGrid');
        const pagination = document.getElementById('paginationContainer');
        
        if (mostrar) {
            grid.innerHTML = this.crearSkeletonLoading();
            if (pagination) pagination.style.opacity = '0.5';
        } else {
            if (pagination) pagination.style.opacity = '1';
        }
    }

    // 🔄 CREAR SKELETON LOADING
    crearSkeletonLoading() {
        return Array.from({ length: this.itemsPerPage }, (_, index) => `
            <div class="col-md-4 mb-4">
                <div class="card h-100 item-card skeleton-card">
                    <div class="skeleton-image"></div>
                    <div class="card-body">
                        <div class="skeleton-line skeleton-title"></div>
                        <div class="skeleton-line skeleton-text"></div>
                        <div class="skeleton-line skeleton-text"></div>
                    </div>
                    <div class="card-footer">
                        <div class="skeleton-line skeleton-button"></div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // 🔄 MOSTRAR PAGINACIÓN
    mostrarPaginacion() {
        const container = document.getElementById('paginationContainer');
        if (!container) return;
        
        if (this.totalPages <= 1) {
            container.innerHTML = '';
            return;
        }
        
        let paginationHTML = `
            <nav aria-label="Paginación de items">
                <ul class="pagination justify-content-center">
        `;
        
        // Botón Anterior
        paginationHTML += `
            <li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}">
                <button class="page-link" onclick="catalogoApp.cambiarPagina(${this.currentPage - 1})" 
                        ${this.currentPage === 1 ? 'disabled' : ''}>
                    <i class="fas fa-chevron-left"></i>
                </button>
            </li>
        `;
        
        // Páginas
        const paginas = this.generarNumerosPagina();
        paginas.forEach(pagina => {
            if (pagina === '...') {
                paginationHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            } else {
                paginationHTML += `
                    <li class="page-item ${pagina === this.currentPage ? 'active' : ''}">
                        <button class="page-link" onclick="catalogoApp.cambiarPagina(${pagina})">
                            ${pagina}
                        </button>
                    </li>
                `;
            }
        });
        
        // Botón Siguiente
        paginationHTML += `
            <li class="page-item ${this.currentPage === this.totalPages ? 'disabled' : ''}">
                <button class="page-link" onclick="catalogoApp.cambiarPagina(${this.currentPage + 1})" 
                        ${this.currentPage === this.totalPages ? 'disabled' : ''}>
                    <i class="fas fa-chevron-right"></i>
                </button>
            </li>
        `;
        
        paginationHTML += `
                </ul>
            </nav>
            
            <div class="text-center mt-2 text-muted small">
                Mostrando ${this.items.length} de ${this.totalItems} items totales
                (Página ${this.currentPage} de ${this.totalPages})
            </div>
        `;
        
        container.innerHTML = paginationHTML;
    }

    // 🔄 GENERAR NÚMEROS DE PÁGINA (con elipsis para muchas páginas)
    generarNumerosPagina() {
        const paginas = [];
        const paginasVisibles = 5;
        
        let inicio = Math.max(1, this.currentPage - Math.floor(paginasVisibles / 2));
        let fin = Math.min(this.totalPages, inicio + paginasVisibles - 1);
        
        // Ajustar inicio si estamos cerca del final
        inicio = Math.max(1, fin - paginasVisibles + 1);
        
        // Primera página y elipsis si es necesario
        if (inicio > 1) {
            paginas.push(1);
            if (inicio > 2) paginas.push('...');
        }
        
        // Páginas centrales
        for (let i = inicio; i <= fin; i++) {
            paginas.push(i);
        }
        
        // Última página y elipsis si es necesario
        if (fin < this.totalPages) {
            if (fin < this.totalPages - 1) paginas.push('...');
            paginas.push(this.totalPages);
        }
        
        return paginas;
    }

    // 🔄 CAMBIAR PÁGINA
    cambiarPagina(nuevaPagina) {
        if (nuevaPagina < 1 || nuevaPagina > this.totalPages || nuevaPagina === this.currentPage) {
            return;
        }
        
        const filtros = {
            busqueda: document.getElementById('searchInput').value,
            categoria_id: document.getElementById('categoryFilter').value,
            estado: document.getElementById('statusFilter').value
        };
        
        this.cargarItems(filtros, nuevaPagina);
        
        // Scroll suave hacia arriba
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // MOSTRAR DETALLES EN MODAL
    async mostrarDetallesItem(id) {
        try {
            // Para invitados usar ruta pública, para logueados usar ruta protegida
            const url = this.usuario.rol === 'invitado' ? 
                `/api/public/items/${id}` : 
                `/api/items/${id}`;
            
            const response = this.usuario.rol === 'invitado' ? 
                await fetch(url) : 
                await this.fetchAutenticado(url);
                
            if (!response.ok) throw new Error('Error al cargar detalles');
            
            const item = await response.json();
            
            // 🔄 AGREGAR BOTÓN DE SOLICITUD SOLO PARA INVITADOS
            const btnSolicitar = document.getElementById('btnSolicitarDesdeDetalles');
            if (btnSolicitar) {
                if (this.usuario.rol === 'invitado') {
                    btnSolicitar.classList.remove('d-none');
                    btnSolicitar.onclick = () => this.mostrarModalSolicitud(item.id);
                } else {
                    btnSolicitar.classList.add('d-none');
                }
            }
            
            this.mostrarModalDetalles(item);
        } catch (error) {
            this.mostrarToast('Error al cargar detalles del item', 'error');
        }
    }

    // MOSTRAR DETALLES EN MODAL CON CARRUSEL
    mostrarModalDetalles(item) {
        const categoria = this.categorias.find(cat => cat.id === item.categoria_id) || { nombre: 'Sin categoría' };
        
        // Formatear fecha
        const fechaAdq = item.fecha_adquisicion ? 
            new Date(item.fecha_adquisicion).toLocaleDateString('es-CL') : 
            'No especificada';
        
        const fechaCreacion = item.fecha_creacion ? 
            new Date(item.fecha_creacion).toLocaleDateString('es-CL') : 
            'No especificada';

        // Generar HTML para el carrusel de imágenes
        let carruselHTML = '';
        let indicadoresHTML = '';
        let miniaturasHTML = '';

        if (item.imagenes && item.imagenes.length > 0) {
            // Indicadores del carrusel
            indicadoresHTML = item.imagenes.map((img, index) => `
                <button type="button" data-bs-target="#itemImagesCarousel" data-bs-slide-to="${index}" 
                        class="${index === 0 ? 'active' : ''}" aria-current="${index === 0 ? 'true' : 'false'}" 
                        aria-label="Slide ${index + 1}"></button>
            `).join('');

            // Slides del carrusel
            carruselHTML = item.imagenes.map((img, index) => {
                const imageUrl = `/uploads/items/${img.filename}`;
                return `
                    <div class="carousel-item ${index === 0 ? 'active' : ''}">
                        <img src="${imageUrl}" class="d-block w-100 carousel-image" alt="${img.originalname}"
                            onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iODAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iI2Y4ZjlmYSIvPjx0ZXh0IHg9IjQwMCIgeT0iMjAwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjAiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZW4gbm8gZGlzcG9uaWJsZTwvdGV4dD48L3N2Zz4='">
                    </div>
                `;
            }).join('');

            // Miniaturas para navegación
            miniaturasHTML = `
                <div class="row mt-3">
                    <div class="col-12">
                        <h6 class="border-bottom pb-2 text-ufro">
                            <i class="fas fa-images me-2"></i>Miniaturas (${item.imagenes.length})
                        </h6>
                        <div class="thumbnails-container">
                            ${item.imagenes.map((img, index) => {
                                const imageUrl = `/uploads/items/${img.filename}`;
                                return `
                                    <img src="${imageUrl}" class="thumbnail-image" alt="${img.originalname}"
                                        data-bs-target="#itemImagesCarousel" data-bs-slide-to="${index}"
                                        onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2Y4ZjlmYSIvPjx0ZXh0IHg9IjUwIiB5PSI1MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIiBmaWxsPSIjOTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+SW1hZ2VuPC90ZXh0Pjwvc3ZnPg=='">
                                `;
                            }).join('')}
                        </div>
                    </div>
                </div>
            `;
        }

        const detallesHTML = `
            ${item.imagenes && item.imagenes.length > 0 ? `
            <!-- CARRUSEL DE IMÁGENES -->
            <div class="row mb-4">
                <div class="col-12">
                    <div id="itemImagesCarousel" class="carousel slide" data-bs-ride="carousel">
                        <!-- Indicadores -->
                        <div class="carousel-indicators">
                            ${indicadoresHTML}
                        </div>
                        
                        <!-- Slides -->
                        <div class="carousel-inner rounded">
                            ${carruselHTML}
                        </div>
                        
                        <!-- Controles -->
                        <button class="carousel-control-prev" type="button" data-bs-target="#itemImagesCarousel" data-bs-slide="prev">
                            <span class="carousel-control-prev-icon" aria-hidden="true"></span>
                            <span class="visually-hidden">Anterior</span>
                        </button>
                        <button class="carousel-control-next" type="button" data-bs-target="#itemImagesCarousel" data-bs-slide="next">
                            <span class="carousel-control-next-icon" aria-hidden="true"></span>
                            <span class="visually-hidden">Siguiente</span>
                        </button>
                    </div>
                    ${miniaturasHTML}
                </div>
            </div>
            ` : ''}

            <div class="row">
                <div class="col-12 mb-4">
                    <h6 class="border-bottom pb-2 text-ufro">
                        <i class="fas fa-file-alt me-2"></i>Descripción
                    </h6>
                    <div class="bg-light p-3 rounded" style="max-height: 200px; overflow-y: auto;">
                        <p class="mb-0" style="white-space: pre-line; line-height: 1.6;">
                            ${item.descripcion || 'No hay descripción disponible'}
                        </p>
                    </div>
                </div>
            </div>

            <div class="row">
                <div class="col-md-6">
                    <h6 class="border-bottom pb-2 text-ufro">
                        <i class="fas fa-info-circle me-2"></i>Información General
                    </h6>
                    <div class="detail-item">
                        <strong>Código UFRO:</strong> ${item.codigo_ufro}
                    </div>
                    <div class="detail-item">
                        <strong>Nombre:</strong> ${item.nombre}
                    </div>
                    <div class="detail-item">
                        <strong>Categoría:</strong> ${categoria.nombre}
                    </div>
                    <div class="detail-item">
                        <strong>Estado:</strong> 
                        <span class="badge ${this.obtenerClaseEstado(item.estado)}">${item.estado}</span>
                    </div>
                    ${this.usuario.rol !== 'invitado' ? `
                    <div class="detail-item">
                        <strong>Ubicación:</strong> ${item.ubicacion_bodega}
                    </div>
                    ` : ''}
                </div>
                
                <div class="col-md-6">
                    <h6 class="border-bottom pb-2 text-ufro">
                        <i class="fas fa-calculator me-2"></i>Especificaciones
                    </h6>
                    <div class="detail-item">
                        <strong>Cantidad:</strong> ${item.cantidad}
                    </div>
                    <div class="detail-item">
                        <strong>Valor Aproximado:</strong> 
                        ${item.valor_aproximado ? `$${item.valor_aproximado.toLocaleString()}` : 'No especificado'}
                    </div>
                    <div class="detail-item">
                        <strong>Fecha Adquisición:</strong> ${fechaAdq}
                    </div>
                    <div class="detail-item">
                        <strong>Fecha Publicación:</strong> ${fechaCreacion}
                    </div>
                </div>
            </div>
            
            ${item.marca || item.modelo ? `
            <div class="row mt-4">
                <div class="col-12">
                    <h6 class="border-bottom pb-2 text-ufro">
                        <i class="fas fa-tag me-2"></i>Detalles del Producto
                    </h6>
                    <div class="row">
                        ${item.marca ? `
                        <div class="col-md-6">
                            <div class="detail-item">
                                <strong>Marca:</strong> ${item.marca}
                            </div>
                        </div>
                        ` : ''}
                        ${item.modelo ? `
                        <div class="col-md-6">
                            <div class="detail-item">
                                <strong>Modelo:</strong> ${item.modelo}
                            </div>
                        </div>
                        ` : ''}
                    </div>
                </div>
            </div>
            ` : ''}
            
            ${item.especificaciones && Object.keys(item.especificaciones).length > 0 ? `
            <div class="row mt-4">
                <div class="col-12">
                    <h6 class="border-bottom pb-2 text-ufro">
                        <i class="fas fa-cogs me-2"></i>Especificaciones Técnicas
                    </h6>
                    <div class="table-responsive">
                        <table class="table table-sm table-bordered table-hover">
                            <thead class="table-light">
                                <tr>
                                    <th>Característica</th>
                                    <th>Valor</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${Object.entries(item.especificaciones).map(([key, value]) => `
                                    <tr>
                                        <td><strong>${key}</strong></td>
                                        <td>${value}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            ` : ''}
            
            <div class="row mt-4">
                <div class="col-12">
                    <div class="alert alert-info">
                        <small>
                            <i class="fas fa-info-circle me-1"></i>
                            <strong>ID del Item:</strong> ${item.id} | 
                            <strong>Última actualización:</strong> ${item.fecha_actualizacion ? 
                                new Date(item.fecha_actualizacion).toLocaleDateString('es-CL') : 'No disponible'}
                        </small>
                    </div>
                </div>
            </div>
        `;

        // Actualizar el modal
        document.getElementById('itemDetailsTitle').textContent = `Detalles: ${item.nombre}`;
        document.getElementById('itemDetailsContent').innerHTML = detallesHTML;
        
        // Mostrar el modal
        const modal = new bootstrap.Modal(document.getElementById('itemDetailsModal'));
        modal.show();
    }

    // SOLICITAR ELIMINACIÓN (muestra modal)
    solicitarEliminacionItem(id) {
        try {
            const item = this.items.find(item => item.id === id);
            if (!item) {
                this.mostrarToast('Item no encontrado', 'error');
                return;
            }

            console.log('🔄 Iniciando eliminación para item ID:', id);
            
            // Verificar que el modal exista
            const deleteModal = document.getElementById('confirmDeleteModal');
            if (!deleteModal) {
                console.error('❌ Modal confirmDeleteModal no encontrado');
                // Fallback: usar confirm nativo
                if (confirm(`¿Estás seguro de eliminar el item "${item.nombre}"?`)) {
                    this.eliminarItemConfirmado(id);
                }
                return;
            }

            // Verificar que el elemento exista antes de usarlo
            const deleteItemInfo = document.getElementById('deleteItemInfo');
            if (!deleteItemInfo) {
                console.error('❌ Elemento deleteItemInfo no encontrado');
                // Fallback: usar confirm nativo
                if (confirm(`¿Estás seguro de eliminar el item "${item.nombre}"?`)) {
                    this.eliminarItemConfirmado(id);
                }
                return;
            }

            // Mostrar información del item en el modal
            const categoria = this.categorias.find(cat => cat.id === item.categoria_id) || { nombre: 'Sin categoría' };
            
            const itemInfoHTML = `
                <div class="row">
                    <div class="col-12">
                        <strong>Item a eliminar:</strong>
                        <div class="mt-2">
                            <div><strong>Código:</strong> ${item.codigo_ufro}</div>
                            <div><strong>Nombre:</strong> ${item.nombre}</div>
                            <div><strong>Categoría:</strong> ${categoria.nombre}</div>
                            <div><strong>Estado actual:</strong> <span class="badge ${this.obtenerClaseEstado(item.estado)}">${item.estado}</span></div>
                            <div><strong>Ubicación:</strong> ${item.ubicacion_bodega}</div>
                        </div>
                    </div>
                </div>
            `;

            deleteItemInfo.innerHTML = itemInfoHTML;

            // Configurar el evento de confirmación
            const confirmButton = document.getElementById('btnConfirmDelete');
            if (!confirmButton) {
                console.error('❌ Botón btnConfirmDelete no encontrado');
                // Fallback: usar confirm nativo
                if (confirm(`¿Estás seguro de eliminar el item "${item.nombre}"?`)) {
                    this.eliminarItemConfirmado(id);
                }
                return;
            }

            // Remover event listeners anteriores de forma más segura
            const newConfirmButton = confirmButton.cloneNode(true);
            confirmButton.parentNode.replaceChild(newConfirmButton, confirmButton);

            // Agregar nuevo event listener
            newConfirmButton.onclick = () => {
                console.log('✅ Confirmando eliminación del item ID:', id);
                this.eliminarItemConfirmado(id);
            };

            // Mostrar el modal
            console.log('🎯 Mostrando modal de confirmación');
            const modal = new bootstrap.Modal(deleteModal);
            modal.show();

        } catch (error) {
            console.error('💥 Error en solicitarEliminacionItem:', error);
            // Fallback final
            const item = this.items.find(item => item.id === id);
            if (item && confirm(`¿Estás seguro de eliminar el item "${item.nombre}"?`)) {
                this.eliminarItemConfirmado(id);
            }
        }
    }

    // ELIMINACIÓN CONFIRMADA
    async eliminarItemConfirmado(id) {
        try {
            // Cerrar el modal de confirmación
            const modal = bootstrap.Modal.getInstance(document.getElementById('confirmDeleteModal'));
            modal.hide();

            // Mostrar indicador de carga
            this.mostrarToast('Eliminando item...', 'info');

            const response = await this.fetchAutenticado(`/api/items/${id}`, {
                method: 'DELETE'
            });

            if (!response.ok) throw new Error('Error al eliminar');

            this.mostrarToast('Item eliminado correctamente', 'success');
            this.cargarItems();
            
        } catch (error) {
            console.error('Error eliminando item:', error);
            this.mostrarToast('Error al eliminar item: ' + error.message, 'error');
        }
    }

    // MOSTRAR MODAL DE EDICIÓN CON FECHA FORMATEADA
    mostrarModalEdicion(id) {
        // Verificar que el usuario tenga permisos de edición
        if (this.usuario.rol !== 'admin' && this.usuario.rol !== 'usuario') {
            this.mostrarToast('No tienes permisos para editar items', 'error');
            return;
        }

        const item = this.items.find(item => item.id === id);
        if (!item) {
            this.mostrarToast('Item no encontrado', 'error');
            return;
        }

        try {
            // Llenar el formulario con los datos actuales del item
            document.getElementById('edit-item-id').value = item.id;
            document.getElementById('edit-codigo_ufro').value = item.codigo_ufro;
            document.getElementById('edit-nombre').value = item.nombre;
            document.getElementById('edit-descripcion').value = item.descripcion || '';
            document.getElementById('edit-categoria_id').value = item.categoria_id || '';
            document.getElementById('edit-estado').value = item.estado;
            document.getElementById('edit-cantidad').value = item.cantidad;
            document.getElementById('edit-valor_aproximado').value = item.valor_aproximado || '';
            
            // Formatear fecha para input type="date" (YYYY-MM-DD)
            if (item.fecha_adquisicion) {
                const fecha = new Date(item.fecha_adquisicion);
                const fechaFormateada = fecha.toISOString().split('T')[0];
                document.getElementById('edit-fecha_adquisicion').value = fechaFormateada;
            } else {
                document.getElementById('edit-fecha_adquisicion').value = '';
            }
            
            document.getElementById('edit-marca').value = item.marca || '';
            document.getElementById('edit-modelo').value = item.modelo || '';
            document.getElementById('edit-ubicacion_bodega').value = item.ubicacion_bodega;

            // Mostrar imágenes existentes
            this.mostrarImagenesExistentes(item.imagenes || []);

            // Limpiar preview de nuevas imágenes
            document.getElementById('imagePreviewEdit').innerHTML = '';
            document.getElementById('edit-imagenes').value = '';

            // Mostrar el modal
            const modal = new bootstrap.Modal(document.getElementById('editItemModal'));
            modal.show();

        } catch (error) {
            console.error('Error al cargar modal de edición:', error);
            this.mostrarToast('Error al cargar formulario de edición', 'error');
        }
    }

    // MOSTRAR IMÁGENES EXISTENTES EN EDICIÓN
    mostrarImagenesExistentes(imagenes) {
        const container = document.getElementById('existingImages');
        container.innerHTML = '';
        
        if (imagenes && imagenes.length > 0) {
            imagenes.forEach((img, index) => {
                // Ruta correcta para imágenes existentes
                const imageUrl = `/uploads/items/${img.filename}`;
                console.log('🖼️ Cargando imagen:', imageUrl);
                
                const imageItem = document.createElement('div');
                imageItem.className = 'existing-image-item';
                imageItem.innerHTML = `
                    <img src="${imageUrl}" alt="${img.originalname}" 
                         onerror="console.error('❌ Error cargando imagen:', this.src)">
                    <button type="button" class="delete-existing-image" 
                            onclick="deleteExistingImage(${document.getElementById('edit-item-id').value}, '${img.filename}')">
                        <i class="fas fa-trash"></i>
                    </button>
                `;
                container.appendChild(imageItem);
            });
        } else {
            container.innerHTML = '<p class="text-muted">No hay imágenes para este item.</p>';
        }
    }

    // OBTENER DATOS DE IMÁGENES EXISTENTES
    getExistingImagesData() {
        const currentItem = this.items.find(item => 
            item.id === parseInt(document.getElementById('edit-item-id').value)
        );
        
        return currentItem?.imagenes || [];
    }

    // ACTUALIZAR ITEM CON IMÁGENES
    async actualizarItem() {
        try {
            // Verificar que el usuario tenga permisos de edición
            if (this.usuario.rol !== 'admin' && this.usuario.rol !== 'usuario') {
                this.mostrarToast('No tienes permisos para actualizar items', 'error');
                return;
            }

            const id = document.getElementById('edit-item-id').value;
            const codigo = document.getElementById('edit-codigo_ufro').value;
            const nombre = document.getElementById('edit-nombre').value;
            
            // Validaciones básicas
            if (!codigo || !nombre) {
                this.mostrarToast('Código UFRO y Nombre son requeridos', 'error');
                return;
            }

            // Crear FormData para enviar archivos
            const formData = new FormData();
            
            // Agregar campos de texto
            formData.append('codigo_ufro', codigo);
            formData.append('nombre', nombre);
            formData.append('descripcion', document.getElementById('edit-descripcion').value);
            formData.append('categoria_id', document.getElementById('edit-categoria_id').value || '');
            formData.append('estado', document.getElementById('edit-estado').value);
            formData.append('cantidad', document.getElementById('edit-cantidad').value || '1');
            formData.append('valor_aproximado', document.getElementById('edit-valor_aproximado').value || '');
            formData.append('fecha_adquisicion', document.getElementById('edit-fecha_adquisicion').value || '');
            formData.append('marca', document.getElementById('edit-marca').value || '');
            formData.append('modelo', document.getElementById('edit-modelo').value || '');
            formData.append('ubicacion_bodega', document.getElementById('edit-ubicacion_bodega').value);

            // Agregar imágenes existentes (si las hay)
            const existingImages = this.getExistingImagesData();
            if (existingImages.length > 0) {
                formData.append('imagenes_existentes', JSON.stringify(existingImages));
            }

            // Agregar nuevas imágenes si existen
            const imagenesInput = document.getElementById('edit-imagenes');
            if (imagenesInput && imagenesInput.files.length > 0) {
                for (let i = 0; i < imagenesInput.files.length; i++) {
                    formData.append('imagenes', imagenesInput.files[i]);
                }
            }

            console.log('📤 Enviando actualización con FormData:', {
                id: id,
                imagenesExistentes: existingImages.length,
                nuevasImagenes: imagenesInput?.files.length || 0
            });

            const response = await this.fetchAutenticado(`/api/items/${id}`, {
                method: 'PUT',
                body: formData // ¡IMPORTANTE! No establecer Content-Type
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
            }

            const itemActualizado = await response.json();
            
            // Cerrar modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('editItemModal'));
            modal.hide();
            
            // Limpiar preview de imágenes
            document.getElementById('imagePreviewEdit').innerHTML = '';
            
            this.mostrarToast('Item actualizado correctamente', 'success');
            this.cargarItems(); // Recargar la lista
            
        } catch (error) {
            console.error('Error completo al actualizar item:', error);
            this.mostrarToast('Error al actualizar item: ' + error.message, 'error');
        }
    }

    mostrarModalNuevoItem() {
        // Solo permitir si no es invitado
        if (this.usuario.rol === 'invitado') {
            this.mostrarToast('Debe iniciar sesión para agregar items', 'warning');
            this.mostrarLogin();
            return;
        }

        const modal = new bootstrap.Modal(document.getElementById('newItemModal'));
        modal.show();
    }

    // GUARDAR NUEVO ITEM CON IMÁGENES
    async guardarNuevoItem() {
        try {
            // Verificar que el usuario tenga permisos de creación
            if (this.usuario.rol !== 'admin' && this.usuario.rol === 'usuario') {
                this.mostrarToast('No tienes permisos para crear items', 'error');
                return;
            }

            // Validaciones básicas
            const codigo = document.getElementById('codigo_ufro').value;
            const nombre = document.getElementById('nombre').value;
            
            if (!codigo || !nombre) {
                this.mostrarToast('Código UFRO y Nombre son requeridos', 'error');
                return;
            }

            // Crear FormData para enviar archivos
            const formData = new FormData();
            
            // Agregar campos de texto
            formData.append('codigo_ufro', codigo);
            formData.append('nombre', nombre);
            formData.append('descripcion', document.getElementById('descripcion').value);
            formData.append('categoria_id', document.getElementById('categoria_id').value || '');
            formData.append('estado', document.getElementById('estado').value);
            formData.append('cantidad', document.getElementById('cantidad').value || '1');
            formData.append('valor_aproximado', document.getElementById('valor_aproximado').value || '');
            formData.append('fecha_adquisicion', document.getElementById('fecha_adquisicion').value || '');
            formData.append('marca', document.getElementById('marca').value || '');
            formData.append('modelo', document.getElementById('modelo').value || '');
            formData.append('ubicacion_bodega', document.getElementById('ubicacion_bodega').value);

            // Agregar imágenes si existen
            const imagenesInput = document.getElementById('imagenes');
            if (imagenesInput && imagenesInput.files.length > 0) {
                for (let i = 0; i < imagenesInput.files.length; i++) {
                    formData.append('imagenes', imagenesInput.files[i]);
                }
            }

            console.log('📤 Enviando nuevo item con FormData, imágenes:', imagenesInput?.files.length || 0);

            const response = await this.fetchAutenticado('/api/items', {
                method: 'POST',
                body: formData // ¡IMPORTANTE! No establecer Content-Type, el navegador lo hará automáticamente
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
            }

            const nuevoItem = await response.json();
            
            // Cerrar modal y limpiar form
            const modal = bootstrap.Modal.getInstance(document.getElementById('newItemModal'));
            modal.hide();
            document.getElementById('newItemForm').reset();
            
            // Limpiar preview de imágenes
            document.getElementById('imagePreviewNew').innerHTML = '';
            
            this.mostrarToast('Item creado correctamente', 'success');
            this.cargarItems();
            
        } catch (error) {
            console.error('Error completo al crear item:', error);
            this.mostrarToast('Error al crear item: ' + error.message, 'error');
        }
    }

    // =============================================
    // 🔄 MÉTODOS PARA SISTEMA DE SOLICITUDES
    // =============================================

    // MOSTRAR MODAL PARA SOLICITAR ITEM (desde vista invitado)
    mostrarModalSolicitud(itemId) {
        const item = this.items.find(item => item.id === itemId);
        if (!item) {
            this.mostrarToast('Item no encontrado', 'error');
            return;
        }

        // Configurar modal
        document.getElementById('solicitar-item-id').value = itemId;
        
        // Mostrar información del item
        const categoria = this.categorias.find(c => c.id === item.categoria_id) || { nombre: 'Sin categoría' };
        const itemInfoHTML = `
            <strong>Item:</strong> ${item.nombre}<br>
            <strong>Código UFRO:</strong> ${item.codigo_ufro}<br>
            <strong>Categoría:</strong> ${categoria.nombre}<br>
            <strong>Estado:</strong> ${item.estado}
        `;
        
        document.getElementById('solicitudItemInfo').innerHTML = itemInfoHTML;
        document.getElementById('solicitudInfo').style.display = 'block';
        
        // Limpiar formulario
        document.getElementById('solicitarItemForm').reset();
        
        // Mostrar modal
        const modal = new bootstrap.Modal(document.getElementById('solicitarItemModal'));
        modal.show();
    }

    // ENVIAR SOLICITUD (pública - sin autenticación)
    async enviarSolicitud() {
        // EL BOTÓN TIENE id="btnEnviarSolicitud" según tu HTML
        const btnEnviar = document.getElementById('btnEnviarSolicitud');
        
        if (!btnEnviar) {
            console.error('❌ Botón con id="btnEnviarSolicitud" no encontrado');
            console.log('🔍 Buscando en el DOM...', document.querySelector('#solicitarItemModal'));
            return;
        }
        
        console.log('✅ Botón encontrado:', btnEnviar.id, 'clase:', btnEnviar.className);
        
        // Verificar si ya se está procesando
        if (btnEnviar.disabled) {
            console.log('⚠️ Solicitud ya en proceso, ignorando clic...');
            return;
        }
        
        // GUARDAR TEXTO ORIGINAL y DESHABILITAR
        const textoOriginal = btnEnviar.innerHTML;
        const claseOriginal = btnEnviar.className;
        btnEnviar.disabled = true;
        
        // Cambiar a estilo "procesando"
        btnEnviar.className = 'btn btn-secondary';
        btnEnviar.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Enviando...';
        
        try {
            // Obtener datos del formulario
            const solicitudData = {
                item_id: parseInt(document.getElementById('solicitar-item-id').value),
                nombre_solicitante: document.getElementById('solicitar-nombre').value.trim(),
                email_solicitante: document.getElementById('solicitar-email').value.trim(),
                telefono_solicitante: document.getElementById('solicitar-telefono').value?.trim() || null,
                departamento: document.getElementById('solicitar-departamento').value?.trim() || null,
                motivo: document.getElementById('solicitar-motivo').value.trim()
            };

            console.log('📤 Enviando solicitud:', solicitudData);

            // VALIDACIONES
            if (!solicitudData.nombre_solicitante || !solicitudData.email_solicitante || !solicitudData.motivo) {
                this.mostrarToast('Complete todos los campos requeridos', 'error');
                throw new Error('validacion'); // Error especial para validación
            }

            if (!solicitudData.email_solicitante.includes('@')) {
                this.mostrarToast('Ingrese un email válido', 'error');
                throw new Error('validacion'); // Error especial para validación
            }

            // ENVIAR AL SERVIDOR
            const response = await fetch('/api/solicitudes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(solicitudData)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || `Error ${response.status}: ${response.statusText}`);
            }

            console.log('✅ Respuesta del servidor:', result);

            // ÉXITO: Cerrar modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('solicitarItemModal'));
            if (modal) {
                modal.hide();
                
                // Limpiar formulario después de cerrar
                setTimeout(() => {
                    document.getElementById('solicitarItemForm')?.reset();
                    document.getElementById('solicitudInfo').style.display = 'none';
                }, 300);
            }
            
            // Mostrar mensaje de éxito
            this.mostrarToast('✅ Solicitud enviada exitosamente', 'success');
            
            // Si es usuario logueado, actualizar lista de solicitudes
            if (this.usuario && this.usuario.rol !== 'invitado') {
                setTimeout(() => {
                    this.cargarSolicitudes();
                }, 1000);
            }

        } catch (error) {
            console.error('❌ Error enviando solicitud:', error);
            
            // Solo mostrar toast si NO es error de validación
            if (error.message !== 'validacion') {
                this.mostrarToast('❌ Error al enviar solicitud: ' + error.message, 'error');
            }
            
        } finally {
            // IMPORTANTE: Restaurar botón después de 1.5 segundos
            setTimeout(() => {
                if (btnEnviar) {
                    btnEnviar.disabled = false;
                    btnEnviar.className = claseOriginal;
                    btnEnviar.innerHTML = textoOriginal;
                }
            }, 1500);
        }
    }

    // CARGAR SOLICITUDES (solo para usuarios logueados)
    async cargarSolicitudes(estado = '', page = 1) {
        try {
            if (this.usuario.rol === 'invitado') return;

            const params = new URLSearchParams();
            if (estado) params.append('estado', estado);
            params.append('page', page);
            params.append('limit', this.solicitudesPerPage);

            const url = `/api/solicitudes?${params.toString()}`;
            const response = await this.fetchAutenticado(url);

            if (!response.ok) throw new Error('Error al cargar solicitudes');

            const result = await response.json();
            
            if (result.success) {
                this.solicitudes = result.data;
                this.currentSolicitudPage = result.pagination.currentPage;
                this.totalSolicitudes = result.pagination.totalItems;
                
                this.mostrarSolicitudes();
                this.mostrarSolicitudesPaginacion(result.pagination);
                
                // Cargar estadísticas de solicitudes
                this.cargarEstadisticasSolicitudes();
            }

        } catch (error) {
            console.error('Error cargando solicitudes:', error);
            this.mostrarToast('Error al cargar solicitudes', 'error');
        }
    }

    // MOSTRAR SOLICITUDES EN TABLA
    mostrarSolicitudes() {
        const tbody = document.getElementById('solicitudesTableBody');
        if (!tbody) return;

        if (this.solicitudes.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-4 text-muted">
                        <i class="fas fa-inbox fa-2x mb-3"></i><br>
                        No hay solicitudes para mostrar
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.solicitudes.map(solicitud => this.crearFilaSolicitud(solicitud)).join('');
    }

    // CREAR FILA DE SOLICITUD PARA TABLA
    crearFilaSolicitud(solicitud) {
        const fecha = new Date(solicitud.fecha_creacion).toLocaleDateString('es-CL');
        
        // Clase CSS según estado
        const estadoClass = this.obtenerClaseEstadoSolicitud(solicitud.estado);
        
        // Texto del estado traducido
        const estadoText = this.obtenerTextoEstadoSolicitud(solicitud.estado);

        return `
            <tr>
                <td><strong>#${solicitud.id}</strong></td>
                <td>
                    <div><strong>${solicitud.nombre_solicitante}</strong></div>
                    <small class="text-muted">${solicitud.email_solicitante}</small>
                </td>
                <td>
                    <div><strong>${solicitud.item_nombre || 'Item eliminado'}</strong></div>
                    <small class="text-muted">${solicitud.codigo_ufro || 'N/A'}</small>
                </td>
                <td>${fecha}</td>
                <td>
                    <span class="badge ${estadoClass}">${estadoText}</span>
                </td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-1" 
                            onclick="catalogoApp.verSolicitud(${solicitud.id})">
                        <i class="fas fa-eye"></i>
                    </button>
                    ${this.usuario.rol === 'admin' ? `
                    <button class="btn btn-sm btn-outline-danger" 
                            onclick="catalogoApp.solicitarEliminacionSolicitud(${solicitud.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                    ` : ''}
                </td>
            </tr>
        `;
    }

    // OBTENER CLASE CSS PARA ESTADO DE SOLICITUD
    obtenerClaseEstadoSolicitud(estado) {
        const clases = {
            'pendiente': 'bg-warning',
            'en_proceso': 'bg-info',
            'aprobada': 'bg-success',
            'rechazada': 'bg-danger',
            'completada': 'bg-secondary'
        };
        return clases[estado] || 'bg-secondary';
    }

    // OBTENER TEXTO TRADUCIDO PARA ESTADO DE SOLICITUD
    obtenerTextoEstadoSolicitud(estado) {
        const textos = {
            'pendiente': 'Pendiente',
            'en_proceso': 'En Proceso',
            'aprobada': 'Aprobada',
            'rechazada': 'Rechazada',
            'completada': 'Completada'
        };
        return textos[estado] || estado;
    }

    // MOSTRAR PAGINACIÓN DE SOLICITUDES
    mostrarSolicitudesPaginacion(pagination) {
        const container = document.getElementById('solicitudesPagination');
        if (!container || pagination.totalPages <= 1) {
            container.innerHTML = '';
            return;
        }
        
        let paginationHTML = `
            <nav aria-label="Paginación de solicitudes">
                <ul class="pagination justify-content-center">
        `;
        
        // Botón Anterior
        paginationHTML += `
            <li class="page-item ${pagination.currentPage === 1 ? 'disabled' : ''}">
                <button class="page-link" onclick="catalogoApp.cambiarPaginaSolicitudes(${pagination.currentPage - 1})">
                    <i class="fas fa-chevron-left"></i>
                </button>
            </li>
        `;
        
        // Páginas
        for (let i = 1; i <= pagination.totalPages; i++) {
            if (i === 1 || i === pagination.totalPages || (i >= pagination.currentPage - 2 && i <= pagination.currentPage + 2)) {
                paginationHTML += `
                    <li class="page-item ${i === pagination.currentPage ? 'active' : ''}">
                        <button class="page-link" onclick="catalogoApp.cambiarPaginaSolicitudes(${i})">
                            ${i}
                        </button>
                    </li>
                `;
            } else if (i === pagination.currentPage - 3 || i === pagination.currentPage + 3) {
                paginationHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
        }
        
        // Botón Siguiente
        paginationHTML += `
            <li class="page-item ${pagination.currentPage === pagination.totalPages ? 'disabled' : ''}">
                <button class="page-link" onclick="catalogoApp.cambiarPaginaSolicitudes(${pagination.currentPage + 1})">
                    <i class="fas fa-chevron-right"></i>
                </button>
            </li>
        `;
        
        paginationHTML += `
            </ul>
        </nav>
        
        <div class="text-center mt-2 text-muted small">
            Mostrando ${this.solicitudes.length} de ${pagination.totalItems} solicitudes
            (Página ${pagination.currentPage} de ${pagination.totalPages})
        </div>
        `;
        
        container.innerHTML = paginationHTML;
    }

    // CAMBIAR PÁGINA DE SOLICITUDES
    cambiarPaginaSolicitudes(nuevaPagina) {
        const estado = document.getElementById('solicitudEstadoFilter').value;
        this.cargarSolicitudes(estado, nuevaPagina);
    }

    // CARGAR ESTADÍSTICAS DE SOLICITUDES
    async cargarEstadisticasSolicitudes() {
        try {
            if (this.usuario.rol === 'invitado') return;

            const response = await this.fetchAutenticado('/api/solicitudes/stats');
            
            if (!response.ok) throw new Error('Error al cargar estadísticas de solicitudes');
            
            const result = await response.json();
            
            if (result.success) {
                this.solicitudesStats = result.stats;
                this.mostrarEstadisticasSolicitudes();
            }

        } catch (error) {
            console.error('Error cargando estadísticas de solicitudes:', error);
        }
    }

    // MOSTRAR ESTADÍSTICAS DE SOLICITUDES
    mostrarEstadisticasSolicitudes() {
        const statsContainer = document.getElementById('solicitudesStats');
        if (!statsContainer) return;

        statsContainer.innerHTML = `
            <div class="col-md-2">
                <div class="stat-card">
                    <div class="stat-number">${this.solicitudesStats.total_solicitudes || 0}</div>
                    <div class="stat-label">Total</div>
                </div>
            </div>
            <div class="col-md-2">
                <div class="stat-card">
                    <div class="stat-number text-warning">${this.solicitudesStats.pendientes || 0}</div>
                    <div class="stat-label">Pendientes</div>
                </div>
            </div>
            <div class="col-md-2">
                <div class="stat-card">
                    <div class="stat-number text-info">${this.solicitudesStats.en_proceso || 0}</div>
                    <div class="stat-label">En Proceso</div>
                </div>
            </div>
            <div class="col-md-2">
                <div class="stat-card">
                    <div class="stat-number text-success">${this.solicitudesStats.aprobadas || 0}</div>
                    <div class="stat-label">Aprobadas</div>
                </div>
            </div>
            <div class="col-md-2">
                <div class="stat-card">
                    <div class="stat-number text-danger">${this.solicitudesStats.rechazadas || 0}</div>
                    <div class="stat-label">Rechazadas</div>
                </div>
            </div>
            <div class="col-md-2">
                <div class="stat-card">
                    <div class="stat-number text-secondary">${this.solicitudesStats.completadas || 0}</div>
                    <div class="stat-label">Completadas</div>
                </div>
            </div>
        `;
    }

    // VER DETALLES DE SOLICITUD
    async verSolicitud(id) {
        try {
            const response = await this.fetchAutenticado(`/api/solicitudes/${id}`);
            
            if (!response.ok) throw new Error('Error al cargar solicitud');
            
            const result = await response.json();
            
            if (result.success) {
                this.mostrarModalSolicitudDetalles(result.data);
            }

        } catch (error) {
            console.error('Error viendo solicitud:', error);
            this.mostrarToast('Error al cargar solicitud', 'error');
        }
    }

    // MOSTRAR MODAL CON DETALLES DE SOLICITUD
    mostrarModalSolicitudDetalles(solicitud) {
        const fechaCreacion = new Date(solicitud.fecha_creacion).toLocaleString('es-CL');
        const fechaActualizacion = new Date(solicitud.fecha_actualizacion).toLocaleString('es-CL');
        
        // Color del header según estado
        const headerClass = this.obtenerClaseEstadoSolicitud(solicitud.estado);
        
        document.getElementById('solicitudModalHeader').className = `modal-header ${headerClass} text-white`;
        
        // Mostrar/ocultar botón eliminar según rol
        const btnEliminar = document.getElementById('btnEliminarSolicitud');
        if (this.usuario.rol === 'admin') {
            btnEliminar.classList.remove('d-none');
            btnEliminar.onclick = () => this.solicitarEliminacionSolicitud(solicitud.id);
        } else {
            btnEliminar.classList.add('d-none');
        }

        const contenidoHTML = `
            <div class="row">
                <div class="col-md-6">
                    <h6 class="border-bottom pb-2">Información del Solicitante</h6>
                    <div class="mb-2">
                        <strong>Nombre:</strong> ${solicitud.nombre_solicitante}
                    </div>
                    <div class="mb-2">
                        <strong>Email:</strong> ${solicitud.email_solicitante}
                    </div>
                    <div class="mb-2">
                        <strong>Teléfono:</strong> ${solicitud.telefono_solicitante || 'No especificado'}
                    </div>
                    <div class="mb-2">
                        <strong>Departamento:</strong> ${solicitud.departamento || 'No especificado'}
                    </div>
                </div>
                
                <div class="col-md-6">
                    <h6 class="border-bottom pb-2">Información de la Solicitud</h6>
                    <div class="mb-2">
                        <strong>Estado:</strong> 
                        <span class="badge ${this.obtenerClaseEstadoSolicitud(solicitud.estado)}">
                            ${this.obtenerTextoEstadoSolicitud(solicitud.estado)}
                        </span>
                    </div>
                    <div class="mb-2">
                        <strong>Creada:</strong> ${fechaCreacion}
                    </div>
                    <div class="mb-2">
                        <strong>Actualizada:</strong> ${fechaActualizacion}
                    </div>
                    <div class="mb-2">
                        <strong>ID:</strong> #${solicitud.id}
                    </div>
                </div>
            </div>
            
            <div class="row mt-4">
                <div class="col-12">
                    <h6 class="border-bottom pb-2">Información del Item</h6>
                    <div class="mb-2">
                        <strong>Nombre:</strong> ${solicitud.item_nombre || 'Item no disponible'}
                    </div>
                    <div class="mb-2">
                        <strong>Código:</strong> ${solicitud.codigo_ufro || 'N/A'}
                    </div>
                    <div class="mb-2">
                        <strong>Categoría:</strong> ${solicitud.categoria_nombre || 'N/A'}
                    </div>
                    <div class="mb-2">
                        <strong>Estado del Item:</strong> 
                        <span class="badge ${this.obtenerClaseEstado(solicitud.item_estado)}">
                            ${solicitud.item_estado || 'N/A'}
                        </span>
                    </div>
                </div>
            </div>
            
            <div class="row mt-4">
                <div class="col-12">
                    <h6 class="border-bottom pb-2">Motivo de la Solicitud</h6>
                    <div class="bg-light p-3 rounded">
                        <p class="mb-0" style="white-space: pre-line;">${solicitud.motivo || 'No especificado'}</p>
                    </div>
                </div>
            </div>
            
            ${solicitud.notas ? `
            <div class="row mt-4">
                <div class="col-12">
                    <h6 class="border-bottom pb-2">Notas Internas</h6>
                    <div class="bg-light p-3 rounded">
                        <p class="mb-0" style="white-space: pre-line;">${solicitud.notas}</p>
                    </div>
                </div>
            </div>
            ` : ''}
        `;

        document.getElementById('solicitudModalContent').innerHTML = contenidoHTML;
        
        // Guardar ID de solicitud actual
        this.solicitudActualId = solicitud.id;
        
        // Mostrar modal
        const modal = new bootstrap.Modal(document.getElementById('verSolicitudModal'));
        modal.show();
    }

    // CAMBIAR ESTADO DE SOLICITUD
    async cambiarEstadoSolicitud(nuevoEstado) {
        try {
            if (!this.solicitudActualId) return;

            const response = await this.fetchAutenticado(`/api/solicitudes/${this.solicitudActualId}/estado`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ estado: nuevoEstado })
            });

            if (!response.ok) throw new Error('Error al cambiar estado');

            const result = await response.json();
            
            if (result.success) {
                // Cerrar modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('verSolicitudModal'));
                modal.hide();
                
                this.mostrarToast(`Solicitud ${nuevoEstado} exitosamente`, 'success');
                
                // Recargar solicitudes
                const estado = document.getElementById('solicitudEstadoFilter').value;
                this.cargarSolicitudes(estado);
            }

        } catch (error) {
            console.error('Error cambiando estado de solicitud:', error);
            this.mostrarToast('Error al cambiar estado: ' + error.message, 'error');
        }
    }

    // SOLICITAR ELIMINACIÓN DE SOLICITUD
    solicitarEliminacionSolicitud(id) {
        if (!confirm('¿Estás seguro de eliminar esta solicitud? Esta acción no se puede deshacer.')) {
            return;
        }
        
        this.eliminarSolicitudConfirmado(id);
    }

    // ELIMINAR SOLICITUD CONFIRMADA
    async eliminarSolicitudConfirmado(id) {
        try {
            const solicitudId = id || this.solicitudActualId;
            if (!solicitudId) return;

            const response = await this.fetchAutenticado(`/api/solicitudes/${solicitudId}`, {
                method: 'DELETE'
            });

            if (!response.ok) throw new Error('Error al eliminar solicitud');

            const result = await response.json();
            
            if (result.success) {
                // Cerrar modal si está abierto
                const modal = bootstrap.Modal.getInstance(document.getElementById('verSolicitudModal'));
                if (modal) modal.hide();
                
                this.mostrarToast('Solicitud eliminada exitosamente', 'success');
                
                // Recargar solicitudes
                const estado = document.getElementById('solicitudEstadoFilter').value;
                this.cargarSolicitudes(estado);
            }

        } catch (error) {
            console.error('Error eliminando solicitud:', error);
            this.mostrarToast('Error al eliminar solicitud: ' + error.message, 'error');
        }
    }

    // TOAST PARA MENSAJES
    mostrarToast(mensaje, tipo = 'info') {
        const toast = document.getElementById('messageToast');
        const toastIcon = document.getElementById('toastIcon');
        const toastTitle = document.getElementById('toastTitle');
        const toastMessage = document.getElementById('toastMessage');

        const config = {
            success: { icon: 'fa-check-circle', title: 'Éxito', class: 'text-success' },
            error: { icon: 'fa-exclamation-circle', title: 'Error', class: 'text-danger' },
            warning: { icon: 'fa-exclamation-triangle', title: 'Advertencia', class: 'text-warning' },
            info: { icon: 'fa-info-circle', title: 'Información', class: 'text-info' }
        }[tipo] || config.info;

        toastIcon.className = `fas ${config.icon} me-2 ${config.class}`;
        toastTitle.textContent = config.title;
        toastTitle.className = `me-auto ${config.class}`;
        toastMessage.textContent = mensaje;

        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
    }
}

// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', () => {
    window.catalogoApp = new CatalogoUFRO();
});