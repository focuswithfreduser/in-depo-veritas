/** @type {import('prettier').Config & import('prettier-plugin-tailwindcss').PluginOptions} */
const config = {
  trailingComma: "all",
  singleQuote: false,
  endOfLine: "auto",
  plugins: ["prettier-plugin-tailwindcss"],
};

export default config;
