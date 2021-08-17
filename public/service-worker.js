(function () {
    'use strict';

    const ReadableStream = globalThis.ReadableStream;
    const fetch = globalThis.fetch;
    const Response$1 = globalThis.Response;

    const isArray = (value) => Array.isArray(value);
    const isAsyncIterator = (value) => (value != null && typeof value[Symbol.asyncIterator] === "function");
    const isSyncIterator = (value) => (value != null && typeof value[Symbol.iterator] === "function");

    async function* y(v) {
        if (v instanceof Uint8Array) {
            yield v;
            return;
        }
        if (typeof v === "string") {
            yield v;
        } else if (isArray(v)) {
            for (const x of v) {
                yield* y(x);
            }
        } else if (isAsyncIterator(v)) {
            for await (const value of v) {
                yield* y(value);
            }
        } else if (isSyncIterator(v)) {
            for (const value of v) {
                yield* y(value);
            }
        } else {
            yield v;
        }
    }

    async function* html(literals, ...values) {
        for (let i = 0; i < values.length; i++) {
            if (literals[i].length > 0) {
                yield literals[i];
            }
            yield* y(values[i]);
        }
        yield literals[literals.length - 1];
        return;
    }

    function getStreamFromSource(source) {
        if (source instanceof Response$1) {
            return source.body;
        }
        if (source instanceof ReadableStream) {
            return source;
        }
        return new Response$1(source).body;
    }

    async function* convert(iterator) {
        while (true) {
            const result = await iterator.next();
            if (result.done) break;
            if (result.value instanceof Uint8Array) {
                yield result.value;
            } else {
                yield getStreamFromSource(await result.value);
            }
        }
    }

    class Deferred {
        constructor() {
            this.promise = new Promise((resolve, reject) => {
                this.resolve = resolve;
                this.reject = reject;
            });
        }
    }

    function toReadableStream(iterator) {
        const streamDeferred = new Deferred();
        const stream = new ReadableStream({
            async pull(controller) {
                try {
                    const result = await iterator.next();
                    if (result.done) {
                        controller.close();
                        streamDeferred.resolve();
                    }
                    else {
                        const value = result.value;
                        if (value instanceof ReadableStream) {
                            const reader = value.getReader();
                            while (true) {
                                const result = await reader.read();
                                if (result.done)
                                    break;
                                controller.enqueue(result.value);
                            }
                        }
                        else {
                            controller.enqueue(value);
                        }
                    }
                }
                catch (err) {
                    streamDeferred.reject(err);
                    throw err;
                }
            },
            cancel() {
                streamDeferred.resolve();
            }
        });
        return { done: streamDeferred.promise, stream };
    }

    function toResponse(iterator, init) {
        const { stream } = toReadableStream(convert(iterator));
        return new Response$1(stream, init);
    }

    function escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function layout(title, content) {
        return html`<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <link rel="stylesheet" href="/global.css">
    </head>
    <body class="content">
        ${content}
        <script type="module" src="/index.js"></script>
    </body>
    </html>`
    }

    function home_html(data) {
        const template = html`
    <div class="center">
        <h1>Github Repository Lister App!</h1>
        <p>Search for public git repositories on Github</p>
        <form role="search" action="/repositories.html" method="get" accept-charset="UTF-8" class="center">
            <input type="search" id="org" name="org" placeholder="Enter an organization" autocomplete="off" aria-label="Enter an organization" value="">        
            <input type="submit" value="List repositories">
            <br>
            <br>
            <input type="search" id="user" name="user" placeholder="Enter a user" autocomplete="off" aria-label="Enter a user" value="">        
            <input type="submit" value="List repositories">
            <br>
            <br>
        </form>
    </div>
    `;

        return layout("GitHub Repo Explorer", template)
    }

    function home_data(request) {
        return [{}, {}]
    }

    var home = /*#__PURE__*/Object.freeze({
        __proto__: null,
        html: home_html,
        data: home_data
    });

    function selected(options, option, value) {
        const v = options[option];
        if (v !== undefined && v === value) {
            return "selected"
        }
        return " "
    }

    function _hidden_option(options, option, value=undefined) {
        if (!value) {
            value = options[option];
        }
        if (value) {
            return `<input type="hidden" name="${option}" value="${value}"> `
        }
        return " "
    }

    async function* _list(options, listRepositoriesPromise) {
        try {
            const {error, data} = await listRepositoriesPromise;
            if (error) {
                throw Error(data.message);
            }
            const { page, resource, links } = data;
            yield html`<ul data-js-repositories-list class="Box">`;
            for (const repo of resource) {
                yield html`<li class="Box-row">
                <h3 style="word-break: break-all;"><a href="${escapeHtml(repo.html_url)}">${escapeHtml(repo.name)}</a></h3>
                <p>${repo.description ? escapeHtml(repo.description) : "No description..."}</p>
            </li>`;
            }
            yield html`</ul>`;

            const pageNumber = (url) => {
                return Number((new URL(url)).searchParams.get("page"));
            };

            let numberOfLastPage;
            if (links["last"]) {
                numberOfLastPage = pageNumber(links["last"]);
            } else if (links["next"]) {
                numberOfLastPage = pageNumber(links["next"]);
            } else {
                numberOfLastPage = page;
            }

            const href = (page) => {
                const url = new URL("/repositories.html", location.origin);
                for (const [key, value] of Object.entries(options)) {
                    if (value) {
                        url.searchParams.set(key, value);
                    }
                }
                url.searchParams.set("page", page);
                return url.href
            };

            const first = links["first"] ? html`<a class="first_page" rel="first" href="${href(1)}">First</a>` : html`<span class="first_page disabled">First</span>`;
            const prev = links["prev"] ? html`<a class="previous_page" rel="prev" href="${href(page - 1)}">Previous</a>` : html`<span class="previous_page disabled">Previous</span>`;
            const next = links["next"] ? html`<a class="next_page" rel="next" href="${href(page + 1)}">Next</a>` : html`<span class="next_page disabled">Next</span>`;
            const last = links["last"] ? html`<a class="last_page" rel="last" href="${href(numberOfLastPage)}">Last</a>` : html`<span class="last_page disabled">Last</span>`;

            yield html`
            <div class="paginate-container">
                <div role="navigation" aria-label="Pagination" class="pagination">
                ${first} ${prev} <span>Page ${page} of ${numberOfLastPage}</span> ${next} ${last}
                </div>
            </div>
            `;
        } catch (err) {
            yield html`<p>${err}</p>`;
            return;
        }
    }

    function repositories_html (data) {
        const [options, listRepositoriesPromise] = data;

        const template = html`

    <header>
        <nav class="crumbs">
            <ol>
                <li class="crumb"><a href="./home.html">Home</a></li>
                <li class="crumb">Public Repositories</li>
            </ol>
        </nav>
    </header>

    <h2 class="center">${options["org"] ? options["org"] : options["user"]}</h2>
    
    <form action="/repositories.html" method="get" class="center">
        ${_hidden_option(options, "org")}
        ${_hidden_option(options, "user")}
        ${_hidden_option(options, "page", "1")}
        ${_hidden_option(options, "per_page")}

        <label for="type">Type:</label>
        <select name="type" id="type">
            <option ${selected(options, "type", "all")} value="all">All</option>
            <option ${selected(options, "type", "sources")} value="sources">Sources</option>
            <option ${selected(options, "type", "forks")} value="forks">Forks</option>
        </select>
        <label for="sort">Sort:</label>
        <select name="sort" id="sort">
            <option ${selected(options, "sort", "created")} value="created">Date created</option>
            <option ${selected(options, "sort", "updated")} value="updated">Date updated</option>
            <option ${selected(options, "sort", "pushed")} value="pushed">Date pushed</option>
            <option ${selected(options, "sort", "full_name")} value="full_name">Full name</option>
        </select>
        <label for="direction">Direction:</label>
        <select name="direction" id="direction">
            <option ${selected(options, "direction", "desc")} value="desc">Descending</option>
            <option ${selected(options, "direction", "asc")} value="asc">Ascending</option>
        </select>
        <input type="submit" value="Update">
    </form>
    ${_list(options, listRepositoriesPromise)}
    `;

        return layout("GitHub Repo Explorer", template)
    }

    const GITHUB_API_ENDPOINT = "https://api.github.com";
    const GITHUB_API_ENDPOINT_VERSION = "application/vnd.github.v3+json";

    const OPTIONS = ["endpoint", "org", "user", "type", "sort", "direction", "per_page", "page"];

    // https://docs.github.com/en/rest/reference/repos#list-organization-repositories--parameters
    function listRepositoriesURL(options) {
        const org = options["org"];
        const user = options["user"];
        if (!org && !user) {
            throw new Error("required option: either 'org' or 'user' is required");
        }

        let endpoint = options["endpoint"];
        if (!endpoint) {
            endpoint = GITHUB_API_ENDPOINT;
        }
        delete options["endpoint"];

        const path = org ? `/orgs/${org}/repos` : `/users/${user}/repos`;
        const url = new URL(path, endpoint);

        // add remaining options to query string
        for (const name of OPTIONS) {
            const value = options[name];
            if (value) {
                url.searchParams.set(name, value);
            }
        }
        return url.href
    }

    function extractLinksFromLinkHeader(s) {
        const links = {};
        let link = "";
        let i = 0;
        let insideURL = false;
        while (i < s.length) {
            const char = s[i];
            if (char === "<") {
                link = "";
                insideURL = true;
            } else if (char === ">") {
                insideURL = false;
                // skip ahead a few characters
                i = i + 1 + `; rel="`.length;
                // extract the link's description (eg first, prev, next or last)
                let desc = "";
                while (s[i] !== '"') {
                    desc += s[i];
                    i++;
                }
                // yield the link and its description
                links[desc] = link;
            } else {
                if (insideURL) {
                    link += char;
                }
            }
            i++;
        }
        return links
    }

    function getPageNumberFromURLQueryString(url) {
        let pageString = new URL(url).searchParams.get("page");
        let page;
        if (pageString) {
            try {
                page = Number(pageString);
                if (page <= 0) {
                    page = 1;
                }
            } catch {
                page = 1;
            }
        } else {
            page = 1;
        }
        return page;
    }

    async function listRepositories(url) {
        const init = {
            headers: { "accept": GITHUB_API_ENDPOINT_VERSION },
            cache: "default",

            // Ensure redirects are followed see:
            // https://docs.github.com/en/rest/overview/resources-in-the-rest-api#http-redirects
            redirect: "follow",
        };

        // Get page number from the url
        let pageString = new URL(url).searchParams.get("page");
        let page = getPageNumberFromURLQueryString(url);
        if (pageString) {
            try {
                page = Number(pageString);
                if (page <= 0) {
                    page = 1;
                }
            } catch {
                page = 1;
            }
        } else {
            page = 1;
        }

        const response = await fetch(url, init);
        if (response.status === 403) {
            return { error: true, data: "Server Error - rate limited - please wait before trying again" }
        }
        try {
            var resource = await response.json();
        } catch (err) {
            return { error: true, data: "Server Error - JSON marhsalling error" }
        }
        if (response["message"]) {
            return { error: true, data: response["message"] }
        }

        const linkHeader = response.headers.get("Link");
        if (linkHeader) {
            const links = extractLinksFromLinkHeader(linkHeader);
            return { error: false, data: { resource, page, links } }
        } else {
            return { error: false, data: { resource, page, links: {} } }
        }
    }

    function repositories_data (request) {
        const url = new URL(request.url);

        const options = {};
        for (const option of OPTIONS) {
            options[option] = url.searchParams.get(option);
        }
        
        const listRepositoriesPromise = listRepositories(listRepositoriesURL(options));

        return [options, listRepositoriesPromise]
    }

    var repositories = /*#__PURE__*/Object.freeze({
        __proto__: null,
        html: repositories_html,
        data: repositories_data
    });

    function handler(route) {
        return async (request) => {
            const stream = route.html(route.data(request));
            return toResponse(stream, {
                headers: { "Content-Type": "text/html" }
            })
        }
    }

    function router (request) {
        const url = new URL(request.url);
        const acceptHeader = request.headers.get("Accept");
        if (url.origin !== location.origin) return;
        if (!acceptHeader) return;
        if (!acceptHeader.includes("text/html")) return;

        if (url.pathname === "/" || url.pathname === "/index.html") {
            return async (request) => Response$1.redirect("/home.html")
        }

        if (url.pathname == "/home.html") {
            return handler(home)
        }

        if (url.pathname == '/repositories.html') {
            return handler(repositories);
        }

        // otherwise fallback to origin server
    }

    self.addEventListener("fetch", event => {
        const handle = router(event.request);
        if (handle) {
            const response = handle(event.request).catch(
                (err) => {
                    console.error(err);
                    return new Response(err.stack, { status: 500 })
                }
            );
            event.respondWith(response);
        }
    });

    self.addEventListener("install", function () {
        console.log("service-worker install");
    });
    self.addEventListener("activate", function () {
        console.log("service-worker activate");
    });

}());
