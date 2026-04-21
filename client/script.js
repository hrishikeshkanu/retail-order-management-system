let authToken = null;
let currentUser = null;

document.addEventListener('DOMContentLoaded', function() {
    console.log('=== DOMContentLoaded ===');
    
    // Check if user is already logged in
    const savedToken = localStorage.getItem('authToken');
    const savedUser = localStorage.getItem('currentUser');
    
    if (savedToken && savedUser) {
        authToken = savedToken;
        currentUser = JSON.parse(savedUser);
        showMainApp();
    } else {
        showAuthSection();
    }

    // Auth form listeners
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const logoutBtn = document.getElementById('logout-btn');

    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
        console.log('Login form listener attached');
    }
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
        console.log('Register form listener attached');
    }
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // Main app listeners
    const orderForm = document.getElementById('order-form');
    const refreshOrdersBtn = document.getElementById('refresh-orders');
    
    if (orderForm) {
        orderForm.addEventListener('submit', placeOrder);
    }
    if (refreshOrdersBtn) {
        refreshOrdersBtn.addEventListener('click', fetchOrders);
    }
});

function switchForms() {
    const loginContainer = document.getElementById('login-form-container');
    const registerContainer = document.getElementById('register-form-container');
    
    loginContainer.classList.toggle('active');
    registerContainer.classList.toggle('active');
}

async function handleLogin(e) {
    e.preventDefault();
    console.log('=== LOGIN SUBMITTED ===');
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    try {
        const response = await fetch('http://localhost:8081/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            authToken = data.token;
            currentUser = data.user;
            
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            console.log('Login OK, showing notification');
            showNotification('Login successful!');
            
            console.log('Calling showMainApp after 300ms');
            setTimeout(showMainApp, 300);
        } else {
            showNotification(data.message || 'Login failed', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showNotification('Error: ' + error.message, 'error');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    console.log('Register form submitted');
    
    const fullName = document.getElementById('register-fullname').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    
    console.log('Form values:', { fullName, email, password });
    
    try {
        const response = await fetch('http://localhost:8081/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ fullName, email, password })
        });
        
        console.log('Response status:', response.status);
        
        if (response.ok) {
            showNotification('Registration successful! Please login.');
            document.getElementById('register-form').reset();
            switchForms();
        } else {
            const error = await response.text();
            showNotification(error || 'Registration failed', 'error');
        }
    } catch (error) {
        console.error('Error during registration:', error);
        showNotification('Registration failed. Please try again.', 'error');
    }
}

function handleLogout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    
    // Clear forms
    document.getElementById('login-form').reset();
    document.getElementById('register-form').reset();
    
    showNotification('Logged out successfully');
    showAuthSection();
}

function showAuthSection() {
    console.log('showAuthSection() called');
    const authSection = document.getElementById('auth-section');
    const mainSection = document.getElementById('main-section');
    
    if (authSection) {
        authSection.style.visibility = 'visible';
        authSection.style.display = 'flex';
    }
    if (mainSection) {
        mainSection.style.visibility = 'hidden';
        mainSection.style.display = 'none';
    }
}

function showMainApp() {
    console.log('=== SHOWMAINAPP CALLED ===');
    
    const auth = document.getElementById('auth-section');
    const main = document.getElementById('main-section');
    const userName = document.getElementById('user-name');
    const customerName = document.getElementById('customer-name');
    
    // FORCE hide auth
    if (auth) {
        auth.style.cssText = 'display: none !important; visibility: hidden !important;';
    }
    
    // FORCE show main
    if (main) {
        main.style.cssText = 'display: block !important; visibility: visible !important;';
    }
    
    // Set user name header
    if (userName) {
        userName.textContent = 'Welcome, ' + (currentUser ? currentUser.fullName : 'User');
    }
    
    // Auto-fill customer name in order form
    if (customerName && currentUser) {
        customerName.value = currentUser.fullName;
    }
    
    // Load data
    fetchProducts();
    fetchOrders();
    
    console.log('showMainApp complete');
}

    async function fetchProducts() {
        console.log('fetchProducts() called');
        try {
            const response = await fetch('http://localhost:8081/products');
            const products = await response.json();
            
            console.log('Products fetched:', products);
            
            const productsList = document.getElementById('products-list');
            const productSelect = document.getElementById('product-select');
            
            if (!productsList || !productSelect) {
                console.error('productsList or productSelect not found');
                return;
            }
            
            productsList.innerHTML = '';
            productSelect.innerHTML = '<option value="">Select a product</option>';
            
            products.forEach(product => {
                // Add to products list
                const productCard = document.createElement('div');
                productCard.className = 'product-card';
                productCard.innerHTML = `
                    <h3>${product.name}</h3>
                    <p>Price: BDT ${product.price}</p>
                    <p>Supplier: ${product.supplier}</p>
                `;
                productsList.appendChild(productCard);
                
                // Add to select dropdown
                const option = document.createElement('option');
                option.value = product.id;
                option.textContent = `${product.name} - BDT ${product.price}`;
                productSelect.appendChild(option);
            });
            console.log('Products rendered');
        } catch (error) {
            console.error('Error fetching products:', error);
        }
    }
    
    async function placeOrder(e) {
        e.preventDefault();
        
        const productId = document.getElementById('product-select').value;
        const customerName = document.getElementById('customer-name').value; // Get value from field
        const quantity = document.getElementById('quantity').value;
        
        try {
            const response = await fetch('http://localhost:8081/order', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({
                    product_id: parseInt(productId),
                    customer: customerName,
                    quantity: parseInt(quantity)
                })
            });
            
            if (response.ok) {
                showNotification('Order placed successfully!');
                document.getElementById('order-form').reset();
                // Re-fill customer name after reset
                if (currentUser) {
                    document.getElementById('customer-name').value = currentUser.fullName;
                }
                fetchOrders();
            } else {
                const error = await response.text();
                showNotification(`Error: ${error}`, 'error');
            }
        } catch (error) {
            console.error('Error placing order:', error);
            showNotification('Failed to place order', 'error');
        }
    }
    
    async function fetchOrders() {
        console.log('fetchOrders() called');
        try {
            const response = await fetch('http://localhost:8081/orders', {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
            
            if (!response.ok) {
                console.error('Orders fetch failed with status:', response.status);
                const ordersList = document.getElementById('orders-list');
                if (ordersList) {
                    ordersList.innerHTML = '<p>Error loading orders</p>';
                }
                return;
            }
            
            const orders = await response.json();
            
            console.log('Orders fetched:', orders);
            
            const ordersList = document.getElementById('orders-list');
            
            if (!ordersList) {
                console.error('ordersList not found');
                return;
            }
            
            ordersList.innerHTML = '';
            
            if (orders.length === 0) {
                ordersList.innerHTML = '<p>No orders found.</p>';
                return;
            }
            
            orders.forEach(order => {
                const orderItem = document.createElement('div');
                orderItem.className = 'order-item';
                orderItem.innerHTML = `
                    <h3>${order.product_name}</h3>
                    <p>Customer: ${order.customer}</p>
                    <p>Quantity: ${order.quantity}</p>
                    <p>Total: BDT ${order.price}</p>
                    <p>Status: ${order.status}</p>
                `;
                ordersList.appendChild(orderItem);
            });
            console.log('Orders rendered');
        } catch (error) {
            console.error('Error fetching orders:', error);
        }
    }

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed !important;
        top: 20px !important;
        right: 20px !important;
        padding: 15px 20px !important;
        border-radius: 4px !important;
        color: white !important;
        z-index: 100000 !important;
        background: ${type === 'success' ? '#2ecc71' : '#e74c3c'} !important;
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}