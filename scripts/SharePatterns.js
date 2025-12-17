class SharePatterns {
    shareIDs = [
        "patternPreview", "clearPreview", "editPreview", "copyPreview",
    ]

    constructor(parentSim) {
        this.simMananger = parentSim;
        this.patternPreview = this.simMananger.patternPreview;
        this.importPattern();
        this.previewPattern();
        this.exportPattern();
        console.log("share test");
    }

    selectPattern() {
        const PATTERN_LIST = {
            selectId: 'pattern-type',
            descId: 'pattern-desc',
            defaultValue: 'glider',
            types: {
                glider: {
                    label: "Glider",
                    desc: ""
                },
                gosperglider: {
                    label: "Gosper Glider",
                    desc: ""
                },
                blank: {
                    label: "Blank Template",
                    desc: ""
                },
            }
        };
        this.simMananger.setupDropdown(PATTERN_LIST, 'pattern-type');
    }

    async importPattern() {
        this.selectPattern();
        const patternName = document.getElementById("pattern-type").value;
        const patternPath = `./patterns/${patternName}.rle`
        const response = await fetch(patternPath);
        this.patternPreview.value = await response.text();

        const patternPreview = this.patternPreview;
        const fileInput = document.getElementById("fileInput");
        const nameInput = document.querySelector(".pattern-name");
        const formatSelect = document.querySelector(".pattern-format");

        fileInput.addEventListener("change", () => {
            const file = fileInput.files[0];
            if (!file) return;

            const reader = new FileReader();

            reader.onload = () => {
                patternPreview.value = reader.result;
                patternPreview.scrollTop = 0;
            };

            reader.readAsText(file);

            // ---- Infer name + format ----
            const fileName = file.name;
            const dot = fileName.lastIndexOf(".");
            const baseName = dot !== -1 ? fileName.slice(0, dot) : fileName;
            const ext = dot !== -1 ? fileName.slice(dot + 1).toLowerCase() : "";

            nameInput.value = baseName;

            if (ext === "cells") {
                formatSelect.value = "plaintext";
            } else if (ext === "rle") {
                formatSelect.value = "rle";
            }

            // allow re-uploading the same file
            fileInput.value = "";
        });
    }

    previewPattern() {
        this.simMananger.editPreview.addEventListener('click', () => {
            console.log("share edit");
            const editable = patternPreview.hasAttribute("readonly");
            const editBtn = this.simMananger.editPreview;
            if (editable) {
                patternPreview.removeAttribute("readonly");
                patternPreview.focus();

                editBtn.style.backgroundColor = "rgba(245, 69, 30, 1)";
                editBtn.style.color = "#fff";
            } else {
                patternPreview.setAttribute("readonly", "");

                editBtn.style.backgroundColor = "";
                editBtn.style.color = "";
            }
        });

        this.simMananger.copyPreview.addEventListener('click', () => {
            console.log("share copy");
            const text = this.patternPreview.value;
            if (!text) return;

            navigator.clipboard.writeText(text)
                .then(() => console.log("Pattern copied"))
                .catch(err => console.error("Copy failed:", err));
        });

        this.simMananger.clearPreview.addEventListener('click', () => {
            console.log("share clear");
            this.patternPreview.value = "";
        });

    }

    exportPattern() {
        const patternPreview = this.patternPreview;

        const nameInput = document.querySelector(".pattern-name");
        const formatSelect = document.querySelector(".pattern-format");
        const downloadBtn = document.getElementById("download");

        function downloadPattern() {
            const content = patternPreview.value;
            if (!content.trim()) return;

            const format = formatSelect.value; // "rle" | "plaintext"
            const ext = format === "plaintext" ? "cells" : "rle";

            const baseName = nameInput.value.trim() || "pattern";
            const fileName = `${baseName}.${ext}`;

            // Hook for future conversion logic
            const output =
                format === "plaintext"
                    ? toPlaintext(content)
                    : toRLE(content);

            const blob = new Blob([output], { type: "text/plain" });
            const url = URL.createObjectURL(blob);

            const a = document.createElement("a");
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();

            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }

        // Placeholder converters (replace later if needed)
        function toRLE(text) {
            return text;
        }

        function toPlaintext(text) {
            return text;
        }

        downloadBtn.addEventListener("click", downloadPattern);

    }

    async loadExample(patternName) {
        const response = await fetch(`./patterns/${patternName}`);
        if (!response.ok) throw new Error('File not found');

        const exampleConfig = await response.json();
        this.loadState(exampleConfig);
    }
}

export {SharePatterns};