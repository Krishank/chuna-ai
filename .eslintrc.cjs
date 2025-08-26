/* eslint-env node */
/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  env: { es2022: true, node: true },
  parser: "@typescript-eslint/parser",
  parserOptions: { sourceType: "module", ecmaVersion: "latest" },
  plugins: ["@typescript-eslint", "import", "n", "promise"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:import/recommended",
    "plugin:n/recommended",
    "plugin:promise/recommended",
    "prettier"
  ],
  settings: {
    "import/resolver": {
      typescript: true
    }
  },
  ignorePatterns: ["dist", "node_modules"],
  rules: {
    "import/order": [
      "warn",
      {
        "alphabetize": { order: "asc", caseInsensitive: true },
        "newlines-between": "always"
      }
    ]
  }
};

