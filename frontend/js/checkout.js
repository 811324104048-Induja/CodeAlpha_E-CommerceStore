
document.addEventListener("DOMContentLoaded", () => {
    const checkoutForm = document.getElementById("checkoutForm");
    const checkoutMessage = document.getElementById("checkoutMessage");
    const placeOrderButton = document.getElementById("placeOrderButton");

    if (!NovaAPI.isLoggedIn()) {
        window.location.href = "login.html?redirect=checkout.html";
        return;
    }

    loadCheckout();

    async function loadCheckout() {
        try {
            const response = await NovaAPI.get("/cart");

            const items = Array.isArray(response)
                ? response
                : response.items || response.cart || response.data || [];

            if (!items.length) {
                showMessage(
                    "Your cart is empty. Add products before checkout.",
                    "error"
                );

                if (placeOrderButton) {
                    placeOrderButton.disabled = true;
                }
                return;
            }

            let subtotal = 0;
            const summary = document.getElementById("checkoutItems");

            const itemHTML = items.map(item => {
                const product = item.product || item;
                const name = escapeHTML(product.name || "Product");
                const quantity = Number(item.quantity) || 1;
                const price = Number(item.price ?? product.price) || 0;

                subtotal += price * quantity;

                return `
                    <div class="checkout-item">
                        <span>${name} × ${quantity}</span>
                        <strong>₹${(price * quantity).toFixed(2)}</strong>
                    </div>
                `;
            }).join("");

            if (summary) {
                summary.innerHTML = itemHTML;
            }

            const shipping = subtotal >= 2000 ? 0 : 99;

            setText("checkoutSubtotal", `₹${subtotal.toFixed(2)}`);
            setText(
                "checkoutShipping",
                shipping === 0 ? "Free" : `₹${shipping.toFixed(2)}`
            );
            setText(
                "checkoutTotal",
                `₹${(subtotal + shipping).toFixed(2)}`
            );

            const user = NovaAPI.getUser();

            if (user) {
                setValue("fullName", user.full_name || user.name || "");
                setValue("email", user.email || "");
                setValue("phone", user.phone || "");
            }
        } catch (error) {
            showMessage(
                error.message || "Unable to load checkout details.",
                "error"
            );
        }
    }

    if (checkoutForm) {
        checkoutForm.addEventListener("submit", async event => {
            event.preventDefault();

            const fullName = getValue("fullName");
            const email = getValue("email");
            const phone = getValue("phone");
            const postalCode = getValue("postalCode");
            const addressLine = getValue("address");
            const city = getValue("city");
            const state = getValue("state");

            if (
                !fullName ||
                !email ||
                !phone ||
                !postalCode ||
                !addressLine ||
                !city ||
                !state
            ) {
                showMessage(
                    "Please complete all delivery details.",
                    "error"
                );
                return;
            }

            if (placeOrderButton) {
                placeOrderButton.disabled = true;
                placeOrderButton.textContent = "Placing order...";
            }

            try {
                // STEP 1: Save the delivery address
                const addressResponse = await NovaAPI.post("/addresses", {
                    recipient_name: fullName,
                    phone: phone,
                    address_line: addressLine,
                    city: city,
                    state: state,
                    postal_code: postalCode,
                    country: "India"
                });

                // Your address API returns address_id at the top level
                const addressId = Number(addressResponse.address_id);

                if (
                    addressResponse.success !== true ||
                    !Number.isInteger(addressId) ||
                    addressId < 1
                ) {
                    throw new Error(
                        addressResponse.message ||
                        "Unable to save delivery address."
                    );
                }

                // STEP 2: Place order using the saved address ID
                const orderResponse = await NovaAPI.post("/orders", {
                    address_id: addressId,
                    payment_method: "COD"
                });

                if (orderResponse.success === false) {
                    throw new Error(
                        orderResponse.message || "Unable to place order."
                    );
                }

                showMessage(
                    orderResponse.message || "Order placed successfully!",
                    "success"
                );

                if (placeOrderButton) {
                    placeOrderButton.textContent = "Order Placed!";
                }

                setTimeout(() => {
                    window.location.href = "orders.html";
                }, 1200);

            } catch (error) {
                showMessage(
                    error.message || "Unable to place order.",
                    "error"
                );

                if (placeOrderButton) {
                    placeOrderButton.disabled = false;
                    placeOrderButton.textContent = "Place Order";
                }
            }
        });
    }

    function getValue(id) {
        return document.getElementById(id)?.value.trim() || "";
    }

    function setValue(id, value) {
        const element = document.getElementById(id);

        if (element && value != null) {
            element.value = value;
        }
    }

    function setText(id, value) {
        const element = document.getElementById(id);

        if (element) {
            element.textContent = value;
        }
    }

    function showMessage(message, type) {
        if (!checkoutMessage) return;

        checkoutMessage.hidden = false;
        checkoutMessage.textContent = message;
        checkoutMessage.className = `page-message ${type}`;
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
});
