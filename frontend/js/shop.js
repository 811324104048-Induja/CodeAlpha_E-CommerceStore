
document.addEventListener("DOMContentLoaded", () => {
    const productGrid = document.getElementById("productGrid");
    const loading = document.getElementById("productsLoading");
    const message = document.getElementById("shopMessage");

    if (!productGrid) return;

    loadProducts();

    // Add to Cart button click handler
    productGrid.addEventListener("click", async event => {
        const button = event.target.closest(".add-to-cart-btn");

        if (!button) return;

        const productId = Number(button.dataset.productId);

        if (!Number.isInteger(productId) || productId < 1) {
            showMessage("Invalid product. Please refresh the page.", "error");
            return;
        }

        if (!NovaAPI.isLoggedIn()) {
            window.location.href =
                "login.html?redirect=" + encodeURIComponent("shop.html");
            return;
        }

        button.disabled = true;
        button.textContent = "Adding...";

        try {
            const response = await NovaAPI.post("/cart", {
                product_id: productId,
                quantity: 1
            });

            if (response?.success === false) {
                throw new Error(
                    response.message || "Unable to add product to cart."
                );
            }

            showMessage(
                response?.message || "Product added to cart successfully!",
                "success"
            );

            button.textContent = "Added to Cart";

        } catch (error) {
            showMessage(
                error.message || "Unable to add product to cart.",
                "error"
            );

            button.textContent = "Add to Cart";
        } finally {
            button.disabled = false;

            if (button.textContent === "Adding...") {
                button.textContent = "Add to Cart";
            }
        }
    });

    async function loadProducts() {
        try {
            if (loading) loading.style.display = "block";

            const response = await NovaAPI.get("/products");

            const products = Array.isArray(response)
                ? response
                : response.products || response.data || [];

            if (products.length === 0) {
                productGrid.innerHTML =
                    '<p class="empty-state">No products available.</p>';
                return;
            }

            productGrid.innerHTML = products.map(product => {
                const id = Number(product.product_id ?? product.id);
                const name = escapeHTML(product.name || "Product");
                const category = escapeHTML(product.category || "General");
                const price = Number(product.price) || 0;
                const image = safeImageURL(product.image_url);

                return `
                    <article class="product-card">
                        <img
                            class="product-image"
                            src="${image}"
                            alt="${name}"
                            loading="lazy"
                            onerror="this.onerror=null;this.src='https://placehold.co/400x300?text=NovaMart'"
                        >

                        <div class="product-info">
                            <p class="product-category">${category}</p>
                            <h3 class="product-name">${name}</h3>
                            <p class="product-price">₹${price.toFixed(2)}</p>

                            <button
                                type="button"
                                class="btn add-to-cart-btn"
                                data-product-id="${id}"
                            >
                                Add to Cart
                            </button>
                        </div>
                    </article>
                `;
            }).join("");

        } catch (error) {
            productGrid.innerHTML = `
                <p class="empty-state">
                    Unable to load products. Please try again later.
                </p>
            `;

            showMessage(error.message || "Unable to load products.", "error");
            console.error("Product loading error:", error);
        } finally {
            if (loading) loading.style.display = "none";
        }
    }

    function showMessage(text, type) {
        if (!message) {
            console.log(text);
            return;
        }

        message.hidden = false;
        message.textContent = text;
        message.className = `page-message ${type}`;
    }

    function escapeHTML(value) {
        return String(value).replace(/[&<>"']/g, character => ({
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

            if (url.protocol === "https:" || url.protocol === "http:") {
                return url.href;
            }
        } catch (error) {
            // Use fallback image.
        }

        return "https://placehold.co/400x300?text=NovaMart";
    }
});
