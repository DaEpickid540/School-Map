// theme.js — settings sidebar, theme switching, device-default Mason
(function () {
  const KEY = "mason-theme";

  // Default: Mason light/dark based on device preference
  function getDefault() {
    if (
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    ) {
      return "mason-dark";
    }
    return "mason";
  }

  const saved = localStorage.getItem(KEY) || getDefault();
  document.documentElement.setAttribute("data-theme", saved);

  document.addEventListener("DOMContentLoaded", function () {
    const trigger = document.getElementById("settingsTrigger");
    const sidebar = document.getElementById("settingsSidebar");
    const overlay = document.getElementById("settingsOverlay");
    const closeBtn = document.getElementById("settingsClose");
    if (!trigger || !sidebar) return;

    const open = () => {
      sidebar.classList.add("open");
      overlay.classList.add("open");
    };
    const close = () => {
      sidebar.classList.remove("open");
      overlay.classList.remove("open");
    };

    trigger.addEventListener("click", open);
    closeBtn.addEventListener("click", close);
    overlay.addEventListener("click", close);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close();
    });

    function sync(theme) {
      document
        .querySelectorAll(".theme-btn[data-theme]")
        .forEach((b) =>
          b.classList.toggle("active", b.dataset.theme === theme),
        );
    }
    function apply(theme) {
      document.documentElement.setAttribute("data-theme", theme);
      localStorage.setItem(KEY, theme);
      sync(theme);
    }

    document.querySelectorAll(".theme-btn[data-theme]").forEach((b) =>
      b.addEventListener("click", function () {
        apply(this.dataset.theme);
      }),
    );
    sync(saved);

    // Android APK link
    const apkBtn = document.getElementById("androidDownload");
    if (apkBtn && window.MASON_APK_URL) apkBtn.href = window.MASON_APK_URL;
  });
})();
