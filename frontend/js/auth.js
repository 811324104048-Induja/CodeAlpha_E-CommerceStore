document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("registerForm");
    if (!form) return;

    const message = document.getElementById("formMessage");
    const button = document.getElementById("registerButton");

    function showMessage(text, type) {
        message.textContent = text;
        message.className = `form-message ${type}`;
        message.hidden = false;
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const full_name = document.getElementById("name").value.trim();
        const email = document.getElementById("email").value.trim();
        const phone = document.getElementById("phone").value.trim();
        const password = document.getElementById("password").value;
        const confirmPassword =
            document.getElementById("confirmPassword").value;
        const terms = document.getElementById("terms");

        if (!full_name || !email || !phone || !password) {
            showMessage("Please fill in all fields.", "error");
            return;
        }

        if (password.length < 8) {
            showMessage(
                "Password must contain at least 8 characters.",
                "error"
            );
            return;
        }

        if (password !== confirmPassword) {
            showMessage("Passwords do not match.", "error");
            return;
        }

        if (terms && !terms.checked) {
            showMessage(
                "Please accept the terms and conditions.",
                "error"
            );
            return;
        }

        button.disabled = true;
        button.textContent = "Creating account...";

        try {
            const response = await window.NovaAPI.post("/auth/register", {
                full_name,
                email,
                phone,
                password
            });

            showMessage(
                response.message || "Account created successfully!",
                "success"
            );

            form.reset();

            setTimeout(() => {
                window.location.href = "login.html";
            }, 1000);
        } catch (error) {
            showMessage(
                error.message || "Registration failed. Please try again.",
                "error"
            );
        } finally {
            button.disabled = false;
            button.innerHTML =
                'Create account <span aria-hidden="true">→</span>';
        }
    });
});