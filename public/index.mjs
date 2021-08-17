// Register service worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
        navigator.serviceWorker.register('/service-worker.mjs', { type: "module", scope: "/" })
            .then(reg => console.log("service-worker registation success: ", reg))
            .catch(err => console.log("service-worker registration error: ", err));
    });
}