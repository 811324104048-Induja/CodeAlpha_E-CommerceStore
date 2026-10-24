document.addEventListener("DOMContentLoaded", () => {
    const ordersList = document.getElementById("ordersList");
    const ordersLoading = document.getElementById("ordersLoading");
    const ordersEmpty = document.getElementById("ordersEmpty");
    const ordersMessage = document.getElementById("ordersMessage");

    if (!NovaAPI.isLoggedIn()) {
        window.location.href = "login.html?redirect=orders.html";
        return;
    }

    loadOrders();

    async function loadOrders() {
        try {
            if (ordersLoading) ordersLoading.style.display = "block";
            if (ordersEmpty) ordersEmpty.style.display = "none";

            const response = await NovaAPI.get("/orders");

            const orders = Array.isArray(response)
                ? response
                : response.orders || response.data || [];

            if (!ordersList) return;

            if (orders.length === 0) {
                ordersList.innerHTML = "";
                if (ordersEmpty) ordersEmpty.style.display = "block";
                return;
            }

            ordersList.innerHTML = orders.map(order => {
                const id = order.order_id ?? order.id;
                const status = escapeHTML(order.status || "Processing");
                const total = Number(
                    order.total_amount ?? order.total ?? order.total_price ?? 0
                );

                const date = order.created_at
                    ? new Date(order.created_at).toLocaleDateString("en-IN")
                    : "Date unavailable";

                return `
                    <article class="order-card">
                        <div class="order-header">
                            <div>
                                <h3>Order #${escapeHTML(id)}</h3>
                                <p>Placed on ${escapeHTML(date)}</p>
                            </div>
                            <span class="order-status">${status}</span>
                        </div>

                        <div class="order-footer">
                            <p>Total: <strong>₹${total.toFixed(2)}</strong></p>
                        </div>
                    </article>
                `;
            }).join("");

        } catch (error) {
            if (ordersMessage) {
                ordersMessage.textContent =
                    error.message || "Unable to load your orders.";
            }

            console.error("Orders loading error:", error);
        } finally {
            if (ordersLoading) ordersLoading.style.display = "none";
        }
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