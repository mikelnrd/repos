import { html } from "../utils/litstream.js";
import { layout } from "./_partials.js";

export default function(data) {
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
    `

    return layout("GitHub Repo Explorer", template)
}