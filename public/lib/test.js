import router from "./router.js";

async function render(path) {
    const url = new URL(path, window.location)
    const request = new Request(url, { headers: { "Accept": "text/html" } });
    const handler = router(request);
    const response = await handler(request);

    const parser = new DOMParser();
    const text = await response.text();
    const doc = parser.parseFromString(text, "text/html");
    return doc
}

async function test() {
    const home = await render("/home.html");
    if (!home.querySelector("form")) {
        throw new Error("home page doesn't have a form!")
    }

    const per_page = 5;
    for (const url of [
        `/repositories.html?org=github&per_page=${per_page}`,
        `/repositories.html?user=mikelnrd&per_page=${per_page}`,
    ]) {
        const doc = await render(url);

        // TEST: test that the page is rendered and that it contains a form
        if (!doc.querySelector("form")) {
            throw new Error("Expected repositories page ${url} to contain an html form element")
        }

        // An example test
        // Use the testing hook data-js-repositories-list to grab specific elements for testing purposes
        const repo_list = doc.querySelector("[data-js-repositories-list]")
        // TEST: Test that results are returned and that the expected number of results are returned
        const num_repos = repo_list.children.length;
        if (num_repos !== per_page) {
            throw Error(`Expected repositories page ${url} to have ${per_page} repositories listed, got ${num_repos}`)
        }
    }

    report("Test result: All tests passed!", true);
}

try {
    test();
} catch (err) {
    const message = `Test result: Test failed! ${err.toString()}`;
    report(message, false)
}

function report(message, success) {
    const testResults = document.createElement("p");
    testResults.style = success ? "color: darkgreen" : "color: red"
    testResults.innerText = message;
    document.body.appendChild(testResults);

    if (success) {
        console.log(message);
    } else {
        console.error(message);
    }
}