/*
 * Site-wide facts for the Teaching Materials Library.
 *
 * Bump version and updated here when the library changes in a way a
 * syllabus should record. cite.html, the library footer, and the demo
 * strip read this file. index.html and cite.html repeat the same
 * version and date as a no-JS fallback; update those when you bump this.
 * Record the change in CHANGELOG.md.
 */
(function (global) {
    var meta = {
        title: "Teaching Materials Library",
        titleApa: "Teaching materials library",
        author: "Yiu Hong Ko",
        authorApa: "Ko, Y. H.",
        authorBibtex: "Ko, Yiu Hong",
        email: "yiuhong.ko@gmail.com",
        orcid: "https://orcid.org/0000-0003-4436-0166",
        orcidId: "0000-0003-4436-0166",
        personalSite: "https://yiuhong.github.io/",
        url: "https://yiuhong.github.io/demo-library/",
        repo: "https://github.com/yiuhong/demo-library",
        issues: "https://github.com/yiuhong/demo-library/issues",
        changelog: "CHANGELOG.md",
        contributing: "CONTRIBUTING.md",
        version: "0.1.1",
        updated: "2026-10-29",
        updatedDisplay: "29 October 2026",
        updatedShort: "29 Oct 2026",
        year: "2026",
        contentLicense: "CC BY 4.0",
        contentLicenseUrl: "https://creativecommons.org/licenses/by/4.0/",
        codeLicense: "MIT",
        bibtexKey: "ko2026teachingmaterials"
    };

    meta.apaPlain = meta.authorApa + " (" + meta.year + "). " + meta.titleApa
        + " (Version " + meta.version + "). " + meta.url;

    meta.bibtex = [
        "@misc{" + meta.bibtexKey + ",",
        "  author  = {" + meta.authorBibtex + "},",
        "  title   = {{" + meta.title + "}},",
        "  year    = {" + meta.year + "},",
        "  version = {" + meta.version + "},",
        "  url     = {" + meta.url + "},",
        "  note    = {Version " + meta.version + ", last updated " + meta.updatedDisplay + "}",
        "}"
    ].join("\n");

    meta.credit = "From " + meta.title + " by " + meta.author + " (" + meta.url
        + "). Content licensed under " + meta.contentLicense + ".";

    // Short per-demo line: catalog title, library name, version, demo URL.
    meta.demoCitation = function (title, href) {
        var path = String(href || "").replace(/^\/+/, "");
        return title + ". " + meta.title + " (Version " + meta.version + "). " + meta.url + path;
    };

    global.DEMO_LIBRARY = meta;
})(typeof window !== "undefined" ? window : globalThis);
