document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("loginForm");
    if (!form) return;

    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const button = document.getElementById("loginButton");
    const message = document.getElementById("formMessage");
    const toggle = document.getElementById("togglePassword");

    function showMessage(text, type = "error") {
        message.textContent = text;
        message.className = `form-message ${type}`;
        message.hidden = false;
    }

    if (toggle) {
        toggle.addEventListener("click", () => {
            const visible = passwordInput.type === "password";

            passwordInput.type = visible ? "text" : "password";
            toggle.textContent = visible ? "Hide" : "Show";
            toggle.setAttribute("aria-pressed", String(visible));
            toggle.setAttribute(
                "aria-label",
                visible ? "Hide password" : "Show password"
            );
        });
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (!email || !password) {
            showMessage("Enter your email and password.");
            return;
        }

        button.disabled = true;
        button.textContent = "Signing in...";

        try {
            const response = await window.NovaAPI.post("/auth/login", {
                email,
                password
            });

            if (!response.token || !response.user) {
                throw new Error("Invalid login response from the server.");
            }

            window.NovaAPI.setToken(response.token);
            window.NovaAPI.setUser(response.user);

            showMessage("Login successful!", "success");

            const redirect = new URLSearchParams(
                window.location.search
            ).get("redirect");

            const safeRedirect =
                redirect && /^[a-zA-Z0-9_-]+\.html$/.test(redirect)
                    ? redirect
                    : "profile.html";

            setTimeout(() => {
                window.location.href = safeRedirect;
            }, 500);
        } catch (error) {
            showMessage(
                error.message || "Login failed. Please try again."
            );
        } finally {
            button.disabled = false;
            button.innerHTML =
                'Sign in <span aria-hidden="true">→</span>';
        }
    });
});