(() => {
    const root = document.documentElement;
    const themeToggle = document.querySelector("[data-theme-toggle]");
    const themeColor = document.querySelector('meta[name="theme-color"]');

    function updateThemeToggle() {
        const isDark = root.dataset.theme === "dark";
        const label = isDark ? "Mudar para tema claro" : "Mudar para tema escuro";
        themeToggle?.setAttribute("aria-label", label);
        themeToggle?.setAttribute("title", label);
    }

    themeToggle?.addEventListener("click", () => {
        const nextTheme = root.dataset.theme === "dark" ? "light" : "dark";
        root.dataset.theme = nextTheme;
        root.style.colorScheme = nextTheme;
        themeColor?.setAttribute(
            "content",
            nextTheme === "dark" ? "#111318" : "#f5f6f8",
        );

        try {
            localStorage.setItem("admin-theme", nextTheme);
        } catch {
            // The selected theme still applies for this page when storage is unavailable.
        }

        updateThemeToggle();
    });

    updateThemeToggle();

    const passwordInput = document.querySelector("[data-password-input]");
    const passwordToggle = document.querySelector("[data-password-toggle]");

    if (passwordInput && passwordToggle) {
        passwordToggle.addEventListener("click", () => {
            const showPassword = passwordInput.type === "password";
            passwordInput.type = showPassword ? "text" : "password";
            passwordToggle.setAttribute("aria-pressed", String(showPassword));
            passwordToggle.setAttribute(
                "aria-label",
                showPassword ? "Ocultar senha" : "Mostrar senha",
            );
        });
    }

    const form = document.querySelector("[data-login-form]");
    const submitButton = document.querySelector("[data-submit-button]");
    const submitLabel = submitButton?.querySelector(".submit-button__label");

    form?.addEventListener("submit", () => {
        if (!form.checkValidity() || !submitButton || !submitLabel) {
            return;
        }

        submitButton.disabled = true;
        submitButton.dataset.loading = "true";
        submitLabel.textContent = "Entrando…";
    });
})();
