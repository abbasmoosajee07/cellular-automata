class SharePatterns {
    shareIDs = [
        "patternPreview", "clearPreview", "editPreview", "copyPreview",
        "fileInput", "download",
    ]

    constructor(parentSim) {
        this.simManager = parentSim;
        this.patternPreview = document.getElementById("patternPreview");

        // cache DOM
        for (const id of this.shareIDs) {
            this[id] = document.getElementById(id);
        }
        this.patternSelect = document.getElementById("pattern-type");

        this.nameInput = document.querySelector(".pattern-name");
        this.formatSelect = document.querySelector(".pattern-format");

        this.init();
    }

    init() {
        this.setupPatternSelect();
        this.bindImport();
        this.bindPreviewControls();
        this.bindExport();
    }

    async setupPatternSelect() {
        const PATTERN_LIST = {
            selectId: "pattern-type",
            descId: "pattern-desc",
            defaultValue: "glider",
            types: {
                glider: { label: "Glider", desc: "" },
                gosperglidergun: { label: "Gosper Glider", desc: "" },
                blank: { label: "Blank Template", desc: "" },
            }
        };

        this.simManager.setupDropdown(PATTERN_LIST, "pattern-type");

        const loadPreview = async () => {
            const name = this.patternSelect.value;
            const fileName = `./patterns/${name}.${this.formatSelect.value}`
            if (!name) return;

            try {
                const res = await fetch(fileName);
                if (!res.ok) throw new Error();
                this.patternPreview.value = await res.text();
                this.patternPreview.scrollTop = 0;
                this.nameInput.value = name;
            } catch {
                this.patternPreview.value = `Failed to load pattern: ${fileName}`;
            }
        };

        await loadPreview();
        this.patternSelect.addEventListener("change", loadPreview);
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
}

export {SharePatterns};