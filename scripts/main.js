import { SimulatorController } from './SimControl.js';

/* ------------------ MOBILE DETECTION ------------------ */
function isMobileBrowser() {
    return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|Mobile/i.test(
        navigator.userAgent
    );
}

// THEME HANDLING
function switchThemes() {
    const themeToggle = document.getElementById('themeToggle');
    const themeIcon = document.getElementById('themeIcon');

    const currentTheme = localStorage.getItem('theme') || 'dark';

    if (currentTheme === 'light') {
        document.body.classList.add('light');
        themeIcon.classList.remove('bi-moon-fill');
        themeIcon.classList.add('bi-sun-fill');
    }

    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('light');

        if (document.body.classList.contains('light')) {
            themeIcon.classList.remove('bi-moon-fill');
            themeIcon.classList.add('bi-sun-fill');
            localStorage.setItem('theme', 'light');
        } else {
            themeIcon.classList.remove('bi-sun-fill');
            themeIcon.classList.add('bi-moon-fill');
            localStorage.setItem('theme', 'dark');
        }
    });

    if (currentTheme === 'dark') {
        themeIcon.classList.remove('bi-sun-fill');
        themeIcon.classList.add('bi-moon-fill');
    }
}

// SIMULATOR INITIALISATION
const mobile = isMobileBrowser();

let simulator = new SimulatorController();
simulator.docIDs.push("themeIcon", "themeToggle");

let useWebGL = true;

// Popup ONLY on real mobile browsers
if (mobile) {
    useWebGL = confirm(
        "WebGL on mobile devices may cause performance or stability issues.\n\n" +
        "Do you want to continue using WebGL or switch to Canvas2d?"
    );
}

const success = simulator.initSim(useWebGL);

// Optional: inform mobile users if fallback occurred
if (mobile && useWebGL && !success) {
    alert(
        "WebGL could not be initialized on this device.\n\n" +
        "The simulator is now using Canvas2D."
    );
}

switchThemes();

// Sync checkbox with actual renderer
const rendererToggle = document.getElementById("useWebgl");
if (rendererToggle) {
    rendererToggle.checked = simulator.rendererType === "webgl";
}


/* ------------------ RENDERER SWITCHING ------------------ */
window.switchRenderers = function () {
    const checkbox = document.getElementById("useWebgl");
    const requestedWebGL = checkbox.checked;

    // ⚠️ Warn ONLY on mobile when enabling WebGL
    if (mobile && requestedWebGL) {
        const proceed = confirm(
            "WebGL on mobile devices may cause performance or stability issues.\n\n" +
            "Do you want to continue?"
        );

        if (!proceed) {
            checkbox.checked = false;
            return;
        }
    }

    const confirmed = confirm(
        "Switch rendering mode?\n\nThis will restart the simulator."
    );

    if (!confirmed) {
        checkbox.checked = !requestedWebGL;
        return;
    }

    // Clean up old simulator
    try {
        simulator.delElements?.();
        simulator.destroy?.();
    } catch (err) {
        console.warn("Simulator cleanup error:", err);
    }

    simulator = new SimulatorController();
    simulator.docIDs.push("themeIcon", "themeToggle");

    const success = simulator.initSim(requestedWebGL);

    if (mobile && requestedWebGL && !success) {
        alert(
            "WebGL failed to initialize on this device.\n\n" +
            "Falling back to Canvas2D."
        );
    }

    switchThemes();

    // Sync checkbox with actual renderer
    checkbox.checked = simulator.rendererType === "webgl";
};
