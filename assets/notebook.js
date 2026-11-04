/*
 * Notebook sheet. Home, Catalog, and Guided Tracks start with
 * class viz-notebook on <html>. This file only applies a preview:
 *   ?notebook=0  plain shell
 *   ?notebook=1  sheet on
 * Demonstration pages do not load this file.
 */
(function () {
    var root = document.documentElement;
    var flag = "";
    try {
        flag = (new URLSearchParams(window.location.search).get("notebook") || "").replace(/\s+/g, "").toLowerCase();
    } catch (err) {
        return;
    }
    if (flag === "0" || flag === "off" || flag === "false") root.classList.remove("viz-notebook");
    else if (flag === "1" || flag === "on" || flag === "true") root.classList.add("viz-notebook");
})();
