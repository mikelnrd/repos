import { fetch, Request, Response } from "./env.js";
import * as home from "./routes/home.js";
import * as repositories from "./routes/repositories.js";

import { toResponse } from "./utils/litstream.js"

function handler(route) {
    return async (request) => {
        const stream = route.html(route.data(request));
        return toResponse(stream, {
            headers: { "Content-Type": "text/html" }
        })
    }
}

export default function (request) {
    const url = new URL(request.url);
    const acceptHeader = request.headers.get("Accept");
    if (url.origin !== location.origin) return;
    if (!acceptHeader) return;
    if (!acceptHeader.includes("text/html")) return;

    if (url.pathname === "/" || url.pathname === "/index.html") {
        return (request) => Response.redirect("/home.html")
    }

    if (url.pathname == "/home.html") {
        return handler(home)
    }

    if (url.pathname == '/repositories.html') {
        return handler(repositories);
    }

    // otherwise fallback to origin server
}