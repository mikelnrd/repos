import { html, escapeHtml } from "../utils/litstream.js";
import { layout } from "./_partials.js";

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
        }

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
        }

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
            `
    } catch (err) {
        yield html`<p>${err}</p>`;
        return;
    }
}

export default function (data) {
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
    `

    return layout("GitHub Repo Explorer", template)
}
