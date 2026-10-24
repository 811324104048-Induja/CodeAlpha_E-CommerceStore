// ============================================
// NovaMart API Configuration
// ============================================

const API_BASE_URL = "http://localhost:5000/api";

const NovaAPI = {
    // ----------------------------------------
    // Authentication & Local Storage
    // ----------------------------------------

    getToken() {
        return localStorage.getItem("novamart_token");
    },

    setToken(token) {
        if (!token) {
            throw new Error("A valid authentication token is required.");
        }

        localStorage.setItem("novamart_token", token);
    },

    clearToken() {
        localStorage.removeItem("novamart_token");
        localStorage.removeItem("novamart_user");
    },

    getUser() {
        try {
            return JSON.parse(
                localStorage.getItem("novamart_user") || "null"
            );
        } catch (error) {
            console.error("Unable to read saved user:", error);
            return null;
        }
    },

    setUser(user) {
        if (!user) {
            localStorage.removeItem("novamart_user");
            return;
        }

        localStorage.setItem("novamart_user", JSON.stringify(user));
    },

    isLoggedIn() {
        return Boolean(this.getToken());
    },

    // ----------------------------------------
    // Main HTTP Request Handler
    // ----------------------------------------

    async request(path, options = {}) {
        if (typeof path !== "string") {
            throw new Error("API path must be a string.");
        }

        const normalizedPath = path.startsWith("/")
            ? path
            : `/${path}`;

        const headers = {
            Accept: "application/json",
            ...(options.body !== undefined
                ? { "Content-Type": "application/json" }
                : {}),
            ...(options.headers || {})
        };

        const token = this.getToken();

        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }

        let response;

        try {
            response = await fetch(
                `${API_BASE_URL}${normalizedPath}`,
                {
                    ...options,
                    headers
                }
            );
        } catch (error) {
            console.error("NovaMart network error:", error);

            throw new Error(
                "Cannot connect to NovaMart backend. Make sure the backend is running at http://localhost:5000."
            );
        }

        // ------------------------------------
        // Read response safely
        // ------------------------------------

        const contentType =
            response.headers.get("content-type") || "";

        let data = null;

        try {
            if (response.status !== 204) {
                if (contentType.includes("application/json")) {
                    data = await response.json();
                } else {
                    const text = await response.text();

                    if (text.trim()) {
                        data = text;
                    }
                }
            }
        } catch (error) {
            console.error("Unable to parse API response:", error);

            throw new Error(
                "The backend returned an invalid response."
            );
        }

        // ------------------------------------
        // Handle expired authentication
        // ------------------------------------

        if (response.status === 401 && token) {
            this.clearToken();

            window.dispatchEvent(
                new Event("novamart:session-expired")
            );
        }

        // ------------------------------------
        // Handle API errors
        // ------------------------------------

        if (!response.ok) {
            let message = `Request failed (${response.status})`;

            if (typeof data === "string" && data.trim()) {
                message = data;
            } else if (data && typeof data === "object") {
                message =
                    data.message ||
                    data.error ||
                    message;
            }

            throw new Error(message);
        }

        return data;
    },

    // ----------------------------------------
    // GET
    // ----------------------------------------

    get(path, options = {}) {
        return this.request(path, {
            ...options,
            method: "GET"
        });
    },

    // ----------------------------------------
    // POST
    // ----------------------------------------

    post(path, body) {
        return this.request(path, {
            method: "POST",
            body: JSON.stringify(body)
        });
    },

    // ----------------------------------------
    // PATCH
    // ----------------------------------------

    patch(path, body) {
        return this.request(path, {
            method: "PATCH",
            body: JSON.stringify(body)
        });
    },

    // ----------------------------------------
    // PUT
    // ----------------------------------------

    put(path, body) {
        return this.request(path, {
            method: "PUT",
            body: JSON.stringify(body)
        });
    },

    // ----------------------------------------
    // DELETE
    // ----------------------------------------

    delete(path) {
        return this.request(path, {
            method: "DELETE"
        });
    }
};

// Make the API helper available to other scripts.
window.NovaAPI = NovaAPI;