class SharePatterns {
    static PATTERN_LIST = { };

    static FORMAT_LIST = {
        selectId: "format-type",
        descId: "format-desc",
        defaultValue: "cells",
        types: {
            rle:   { label: "rle", desc: "" },
            cells: { label: "cells", desc: "" },
        }
    };

    shareIDs = [
        "patternPreview", "fileInput", "downloadFile",
        "clearPreview", "editPreview", "copyPreview",
        "library", "openLibrary", "closeLibrary",
        "searchLibrary", "tableBody"
    ];

    constructor(parentSim) {
        this.simManager = parentSim;
        this.pendingPattern = null; // 🔑 queue
        this.cacheDOM();
        this.ready = this.init();
    }

    cacheDOM() {
        for (const id of this.shareIDs) {
            this[id] = document.getElementById(id);
        }

        this.nameInput    = document.querySelector(".pattern-name");
        this.formatSelect = document.getElementById("format-type");

    }

    async init() {
        this.simManager.setupDropdown(
            SharePatterns.FORMAT_LIST,
            SharePatterns.FORMAT_LIST.selectId
        );

        await this.loadPatternList();

        this.bindImport();
        this.bindPreviewControls();
        this.bindExport();
        this.buildPatternTable();

        this.formatSelect.addEventListener("change", () => {
            this.simManager.wasm_engine.change_format(this.formatSelect.value);
            this.updatePreview("");
        });

        this.openLibrary.addEventListener("click", () => {
            this.library.classList.remove("hidden");
            this.searchLibrary.value = "";
            this.searchLibrary.focus();
            this.filterPatterns("");
        });

        this.closeLibrary.addEventListener("click", () => {
            this.closeLibraryBox();
        });

        this.searchLibrary.addEventListener("input", e => {
            this.filterPatterns(e.target.value);
        });

        // bootstrap default
        this.inferNameAndFormat("base.cells")
        await this.loadPreview();
    }

    async loadPatternList() {
        const res = await fetch("./patterns/patterns.json");
        if (!res.ok) throw new Error("Failed to load patterns.json");
        SharePatterns.PATTERN_LIST = await res.json();
    }

    async loadPreview() {
        const name = this.nameInput.value.trim();
        if (!name) return;

        const meta = SharePatterns.PATTERN_LIST[name];
        let format = this.formatSelect.value;

        if (meta && !meta.format.includes(format)) {
            format = meta.format[0];
            this.formatSelect.value = format;
        }

        const filePath = `./patterns/${name}.${format}`;

        try {
            const res = await fetch(filePath);
            if (!res.ok) throw new Error();

            const text = await res.text();
            this.updatePreview(text);

            // queue for sim
            this.pendingPattern = { text, format };

        } catch {
            this.updatePreview("");
            console.warn("Pattern file missing:", filePath);
        }
    }

    async selectPattern(name) {
        this.nameInput.value = name;
        this.formatSelect.value =
            SharePatterns.PATTERN_LIST[name].format[0];

        await this.loadPreview();
        this.closeLibraryBox();
    }

    bindImport() {
        this.fileInput.addEventListener("change", () => {
            const file = this.fileInput.files?.[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = () => {
                this.patternPreview.value = reader.result;
                this.patternPreview.scrollTop = 0;

                this.pendingPattern = {
                    text: reader.result,
                    format: this.formatSelect.value
                };
            };

            reader.readAsText(file);
            this.inferNameAndFormat(file.name);
            this.fileInput.value = "";
        });
    }

    inferNameAndFormat(fileName) {
        const dot = fileName.lastIndexOf(".");
        this.nameInput.value =
            dot === -1 ? fileName : fileName.slice(0, dot);
        this.formatSelect.value =
            dot === -1 ? "cells" : fileName.slice(dot + 1);
    }

    bindPreviewControls() {
        this.editPreview.addEventListener("click", () => {
            const ro = this.patternPreview.hasAttribute("readonly");
            this.patternPreview.toggleAttribute("readonly", !ro);
            if (ro) this.patternPreview.focus();
        });

        this.copyPreview.addEventListener("click", async () => {
            if (this.patternPreview.value) {
                await navigator.clipboard.writeText(
                    this.patternPreview.value
                );
            }
        });

        this.clearPreview.addEventListener("click", () => {
            this.patternPreview.value = "";
        });
    }

    bindExport() {
        this.downloadFile.addEventListener("click", () => {
            const content = this.patternPreview.value.trim();
            if (!content) return;
            this.downloadFile(content, this.getPatternName());
        });
    }

    getPatternName() {
        return `${this.nameInput.value.trim() || "pattern"}.${this.formatSelect.value}`;
    }

    downloadFile(text, fileName) {
        const blob = new Blob([text], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.downloadFile = fileName;
        a.click();
        URL.revokeObjectURL(url);
    }

    buildPatternTable() {
        this.tableBody.innerHTML = "";
        Object.entries(SharePatterns.PATTERN_LIST).forEach(
            ([key, meta]) => {
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td>${meta.label ?? key}</td>
                    <td>${meta.format.join(", ")}</td>
                    <td>${meta.lines ?? "-"}</td>
                `;
                tr.onclick = () => this.selectPattern(key);
                this.tableBody.appendChild(tr);
            }
        );
    }

    filterPatterns(q) {
        q = q.toLowerCase();
        [...this.tableBody.children].forEach(row => {
            row.style.display =
                row.textContent.toLowerCase().includes(q)
                    ? ""
                    : "none";
        });
    }

    closeLibraryBox() {
        this.library.classList.add("hidden");
    }

    updatePreview(text) {
        this.patternPreview.value = text;
    }

    getPreview() {
        return this.patternPreview.value;
    }

}

export { SharePatterns };
