class SharePatterns {
    static PATTERN_LIST = {
        selectId: "pattern-type",
        descId: "pattern-desc",
        defaultValue: "test",
        types: {
            test: { label: "Test", desc: "" },
            glider: { label: "Glider", desc: "" },
            gosperglidergun: { label: "Gosper Glider", desc: "" },
            blank: { label: "Blank Template", desc: "" },
        },
    };

    static TEST_FILE = `Test Comment
....................
....................
....................
......O.............
.....OOO............
......O.............
....................
....................
..........O.........
...........O........
.........OOO........
....................
....................
....................
....................
....................
....................
....................
....................
....................`;

    shareIDs = [
        "patternPreview",
        "clearPreview",
        "editPreview",
        "copyPreview",
        "fileInput",
        "download",
    ];

    constructor(parentSim) {
        this.simManager = parentSim;

        this.cacheDOM();
        this.init();
    }

    cacheDOM() {
        for (const id of this.shareIDs) {
            this[id] = document.getElementById(id);
        }

        this.patternSelect = document.getElementById("pattern-type");
        this.nameInput = document.querySelector(".pattern-name");
        this.formatSelect = document.querySelector(".pattern-format");
    }

    init() {
        this.setupPatternSelect();
        this.bindImport();
        this.bindPreviewControls();
        this.bindExport();
    }

    async setupPatternSelect() {
        this.simManager.setupDropdown(
            SharePatterns.PATTERN_LIST,
            SharePatterns.PATTERN_LIST.selectId
        );

        this.patternPreview.value = SharePatterns.TEST_FILE;
        await this.loadPreview();

        this.patternSelect.addEventListener("change", () => this.loadPreview());
        this.formatSelect.addEventListener("change", () => this.loadPreview());
    }

    async loadPreview() {
        const name = this.patternSelect.value;
        if (!name) return;

        const filePath = `./patterns/${name}.${this.formatSelect.value}`;

        try {
            const res = await fetch(filePath);
            if (!res.ok) throw new Error();

            this.patternPreview.value = await res.text();
            this.patternPreview.scrollTop = 0;
            this.nameInput.value = name;
        } catch {
            this.patternPreview.value = `Failed to load pattern: ${filePath}`;
        }
    }

    bindImport() {
        this.fileInput.addEventListener("change", () => {
            const file = this.fileInput.files?.[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = () => {
                this.patternPreview.value = reader.result;
                this.patternPreview.scrollTop = 0;
            };

            reader.readAsText(file);
            this.inferNameAndFormat(file.name);

            // allow re-uploading same file
            this.fileInput.value = "";
        });
    }

    inferNameAndFormat(fileName) {
        const dot = fileName.lastIndexOf(".");
        const base = dot === -1 ? fileName : fileName.slice(0, dot);
        const ext = dot === -1 ? "" : fileName.slice(dot + 1).toLowerCase();

        this.nameInput.value = base;
        this.patternSelect.value = "";
        this.formatSelect.value = ext;
    }

    bindPreviewControls() {
        this.editPreview.addEventListener("click", () => {
            const isReadonly = this.patternPreview.hasAttribute("readonly");

            this.patternPreview.toggleAttribute("readonly", !isReadonly);
            if (isReadonly) this.patternPreview.focus();

            this.editPreview.style.backgroundColor = isReadonly
                ? "rgba(245, 69, 30, 1)": "";
            this.editPreview.style.color = isReadonly ? "#fff" : "";
        });

        this.copyPreview.addEventListener("click", async () => {
            const text = this.patternPreview.value;
            if (!text) return;

            try {
                await navigator.clipboard.writeText(text);
            } catch (err) {
                console.error("Copy failed:", err);
            }
        });

        this.clearPreview.addEventListener("click", () => {
            this.patternPreview.value = "";
        });
    }

    bindExport() {
        this.download.addEventListener("click", () => {
            const content = this.patternPreview.value.trim();
            if (!content) return;

            const format = this.formatSelect.value;
            const ext = format;
            const baseName = this.nameInput.value.trim() || "pattern";
            const fileName = `${baseName}.${ext}`;

            const output =
                format === "cells"
                    ? this.toPlaintext(content)
                    : this.toRLE(content);

            this.downloadFile(output, fileName);
        });
    }

    downloadFile(text, fileName) {
        const blob = new Blob([text], { type: "text/plain" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();

        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    toRLE(text) {
        return text;
    }

    toPlaintext(text) {
        return text;
    }

    updatePreview(newText) {
        this.patternPreview.value = newText;
    }

    getPreview() {
        // console.log(this.patternPreview.value);
        return this.patternPreview.value;
    }
}

export {SharePatterns};