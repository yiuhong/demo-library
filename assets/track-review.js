/*
 * Ten-question review for a Guided Track other than Shape and pictures.
 * The questions, the score, the review, Try again, and the completion
 * card follow statistics/shape_and_pictures_review.html. That page does
 * not load this file. Nothing about the attempt is stored. A high score
 * can download a PDF; that file is the only record.
 */
(function (root) {
    function start(config) {
        var QUESTIONS = config.questions;
        var TRACK = config.trackTitle;
        var PDF_NAME = config.filename;

        /*
         * selections, cursor, and finished are the attempt.
         * Teach only hides #review. The slot and its sizers stay,
         * so the page length does not change, and the questions
         * stay hidden. This script does not read viz-teach, and
         * it does not clear the attempt when the mode changes.
         * Try again is the reset. Nothing is stored. A high score
         * can download a PDF; that file is the only record.
         */

        var LAST = QUESTIONS.length - 1;
        var SCORE = QUESTIONS.length;
        var REVIEW = QUESTIONS.length + 1;
        var PASS = 8;
        var MONTHS = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];
        var selections = QUESTIONS.map(function () { return null; });
        var cursor = 0;
        var finished = false;
        var attemptWhen = null;
        var pdfBusy = false;
        var review = document.getElementById("review");
        var slot = document.getElementById("review-slot");

        function formatDate(date) {
            return date.getDate() + " " + MONTHS[date.getMonth()] + " " + date.getFullYear();
        }

        function attemptDateText() {
            if (!attemptWhen) attemptWhen = new Date();
            return formatDate(attemptWhen);
        }

        function el(name, attrs) {
            var node = document.createElement(name);
            if (!attrs) return node;
            Object.keys(attrs).forEach(function (key) {
                if (key === "class") node.className = attrs[key];
                else node.setAttribute(key, attrs[key]);
            });
            return node;
        }

        function addText(parent, tag, className, text) {
            var node = el(tag, className ? { "class": className } : null);
            node.textContent = text;
            parent.appendChild(node);
            return node;
        }

        function allAnswered() {
            var i;
            for (i = 0; i < selections.length; i++) {
                if (selections[i] == null) return false;
            }
            return true;
        }

        function score() {
            var n = 0;
            var i;
            for (i = 0; i < QUESTIONS.length; i++) {
                if (selections[i] === QUESTIONS[i].answer) n += 1;
            }
            return n;
        }

        function scoreText() {
            return score() + " out of 10";
        }

        /*
         * The four demonstrations are the sections. Each line is
         * that demonstration's count correct over its questions.
         */
        function sectionGroups() {
            var groups = [];
            var byTitle = {};
            var i;
            for (i = 0; i < QUESTIONS.length; i++) {
                var title = QUESTIONS[i].demoTitle;
                if (!byTitle[title]) {
                    byTitle[title] = { title: title, indexes: [] };
                    groups.push(byTitle[title]);
                }
                byTitle[title].indexes.push(i);
            }
            return groups;
        }

        function sectionLines() {
            var groups = sectionGroups();
            var lines = [];
            var i;
            for (i = 0; i < groups.length; i++) {
                var correct = 0;
                var j;
                var indexes = groups[i].indexes;
                for (j = 0; j < indexes.length; j++) {
                    var index = indexes[j];
                    if (selections[index] === QUESTIONS[index].answer) correct += 1;
                }
                lines.push(groups[i].title + ": " + correct + "/" + indexes.length);
            }
            return lines;
        }

        function answerBlock(kind, label, text) {
            var block = el("div", { "class": "answer-block is-" + kind });
            addText(block, "span", "k", label);
            addText(block, "span", "answer-text", text);
            return block;
        }

        function widestSectionLines() {
            return sectionGroups().map(function (group) {
                var count = group.indexes.length;
                return group.title + ": " + count + "/" + count;
            });
        }

        function maxCursor() {
            return finished ? REVIEW + LAST : LAST;
        }

        function canForward() {
            if (cursor < LAST) return selections[cursor] != null;
            if (cursor === LAST) return allAnswered();
            return finished && cursor < REVIEW + LAST;
        }

        function withEmbed(href) {
            if (!/[?&]embed=shell(?:&|$)/.test(location.search)) return href;
            return href + (href.indexOf("?") === -1 ? "?" : "&") + "embed=shell";
        }

        function button(action, label, primary) {
            var node = el("button", {
                type: "button",
                "class": primary ? "demo-btn demo-btn-primary" : "demo-btn",
                "data-action": action
            });
            node.textContent = label;
            return node;
        }

        /*
         * Try again shows on the score and on the last review
         * item (Review 10 of 10). Earlier review items and the
         * questions do not show it. The button stays in the bar
         * either way, so Previous and Next do not move.
         */
        function tryAgainHere() {
            return cursor === SCORE || cursor === REVIEW + LAST;
        }

        function navBar(nextLabel) {
            var bar = el("div", { "class": "nav" });
            bar.appendChild(button("prev", "Previous", false));
            bar.appendChild(button("next", nextLabel, true));
            bar.appendChild(button("again", "Try again", false));
            return bar;
        }

        function mount(parent, nextLabel, fill) {
            var body = el("div", { "class": "review-body" });
            fill(body);
            parent.appendChild(body);
            parent.appendChild(navBar(nextLabel));
        }

        function stepHeading(parent, text, live) {
            var node = addText(parent, "h2", "step-kicker", text);
            if (!live) return node;
            node.id = "review-heading";
            node.tabIndex = -1;
            return node;
        }

        function fillQuiz(parent, index, hintText, live) {
            mount(parent, index === LAST ? "Score" : "Next", function (body) {
                var item = QUESTIONS[index];
                stepHeading(body, "Question " + (index + 1) + " of 10", live);
                var field = el("fieldset", { "class": "ask" });
                var legend = el("legend");
                legend.textContent = item.stem;
                field.appendChild(legend);
                item.choices.forEach(function (choice, choiceIndex) {
                    var label = el("label", { "class": "choice" });
                    var input = el("input", {
                        type: "radio",
                        name: live ? "track-review-answer" : "track-review-sizer-" + index,
                        value: String(choiceIndex)
                    });
                    if (live && selections[index] === choiceIndex) {
                        input.checked = true;
                        label.classList.add("is-selected");
                    }
                    var text = el("span", { "class": "choice-text" });
                    text.textContent = choice;
                    label.appendChild(input);
                    label.appendChild(text);
                    field.appendChild(label);
                });
                body.appendChild(field);
                var hint = addText(body, "p", "hint", hintText);
                hint.setAttribute("data-role", "hint");
                if (!hintText) hint.hidden = true;
            });
        }

        function completionCard(n, dateText, live) {
            var card = el("article", { "class": "complete-card" });
            addText(card, "p", "complete-kicker", "Project Viz");
            addText(card, "h3", "complete-title", "Well done!");
            addText(card, "p", "complete-finish", "You have finished the track:");
            addText(card, "p", "complete-track", TRACK);
            addText(card, "p", "complete-date", dateText);
            var row = el("div", { "class": "complete-score-row" });
            var scoreLine = el("p", { "class": "complete-score" });
            var number = el("span", { "class": "complete-score-n" });
            number.textContent = String(n);
            var ofTen = el("span", { "class": "complete-score-of" });
            ofTen.textContent = "/10";
            scoreLine.appendChild(number);
            scoreLine.appendChild(ofTen);
            if (live) scoreLine.setAttribute("aria-live", "polite");
            row.appendChild(scoreLine);
            var stamp = el("div", { "class": "complete-seal" });
            addText(stamp, "span", "complete-seal-word", "Complete");
            row.appendChild(stamp);
            card.appendChild(row);
            var download = el("button", {
                type: "button",
                "class": "complete-download",
                "data-action": "pdf"
            });
            download.textContent = "Download as PDF";
            card.appendChild(download);
            return card;
        }

        /*
         * Eight or more shows the card. Seven or fewer keeps the
         * score line and adds one sentence. The sizer always uses
         * the card, with the longest date, so the reserved height
         * covers that sheet.
         */
        function fillScore(parent, lines, live) {
            var n = live ? score() : 10;
            mount(parent, "Next", function (body) {
                stepHeading(body, "Score", live);
                if (n >= PASS) {
                    body.appendChild(completionCard(
                        n,
                        live ? attemptDateText() : "30 September 2026",
                        live
                    ));
                } else {
                    var number = addText(body, "p", "score", n + " out of 10");
                    if (live) number.setAttribute("aria-live", "polite");
                    addText(body, "p", "score-encourage", "A good start. Review the answers, then try again.");
                }
                addText(body, "h3", "section-heading", "Breakdown");
                var i;
                for (i = 0; i < lines.length; i++) {
                    addText(body, "p", "section-line", lines[i]);
                }
                addText(body, "p", "score-note", "Next reviews the answers.");
            });
        }

        function fillReview(parent, index, picked, live) {
            mount(parent, "Next", function (body) {
                var item = QUESTIONS[index];
                stepHeading(body, "Review " + (index + 1) + " of 10", live);
                addText(body, "p", "score-line", "Score: " + (live ? scoreText() : "10 out of 10"));
                addText(body, "p", "review-stem", item.stem);
                if (picked === item.answer) {
                    body.appendChild(answerBlock("correct", "YOUR ANSWER IS CORRECT", item.choices[picked]));
                } else {
                    body.appendChild(answerBlock(
                        "incorrect",
                        "YOUR ANSWER IS INCORRECT",
                        picked == null ? "No answer selected." : item.choices[picked]
                    ));
                    body.appendChild(answerBlock("correct", "Correct answer", item.choices[item.answer]));
                }
                var source = el("p", { "class": "source" });
                source.appendChild(document.createTextNode("Demonstration: "));
                var link = el("a", { href: live ? withEmbed(item.demo) : item.demo });
                link.textContent = item.demoTitle;
                if (!live) link.tabIndex = -1;
                source.appendChild(link);
                body.appendChild(source);
            });
        }

        function addSizer(kind, index, picked, hintText) {
            var node = el("div", {
                "class": "review review-sizer demo-card",
                "aria-hidden": "true"
            });
            node.inert = true;
            if (kind === "quiz") fillQuiz(node, index, hintText, false);
            else if (kind === "score") fillScore(node, widestSectionLines(), false);
            else fillReview(node, index, picked, false);
            var controls = node.querySelectorAll("button, input, a");
            var i;
            for (i = 0; i < controls.length; i++) {
                controls[i].tabIndex = -1;
                if (controls[i].tagName !== "A") controls[i].disabled = true;
            }
            slot.appendChild(node);
        }

        /*
         * One sizer for each question, each wrong-answer review
         * (the correct answer and the demonstration link), and the
         * score. The last question's sizer includes the line that
         * can show when that answer is in and earlier ones are not.
         * Other questions do not reserve a line under the choices.
         * Every sizer includes the three-slot action bar, so the
         * reserved height covers Try again on the score and on the
         * last item, and the completion card on the score. The slot
         * is as tall as the tallest of these.
         */
        function buildSizers() {
            var q;
            var i;
            for (q = 0; q < QUESTIONS.length; q++) {
                addSizer(
                    "quiz",
                    q,
                    null,
                    q === LAST ? "Answer all ten questions to see the score." : ""
                );
                for (i = 0; i < QUESTIONS[q].choices.length; i++) {
                    if (i === QUESTIONS[q].answer) continue;
                    addSizer("review", q, i, "");
                }
            }
            addSizer("score", 0, null, "");
        }

        function syncChrome() {
            var prev = review.querySelector("[data-action='prev']");
            var next = review.querySelector("[data-action='next']");
            var again = review.querySelector("[data-action='again']");
            if (prev) prev.disabled = cursor === 0;
            if (next) next.disabled = !canForward();
            if (again) {
                var showAgain = tryAgainHere();
                again.classList.toggle("is-reserved", !showAgain);
                again.disabled = !showAgain;
                again.setAttribute("aria-hidden", showAgain ? "false" : "true");
            }
            if (cursor > LAST) return;
            var hint = review.querySelector("[data-role='hint']");
            var message = "";
            if (cursor === LAST && selections[cursor] != null && !allAnswered()) {
                message = "Answer all ten questions to see the score.";
            }
            if (hint) {
                hint.hidden = !message;
                hint.textContent = message;
            }
        }

        function paintSelected() {
            var labels = review.querySelectorAll(".choice");
            var i;
            for (i = 0; i < labels.length; i++) {
                var input = labels[i].querySelector("input");
                var on = Number(input.value) === selections[cursor];
                input.checked = on;
                labels[i].classList.toggle("is-selected", on);
            }
        }

        function render(moveFocus) {
            while (review.firstChild) review.removeChild(review.firstChild);
            if (cursor < SCORE) fillQuiz(review, cursor, "", true);
            else if (cursor === SCORE) fillScore(review, sectionLines(), true);
            else fillReview(review, cursor - REVIEW, selections[cursor - REVIEW], true);
            syncChrome();
            if (!moveFocus) return;
            var heading = document.getElementById("review-heading");
            if (heading) heading.focus();
        }

        function go(delta) {
            if (delta > 0 && !canForward()) return;
            var next = cursor + delta;
            if (next < 0) return;
            if (cursor === LAST && next === SCORE && allAnswered()) {
                finished = true;
                if (!attemptWhen) attemptWhen = new Date();
            }
            if (next > maxCursor()) return;
            cursor = next;
            render(true);
        }

        review.addEventListener("change", function (event) {
            var input = event.target;
            if (!input || input.name !== "track-review-answer") return;
            if (cursor > LAST) return;
            var value = Number(input.value);
            if (value !== value || value < 0 || value >= QUESTIONS[cursor].choices.length) return;
            selections[cursor] = value;
            paintSelected();
            syncChrome();
        });

        review.addEventListener("click", function (event) {
            var target = event.target;
            var control = target && target.closest ? target.closest("[data-action]") : null;
            if (!control || !review.contains(control)) return;
            var action = control.getAttribute("data-action");
            if (action === "prev") go(-1);
            else if (action === "next") go(1);
            else if (action === "again") {
                selections = QUESTIONS.map(function () { return null; });
                finished = false;
                attemptWhen = null;
                pdfBusy = false;
                cursor = 0;
                render(true);
            } else if (action === "pdf") downloadCompletion();
        });

        function downloadCompletion() {
            if (pdfBusy || cursor !== SCORE || score() < PASS) return;
            var pdf = window.ShapeCompletePdf;
            var button = review.querySelector("[data-action='pdf']");
            if (!pdf || !button) return;
            var info = { date: attemptDateText(), score: score(), track: TRACK };
            function write(fonts) {
                pdf.save(pdf.build(info, fonts), PDF_NAME);
            }
            var ready = pdf.ready();
            if (ready) {
                try {
                    write(ready);
                } catch (error) {
                    button.textContent = "Could not make the PDF";
                }
                return;
            }
            pdfBusy = true;
            button.disabled = true;
            pdf.load().then(function (fonts) {
                write(fonts);
                button.disabled = false;
                button.textContent = "Download as PDF";
                pdfBusy = false;
            }).catch(function () {
                button.disabled = false;
                button.textContent = "Could not make the PDF";
                pdfBusy = false;
            });
        }

        buildSizers();
        render(false);
        if (window.ShapeCompletePdf) window.ShapeCompletePdf.load();

    }
    root.TrackReview = { start: start };
})(typeof window !== "undefined" ? window : this);
