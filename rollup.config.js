import nodeResolve from "rollup-plugin-node-resolve";

// import replace from "@rollup/plugin-replace";
// import { terser } from "rollup-plugin-terser";

/** @type {import('rollup').RollupOptions} */
const config = [
  {
    plugins: [
      nodeResolve({
        // If true, inspect resolved files to check that they are ES2015 modules
        modulesOnly: true, // Default: false
        dedupe: [], // Default: [] // Eg ["react", "react-dom"]
      }),
    ],
    input: "./public/service-worker.mjs",
    output: {
      file: "./public/service-worker.js",
      format: "iife",
      sourcemap: false,
    },
  },
];

export default config;