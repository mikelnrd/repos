import router from "./lib/router.js";

self.addEventListener("fetch", event => {
    const handle = router(event.request);
    if (handle) {
        const response = handle(event.request).catch(
            (err) => {
                // TODO replace this hander with a 404 page
                console.error(err);
                return new Response(err.stack, { status: 500 })
            }
        )
        event.respondWith(response);
    } else {
        // let the origin server handle this request
    }
});

self.addEventListener("install", function () {
    console.log("service-worker install");
});
self.addEventListener("activate", function () {
    console.log("service-worker activate");
});