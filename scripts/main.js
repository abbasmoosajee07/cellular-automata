import { SimulatorController } from './SimControl.js';

/* ------------------ MOBILE DETECTION ------------------ */
function isMobileBrowser() {
    return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|Mobile/i.test(navigator.userAgent);
}


/* ------------------ THEME HANDLING ------------------ */
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


/* ------------------ SIMULATOR INITIALISATION ------------------ */
const mobile = isMobileBrowser();
const initialUseWebGL = !mobile;   // force Canvas2D on mobile

let simulator = new SimulatorController();
simulator.docIDs.push("themeIcon", "themeToggle");
simulator.initSim(initialUseWebGL);
switchThemes();

// Sync toggle checkbox with forced renderer mode
const rendererToggle = document.getElementById("useWebgl");
if (rendererToggle) rendererToggle.checked = initialUseWebGL;


/* ------------------ RENDERER SWITCHING ------------------ */
window.switchRenderers = function () {
    const checkbox = document.getElementById("useWebgl");
    let useWebgl = checkbox.checked;

    // Force Canvas2D on mobile
    if (mobile) {
        alert("WebGL rendering is disabled on mobile. Using Canvas2D instead.");
        useWebgl = false;
        checkbox.checked = false;
    }

    const confirmed = confirm("Switch rendering mode? This will restart the simulator.");
    if (!confirmed) {
        checkbox.checked = !useWebgl;
        return;
    }

    // Clean up old simulator
    try {
        if (simulator?.delElements) simulator.delElements();
        if (simulator?.destroy) simulator.destroy();
    } catch (err) {
        console.warn("Simulator cleanup error:", err);
    }

    // Create new simulator
    simulator = new SimulatorController();
    simulator.docIDs.push("themeIcon", "themeToggle");
    simulator.initSim(useWebgl);
    switchThemes();

    console.log(`Renderer switched to: ${useWebgl ? "WebGL" : "Canvas2D"}`);
};
