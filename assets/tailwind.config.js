/*
 * Tailwind CSS 3.4.17, the same compiler https://cdn.tailwindcss.com serves.
 * The Play CDN is not loaded. python3 scripts/build_tailwind.py writes
 * assets/tailwind.css from the classes in the demonstration pages.
 *
 * Captured page config:
 * - Power Curve sets color primary to var(--viz-group-a). text-primary uses it.
 *   It also sets fontFamily.sans to Inter. That would change preflight on
 *   every page, so it stays a rule on that page only. body.demo-page still
 *   paints Arial.
 * - The ERP page sets darkMode to class and adds brand and eggplant.
 *   No dark:, brand-*, or eggplant utility is used, so those keys do not
 *   emit rules until a class needs them. darkMode is class so a later
 *   dark: utility follows the ERP page (html.dark), not the OS theme.
 */
const path = require("path");

const root = path.resolve(__dirname, "..");

module.exports = {
    content: [
        path.join(root, "statistics/**/*.html"),
        path.join(root, "neuroscience/**/*.html"),
        path.join(root, "personality_psychology/**/*.html"),
        path.join(root, "cognitive_psychology/**/*.html"),
    ],
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                primary: "var(--viz-group-a)",
                brand: {
                    50: "#eef2ff",
                    100: "#e0e7ff",
                    500: "#6366f1",
                    600: "#4f46e5",
                    700: "#4338ca",
                    900: "#312e81",
                },
                eggplant: "#2e1065",
            },
        },
    },
};
