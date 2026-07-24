(() => {
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
