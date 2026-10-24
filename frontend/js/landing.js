document.addEventListener("DOMContentLoaded", () => {
    loadFeaturedProducts();
});

const fallbackProductImage =
    "https://images.unsplash.com/photo-1491553895911-0055eca6402d?auto=format&fit=crop&w=600&q=80";

function escapeProductText(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

function formatProductPrice(price) {
    const value = Number(price);

    if (!Number.isFinite(value)) {
        return "Price unavailable";
    }

    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2
    }).format(value);
}

async function loadFeaturedProducts() {
    const container = document.getElementById("featuredProducts");

    if (!container) return;

    try {
        if (!window.NovaAPI) {
            throw new Error("API helper has not loaded.");
        }

        const response = await window.NovaAPI.get("/products");

        // Support common API response formats.
        const products = Array.isArray(response)
            ? response
            : response.products || response.data || [];

        if (!Array.isArray(products) || products.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>No products to display yet.</h3>
                    <p>Add products to your database and refresh this page.</p>
                    <br>
                    <a class="text-link" href="shop.html">Visit the shop ↗</a>
                </div>
            `;
            return;
        }

        container.innerHTML = products.slice(0, 4).map(product => {
            const id = product.product_id ?? product.id;
            const name = escapeProductText(product.name);
            const category = escapeProductText(product.category || "Collection");
            const price = formatProductPrice(product.price);
            const image = escapeProductText(
                product.image_url || fallbackProductImage
            );
            const stock = Number(product.stock ?? 0);
            const unavailable = stock <= 0;

            return `
                <article class="product-card">
                    <a href="product-details.html?id=${encodeURIComponent(id)}"
                       class="product-image">
                        <img
                            src="${image}"
                            alt="${name}"
                            loading="lazy"
                            onerror="this.onerror=null;this.src='${fallbackProductImage}'"
                        >
                        <span class="product-tag">
                            ${unavailable ? "Out of stock" : "A good find"}
                        </span>
                    </a>

                    <div class="product-info">
                        <p class="product-category">${category}</p>

                        <a class="product-name"
                           href="product-details.html?id=${encodeURIComponent(id)}">
                            ${name}
                        </a>

                        <p class="product-price">${price}</p>

                        <button
                            class="add-to-cart-btn"
                            data-product-id="${escapeProductText(id)}"
                            ${unavailable ? "disabled" : ""}
                        >
                            ${unavailable ? "Currently unavailable" : "Add to cart +"}
                        </button>
                    </div>
                </article>
            `;
        }).join("");

        container.querySelectorAll(".add-to-cart-btn").forEach(button => {
            button.addEventListener("click", () => {
                const productId = button.dataset.productId;

                // Connect this action to the existing cart endpoint
                // after confirming your backend's authentication and response format.
                if (!window.NovaAPI?.isLoggedIn()) {
                    window.location.href = "login.html";
                    return;
                }

                addFeaturedProductToCart(productId, button);
            });
        });

    } catch (error) {
        console.error("Featured products error:", error);

        container.innerHTML = `
            <div class="empty-state">
                <h3>Our products are taking a little break.</h3>
                <p>Check that your backend is running on port 5000.</p>
                <br>
                <button class="button button-dark" id="retryProducts">
                    Try again ↻
                </button>
            </div>
        `;

        document.getElementById("retryProducts")?.addEventListener(
            "click",
            loadFeaturedProducts
        );
    }
}

async function addFeaturedProductToCart(productId, button) {
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = "Adding...";

    try {
        // Expected API contract: POST /api/cart
        // Body: { product_id: ..., quantity: 1 }
        await window.NovaAPI.post("/cart", {
            product_id: Number(productId),
            quantity: 1
        });

        button.textContent = "Added ✓";

        const badge = document.getElementById("cartCount");
        if (badge) {
            const count = Number(badge.textContent || 0) + 1;
            badge.textContent = count;
            sessionStorage.setItem("novamart_cart_count", String(count));
        }

    } catch (error) {
        console.error("Add to cart error:", error);
        button.textContent = "Couldn't add — try again";
    }

    setTimeout(() => {
        button.textContent = originalText;
        button.disabled = false;
    }, 1800);
}