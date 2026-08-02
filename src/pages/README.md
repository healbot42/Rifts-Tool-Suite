# Tool page modules

Each tool is isolated in its own directory. The suite-level navigation stays in `src/App.vue`; tool implementation code stays inside its feature directory.

To integrate generated code for a placeholder tool:

1. Replace the contents of its `components/*App.vue` component.
2. Put additional components, helpers, and data beneath the same feature directory.
3. Use relative imports within the feature.
4. Run `npm test` and `npm run build`.

The `index.js` and `*Page.vue` files form the stable interface to the suite and generally do not need to change. Placeholder tools are lazy-loaded, keeping their code out of the initial TW Calculator bundle.
