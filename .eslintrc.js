module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: ["next", "prettier"],
  overrides: [
    {
      env: {
        node: true,
      },
      files: [".eslintrc.{js,cjs}"],
      parserOptions: {
        sourceType: "script",
      },
    },
  ],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  plugins: ["react"],
  rules: {
    "react/react-in-jsx-scope": "off",
    "react/jsx-uses-react": "off",
    // return type off:
    "@typescript-eslint/explicit-function-return-type": "off",
    // no unesaced:
    "react/no-unescaped-entities": "off",
  },
};
