document.addEventListener("DOMContentLoaded", () => {
    const loading = document.getElementById("productLoading");
    const errorSection = document.getElementById("productError");
    const errorMessage = document.getElementById("productErrorMessage");
    const details = document.getElementById("productDetails");

    const image = document.getElementById("detailImage");
    const imagePlaceholder = document.getElementById("imagePlaceholder");
    const nameElement = document.getElementById("detailName");
    const categoryElement = document.getElementById("detailCategory");
    const priceElement = document.getElementById("detailPrice");
    const descriptionElement = document.getElementById("detailDescription");
    const stockElement = document.getElementById("detailStock");
    const breadcrumb = document.getElementById("breadcrumbProduct");

    const quantityInput = document.getElementById("quantity");
    const decreaseButton = document.getElementById("decreaseQuantity");
    const increaseButton = document.getElementById("increaseQuantity");
    const addButton = document.getElementById("addToCartButton");
    const message = document.getElementById("productMessage");

    let currentProduct = null;

    function showMessage(text, isError = false) {
        message.textContent = text;
        message.className = isError
            ? "product-message error"
            : "product-message";
        message.hidden = false;
    }

    function formatPrice(price) {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 2
        }).format(Number(price));
    }

    function getStock(product) {
        const stock = Number(product.stock);
        return Number.isFinite(stock) ? Math.max(0, stock) : 0;
    }

    function showError(text) {
        loading.hidden = true;
        details.hidden = true;
        errorMessage.textContent = text;
        errorSection.hidden = false;
    }

    function showProductImage(url, productName) {
        image.hidden = true;
        imagePlaceholder.hidden = false;

        if (!url) return;

        image.alt = productName;
        image.onload = () => {
            image.hidden = false;
            imagePlaceholder.hidden = true;
        };

        image.onerror = () => {
            image.hidden = true;
            imagePlaceholder.hidden = false;
        };

        image.src = url;
    }

    function renderProduct(product) {
        currentProduct = product;

        const productName = product.name || "Product";
        const stock = getStock(product);

        document.title = `${productName} | NovaMart`;

        nameElement.textContent = productName;
        categoryElement.textContent = product.category || "Collection";
        priceElement.textContent = formatPrice(product.price);
        descriptionElement.textContent =
            product.description || "No description is available for this product.";

        breadcrumb.textContent = productName;

        showProductImage(product.image_url, productName);

        stockElement.classList.toggle("out-of-stock", stock < 1);
        stockElement.textContent = stock > 0
            ? `${stock} available in stock`
            : "Currently out of stock";

        quantityInput.min = "1";
        quantityInput.max = String(Math.max(1, stock));
        quantityInput.value = "1";
        quantityInput.disabled = stock < 1;

        decreaseButton.disabled = stock < 1;
        increaseButton.disabled = stock < 1;

        addButton.disabled = stock < 1;
        addButton.textContent = stock > 0
            ? "Add to Cart →"
            : "Out of Stock";

        loading.hidden = true;
        errorSection.hidden = true;
        details.hidden = false;
    }

    function getValidQuantity() {
        if (!currentProduct) return 1;

        const stock = getStock(currentProduct);
        const quantity = Number.parseInt(quantityInput.value, 10);

        if (!Number.isFinite(quantity) || quantity < 1) {
            return 1;
        }

        return Math.min(quantity, stock);
    }

    decreaseButton.addEventListener("click", () => {
        const quantity = Number.parseInt(quantityInput.value, 10) || 1;
        quantityInput.value = String(Math.max(1, quantity - 1));
    });

    increaseButton.addEventListener("click", () => {
        if (!currentProduct) return;

        const quantity = Number.parseInt(quantityInput.value, 10) || 1;
        const stock = getStock(currentProduct);

        quantityInput.value = String(Math.min(stock, quantity + 1));
    });

    quantityInput.addEventListener("change", () => {
        quantityInput.value = String(getValidQuantity());
    });

    addButton.addEventListener("click", async () => {
        if (!currentProduct) return;

        if (!window.NovaAPI) {
            showMessage("API helper could not load. Please refresh the page.", true);
            return;
        }

        if (!NovaAPI.isLoggedIn()) {
            const returnUrl = window.location.pathname + window.location.search;
            window.location.href =
                `login.html?redirect=${encodeURIComponent(returnUrl)}`;
            return;
        }

        const quantity = getValidQuantity();

        if (quantity < 1) {
            showMessage("This product is currently out of stock.", true);
            return;
        }

        addButton.disabled = true;
        addButton.textContent = "Adding...";

        try {
            await NovaAPI.post("/cart", {
                product_id: Number(currentProduct.product_id ?? currentProduct.id),
                quantity: quantity
            });

            const previousCount = Number(
                sessionStorage.getItem("novamart_cart_count") || 0
            );

            sessionStorage.setItem(
                "novamart_cart_count",
                String(previousCount + quantity)
            );

            const cartCount = document.getElementById("cartCount");
            if (cartCount) {
                cartCount.textContent = String(previousCount + quantity);
            }

            showMessage("Product added to your cart successfully.");

        } catch (error) {
            console.error("Add to cart failed:", error);
            showMessage(
                error.message || "Unable to add this product to your cart.",
                true
            );
        } finally {
            addButton.disabled = getStock(currentProduct) < 1;
            addButton.textContent = getStock(currentProduct) > 0
                ? "Add to Cart →"
                : "Out of Stock";
        }
    });

    async function loadProduct() {
        const params = new URLSearchParams(window.location.search);
        const id = params.get("id");

        if (!id || !/^\d+$/.test(id) || Number(id) < 1) {
            showError("No valid product ID was provided. Please select a product from the shop.");
            return;
        }

        if (!window.NovaAPI) {
            showError("The API helper could not load. Check js/api.js and refresh the page.");
            return;
        }

        try {
            const response = await NovaAPI.get(
                `/products/${encodeURIComponent(id)}`
            );

            const product = response?.product ?? response?.data ?? response;

            if (
                !product ||
                typeof product !== "object" ||
                !(product.product_id ?? product.id)
            ) {
                showError("This product could not be found.");
                return;
            }

            renderProduct(product);

        } catch (error) {
            console.error("Unable to load product:", error);
            showError(
                error.message ||
                "Unable to load product details. Check that your backend is running."
            );
        }
    }

    loadProduct();
});
