import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    // "android" holds the Capacitor native project; it also receives a copy of
    // the built web app under app/src/main/assets/public.
    ignores: ["dist", ".venv", "node_modules", "app_connect_test", "android"],
  },
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
);
