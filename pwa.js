(function () {
  const installButton = document.querySelector("#install-app");
  const installHint = document.querySelector("#install-hint");
  let installPrompt = null;

  function showInstallHint(message) {
    installHint.textContent = message;
    installHint.hidden = false;
  }

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installPrompt = event;
    installButton.hidden = false;
  });

  window.addEventListener("appinstalled", () => {
    installPrompt = null;
    installButton.hidden = true;
    showInstallHint("Preventive Health Assessment was installed.");
  });

  installButton.addEventListener("click", async () => {
    if (!installPrompt) {
      showInstallHint("To install, open this app from localhost or an HTTPS website, then choose Install app from your browser menu.");
      return;
    }
    installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") {
      showInstallHint("The browser is installing the app.");
    }
    installPrompt = null;
    installButton.hidden = true;
  });

  if ("serviceWorker" in navigator && window.isSecureContext) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch((error) => {
        showInstallHint(`Offline support could not be enabled: ${error.message}`);
      });
    });
  }

  if (!installPrompt && window.matchMedia("(display-mode: standalone)").matches) {
    installButton.hidden = true;
  }
}());
