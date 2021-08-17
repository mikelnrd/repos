import { OPTIONS, listRepositoriesURL, listRepositories } from "../api/repositories.js";

export default function (request) {
    const url = new URL(request.url);

    const options = {};
    for (const option of OPTIONS) {
        options[option] = url.searchParams.get(option);
    }
    
    const listRepositoriesPromise = listRepositories(listRepositoriesURL(options));

    return [options, listRepositoriesPromise]
}