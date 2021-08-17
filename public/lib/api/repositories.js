import { fetch } from "../env.js";
import { GITHUB_API_ENDPOINT, GITHUB_API_ENDPOINT_VERSION } from "./common.js";

export const OPTIONS = ["endpoint", "org", "user", "type", "sort", "direction", "per_page", "page"];

// https://docs.github.com/en/rest/reference/repos#list-organization-repositories--parameters
export function listRepositoriesURL(options) {
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
            links[desc] = link
        } else {
            if (insideURL) {
                link += char;
            } else {
                // do nothing
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
            page = Number(pageString)
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

export async function listRepositories(url) {
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
            page = Number(pageString)
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