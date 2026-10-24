document.addEventListener("DOMContentLoaded", () => {
    const menuToggle = document.getElementById("menuToggle");
    const navLinks = document.getElementById("navLinks");

    if (menuToggle && navLinks) {
        menuToggle.addEventListener("click", () => {
            navLinks.classList.toggle("open");
        });

        navLinks.querySelectorAll("a").forEach(link => {
            link.addEventListener("click", () => {
                navLinks.classList.remove("open");
            });
        });
    }

    const year = document.getElementById("currentYear");

    if (year) {
        year.textContent = new Date().getFullYear();
    }

    // Update the cart badge when a cart count is available.
    // The API-specific cart loading is handled in the page scripts.
    const cartCount = document.getElementById("cartCount");

    if (cartCount) {
        const savedCount = sessionStorage.getItem("novamart_cart_count");

        if (savedCount !== null) {
            cartCount.textContent = savedCount;
        }
    }

    // Show the account link based on the saved login session.
    const accountLink = document.getElementById("accountLink");

    if (accountLink) {
        try {
            const user = JSON.parse(localStorage.getItem("novamart_user") || "null");

            if (user) {
                accountLink.textContent = "My account ↗";
                accountLink.href = "profile.html";
            }
        } catch (error) {
            console.warn("Unable to read saved account information.");
        }
    }
});