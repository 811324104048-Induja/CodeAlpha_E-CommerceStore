
const API = window.NovaAPI;

const state = {
    products: [],
    category: "All",
    search: "",
    cart: [],
    authMode: "login"
};

const FALLBACK_IMAGES = {
    Electronics:
        "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=700&q=80",
    Accessories:
        "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=700&q=80",
    Fashion:
        "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=700&q=80",
    default:
        "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=700&q=80"
};

let toastTimer;

function escapeHTML(value = "") {
    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function formatPrice(value) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2
    }).format(Number(value) || 0);
}

function showToast(message, isError = false) {
    const toast = document.getElementById("toast");

    toast.textContent = message;
    toast.classList.toggle("error", isError);
    toast.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}

function setButtonLoading(button, loading, loadingText = "Please wait...") {
    if (!button.dataset.originalText) {
        button.dataset.originalText = button.textContent;
    }

    button.disabled = loading;
    button.textContent = loading
        ? loadingText
        : button.dataset.originalText;
}

function openModal(id) {
    const modal = document.getElementById(id);

    if (modal && !modal.open) {
        modal.showModal();
    }
}

function closeModal(id) {
    const modal = document.getElementById(id);

    if (modal?.open) {
        modal.close();
    }
}

function requireLogin() {
    if (API.isLoggedIn()) {
        return true;
    }

    showToast("Please sign in to continue.");
    openAuth("login");
    return false;
}

// ------------------------------------------
// PRODUCTS
// ------------------------------------------

async function loadProducts() {
    const grid = document.getElementById("productGrid");

    grid.innerHTML = '<div class="loading-state">Loading your collection...</div>';

    try {
        const result = await API.get("/products");

        state.products = Array.isArray(result)
            ? result
            : result.products || [];

        renderProducts();
    } catch (error) {
        grid.innerHTML = `
            <div class="empty-state">
                <strong>We couldn't load the collection.</strong>
                ${escapeHTML(error.message)}
                <p>Please check your backend and database.</p>
                <button class="button button-dark" id="retryProducts">Try again</button>
            </div>
        `;

        document.getElementById("retryProducts")?.addEventListener(
            "click",
            loadProducts
        );
    }
}

function getFilteredProducts() {
    return state.products.filter(product => {
        const matchesCategory =
            state.category === "All" ||
            product.category === state.category;

        const searchTerm = state.search.toLowerCase();

        const matchesSearch =
            String(product.name || "").toLowerCase().includes(searchTerm) ||
            String(product.description || "").toLowerCase().includes(searchTerm) ||
            String(product.category || "").toLowerCase().includes(searchTerm);

        return matchesCategory && matchesSearch;
    });
}

function renderProducts() {
    const grid = document.getElementById("productGrid");
    const filtered = getFilteredProducts();

    document.getElementById("productCount").textContent =
        `${filtered.length} ${filtered.length === 1 ? "product" : "products"} found`;

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <strong>No products found.</strong>
                Try another search or category.
            </div>
        `;
        return;
    }

    grid.innerHTML = filtered.map(product => {
        const productId = Number(product.product_id);
        const stock = Number(product.stock);
        const category = escapeHTML(product.category || "Essentials");

        const image = product.image_url || FALLBACK_IMAGES[product.category]
            || FALLBACK_IMAGES.default;

        return `
            <article class="product-card">
                <div class="product-image">
                    <img
                        src="${escapeHTML(image)}"
                        alt="${escapeHTML(product.name)}"
                        loading="lazy"
                        onerror="this.onerror=null;this.src='${FALLBACK_IMAGES.default}'"
                    >
                    <span class="product-tag">${category}</span>
                </div>
                <div class="product-details">
                    <span class="product-category">${category}</span>
                    <h3 class="product-title">${escapeHTML(product.name)}</h3>
                    <p class="product-description">
                        ${escapeHTML(product.description || "A thoughtful pick for everyday life.")}
                    </p>
                    <div class="product-bottom">
                        <span class="product-price">${formatPrice(product.price)}</span>
                        <button
                            class="add-button"
                            data-add-product="${productId}"
                            aria-label="Add ${escapeHTML(product.name)} to cart"
                            title="${stock > 0 ? "Add to cart" : "Out of stock"}"
                            ${stock < 1 ? "disabled" : ""}
                        >${stock > 0 ? "+" : "×"}</button>
                    </div>
                    <p class="product-category">
                        ${stock > 0 ? `${stock} available` : "Currently unavailable"}
                    </p>
                </div>
            </article>
        `;
    }).join("");
}

function setupProductControls() {
    document.getElementById("categoryList").addEventListener("click", event => {
        const button = event.target.closest("[data-category]");

        if (!button) return;

        state.category = button.dataset.category;

        document.querySelectorAll(".category-chip").forEach(chip => {
            chip.classList.toggle("active", chip === button);
        });

        renderProducts();
    });

    document.getElementById("searchInput").addEventListener("input", event => {
        state.search = event.target.value.trim();
        renderProducts();
    });

    document.getElementById("searchFocus").addEventListener("click", () => {
        document.getElementById("searchInput").focus();
        document.getElementById("products").scrollIntoView({ behavior: "smooth" });
    });

    document.getElementById("refreshProducts").addEventListener(
        "click",
        loadProducts
    );

    document.getElementById("productGrid").addEventListener("click", event => {
        const button = event.target.closest("[data-add-product]");

        if (button) {
            addToCart(Number(button.dataset.addProduct));
        }
    });
}

// ------------------------------------------
// AUTHENTICATION
// ------------------------------------------

function openAuth(mode = "login") {
    state.authMode = mode;
    updateAuthForm();
    openModal("authModal");
}

function updateAuthForm() {
    const isRegister = state.authMode === "register";

    document.getElementById("authTitle").textContent =
        isRegister ? "Create your account." : "Welcome back.";

    document.getElementById("authSubtitle").textContent =
        isRegister
            ? "Join NovaMart and make everyday shopping simpler."
            : "Sign in to continue your shopping journey.";

    document.getElementById("nameField").classList.toggle("hidden", !isRegister);
    document.getElementById("phoneField").classList.toggle("hidden", !isRegister);

    document.querySelector('[name="full_name"]').required = isRegister;
    document.querySelector('[name="password"]').autocomplete =
        isRegister ? "new-password" : "current-password";

    document.getElementById("authSubmit").textContent =
        isRegister ? "Create account →" : "Sign in →";

    document.querySelectorAll("[data-auth-mode]").forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.authMode === state.authMode
        );
    });
}

function setupAuth() {
    document.getElementById("authButton").addEventListener("click", () => {
        if (API.isLoggedIn()) {
            const user = API.getUser();

            if (confirm(`Signed in as ${user?.full_name || "customer"}. Sign out?`)) {
                API.clearToken();
                updateAuthButton();
                state.cart = [];
                updateCartCount();
                showToast("You have signed out.");
            }
        } else {
            openAuth("login");
        }
    });

    document.querySelectorAll("[data-auth-mode]").forEach(button => {
        button.addEventListener("click", () => {
            state.authMode = button.dataset.authMode;
            updateAuthForm();
        });
    });

    document.getElementById("authForm").addEventListener("submit", submitAuth);
}

async function submitAuth(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const button = document.getElementById("authSubmit");
    const formData = new FormData(form);

    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");

    const isRegister = state.authMode === "register";

    const body = isRegister
        ? {
            full_name: String(formData.get("full_name") || "").trim(),
            email,
            password,
            phone: String(formData.get("phone") || "").trim()
        }
        : { email, password };

    setButtonLoading(button, true);

    try {
        if (isRegister) {
            await API.post("/auth/register", body);

            showToast("Account created! Please sign in.");
            state.authMode = "login";
            form.reset();
            updateAuthForm();
            return;
        }

        const result = await API.post("/auth/login", body);

        if (!result.token || !result.user) {
            throw new Error("Login response is missing token or user details");
        }

        API.setToken(result.token);
        API.setUser(result.user);

        closeModal("authModal");
        form.reset();
        updateAuthButton();

        showToast(`Welcome, ${result.user.full_name}!`);

        await loadCart();
    } catch (error) {
        showToast(error.message, true);
    } finally {
        setButtonLoading(button, false);
    }
}

function updateAuthButton() {
    const button = document.getElementById("authButton");
    const user = API.getUser();

    if (API.isLoggedIn()) {
        const name = user?.full_name || "Account";
        button.textContent = name.length > 12
            ? `${name.slice(0, 10)}…`
            : name;
        button.title = "Click to sign out";
    } else {
        button.textContent = "Sign in";
        button.title = "Sign in or create an account";
    }
}

// ------------------------------------------
// CART
// ------------------------------------------

function updateCartCount() {
    const count = state.cart.reduce(
        (sum, item) => sum + Number(item.quantity),
        0
    );

    document.getElementById("cartCount").textContent = count;
    document.getElementById("drawerCartCount").textContent =
        count ? `(${count})` : "";
}

async function addToCart(productId) {
    if (!requireLogin()) return;

    try {
        await API.post("/cart", {
            product_id: productId,
            quantity: 1
        });

        showToast("Added to your cart.");
        await loadCart();
    } catch (error) {
        showToast(error.message, true);
    }
}

async function loadCart() {
    if (!API.isLoggedIn()) {
        state.cart = [];
        renderCart();
        updateCartCount();
        return;
    }

    try {
        const result = await API.get("/cart");
        state.cart = result.items || [];
        renderCart();
        updateCartCount();
    } catch (error) {
        state.cart = [];
        renderCart();
        updateCartCount();

        if (!error.message.includes("Please login")) {
            showToast(error.message, true);
        }
    }
}

function renderCart() {
    const container = document.getElementById("cartItems");

    updateCartCount();

    if (!API.isLoggedIn()) {
        container.innerHTML = `
            <div class="empty-state">
                <strong>Sign in to view your cart.</strong>
                Your selected products will be available after login.
                <p><button class="button button-dark" id="cartLogin">Sign in</button></p>
            </div>
        `;

        document.getElementById("cartLogin")?.addEventListener(
            "click",
            () => {
                closeModal("cartModal");
                openAuth("login");
            }
        );

        document.getElementById("cartTotal").textContent = formatPrice(0);
        return;
    }

    if (state.cart.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <strong>Your cart is taking a little break.</strong>
                Find something you love and add it here.
            </div>
        `;

        document.getElementById("cartTotal").textContent = formatPrice(0);
        return;
    }

    container.innerHTML = state.cart.map(item => {
        const image = item.image_url || FALLBACK_IMAGES.default;

        return `
            <article class="cart-item">
                <img src="${escapeHTML(image)}" alt="${escapeHTML(item.name)}">
                <div>
                    <h3>${escapeHTML(item.name)}</h3>
                    <p>${formatPrice(item.price)} each</p>
                    <div class="quantity-controls">
                        <button data-quantity="${item.cart_item_id}" data-change="-1" aria-label="Decrease quantity">−</button>
                        <span>${Number(item.quantity)}</span>
                        <button
                            data-quantity="${item.cart_item_id}"
                            data-change="1"
                            aria-label="Increase quantity"
                            ${Number(item.quantity) >= Number(item.stock) ? "disabled" : ""}
                        >+</button>
                    </div>
                </div>
                <div>
                    <strong>${formatPrice(item.subtotal)}</strong>
                    <p><button class="remove-item" data-remove="${item.cart_item_id}">Remove</button></p>
                </div>
            </article>
        `;
    }).join("");

    const total = state.cart.reduce(
        (sum, item) => sum + Number(item.subtotal),
        0
    );

    document.getElementById("cartTotal").textContent = formatPrice(total);
}

function setupCart() {
    document.getElementById("cartButton").addEventListener("click", async () => {
        await loadCart();
        openModal("cartModal");
    });

    document.getElementById("cartItems").addEventListener("click", async event => {
        const quantityButton = event.target.closest("[data-quantity]");
        const removeButton = event.target.closest("[data-remove]");

        try {
            if (quantityButton) {
                const id = Number(quantityButton.dataset.quantity);
                const change = Number(quantityButton.dataset.change);
                const item = state.cart.find(
                    row => Number(row.cart_item_id) === id
                );

                if (!item) return;

                const quantity = Number(item.quantity) + change;

                if (quantity < 1) {
                    await API.delete(`/cart/${id}`);
                } else {
                    await API.patch(`/cart/${id}`, { quantity });
                }

                await loadCart();
            }

            if (removeButton) {
                await API.delete(`/cart/${Number(removeButton.dataset.remove)}`);
                showToast("Item removed from cart.");
                await loadCart();
            }
        } catch (error) {
            showToast(error.message, true);
        }
    });

    document.getElementById("checkoutButton").addEventListener("click", async () => {
        if (!requireLogin()) return;

        await loadCart();

        if (!state.cart.length) {
            showToast("Add a product before checking out.", true);
            return;
        }

        closeModal("cartModal");
        openModal("checkoutModal");
    });
}

// ------------------------------------------
// CHECKOUT AND ADDRESSES
// ------------------------------------------

function setupCheckout() {
    document.getElementById("checkoutForm").addEventListener(
        "submit",
        submitCheckout
    );
}

async function submitCheckout(event) {
    event.preventDefault();

    if (!requireLogin()) return;

    const form = event.currentTarget;
    const button = document.getElementById("placeOrderButton");
    const values = Object.fromEntries(new FormData(form).entries());

    const address = {
        recipient_name: values.recipient_name.trim(),
        phone: values.phone.trim(),
        address_line: values.address_line.trim(),
        city: values.city.trim(),
        state: values.state.trim(),
        postal_code: values.postal_code.trim(),
        country: values.country.trim() || "India",
        is_default: true
    };

    const paymentMethod = values.payment_method || "COD";

    // Actual UPI/card processing is not integrated yet.
    if (paymentMethod !== "COD") {
        showToast(
            "UPI/card payment is not integrated yet. Please choose COD.",
            true
        );
        return;
    }

    setButtonLoading(button, true, "Placing order...");

    try {
        // First save the address in the addresses table.
        const addressResult = await API.post("/addresses", address);

        if (!addressResult.address_id) {
            throw new Error("Address saved but address ID was not returned");
        }

        // Then create the order using the returned address_id.
        const orderResult = await API.post("/orders", {
            address_id: addressResult.address_id,
            payment_method: paymentMethod
        });

        closeModal("checkoutModal");
        form.reset();

        showToast(`Order #${orderResult.order.order_id} placed successfully!`);

        await Promise.all([loadCart(), loadProducts()]);
        await showOrders();
    } catch (error) {
        showToast(error.message, true);
    } finally {
        setButtonLoading(button, false);
    }
}

// ------------------------------------------
// ORDER HISTORY
// ------------------------------------------

async function showOrders() {
    if (!requireLogin()) return;

    const container = document.getElementById("ordersList");

    container.innerHTML = '<div class="loading-state">Loading your orders...</div>';
    openModal("ordersModal");

    try {
        const result = await API.get("/orders");
        const orders = result.orders || [];

        if (!orders.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <strong>No orders yet.</strong>
                    Your next great find is just around the corner.
                </div>
            `;
            return;
        }

        container.innerHTML = orders.map(order => `
            <article class="order-card">
                <div class="order-card-top">
                    <div>
                        <h3>Order #${Number(order.order_id)}</h3>
                        <p>${new Date(order.order_date).toLocaleString()}</p>
                    </div>
                    <span class="status-pill">${escapeHTML(order.order_status)}</span>
                </div>
                <p>Total: <strong>${formatPrice(order.total_amount)}</strong></p>
                <p>Payment: ${escapeHTML(order.payment_method)} · ${escapeHTML(order.payment_status)}</p>
                <div class="order-actions">
                    <button data-view-order="${Number(order.order_id)}">View details →</button>
                    ${
                        order.order_status === "PENDING"
                            ? `<button data-cancel-order="${Number(order.order_id)}">Cancel order</button>`
                            : ""
                    }
                </div>
                <div id="order-detail-${Number(order.order_id)}"></div>
            </article>
        `).join("");
    } catch (error) {
        container.innerHTML = `
            <div class="empty-state">
                <strong>Unable to load orders.</strong>
                ${escapeHTML(error.message)}
            </div>
        `;
    }
}

async function viewOrderDetails(orderId) {
    const container = document.getElementById(`order-detail-${orderId}`);

    if (!container) return;

    container.innerHTML = "<p>Loading details...</p>";

    try {
        const result = await API.get(`/orders/${orderId}`);

        const itemsHTML = (result.items || []).map(item => `
            <p>
                ${escapeHTML(item.product_name)}
                × ${Number(item.quantity)}
                — <strong>${formatPrice(item.subtotal)}</strong>
            </p>
        `).join("");

        container.innerHTML = `
            <div class="order-details">
                <p><strong>Delivery address</strong></p>
                <p>${escapeHTML(result.order.shipping_name)} · ${escapeHTML(result.order.shipping_phone)}</p>
                <p>
                    ${escapeHTML(result.order.shipping_address)},
                    ${escapeHTML(result.order.shipping_city)},
                    ${escapeHTML(result.order.shipping_state)}
                    ${escapeHTML(result.order.shipping_postal_code)},
                    ${escapeHTML(result.order.shipping_country)}
                </p>
                <p><strong>Items</strong></p>
                ${itemsHTML}
            </div>
        `;
    } catch (error) {
        container.textContent = error.message;
    }
}

async function cancelOrder(orderId) {
    if (!confirm(`Cancel order #${orderId}?`)) return;

    try {
        await API.patch(`/orders/${orderId}/cancel`, {});

        showToast("Order cancelled.");
        await loadProducts();
        await showOrders();
    } catch (error) {
        showToast(error.message, true);
    }
}

function setupOrders() {
    document.getElementById("ordersButton").addEventListener(showOrders);

    document.getElementById("ordersList").addEventListener("click", event => {
        const viewButton = event.target.closest("[data-view-order]");
        const cancelButton = event.target.closest("[data-cancel-order]");

        if (viewButton) {
            viewOrderDetails(Number(viewButton.dataset.viewOrder));
        }

        if (cancelButton) {
            cancelOrder(Number(cancelButton.dataset.cancelOrder));
        }
    });
}

// ------------------------------------------
// GENERAL UI
// ------------------------------------------

function setupDialogs() {
    document.querySelectorAll("[data-close]").forEach(button => {
        button.addEventListener("click", () => {
            closeModal(button.dataset.close);
        });
    });

    document.querySelectorAll("dialog.modal").forEach(dialog => {
        dialog.addEventListener("click", event => {
            if (event.target === dialog) {
                dialog.close();
            }
        });
    });
}

window.addEventListener("novamart:session-expired", () => {
    updateAuthButton();
    state.cart = [];
    renderCart();
    showToast("Your session expired. Please sign in again.", true);
});

document.addEventListener("DOMContentLoaded", async () => {
    document.getElementById("currentYear").textContent =
        new Date().getFullYear();

    setupProductControls();
    setupAuth();
    setupCart();
    setupCheckout();
    setupOrders();
    setupDialogs();

    updateAuthButton();

    await loadProducts();

    if (API.isLoggedIn()) {
        await loadCart();
    } else {
        renderCart();
    }
});
