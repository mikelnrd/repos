# Repos - An app to list github public repositories

Check out the app here: [https://eloquent-minsky-1735ac.netlify.app/](https://eloquent-minsky-1735ac.netlify.app/)

## About

This application presents a simple form on the home page where a visitor can search the public git repositories listed on GitHub that belong to either an individual or an entire organization.

The visitor is taken to a separate page where the list of repositories appears. This page is paginated and the list can be sorted or filtered. For instance, the repository list can be sorted by name or create date, and can be filtered to show only forks.

## Technical details

This application is written in javascript, html and css. The javascript can be run on a server - however in this instance the application is currently deployed as a static site using Netlify.

The javascript code is written to be environment-agnostic. By this I mean that it can be run in the page itself, on a remote server, or inside a service worker. In this case it is running in a service worker - an approach I've been experimenting with recently. I thought it would be a fun challenge for this coding task!

### What is a service worker?

A service-worker is an exciting and relatively new feature of the modern web platform that's now available on all modern browsers. If you haven't come across this feature before, think of it as a node.js server that you can install and run *inside* the user's own browser. A bit like a middleman, a service worker intercepts any request the page makes before that request hits the network. You can write javascript that runs in this service worker and responds to requests for pages, just like a server would. The exciting difference is that this script isn't running far away from the user on some remote server - rather it is running inside their local browser. This makes page transitions very quick and gives the user a 'web app' experience.

### How does the service worker work for this application?

In this application, when you visit the home page the service worker is installed automatically. There is no javascript running in the page itself as would normally happen - instead the page is just html and css and the html forms used on the page submit submit their data to the server. The service worker intercepts this submitted form before it travels to the server, fetches the requested data from the Github REST API, and then passes this data to an html template before sending the resulting html back to the page to be shown to the user. This all happens without the latency of travelling to and back from the server.

### What other architectures did you consider?

I considered running the javascript templates on the server in node.js instead of in the service worker. However as these approaches are quite similar I opted to demo the more interesting service-worker approach. In a real-world production application both approaches could be used, with the html templates shared between the service worker and the backend server.

Another approach I am fond of is to write a web component using a library such as Google's [Lit](https://lit.dev/). This approach would essentially install a custom html tag into the browser that looks something like this: 

```html
<public-repositories org="google" type="forks" sort="asc" page="2">
    <!-- contents are rendered by javascript based on the given attributes and update if the attributes change -->
</public-repositories>
```

This approach is great for adding functionality to an existing marketing website, and is easy for non-developers to use from html without the need to touch javascript. The only downside is that it needs the page's javascript to run first, which can slow down initial page load and potentially affect SEO. I am eagerly awaiting the new server-side rendering functionality that the [Lit](https://lit.dev/) developers are currently working on. I think this could be a great competitor to Facebook's React framework.

### How does the application work with the Github api?

The application is using Github's RESTful api [https://docs.github.com/en/rest](https://docs.github.com/en/rest) to list repositories. The `/users/[username]/repos` and `/orgs/[organization]/repos` endpoints are used for listing user and organization repositories respectively.

I have added in some error handling to demonstrate how this would work in a production application but have not fully implemented this. 

### How is the code tested?

I have created a test page [test.html](https://eloquent-minsky-1735ac.netlify.app/lib/test.html)   to perform several queries against the Github api endpoints and to test the page's html is rendered as expected. Click through to the testing page for more information.

### How does the css work?

There's a single `global.css` file where I have added just a few css styles for layout and (very) basic design. I have focused more on the functionality of the application in order to demonstrate frontend/backend javascript skills.

### How is the code organised?

The javascript code is split into several files. These can run directly in the browser using javascript module loading during development. They are bundled into a single file `service-worker.js` for deployment.


## Steps to run locally

```sh
# Simply serve the public folder with any static http server such as this python oneliner:
python3 -m http.server --dir public
```

## Steps to develop

```sh
# install nodejs dependencies (used only for build not at runtime)
npm install
# run rollup to bundle the javascript modules that make up service-worker.js
npx rollup -c rollup.config.js
# serve the newly updated files
python3 -m http.server --dir public
```