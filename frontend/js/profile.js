
document.addEventListener("DOMContentLoaded", () => {
    const profileForm = document.getElementById("profileForm");
    const logoutButton = document.getElementById("logoutButton");
    const message = document.getElementById("profileMessage");
    const loading = document.getElementById("profileLoading");
    const saveButton = document.getElementById("saveProfileButton");

    if (!window.NovaAPI || !NovaAPI.isLoggedIn()) {
        window.location.href = "login.html?redirect=profile.html";
        return;
    }

    if (logoutButton) {
        logoutButton.addEventListener("click", () => {
            NovaAPI.clearToken();
            window.location.href = "login.html";
        });
    }

    loadProfile();

    async function loadProfile() {
        if (loading) {
            loading.hidden = false;
            loading.textContent = "Loading your profile...";
        }

        if (profileForm) profileForm.hidden = true;

        try {
            // server.js mounts profileRoutes at /api/profile.
            const response = await NovaAPI.get("/profile");
            const user = response?.user || response?.data || response;

            const name = user.full_name || user.name || "";
            const email = user.email || "";
            const phone = user.phone || "";

            setValue("profileName", name);
            setValue("profileEmail", email);
            setValue("profilePhone", phone);

            setText("profileDisplayName", name || "NovaMart customer");
            setText("profileDisplayEmail", email);
            setText(
                "profileAvatar",
                name.trim().charAt(0).toUpperCase() || "N"
            );

            if (profileForm) profileForm.hidden = false;
            if (loading) loading.hidden = true;

        } catch (error) {
            if (loading) {
                loading.hidden = false;
                loading.textContent =
                    "Your profile could not be loaded. Please try again.";
            }

            showMessage(
                error.message || "Unable to load profile.",
                "error"
            );
        }
    }

    if (profileForm) {
        profileForm.addEventListener("submit", async event => {
            event.preventDefault();

            const name = document.getElementById("profileName")
                .value.trim();
            const phone = document.getElementById("profilePhone")
                .value.trim();

            if (name.length < 2) {
                showMessage("Please enter your full name.", "error");
                return;
            }

            if (!/^[0-9]{10}$/.test(phone)) {
                showMessage(
                    "Please enter a valid 10-digit phone number.",
                    "error"
                );
                return;
            }

            if (saveButton) {
                saveButton.disabled = true;
                saveButton.textContent = "Saving...";
            }

            try {
                // Confirm this endpoint and accepted field names
                // against backend/routes/profileRoutes.js.
                const response = await NovaAPI.patch("/profile", {
                    full_name: name,
                    phone
                });

                const saved = response?.user || response?.data || response;
                const savedName = saved.full_name || saved.name || name;
                const savedPhone = saved.phone ?? phone;

                const previousUser = NovaAPI.getUser() || {};

                NovaAPI.setUser({
                    ...previousUser,
                    full_name: savedName,
                    name: savedName,
                    phone: savedPhone
                });

                setText("profileDisplayName", savedName);
                setText(
                    "profileAvatar",
                    savedName.trim().charAt(0).toUpperCase() || "N"
                );
                setValue("profileName", savedName);
                setValue("profilePhone", savedPhone);

                showMessage(
                    response.message || "Profile updated successfully.",
                    "success"
                );

            } catch (error) {
                showMessage(
                    error.message || "Unable to update profile.",
                    "error"
                );
            } finally {
                if (saveButton) {
                    saveButton.disabled = false;
                    saveButton.textContent = "Save changes →";
                }
            }
        });
    }

    function setValue(id, value) {
        const element = document.getElementById(id);
        if (element && value != null) element.value = value;
    }

    function setText(id, value) {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    }

    function showMessage(text, type) {
        if (!message) return;

        message.textContent = text;
        message.className = `page-message ${type}`;
        message.hidden = false;
    }
});
