class SharePatterns {
    static PATTERN_LIST = {
        selectId: "pattern-type",
        descId: "pattern-desc",
        defaultValue: null, // will be set after load
        types: {}
    };

    shareIDs = [
        "patternPreview", "fileInput", "download",
        "clearPreview", "editPreview", "copyPreview",
    ];

    constructor(parentSim) {
        this.simManager = parentSim;
        this.cacheDOM();
        this.ready = this.init(); // ← REQUIRED
    }

    cacheDOM() {
        for (const id of this.shareIDs) {
            this[id] = document.getElementById(id);
        }

        this.patternSelect = document.getElementById("pattern-type");
        this.nameInput = document.querySelector(".pattern-name");
        this.formatSelect = document.querySelector(".pattern-format");
    }

    async init() {
        await this.loadPatternList();
        await this.setupPatternSelect(); // ← must await
        this.bindImport();
        this.bindPreviewControls();
        this.bindExport();
    }

    async loadPatternList() {
        const res = await fetch("./patterns/patterns.json");
        if (!res.ok) {
            throw new Error("Failed to load patterns.json");
        }

        const data = await res.json();

        SharePatterns.PATTERN_LIST.types = data;

        // pick a safe default (prefer non-blank)
        const keys = Object.keys(data);
        SharePatterns.PATTERN_LIST.defaultValue =
            keys.find(k => k !== "blank") ?? keys[0];
    }

    async setupPatternSelect() {
        this.patternPreview.value = "";

        this.simManager.setupDropdown(
            SharePatterns.PATTERN_LIST,
            SharePatterns.PATTERN_LIST.selectId
        );

        await this.loadPreview();
        this.patternSelect.addEventListener("change", () => this.loadPreview());
        this.formatSelect.addEventListener("change", () => this.loadPreview());
    }

    async loadPreview() {
        const name = this.patternSelect.value;
        if (!name || name === "blank") {
            this.updatePreview("");
            return;
        }

        const filePath = `./patterns/${name}.${this.formatSelect.value}`;

        try {
            const res = await fetch(filePath);
            if (!res.ok) throw new Error();

            const text = await res.text();
            this.updatePreview(text);
            this.nameInput.value = name;
        } catch {
            this.updatePreview("");
            console.warn("Pattern file missing:", filePath);
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

    getPatternName() {
        const baseName = this.nameInput.value.trim() || "pattern";
        const ext = this.formatSelect.value;
        return`${baseName}.${ext}`
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

            const fileName = this.getPatternName();

            this.downloadFile(content, fileName);
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

    updatePreview(newText) {
        this.patternPreview.value = newText;
    }

    getPreview() {
        return this.patternPreview.value;
    }
}

export {SharePatterns};