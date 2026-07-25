(() => {
    const storageKey = "admin-theme";
    const root = document.documentElement;
    const requestedTheme = root.dataset.theme;
    let storedTheme = null;

    try {
        storedTheme = localStorage.getItem(storageKey);
    } catch {
        storedTheme = null;
    }

    const theme =
        storedTheme === "light" || storedTheme === "dark"
            ? storedTheme
            : requestedTheme === "light" || requestedTheme === "dark"
              ? requestedTheme
              : window.matchMedia("(prefers-color-scheme: dark)").matches
                ? "dark"
                : "light";

    root.dataset.theme = theme;
    root.style.colorScheme = theme;
    document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute("content", theme === "dark" ? "#111318" : "#f5f6f8");
})();
