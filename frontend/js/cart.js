
document.addEventListener("DOMContentLoaded", () => {
    const cartItems = document.getElementById("cartItems");
    const emptyCart = document.getElementById("emptyCart");
    const cartMessage = document.getElementById("cartMessage");
    const checkoutButton = document.getElementById("checkoutButton");

    if (!window.NovaAPI || !NovaAPI.isLoggedIn()) {
        window.location.href = "login.html?redirect=cart.html";
        return;
    }

    if (checkoutButton) {
        checkoutButton.addEventListener("click", () => {
            window.location.href = "checkout.html";
        });
    }

    loadCart();

    async function loadCart() {
        try {
            const response = await NovaAPI.get("/cart");

            const items = Array.isArray(response)
                ? response
                : response?.items || response?.cart || response?.data || [];

            renderCart(items);
        } catch (error) {
            if (cartItems) cartItems.innerHTML = "";
            if (emptyCart) emptyCart.hidden = true;

            updateTotals(0);
            updateCartCount(0);

            if (checkoutButton) checkoutButton.disabled = true;

            showMessage(
                error.message || "Unable to load your cart.",
                "error"
            );
        }
    }

    function renderCart(items) {
        if (!cartItems) return;

        if (!Array.isArray(items) || items.length === 0) {
            cartItems.innerHTML = "";

            if (emptyCart) emptyCart.hidden = false;
            if (checkoutButton) checkoutButton.disabled = true;

            updateTotals(0);
            updateCartCount(0);
            return;
        }

        if (emptyCart) emptyCart.hidden = true;
        if (checkoutButton) checkoutButton.disabled = false;

        let subtotal = 0;
        let count = 0;

        cartItems.innerHTML = items.map(item => {
            const product = item.product || item;

            // These IDs are different:
            const cartItemId = item.cart_item_id;
            const productId =
                item.product_id ?? product.product_id ?? product.id;

            const quantity = Math.max(1, Number(item.quantity) || 1);
            const price = Number(item.price ?? product.price) || 0;
            const name = escapeHTML(product.name || item.name || "Product");

            const image = safeImageURL(
                product.image_url || item.image_url
            );

            subtotal += price * quantity;
            count += quantity;

            return `
                <article class="cart-item">
                    <img
                        src="${image}"
                        alt="${name}"
                        loading="lazy">

                    <div class="cart-item-info">
                        <h3>${name}</h3>
                        <p>${formatPrice(price)} each</p>

                        <div class="cart-quantity"
                             aria-label="Quantity controls">

                            <button
                                type="button"
                                data-action="decrease"
                                data-id="${escapeHTML(cartItemId)}"
                                aria-label="Decrease quantity"
                                ${quantity <= 1 ? "disabled" : ""}>
                                −
                            </button>

                            <span aria-live="polite">${quantity}</span>

                            <button
                                type="button"
                                data-action="increase"
                                data-id="${escapeHTML(cartItemId)}"
                                aria-label="Increase quantity">
                                +
                            </button>
                        </div>

                        <button
                            type="button"
                            class="remove-item"
                            data-action="remove"
                            data-id="${escapeHTML(cartItemId)}">
                            Remove item
                        </button>
                    </div>

                    <strong>${formatPrice(price * quantity)}</strong>
                </article>
            `;
        }).join("");

        updateTotals(subtotal);
        updateCartCount(count);

        cartItems.querySelectorAll("[data-action]").forEach(button => {
            button.addEventListener("click", () => {
                changeItem(
                    button.dataset.id,
                    button.dataset.action,
                    items,
                    button
                );
            });
        });
    }

    async function changeItem(cartItemId, action, items, button) {
        // Find the cart row using cart_item_id, not product_id.
        const item = items.find(entry =>
            String(entry.cart_item_id) === String(cartItemId)
        );

        if (!item) {
            showMessage("Could not find that cart item.", "error");
            return;
        }

        const quantity = Number(item.quantity) || 1;

        if (action === "decrease" && quantity <= 1) return;

        if (button) button.disabled = true;

        try {
            if (action === "remove") {
                await NovaAPI.delete(
                    `/cart/${encodeURIComponent(item.cart_item_id)}`
                );
            } else {
                const newQuantity = action === "increase"
                    ? quantity + 1
                    : quantity - 1;

                await NovaAPI.patch(
                    `/cart/${encodeURIComponent(item.cart_item_id)}`,
                    { quantity: newQuantity }
                );
            }

            hideMessage();
            await loadCart();
        } catch (error) {
            showMessage(
                error.message || "Unable to update this item.",
                "error"
            );

            if (button) button.disabled = false;
        }
    }

    function updateTotals(subtotal) {
        // Free shipping above ₹2,000; otherwise ₹99.
        const shipping = subtotal === 0 || subtotal >= 2000
            ? 0
            : 99;

        setText("cartSubtotal", formatPrice(subtotal));

        setText(
            "cartShipping",
            shipping === 0 ? "Free" : formatPrice(shipping)
        );

        setText("cartTotal", formatPrice(subtotal + shipping));
    }

    function updateCartCount(count) {
        sessionStorage.setItem("novamart_cart_count", String(count));
        setText("cartCount", count);
    }

    function formatPrice(amount) {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    }

    function setText(id, value) {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    }

    function showMessage(text, type) {
        if (!cartMessage) return;

        cartMessage.textContent = text;
        cartMessage.className = `page-message ${type}`;
        cartMessage.hidden = false;
    }

    function hideMessage() {
        if (!cartMessage) return;

        cartMessage.hidden = true;
        cartMessage.textContent = "";
    }

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[character]);
    }

    function safeImageURL(value) {
        try {
            const url = new URL(value || "", window.location.href);

            if (
                url.protocol === "https:" ||
                url.protocol === "http:"
            ) {
                return url.href;
            }
        } catch (error) {
            // Use the fallback image.
        }

        return "https://placehold.co/240x240?text=Product";
    }
});
