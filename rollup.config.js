import { terser } from "rollup-plugin-terser";

const plugins = [];
const minifyPlugins = [
  terser({
    compress: true,
    nameCache: {
      vars: {},
      props: {
        props: {
          $_updated: "a",
          $_references: "b",
          $_listeners: "c",
          $_update: "d",
          $_dependencies: "e",
          $_dependents: "f",
          $_registerDependent: "g",
          $_unregisterDependent: "h",
        },
      },
    },
    mangle: {
      reserved: [],
      properties: {
        regex: /^_/,
      },
    },
  }),
];

export default [
  {
    input: "src/state.js",
    output: {
      file: "dist/dependable-state.esm.js",
      format: "esm",
    },
    plugins,
  },
  {
    input: "src/state.js",
    output: {
      file: "dist/dependable-state.esm.min.js",
      format: "esm",
    },
    plugins: plugins.concat(minifyPlugins),
  },
];
