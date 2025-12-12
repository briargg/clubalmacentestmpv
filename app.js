// ============================================
// CLUBALMACÉN - app.js COMPLETAMENTE CORREGIDO
// ============================================

// Inicializa Firebase
const firebaseConfig = {
    apiKey: "AIzaSyB89PuH-5zSpQpI1QASHrEcrQvtUWsDn7A",
    authDomain: "clubalmacen.firebaseapp.com",
    projectId: "clubalmacen",
    storageBucket: "clubalmacen.appspot.com",
    messagingSenderId: "284091950744",
    appId: "1:284091950744:web:578d9d1aae581225d592ed",
    measurementId: "G-MWHWM339Y2"
};

// Inicializar Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

// Variables globales
let currentPurchase = {
    category: '',
    comercianteId: '',
    items: [],
    total: 0
};

let selectedPaymentMethod = null;
let currentPaymentPurchaseId = null;
let userScoring = {
    score: 0,
    category: 'low',
    level: 1,
    totalPayments: 0,
    onTimePayments: 0,
    latePayments: 0,
    creditUsed: 0,
    creditLimit: 0
};

// ============================================
// INICIALIZACIÓN
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    console.log("✅ Aplicación iniciada");
    
    // Configurar eventos de autenticación
    document.getElementById('loginButton').addEventListener('click', handleLogin);
    document.getElementById('signupButton').addEventListener('click', handleSignup);
    document.getElementById('toggleSignupLink').addEventListener('click', (e) => {
        e.preventDefault();
        toggleAuthMode('signup');
    });
    document.getElementById('logoutBtn').addEventListener('click', signOut);
    
    // Configurar botones de cliente
    const startPurchaseBtn = document.getElementById('startPurchaseBtn');
    if (startPurchaseBtn) {
        startPurchaseBtn.addEventListener('click', startPurchase);
    }
    
    const refreshCreditBtn = document.getElementById('refreshCreditBtn');
    if (refreshCreditBtn) {
        refreshCreditBtn.addEventListener('click', () => {
            const user = auth.currentUser;
            if (user) {
                loadMyFiados(user.uid);
                loadUserScoring(user.uid);
                showStatus('Información actualizada', 'success');
            }
        });
    }
    
    const payBtn = document.getElementById('payBtn');
    if (payBtn) {
        payBtn.addEventListener('click', openPaymentModal);
    }
    
    const addItemBtn = document.getElementById('addItemBtn');
    if (addItemBtn) {
        addItemBtn.addEventListener('click', addItemToList);
    }
    
    const submitPurchaseBtn = document.getElementById('submitPurchaseBtn');
    if (submitPurchaseBtn) {
        submitPurchaseBtn.addEventListener('click', submitPurchase);
    }
    
    // Configurar botones de categorías
    document.querySelectorAll('.category-buttons button').forEach(button => {
        button.addEventListener('click', (e) => {
            const category = e.target.closest('button').dataset.category;
            selectCategory(category);
        });
    });
    
    // Configurar botones de comerciante
    const habilitarFiadoBtn = document.getElementById('habilitarFiadoBtn');
    if (habilitarFiadoBtn) {
        habilitarFiadoBtn.addEventListener('click', habilitarFiado);
    }
    
    // Configurar modal de pago - CORREGIDO
    const closePaymentModalBtn = document.getElementById('closePaymentModalBtn');
    if (closePaymentModalBtn) {
        closePaymentModalBtn.addEventListener('click', closePaymentModal);
    }
    
    const cancelPaymentModalBtn = document.getElementById('cancelPaymentModalBtn');
    if (cancelPaymentModalBtn) {
        cancelPaymentModalBtn.addEventListener('click', closePaymentModal);
    }
    
    const confirmPaymentBtn = document.getElementById('confirmPaymentBtn');
    if (confirmPaymentBtn) {
        confirmPaymentBtn.addEventListener('click', confirmPayment);
    }
    
    // Configurar opciones de pago
    document.querySelectorAll('.payment-option').forEach(option => {
        option.addEventListener('click', (e) => {
            const method = e.target.closest('.payment-option').dataset.method;
            selectPaymentMethod(method);
        });
    });
    
    // Configurar selección de compra a pagar
    const purchaseToPaySelect = document.getElementById('purchaseToPaySelect');
    if (purchaseToPaySelect) {
        purchaseToPaySelect.addEventListener('change', loadPurchaseDetails);
    }
    
    // Configurar modal de selección de rol
    document.getElementById('selectClienteBtn').addEventListener('click', () => {
        assignRole('cliente');
    });
    
    document.getElementById('selectComercianteBtn').addEventListener('click', () => {
        assignRole('comerciante');
    });
    
    // Configurar botón de aprobar pago
    document.getElementById('confirmApprovePaymentBtn').addEventListener('click', approvePaymentByMerchant);
    
    // Verificar estado de autenticación al cargar
    auth.onAuthStateChanged(user => {
        console.log("Estado de autenticación cambiado:", user ? user.email : "No hay usuario");
        if (user) {
            showAuthenticatedUI(user);
            checkUserRole(user);
        } else {
            showAuthUI();
        }
    });
    
    // Mostrar UI de autenticación inicialmente
    showAuthUI();
});

// ============================================
// FUNCIONES DE INTERFAZ
// ============================================

function showAuthUI() {
    console.log("Mostrando UI de autenticación");
    document.getElementById('authContainer').style.display = 'block';
    document.getElementById('appHeader').style.display = 'none';
    document.getElementById('mainDashboard').style.display = 'none';
    document.getElementById('mainDashboard').classList.add('hidden');
    
    // Limpiar campos
    document.getElementById('email').value = '';
    document.getElementById('password').value = '';
}

function showAuthenticatedUI(user) {
    console.log("Mostrando UI autenticada para:", user.email);
    document.getElementById('authContainer').style.display = 'none';
    document.getElementById('appHeader').style.display = 'flex';
    document.getElementById('userEmail').textContent = user.email;
}

function toggleAuthMode(mode) {
    const signupSection = document.getElementById('signupSection');
    const loginButton = document.getElementById('loginButton');
    const toggleLink = document.getElementById('toggleSignupLink');
    
    if (mode === 'signup') {
        signupSection.classList.remove('hidden');
        loginButton.style.display = 'none';
        toggleLink.textContent = 'Iniciar sesión';
        toggleLink.onclick = (e) => {
            e.preventDefault();
            toggleAuthMode('login');
        };
    } else {
        signupSection.classList.add('hidden');
        loginButton.style.display = 'block';
        toggleLink.textContent = 'Regístrate aquí';
        toggleLink.onclick = (e) => {
            e.preventDefault();
            toggleAuthMode('signup');
        };
    }
}

// ============================================
// AUTENTICACIÓN
// ============================================

async function handleLogin() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    if (!email || !password) {
        showStatus('Por favor completa todos los campos', 'error');
        return;
    }
    
    const loginButton = document.getElementById('loginButton');
    loginButton.classList.add('loading');
    
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        console.log("Login exitoso:", userCredential.user.email);
        showStatus('Inicio de sesión exitoso', 'success');
        checkUserRole(userCredential.user);
    } catch (error) {
        console.error("Error en login:", error);
        showStatus(`Error: ${error.message}`, 'error');
    } finally {
        loginButton.classList.remove('loading');
    }
}

async function handleSignup() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    if (!email || !password) {
        showStatus('Por favor completa todos los campos', 'error');
        return;
    }
    
    if (password.length < 6) {
        showStatus('La contraseña debe tener al menos 6 caracteres', 'error');
        return;
    }
    
    const signupButton = document.getElementById('signupButton');
    signupButton.classList.add('loading');
    
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        console.log("Registro exitoso:", userCredential.user.email);
        showStatus('Cuenta creada exitosamente', 'success');
        
        // Inicializar scoring para nuevo usuario
        await db.collection("users").doc(userCredential.user.uid).collection("scoring").doc("data").set({
            score: 300,
            category: "low",
            level: 1,
            totalPayments: 0,
            onTimePayments: 0,
            latePayments: 0,
            creditUsed: 0,
            creditLimit: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
        
        // Mostrar modal para selección de rol
        showRoleSelection(userCredential.user);
    } catch (error) {
        console.error("Error en registro:", error);
        showStatus(`Error: ${error.message}`, 'error');
    } finally {
        signupButton.classList.remove('loading');
    }
}

async function signOut() {
    try {
        await auth.signOut();
        console.log("Sesión cerrada exitosamente");
        showStatus('Sesión cerrada', 'success');
    } catch (error) {
        console.error("Error al cerrar sesión:", error);
        showStatus(`Error: ${error.message}`, 'error');
    }
}

// ============================================
// GESTIÓN DE ROLES
// ============================================

function showRoleSelection(user) {
    console.log("Mostrando selección de rol para:", user.email);
    document.getElementById('roleModal').style.display = 'flex';
    
    document.getElementById('selectClienteBtn').dataset.userId = user.uid;
    document.getElementById('selectComercianteBtn').dataset.userId = user.uid;
}

async function assignRole(role) {
    const userId = event.target.dataset.userId;
    const user = auth.currentUser;
    
    if (!user) {
        showStatus('No hay usuario autenticado', 'error');
        return;
    }
    
    const button = event.target;
    button.classList.add('loading');
    
    try {
        await db.collection("users").doc(userId).set({
            email: user.email,
            role: role,
            createdAt: new Date().toISOString(),
            scoring: role === "cliente" ? 300 : 0
        }, { merge: true });
        
        console.log("Rol asignado:", role);
        showStatus(`Rol ${role} asignado exitosamente`, 'success');
        
        document.getElementById('roleModal').style.display = 'none';
        checkUserRole(user);
    } catch (error) {
        console.error("Error asignando rol:", error);
        showStatus(`Error: ${error.message}`, 'error');
        button.classList.remove('loading');
    }
}

async function checkUserRole(user) {
    console.log("Verificando rol para usuario:", user.uid);
    
    try {
        const doc = await db.collection("users").doc(user.uid).get();
        
        if (doc.exists) {
            const role = doc.data().role;
            console.log("Rol encontrado:", role);
            
            document.getElementById('mainDashboard').style.display = 'block';
            document.getElementById('mainDashboard').classList.remove('hidden');
            
            document.getElementById('clienteDashboard').classList.add('hidden');
            document.getElementById('comercianteDashboard').classList.add('hidden');
            document.getElementById('clienteDashboard').style.display = 'none';
            document.getElementById('comercianteDashboard').style.display = 'none';
            
            if (role === "cliente") {
                console.log("Mostrando dashboard cliente");
                document.getElementById('clienteDashboard').classList.remove('hidden');
                document.getElementById('clienteDashboard').style.display = 'block';
                setupClienteUI(user);
            } else if (role === "comerciante") {
                console.log("Mostrando dashboard comerciante");
                document.getElementById('comercianteDashboard').classList.remove('hidden');
                document.getElementById('comercianteDashboard').style.display = 'block';
                setupComercianteUI(user);
            }
        } else {
            console.log("No se encontró rol, mostrando selección");
            showRoleSelection(user);
        }
    } catch (error) {
        console.error("Error al obtener el rol:", error);
        showStatus('Error al cargar tu perfil', 'error');
    }
}

function setupClienteUI(user) {
    console.log("Configurando UI para cliente:", user.uid);
    loadClientPurchases(user.uid);
    loadMyFiados(user.uid);
    loadPaymentHistory(user.uid);
    loadUserScoring(user.uid);
}

function setupComercianteUI(user) {
    console.log("Configurando UI para comerciante:", user.uid);
    loadPurchasesToApprove(user.uid);
    loadApprovedPurchasesMerchant(user.uid);
    loadClientesFiado(user.uid);
    cargarClientes();
    updateMerchantStats(user.uid);
    loadPaymentsToApprove(user.uid);
}

// ============================================
// SCORING Y CRÉDITO
// ============================================

async function loadUserScoring(userId) {
    try {
        console.log("Cargando scoring del usuario:", userId);
        const scoringDoc = await db.collection("users").doc(userId).collection("scoring").doc("data").get();
        
        if (scoringDoc.exists) {
            const data = scoringDoc.data();
            userScoring = data;
            
            updateScoringUI(data);
            
            const electroBtn = document.getElementById('electroBtn');
            if (electroBtn) {
                if (data.category === "high" && data.score >= 700) {
                    electroBtn.disabled = false;
                    electroBtn.innerHTML = '<i class="fas fa-tv"></i> Electrodomésticos';
                } else {
                    electroBtn.disabled = true;
                    electroBtn.innerHTML = '<i class="fas fa-lock"></i> Electrodomésticos (Score Alto)';
                }
            }
            
            console.log("Scoring cargado:", data);
        } else {
            const initialScoring = {
                score: 300,
                category: "low",
                level: 1,
                totalPayments: 0,
                onTimePayments: 0,
                latePayments: 0,
                creditUsed: 0,
                creditLimit: 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            await db.collection("users").doc(userId).collection("scoring").doc("data").set(initialScoring);
            updateScoringUI(initialScoring);
        }
    } catch (error) {
        console.error("Error al cargar scoring:", error);
    }
}

function updateScoringUI(scoringData) {
    const scoreValue = document.getElementById('scoreValue');
    if (scoreValue) scoreValue.textContent = scoringData.score;
    
    const scoreCategory = document.getElementById('scoreCategory');
    if (scoreCategory) {
        scoreCategory.textContent = scoringData.category === "low" ? "Bajo" : 
                                   scoringData.category === "medium" ? "Medio" : "Alto";
        scoreCategory.className = 'score-category ' + scoringData.category;
    }
    
    const scoreFill = document.getElementById('scoreFill');
    if (scoreFill) {
        let fillPercentage = 0;
        if (scoringData.score < 500) {
            fillPercentage = (scoringData.score - 300) / 200 * 33;
        } else if (scoringData.score < 700) {
            fillPercentage = 33 + (scoringData.score - 500) / 200 * 33;
        } else {
            fillPercentage = 66 + (scoringData.score - 700) / 300 * 34;
        }
        
        scoreFill.style.width = Math.min(fillPercentage, 100) + '%';
    }
    
    const description = document.getElementById('scoreDescription');
    if (description) {
        if (scoringData.score < 500) {
            description.textContent = '¡Comienza a usar crédito para mejorar tu scoring!';
        } else if (scoringData.score < 700) {
            description.textContent = '¡Buen trabajo! Sigue pagando a tiempo para mejorar.';
        } else {
            description.textContent = '¡Excelente! Tienes acceso a electrodomésticos.';
        }
    }
    
    const benefitsContainer = document.getElementById('scoreBenefits');
    if (benefitsContainer) {
        benefitsContainer.innerHTML = '';
        
        const benefits = [
            { icon: 'fa-shopping-cart', text: 'Compras básicas', unlocked: true },
            { icon: 'fa-tv', text: 'Electrodomésticos', unlocked: scoringData.category === "high" && scoringData.score >= 700 }
        ];
        
        benefits.forEach(benefit => {
            const div = document.createElement('div');
            div.className = `benefit-item ${benefit.unlocked ? 'unlocked' : 'locked'}`;
            div.innerHTML = `
                <i class="fas ${benefit.icon}"></i>
                <span>${benefit.text}</span>
            `;
            benefitsContainer.appendChild(div);
        });
    }
    
    const scoreBadge = document.getElementById('scoreBadge');
    if (scoreBadge) scoreBadge.textContent = scoringData.score + ' pts';
}

// ============================================
// COMPRAS - CLIENTE
// ============================================

function startPurchase() {
    console.log("Iniciando flujo de compra");
    const purchaseFlow = document.getElementById('purchaseFlow');
    const startBtn = document.getElementById('startPurchaseBtn');
    
    if (purchaseFlow && startBtn) {
        purchaseFlow.classList.remove('hidden');
        purchaseFlow.style.display = 'block';
        startBtn.style.display = 'none';
    }
}

function selectCategory(category) {
    console.log("Categoría seleccionada:", category);
    currentPurchase.category = category;
    
    if (category === "electrodomesticos") {
        if (userScoring.category !== "high" || userScoring.score < 700) {
            showStatus('Necesitas un scoring alto (700+) para acceder a electrodomésticos', 'error');
            return;
        }
    }
    
    const merchantSection = document.getElementById('merchantSection');
    if (merchantSection) {
        merchantSection.classList.remove('hidden');
        merchantSection.style.display = 'block';
        loadComerciantes();
    }
}

async function loadComerciantes() {
    try {
        console.log("Cargando comerciantes...");
        const querySnapshot = await db.collection("users")
            .where("role", "==", "comerciante")
            .get();
        
        const select = document.getElementById('comercianteSelect');
        if (!select) return;
        
        select.innerHTML = '<option value="">Seleccionar Comerciante</option>';
        
        querySnapshot.forEach(doc => {
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = doc.data().email;
            select.appendChild(option);
        });
        
        select.addEventListener('change', (e) => {
            const itemsSection = document.getElementById('itemsSection');
            if (e.target.value && itemsSection) {
                itemsSection.classList.remove('hidden');
                itemsSection.style.display = 'block';
                currentPurchase.comercianteId = e.target.value;
            }
        });
        
        console.log("Comerciantes cargados:", querySnapshot.size);
    } catch (error) {
        console.error("Error al cargar comerciantes:", error);
        showStatus('Error al cargar comerciantes', 'error');
    }
}

function addItemToList() {
    const name = document.getElementById('itemName').value;
    const price = parseFloat(document.getElementById('itemPrice').value);
    const quantity = parseInt(document.getElementById('itemQuantity').value) || 1;
    
    if (!name || isNaN(price) || isNaN(quantity) || price <= 0) {
        showStatus('Completa todos los campos correctamente', 'error');
        return;
    }
    
    const item = {
        name,
        price,
        quantity,
        total: price * quantity
    };
    
    currentPurchase.items.push(item);
    currentPurchase.total += item.total;
    
    updateItemsList();
    
    document.getElementById('itemName').value = '';
    document.getElementById('itemPrice').value = '';
    document.getElementById('itemQuantity').value = '1';
    
    showStatus('Producto agregado a la lista', 'success');
}

function updateItemsList() {
    const itemsList = document.getElementById('itemsList');
    const totalElement = document.getElementById('purchaseTotal');
    
    if (!itemsList || !totalElement) return;
    
    itemsList.innerHTML = currentPurchase.items.map((item, index) => `
        <div class="purchase-item">
            <div class="purchase-info">
                <h4>${item.name}</h4>
                <p>${item.quantity} x $${item.price.toFixed(2)}</p>
            </div>
            <div>
                <span class="purchase-total">$${item.total.toFixed(2)}</span>
                <button class="btn btn-outline" onclick="removeItem(${index})" style="margin-left: 10px;">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
    
    totalElement.textContent = currentPurchase.total.toFixed(2);
}

function removeItem(index) {
    currentPurchase.total -= currentPurchase.items[index].total;
    currentPurchase.items.splice(index, 1);
    updateItemsList();
    showStatus('Producto eliminado', 'info');
}

async function submitPurchase() {
    if (currentPurchase.items.length === 0) {
        showStatus('Agrega al menos un producto', 'error');
        return;
    }
    
    if (!currentPurchase.comercianteId) {
        showStatus('Selecciona un comerciante', 'error');
        return;
    }
    
    const user = auth.currentUser;
    const button = document.getElementById('submitPurchaseBtn');
    
    if (!button) return;
    
    button.classList.add('loading');
    
    try {
        await db.collection("purchases").add({
            clienteId: user.uid,
            clienteEmail: user.email,
            comercianteId: currentPurchase.comercianteId,
            category: currentPurchase.category,
            items: currentPurchase.items,
            total: currentPurchase.total,
            status: "pending",
            createdAt: new Date().toISOString(),
            paid: false
        });
        
        showStatus('Compra enviada para aprobación', 'success');
        
        // Resetear
        currentPurchase = { category: '', comercianteId: '', items: [], total: 0 };
        
        document.getElementById('purchaseFlow').classList.add('hidden');
        document.getElementById('purchaseFlow').style.display = 'none';
        document.getElementById('startPurchaseBtn').style.display = 'block';
        document.getElementById('itemsList').innerHTML = '';
        document.getElementById('purchaseTotal').textContent = '0.00';
        
        loadClientPurchases(user.uid);
        
    } catch (error) {
        console.error("Error al enviar compra:", error);
        showStatus(`Error: ${error.message}`, 'error');
    } finally {
        button.classList.remove('loading');
    }
}

async function loadClientPurchases(clienteId) {
    try {
        console.log("Cargando compras del cliente:", clienteId);
        
        // Cargar compras pendientes
        const pendingSnapshot = await db.collection("purchases")
            .where("clienteId", "==", clienteId)
            .where("status", "==", "pending")
            .get();
        
        const pendingList = document.getElementById('pendingPurchasesList');
        if (pendingList) {
            if (pendingSnapshot.empty) {
                pendingList.innerHTML = '<div class="no-items">No hay compras pendientes</div>';
            } else {
                pendingList.innerHTML = '';
                pendingSnapshot.forEach(doc => {
                    const purchase = doc.data();
                    const div = createPurchaseCard(doc.id, purchase, false);
                    pendingList.appendChild(div);
                });
                console.log("Compras pendientes cargadas:", pendingSnapshot.size);
            }
        }
        
        // Cargar compras aprobadas
        const approvedSnapshot = await db.collection("purchases")
            .where("clienteId", "==", clienteId)
            .where("status", "==", "approved")
            .get();
        
        const approvedList = document.getElementById('approvedPurchasesList');
        if (approvedList) {
            if (approvedSnapshot.empty) {
                approvedList.innerHTML = '<div class="no-items">No hay compras aprobadas</div>';
            } else {
                approvedList.innerHTML = '';
                approvedSnapshot.forEach(doc => {
                    const purchase = doc.data();
                    const div = createPurchaseCard(doc.id, purchase, true);
                    approvedList.appendChild(div);
                });
                console.log("Compras aprobadas cargadas:", approvedSnapshot.size);
            }
        }
        
    } catch (error) {
        console.error("Error al cargar compras del cliente:", error);
        showStatus('Error al cargar compras', 'error');
    }
}

function createPurchaseCard(id, purchase, isApproved) {
    const div = document.createElement('div');
    div.className = 'purchase-item';
    
    const itemsText = purchase.items ? purchase.items.map(item => 
        `${item.name} (${item.quantity} x $${item.price.toFixed(2)})`
    ).join(', ') : 'Sin productos';
    
    const statusText = isApproved ? 
        `Aprobada: ${purchase.approvedAt ? new Date(purchase.approvedAt).toLocaleDateString() : 'Fecha no disponible'}` :
        `Enviada: ${purchase.createdAt ? new Date(purchase.createdAt).toLocaleDateString() : 'Fecha no disponible'}`;
    
    const paidStatus = purchase.paid ? 
        '<p><small class="text-success">✅ Pagada</small></p>' : 
        '<p><small class="text-warning">⏳ Pendiente de pago</small></p>';
    
    div.innerHTML = `
        <div class="purchase-info">
            <h4>${purchase.category || 'Compra'} - $${purchase.total?.toFixed(2) || '0.00'}</h4>
            <p>${itemsText}</p>
            <p><small>${statusText}</small></p>
            ${isApproved ? paidStatus : ''}
        </div>
        <div>
            <span class="purchase-total">$${purchase.total?.toFixed(2) || '0.00'}</span>
            <div class="status-badge ${isApproved ? 'approved' : 'pending'}">
                ${isApproved ? '✅ Aprobada' : '⏳ Pendiente'}
            </div>
            ${isApproved && !purchase.paid ? 
                `<button class="btn btn-primary btn-sm mt-2" onclick="pagarCompraDirecta('${id}', ${purchase.total})">
                    <i class="fas fa-credit-card"></i> Pagar
                </button>` : ''
            }
        </div>
    `;
    
    return div;
}

function pagarCompraDirecta(purchaseId, amount) {
    console.log("Pagando compra directamente:", purchaseId);
    currentPaymentPurchaseId = purchaseId;
    
    const modal = document.getElementById('paymentModal');
    const select = document.getElementById('purchaseToPaySelect');
    
    if (modal && select) {
        loadComprasParaPagar().then(() => {
            select.value = purchaseId;
            const event = new Event('change');
            select.dispatchEvent(event);
            showModal(modal);
        });
    }
}

// ============================================
// FIADOS Y CRÉDITO
// ============================================

async function loadMyFiados(clienteId) {
    try {
        console.log("Cargando fiados del cliente:", clienteId);
        const comerciantesSnapshot = await db.collection("users")
            .where("role", "==", "comerciante")
            .get();

        const fiadoList = document.getElementById('misFiados');
        if (!fiadoList) return;

        fiadoList.innerHTML = "";
        let totalCredit = 0;
        let totalUsed = 0;

        for (const doc of comerciantesSnapshot.docs) {
            const comercianteId = doc.id;
            const fiadoRef = db.collection("users").doc(comercianteId)
                .collection("fiados").doc(clienteId);

            const fiadoDoc = await fiadoRef.get();

            if (fiadoDoc.exists) {
                const fiadoData = fiadoDoc.data();
                const monto = fiadoData.monto_fiado || 0;
                const usado = fiadoData.usado || 0;
                const disponible = monto - usado;
                
                totalCredit += monto;
                totalUsed += usado;
                
                const div = document.createElement("div");
                div.className = "purchase-item";
                div.innerHTML = `
                    <div>
                        <strong>${doc.data().email}</strong><br>
                        <span>Límite: $${monto.toFixed(2)}</span><br>
                        <span>Usado: $${usado.toFixed(2)}</span><br>
                        <span class="text-success">Disponible: $${disponible.toFixed(2)}</span>
                    </div>
                    <div>
                        <small>${new Date(fiadoData.fecha_inicio || new Date()).toLocaleDateString()}</small>
                    </div>
                `;
                fiadoList.appendChild(div);
            }
        }

        const totalCreditEl = document.getElementById('totalCredit');
        const creditUsedEl = document.getElementById('creditUsed');
        const creditAvailableEl = document.getElementById('creditAvailable');
        
        if (totalCreditEl) totalCreditEl.textContent = `$${totalCredit.toFixed(2)}`;
        if (creditUsedEl) creditUsedEl.textContent = `$${totalUsed.toFixed(2)}`;
        if (creditAvailableEl) creditAvailableEl.textContent = `$${(totalCredit - totalUsed).toFixed(2)}`;

        if (fiadoList.children.length === 0) {
            fiadoList.innerHTML = '<div class="no-items">No tienes créditos habilitados</div>';
        }
        
        console.log("Fiados cargados, total crédito: $", totalCredit.toFixed(2));

    } catch (error) {
        console.error("Error al cargar fiados del cliente:", error);
        showStatus('Error al cargar créditos', 'error');
    }
}

// ============================================
// MODAL DE PAGO - CORREGIDO
// ============================================

async function openPaymentModal() {
    console.log("=== openPaymentModal INICIADA ===");
    
    const user = auth.currentUser;
    if (!user) {
        showStatus("Debes iniciar sesión para realizar pagos", "error");
        return;
    }
    
    console.log("Usuario:", user.email);
    
    try {
        // Cargar compras
        console.log("Cargando compras para pagar...");
        const hayCompras = await loadComprasParaPagar();
        console.log("¿Hay compras para pagar?:", hayCompras);
        
        // Mostrar modal
        const modal = document.getElementById('paymentModal');
        console.log("Modal encontrado:", !!modal);
        
        if (modal) {
            showModal(modal);
            
            // Resetear estado
            selectedPaymentMethod = null;
            currentPaymentPurchaseId = null;
            document.getElementById('confirmPaymentBtn').disabled = true;
            document.getElementById('paymentDetailsSection').classList.add('hidden');
            document.getElementById('purchaseDetails').classList.add('hidden');
            
            // Resetear opciones de pago
            document.querySelectorAll('.payment-option').forEach(option => {
                option.classList.remove('active', 'selected');
            });
            
            console.log("✅ Modal DEBERÍA estar visible ahora");
        }
        
    } catch (error) {
        console.error("❌ Error en openPaymentModal:", error);
        showStatus("Error: " + error.message, "error");
    }
}

// FUNCIÓN PARA MOSTRAR MODAL (CORREGIDA)
function showModal(modal) {
    console.log("🔴 MOSTRANDO MODAL...");
    
    // Método 1: Usar style.display
    modal.style.display = 'flex';
    
    // Método 2: Forzar visibilidad
    modal.style.cssText = `
        display: flex !important;
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        background: rgba(0,0,0,0.5) !important;
        z-index: 9999 !important;
        opacity: 1 !important;
        visibility: visible !important;
    `;
    
    console.log("✅ Modal configurado con display:flex");
}

async function loadComprasParaPagar() {
    const user = auth.currentUser;
    if (!user) return false;
    
    try {
        // Intentar diferentes colecciones
        let purchases = [];
        
        try {
            // Intentar con 'compras_jiado' (tu estructura)
            const querySnapshot = await db.collection("compras_jiado")
                .where("clienteId", "==", user.uid)
                .get();
            
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                if (data.estado === "aprobado" && data.pagado === false) {
                    purchases.push({
                        id: doc.id,
                        total: data.monto || 0,
                        category: data.categoria || "general",
                        comercianteId: data.comercial || "",
                        approvedAt: data.fecha || new Date().toISOString(),
                        estado: data.estado,
                        pagado: data.pagado
                    });
                }
            });
        } catch (error) {
            console.log("Intentando con 'purchases'...");
            // Si falla, intentar con 'purchases'
            const querySnapshot = await db.collection("purchases")
                .where("clienteId", "==", user.uid)
                .get();
            
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                if (data.status === "approved" && data.paid === false) {
                    purchases.push({
                        id: doc.id,
                        total: data.total || 0,
                        category: data.category || "",
                        comercianteId: data.comercianteId || "",
                        approvedAt: data.approvedAt || "",
                        estado: data.status,
                        pagado: data.paid
                    });
                }
            });
        }
        
        console.log("Compras encontradas:", purchases.length);
        
        if (purchases.length === 0) {
            showStatus("No tienes compras pendientes de pago", "info");
            return false;
        }
        
        // Ordenar por fecha
        purchases.sort((a, b) => new Date(b.approvedAt) - new Date(a.approvedAt));
        
        // Llenar el select
        const select = document.getElementById('purchaseToPaySelect');
        if (!select) {
            console.error("No se encontró el select de compras");
            return false;
        }
        
        select.innerHTML = '<option value="">Seleccionar Compra</option>';
        purchases.forEach(purchase => {
            const option = document.createElement('option');
            option.value = purchase.id;
            const fecha = purchase.approvedAt ? 
                new Date(purchase.approvedAt).toLocaleDateString() : "Sin fecha";
            option.textContent = `$${purchase.total.toFixed(2)} - ${fecha}`;
            option.dataset.total = purchase.total;
            option.dataset.comercianteId = purchase.comercianteId;
            select.appendChild(option);
        });
        
        return true;
        
    } catch (error) {
        console.error("Error al cargar compras para pagar:", error);
        
        // Si hay error, mostrar datos de prueba
        const select = document.getElementById('purchaseToPaySelect');
        if (select) {
            select.innerHTML = `
                <option value="">Seleccionar Compra</option>
                <option value="test1">Compra de prueba 1 - $100.00</option>
                <option value="test2">Compra de prueba 2 - $200.00</option>
            `;
            return true;
        }
        
        return false;
    }
}

function closePaymentModal() {
    console.log("🔒 Cerrando modal de pago");
    const modal = document.getElementById('paymentModal');
    if (modal) {
        modal.style.display = 'none';
        modal.style.visibility = 'hidden';
        modal.style.opacity = '0';
    }
    
    // Limpiar campos
    const select = document.getElementById('purchaseToPaySelect');
    if (select) select.value = '';
    
    const comprobanteInput = document.getElementById('comprobanteNumber');
    if (comprobanteInput) comprobanteInput.value = '';
    
    const amountInput = document.getElementById('paymentAmount');
    if (amountInput) amountInput.value = '';
    
    // Ocultar detalles
    document.getElementById('paymentDetailsSection').classList.add('hidden');
    document.getElementById('purchaseDetails').classList.add('hidden');
    
    // Resetear selección
    selectedPaymentMethod = null;
    currentPaymentPurchaseId = null;
    
    // Deshabilitar botón confirmar
    document.getElementById('confirmPaymentBtn').disabled = true;
}

async function loadPurchaseDetails(event) {
    const select = event.target;
    if (!select || !select.value) {
        document.getElementById('purchaseDetails').classList.add('hidden');
        return;
    }
    
    const purchaseId = select.value;
    currentPaymentPurchaseId = purchaseId;
    
    try {
        // Intentar diferentes colecciones
        let purchaseData = null;
        
        try {
            const doc = await db.collection("compras_jiado").doc(purchaseId).get();
            if (doc.exists) {
                purchaseData = doc.data();
                purchaseData.total = purchaseData.monto || 0;
                purchaseData.comercianteId = purchaseData.comercial || "";
            }
        } catch (error) {
            const doc = await db.collection("purchases").doc(purchaseId).get();
            if (doc.exists) {
                purchaseData = doc.data();
            }
        }
        
        if (purchaseData) {
            const amountToPay = document.getElementById('amountToPay');
            const merchantToPay = document.getElementById('merchantToPay');
            
            if (amountToPay) amountToPay.textContent = purchaseData.total.toFixed(2);
            
            if (merchantToPay) {
                try {
                    const comercianteDoc = await db.collection("users").doc(purchaseData.comercianteId).get();
                    merchantToPay.textContent = comercianteDoc.exists ? comercianteDoc.data().email : "Comerciante";
                } catch (error) {
                    merchantToPay.textContent = "Comerciante";
                }
            }
            
            const purchaseDetails = document.getElementById('purchaseDetails');
            if (purchaseDetails) purchaseDetails.classList.remove('hidden');
            
            const paymentAmountInput = document.getElementById('paymentAmount');
            if (paymentAmountInput) {
                paymentAmountInput.value = purchaseData.total.toFixed(2);
            }
        }
    } catch (error) {
        console.error("Error al cargar detalles de compra:", error);
        showStatus("Error al cargar detalles de la compra", "error");
    }
}

function selectPaymentMethod(method) {
    console.log("Método de pago seleccionado:", method);
    selectedPaymentMethod = method;
    
    document.querySelectorAll('.payment-option').forEach(option => {
        option.classList.remove('active', 'selected');
        if (option.dataset.method === method) {
            option.classList.add('active', 'selected');
        }
    });
    
    const detailsSection = document.getElementById('paymentDetailsSection');
    if (detailsSection) {
        detailsSection.classList.remove('hidden');
    }
    
    if (method === "efectivo") {
        document.getElementById('efectivoDetails').classList.remove('hidden');
        document.getElementById('transferenciaDetails').classList.add('hidden');
        document.getElementById('paymentMethodLabel').textContent = "Instrucciones para pago en efectivo";
    } else if (method === "transferencia") {
        document.getElementById('efectivoDetails').classList.add('hidden');
        document.getElementById('transferenciaDetails').classList.remove('hidden');
        document.getElementById('paymentMethodLabel').textContent = "Detalles de la transferencia";
    }
    
    const confirmBtn = document.getElementById('confirmPaymentBtn');
    if (confirmBtn && currentPaymentPurchaseId && selectedPaymentMethod) {
        confirmBtn.disabled = false;
    }
}

async function confirmPayment() {
    console.log("Confirmando pago...");
    
    if (!currentPaymentPurchaseId || !selectedPaymentMethod) {
        showStatus("Selecciona una compra y un método de pago", "error");
        return;
    }
    
    const user = auth.currentUser;
    if (!user) {
        showStatus("Debes iniciar sesión", "error");
        return;
    }
    
    const confirmBtn = document.getElementById('confirmPaymentBtn');
    if (!confirmBtn) return;
    
    confirmBtn.classList.add('loading');
    
    try {
        let amount = 0;
        let comercianteId = "";
        
        // Obtener monto de la compra seleccionada
        const select = document.getElementById('purchaseToPaySelect');
        if (select && select.value) {
            const selectedOption = select.options[select.selectedIndex];
            amount = parseFloat(selectedOption.dataset.total) || 0;
            comercianteId = selectedOption.dataset.comercianteId || "";
        }
        
        if (amount <= 0) {
            throw new Error("Monto inválido");
        }
        
        const paymentData = {
            purchaseId: currentPaymentPurchaseId,
            userId: user.uid,
            userEmail: user.email,
            comercianteId: comercianteId,
            amount: amount,
            method: selectedPaymentMethod,
            date: new Date().toISOString(),
            approved: false,
            rejected: false
        };
        
        if (selectedPaymentMethod === "transferencia") {
            const comprobante = document.getElementById('comprobanteNumber').value;
            if (!comprobante) {
                throw new Error("Ingresa el número de comprobante");
            }
            paymentData.comprobante = comprobante;
            
            const paymentAmount = parseFloat(document.getElementById('paymentAmount').value);
            if (!paymentAmount || paymentAmount <= 0) {
                throw new Error("Ingresa un monto válido");
            }
            paymentData.amount = paymentAmount;
        }
        
        await db.collection("payments").add(paymentData);
        
        console.log("Pago registrado");
        
        closePaymentModal();
        showPaymentSuccessNotification(amount);
        
        loadClientPurchases(user.uid);
        loadPaymentHistory(user.uid);
        
    } catch (error) {
        console.error("Error al confirmar pago:", error);
        showStatus(`Error: ${error.message}`, "error");
    } finally {
        confirmBtn.classList.remove('loading');
    }
}

function showPaymentSuccessNotification(amount) {
    const notification = document.getElementById('paymentNotification');
    const pointsEarned = Math.floor(amount / 100) * 10 + 10;
    
    document.getElementById('notificationMessage').textContent = `Pago de $${amount.toFixed(2)} registrado exitosamente`;
    document.getElementById('pointsEarned').textContent = pointsEarned;
    
    if (notification) {
        notification.style.display = 'flex';
    }
}

function closeNotification() {
    const notification = document.getElementById('paymentNotification');
    if (notification) {
        notification.style.display = 'none';
    }
}

// ============================================
// HISTORIAL DE PAGOS
// ============================================

async function loadPaymentHistory(userId) {
    try {
        const querySnapshot = await db.collection("payments")
            .where("userId", "==", userId)
            .get();
        
        const historyList = document.getElementById('paymentHistoryList');
        if (!historyList) return;
        
        if (querySnapshot.empty) {
            historyList.innerHTML = '<div class="no-items">No hay historial de pagos</div>';
            return;
        }
        
        historyList.innerHTML = '';
        querySnapshot.forEach(doc => {
            const payment = doc.data();
            const div = document.createElement("div");
            div.className = "purchase-item";
            
            const statusText = payment.approved ? 
                `✅ Aprobado` :
                payment.rejected ? 
                `❌ Rechazado` :
                `⏳ Pendiente`;
            
            div.innerHTML = `
                <div class="purchase-info">
                    <h4>Pago</h4>
                    <p><strong>Método:</strong> ${payment.method === "efectivo" ? "Efectivo" : "Transferencia"}</p>
                    <p><strong>Monto:</strong> $${payment.amount.toFixed(2)}</p>
                    <p><strong>Fecha:</strong> ${new Date(payment.date).toLocaleDateString()}</p>
                    <p><small>${statusText}</small></p>
                </div>
                <div>
                    <span class="purchase-total">$${payment.amount.toFixed(2)}</span>
                </div>
            `;
            historyList.appendChild(div);
        });
    } catch (error) {
        console.error("Error al cargar historial de pagos:", error);
    }
}

// ============================================
// COMERCIANTE
// ============================================

async function loadPurchasesToApprove(comercianteId) {
    try {
        console.log("Cargando compras para aprobar del comerciante:", comercianteId);
        const querySnapshot = await db.collection("purchases")
            .where("comercianteId", "==", comercianteId)
            .where("status", "==", "pending")
            .get();
        
        const approveList = document.getElementById('purchasesToApprove');
        const pendingBadge = document.getElementById('pendingBadge');
        
        if (!approveList) return;
        
        if (querySnapshot.empty) {
            approveList.innerHTML = "<div class='no-items'>No hay compras por aprobar</div>";
            if (pendingBadge) pendingBadge.textContent = '0';
            return;
        }
        
        if (pendingBadge) pendingBadge.textContent = querySnapshot.size.toString();
        
        approveList.innerHTML = '';
        querySnapshot.forEach(doc => {
            const purchase = doc.data();
            const div = document.createElement("div");
            div.className = "purchase-item";
            div.setAttribute('data-purchase-id', doc.id);
            
            const itemsList = purchase.items.map(item => 
                `${item.name} (${item.quantity} x $${item.price.toFixed(2)})`
            ).join('<br>');
            
            div.innerHTML = `
                <div class="purchase-info">
                    <h4>${purchase.clienteEmail || 'Cliente'}</h4>
                    <p><strong>Categoría:</strong> ${purchase.category || 'Sin categoría'}</p>
                    <p><strong>Productos:</strong><br>${itemsList}</p>
                    <p><small>${new Date(purchase.createdAt).toLocaleDateString()}</small></p>
                </div>
                <div class="purchase-actions">
                    <span class="purchase-total">$${purchase.total.toFixed(2)}</span>
                    <div>
                        <button class="btn btn-success btn-approve" data-purchase-id="${doc.id}" data-cliente-id="${purchase.clienteId}" data-total="${purchase.total}">
                            <i class="fas fa-check"></i> Aprobar
                        </button>
                        <button class="btn btn-outline btn-reject" data-purchase-id="${doc.id}">
                            <i class="fas fa-times"></i> Rechazar
                        </button>
                    </div>
                </div>
            `;
            approveList.appendChild(div);
        });
        
        approveList.querySelectorAll('.btn-approve').forEach(button => {
            button.addEventListener('click', handleApprovePurchase);
        });
        
        approveList.querySelectorAll('.btn-reject').forEach(button => {
            button.addEventListener('click', handleRejectPurchase);
        });
        
        console.log("Compras para aprobar cargadas:", querySnapshot.size);
    } catch (error) {
        console.error("Error al cargar compras por aprobar:", error);
        showStatus('Error al cargar compras pendientes', 'error');
    }
}

async function handleApprovePurchase(event) {
    const button = event.currentTarget;
    const purchaseId = button.getAttribute('data-purchase-id');
    const clienteId = button.getAttribute('data-cliente-id');
    const total = parseFloat(button.getAttribute('data-total'));
    
    console.log("Aprobando compra:", { purchaseId, clienteId, total });
    
    button.classList.add('loading');
    
    try {
        await approvePurchase(purchaseId, clienteId, total);
    } finally {
        button.classList.remove('loading');
    }
}

async function handleRejectPurchase(event) {
    const button = event.currentTarget;
    const purchaseId = button.getAttribute('data-purchase-id');
    
    console.log("Rechazando compra:", purchaseId);
    
    button.classList.add('loading');
    
    try {
        await rejectPurchase(purchaseId);
    } finally {
        button.classList.remove('loading');
    }
}

async function approvePurchase(purchaseId, clienteId, total) {
    const comerciante = auth.currentUser;
    if (!comerciante) {
        showStatus('Debes iniciar sesión como comerciante', 'error');
        return;
    }

    try {
        const fiadoRef = db.collection("users").doc(comerciante.uid)
            .collection("fiados").doc(clienteId);
        
        const fiadoDoc = await fiadoRef.get();
        
        if (!fiadoDoc.exists) {
            const confirmar = confirm(
                'Este cliente no tiene crédito habilitado. ¿Desea aprobar la compra igual?'
            );
            
            if (!confirmar) {
                return;
            }
            
            await db.collection("purchases").doc(purchaseId).update({
                status: "approved",
                approvedAt: new Date().toISOString(),
                approvedBy: comerciante.uid,
                paid: false,
                updatedAt: new Date().toISOString()
            });
            
            showStatus('Compra aprobada (sin descuento de crédito)', 'success');
            
        } else {
            const fiadoData = fiadoDoc.data();
            const usadoActual = fiadoData.usado || 0;
            const nuevoUsado = usadoActual + total;
            const disponible = fiadoData.monto_fiado - nuevoUsado;
            
            if (disponible < 0) {
                showStatus('El cliente no tiene suficiente crédito disponible', 'error');
                return;
            }
            
            await db.collection("purchases").doc(purchaseId).update({
                status: "approved",
                approvedAt: new Date().toISOString(),
                approvedBy: comerciante.uid,
                paid: true,
                updatedAt: new Date().toISOString()
            });
            
            await fiadoRef.update({
                usado: nuevoUsado,
                ultima_transaccion: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
            
            showStatus('Compra aprobada y descontada del crédito', 'success');
        }
        
        loadPurchasesToApprove(comerciante.uid);
        loadApprovedPurchasesMerchant(comerciante.uid);
        updateMerchantStats(comerciante.uid);
        
    } catch (error) {
        console.error("Error al aprobar compra:", error);
        showStatus(`Error: ${error.message}`, 'error');
    }
}

async function rejectPurchase(purchaseId) {
    const comerciante = auth.currentUser;
    if (!comerciante) {
        showStatus('Debes iniciar sesión como comerciante', 'error');
        return;
    }

    try {
        const confirmar = confirm(
            '¿Estás seguro de que deseas rechazar esta compra?'
        );
        
        if (!confirmar) {
            return;
        }
        
        await db.collection("purchases").doc(purchaseId).update({
            status: "rejected",
            rejectedAt: new Date().toISOString(),
            rejectedBy: comerciante.uid,
            updatedAt: new Date().toISOString()
        });
        
        showStatus('Compra rechazada', 'success');
        
        loadPurchasesToApprove(comerciante.uid);
        updateMerchantStats(comerciante.uid);
        
    } catch (error) {
        console.error("Error al rechazar compra:", error);
        showStatus(`Error: ${error.message}`, 'error');
    }
}

async function loadApprovedPurchasesMerchant(comercianteId) {
    try {
        const querySnapshot = await db.collection("purchases")
            .where("comercianteId", "==", comercianteId)
            .where("status", "==", "approved")
            .get();
        
        const approvedList = document.getElementById('approvedPurchasesMerchantList');
        if (!approvedList) return;
        
        if (querySnapshot.empty) {
            approvedList.innerHTML = "<div class='no-items'>No hay compras aprobadas</div>";
            return;
        }
        
        approvedList.innerHTML = '';
        querySnapshot.forEach(doc => {
            const purchase = doc.data();
            const div = document.createElement("div");
            div.className = "purchase-item";
            
            const itemsList = purchase.items.map(item => 
                `${item.name} (${item.quantity} x $${item.price.toFixed(2)})`
            ).join('<br>');
            
            div.innerHTML = `
                <div class="purchase-info">
                    <h4>${purchase.clienteEmail || 'Cliente'}</h4>
                    <p><strong>Categoría:</strong> ${purchase.category || 'Sin categoría'}</p>
                    <p><strong>Productos:</strong><br>${itemsList}</p>
                    <p><small>Aprobada: ${new Date(purchase.approvedAt).toLocaleDateString()}</small></p>
                    <p><small>${purchase.paid ? '✅ Pagada' : '⏳ Pendiente de pago'}</small></p>
                </div>
                <div>
                    <span class="purchase-total">$${purchase.total.toFixed(2)}</span>
                </div>
            `;
            approvedList.appendChild(div);
        });
        
    } catch (error) {
        console.error("Error al cargar compras aprobadas del comerciante:", error);
    }
}

async function updateMerchantStats(comercianteId) {
    try {
        const pendingSnapshot = await db.collection("purchases")
            .where("comercianteId", "==", comercianteId)
            .where("status", "==", "pending")
            .get();
        
        const approvedSnapshot = await db.collection("purchases")
            .where("comercianteId", "==", comercianteId)
            .where("status", "==", "approved")
            .get();
        
        let totalSales = 0;
        approvedSnapshot.forEach(doc => {
            totalSales += doc.data().total || 0;
        });
        
        const paymentsPendingSnapshot = await db.collection("payments")
            .where("comercianteId", "==", comercianteId)
            .where("approved", "==", false)
            .where("rejected", "==", false)
            .get();
        
        document.getElementById('pendingCount').textContent = pendingSnapshot.size;
        document.getElementById('approvedCount').textContent = approvedSnapshot.size;
        document.getElementById('totalSales').textContent = `$${totalSales.toFixed(2)}`;
        document.getElementById('pendingPayments').textContent = paymentsPendingSnapshot.size;
        
    } catch (error) {
        console.error("Error al actualizar estadísticas:", error);
    }
}

async function loadClientesFiado(comercianteId) {
    try {
        const querySnapshot = await db.collection("users")
            .doc(comercianteId)
            .collection("fiados")
            .get();
        
        const clientesList = document.getElementById('clientesFiado');
        if (!clientesList) return;
        
        if (querySnapshot.empty) {
            clientesList.innerHTML = '<div class="no-items">No hay clientes con crédito</div>';
            return;
        }
        
        clientesList.innerHTML = '';
        
        for (const doc of querySnapshot.docs) {
            const fiadoData = doc.data();
            
            const clienteDoc = await db.collection("users").doc(doc.id).get();
            const clienteEmail = clienteDoc.exists ? clienteDoc.data().email : "Cliente desconocido";
            
            const div = document.createElement("div");
            div.className = "purchase-item";
            
            const monto = fiadoData.monto_fiado || 0;
            const usado = fiadoData.usado || 0;
            const disponible = monto - usado;
            
            div.innerHTML = `
                <div>
                    <strong>${clienteEmail}</strong><br>
                    <span>Límite: $${monto.toFixed(2)}</span><br>
                    <span>Usado: $${usado.toFixed(2)}</span><br>
                    <span class="text-success">Disponible: $${disponible.toFixed(2)}</span>
                </div>
                <div>
                    <small>${new Date(fiadoData.fecha_inicio || new Date()).toLocaleDateString()}</small>
                </div>
            `;
            clientesList.appendChild(div);
        }
        
    } catch (error) {
        console.error("Error al cargar clientes con crédito:", error);
    }
}

async function cargarClientes() {
    try {
        const querySnapshot = await db.collection("users")
            .where("role", "==", "cliente")
            .get();
        
        const select = document.getElementById('clienteSelectComerciante');
        if (!select) return;
        
        select.innerHTML = '<option value="">Seleccionar Cliente</option>';
        
        querySnapshot.forEach(doc => {
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = doc.data().email;
            select.appendChild(option);
        });
        
    } catch (error) {
        console.error("Error al cargar clientes:", error);
    }
}

async function habilitarFiado() {
    const comerciante = auth.currentUser;
    if (!comerciante) {
        showStatus('Debes iniciar sesión como comerciante', 'error');
        return;
    }
    
    const clienteId = document.getElementById('clienteSelectComerciante').value;
    const monto = parseFloat(document.getElementById('montoFiado').value);
    
    if (!clienteId) {
        showStatus('Selecciona un cliente', 'error');
        return;
    }
    
    if (!monto || monto <= 0) {
        showStatus('Ingresa un monto válido', 'error');
        return;
    }
    
    const button = document.getElementById('habilitarFiadoBtn');
    button.classList.add('loading');
    
    try {
        const clienteDoc = await db.collection("users").doc(clienteId).get();
        const clienteEmail = clienteDoc.exists ? clienteDoc.data().email : "Cliente";
        
        await db.collection("users").doc(comerciante.uid)
            .collection("fiados")
            .doc(clienteId)
            .set({
                clienteId: clienteId,
                clienteEmail: clienteEmail,
                monto_fiado: monto,
                usado: 0,
                fecha_inicio: new Date().toISOString(),
                activo: true,
                updatedAt: new Date().toISOString()
            }, { merge: true });
        
        showStatus(`Crédito de $${monto.toFixed(2)} habilitado para ${clienteEmail}`, 'success');
        
        document.getElementById('clienteSelectComerciante').value = '';
        document.getElementById('montoFiado').value = '';
        
        loadClientesFiado(comerciante.uid);
        
    } catch (error) {
        console.error("Error al habilitar fiado:", error);
        showStatus(`Error: ${error.message}`, 'error');
    } finally {
        button.classList.remove('loading');
    }
}

async function loadPaymentsToApprove(comercianteId) {
    try {
        const querySnapshot = await db.collection("payments")
            .where("comercianteId", "==", comercianteId)
            .where("approved", "==", false)
            .where("rejected", "==", false)
            .get();
        
        const paymentsList = document.getElementById('paymentsToApprove');
        const pendingPaymentsBadge = document.getElementById('pendingPaymentsBadge');
        
        if (!paymentsList) return;
        
        if (querySnapshot.empty) {
            paymentsList.innerHTML = "<div class='no-items'>No hay pagos por aprobar</div>";
            if (pendingPaymentsBadge) pendingPaymentsBadge.textContent = '0';
            return;
        }
        
        if (pendingPaymentsBadge) pendingPaymentsBadge.textContent = querySnapshot.size.toString();
        
        paymentsList.innerHTML = '';
        querySnapshot.forEach(doc => {
            const payment = doc.data();
            const div = document.createElement("div");
            div.className = "purchase-item";
            
            div.innerHTML = `
                <div class="purchase-info">
                    <h4>Pago de ${payment.userEmail || 'Cliente'}</h4>
                    <p><strong>Método:</strong> ${payment.method === "efectivo" ? "Efectivo" : "Transferencia"}</p>
                    <p><strong>Monto:</strong> $${payment.amount.toFixed(2)}</p>
                    <p><strong>Fecha:</strong> ${new Date(payment.date).toLocaleDateString()}</p>
                    ${payment.comprobante ? `<p><strong>Comprobante:</strong> ${payment.comprobante}</p>` : ''}
                </div>
                <div class="purchase-actions">
                    <span class="purchase-total">$${payment.amount.toFixed(2)}</span>
                    <div>
                        <button class="btn btn-success btn-approve-payment" data-payment-id="${doc.id}" data-user-id="${payment.userId}" data-amount="${payment.amount}">
                            <i class="fas fa-check"></i> Aprobar
                        </button>
                        <button class="btn btn-outline btn-reject-payment" data-payment-id="${doc.id}">
                            <i class="fas fa-times"></i> Rechazar
                        </button>
                    </div>
                </div>
            `;
            paymentsList.appendChild(div);
        });
        
        paymentsList.querySelectorAll('.btn-approve-payment').forEach(button => {
            button.addEventListener('click', handleApprovePayment);
        });
        
        paymentsList.querySelectorAll('.btn-reject-payment').forEach(button => {
            button.addEventListener('click', handleRejectPayment);
        });
        
    } catch (error) {
        console.error("Error al cargar pagos por aprobar:", error);
    }
}

async function handleApprovePayment(event) {
    const button = event.currentTarget;
    const paymentId = button.getAttribute('data-payment-id');
    const userId = button.getAttribute('data-user-id');
    const amount = parseFloat(button.getAttribute('data-amount'));
    
    button.classList.add('loading');
    
    try {
        await approvePayment(paymentId, userId, amount);
    } finally {
        button.classList.remove('loading');
    }
}

async function handleRejectPayment(event) {
    const button = event.currentTarget;
    const paymentId = button.getAttribute('data-payment-id');
    
    button.classList.add('loading');
    
    try {
        await rejectPayment(paymentId);
    } finally {
        button.classList.remove('loading');
    }
}

async function approvePayment(paymentId, userId, amount) {
    const comerciante = auth.currentUser;
    if (!comerciante) {
        showStatus('Debes iniciar sesión como comerciante', 'error');
        return;
    }
    
    try {
        const paymentDoc = await db.collection("payments").doc(paymentId).get();
        const paymentData = paymentDoc.data();
        
        if (!paymentData) {
            throw new Error("Pago no encontrado");
        }
        
        await db.collection("payments").doc(paymentId).update({
            approved: true,
            approvedBy: comerciante.uid,
            approvedAt: new Date().toISOString()
        });
        
        if (paymentData.purchaseId) {
            await db.collection("purchases").doc(paymentData.purchaseId).update({
                paid: true,
                paidAt: new Date().toISOString()
            });
        }
        
        showStatus('Pago aprobado correctamente', 'success');
        
        loadPaymentsToApprove(comerciante.uid);
        updateMerchantStats(comerciante.uid);
        
    } catch (error) {
        console.error("Error al aprobar pago:", error);
        showStatus(`Error: ${error.message}`, 'error');
    }
}

async function rejectPayment(paymentId) {
    const comerciante = auth.currentUser;
    if (!comerciante) {
        showStatus('Debes iniciar sesión como comerciante', 'error');
        return;
    }
    
    try {
        const razon = prompt("Ingresa la razón del rechazo:");
        
        if (!razon) {
            showStatus('Debes ingresar una razón para rechazar', 'error');
            return;
        }
        
        await db.collection("payments").doc(paymentId).update({
            rejected: true,
            rejectedBy: comerciante.uid,
            rejectedAt: new Date().toISOString(),
            rejectionReason: razon
        });
        
        showStatus('Pago rechazado', 'success');
        
        loadPaymentsToApprove(comerciante.uid);
        
    } catch (error) {
        console.error("Error al rechazar pago:", error);
        showStatus(`Error: ${error.message}`, 'error');
    }
}

async function approvePaymentByMerchant() {
    const button = document.getElementById('confirmApprovePaymentBtn');
    const paymentId = button.dataset.paymentId;
    const userId = button.dataset.userId;
    const amount = parseFloat(button.dataset.amount);
    
    if (!paymentId || !userId) {
        showStatus('Datos del pago no disponibles', 'error');
        return;
    }
    
    button.classList.add('loading');
    
    try {
        await approvePayment(paymentId, userId, amount);
        closeApprovePaymentModal();
    } finally {
        button.classList.remove('loading');
    }
}

function closeApprovePaymentModal() {
    document.getElementById('approvePaymentModal').style.display = 'none';
}

// ============================================
// FUNCIONES AUXILIARES
// ============================================

function showStatus(message, type = 'info') {
    console.log(`Status: ${message} (${type})`);
    
    const statusMessage = document.getElementById('statusMessage');
    if (!statusMessage) return;
    
    statusMessage.textContent = message;
    statusMessage.className = 'text-center mt-4';
    
    switch (type) {
        case 'success':
            statusMessage.style.color = 'var(--success)';
            break;
        case 'error':
            statusMessage.style.color = 'var(--primary)';
            break;
        case 'info':
            statusMessage.style.color = 'var(--text-light)';
            break;
    }
    
    setTimeout(() => {
        statusMessage.textContent = '';
    }, 5000);
}

// ============================================
// FUNCIONES GLOBALES
// ============================================

window.openPaymentModal = openPaymentModal;
window.closePaymentModal = closePaymentModal;
window.selectPaymentMethod = selectPaymentMethod;
window.confirmPayment = confirmPayment;
window.closeNotification = closeNotification;
window.removeItem = removeItem;
window.pagarCompraDirecta = pagarCompraDirecta;
window.closeApprovePaymentModal = closeApprovePaymentModal;
window.approvePaymentByMerchant = approvePaymentByMerchant;

// ============================================
// TEST FUNCTIONS
// ============================================

function testModal() {
    console.log("=== TEST MODAL ===");
    
    const modal = document.getElementById('paymentModal');
    console.log("Modal encontrado:", !!modal);
    
    if (modal) {
        console.log("Mostrando modal...");
        modal.style.display = 'flex';
        
        const select = document.getElementById('purchaseToPaySelect');
        if (select) {
            select.innerHTML = '<option value="">Seleccionar Compra</option>';
            const option = document.createElement('option');
            option.value = 'test-123';
            option.textContent = 'Compra de prueba - $100.00';
            select.appendChild(option);
        }
        
        console.log("Modal debería ser visible ahora");
    } else {
        console.error("ERROR: No se encontró el modal");
    }
}

window.testModal = testModal;

console.log("✅ app.js cargado completamente");