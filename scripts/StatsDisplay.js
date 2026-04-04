class StatsDisplay {
    // Rolling history for the population chart
    _chartHistory = [];          // [{gen, live}, ...]
    _MAX_CHART_POINTS = 200;     // keep last N generations visible
    _hoveredIndex = null;        // index into _chartHistory under cursor
    statsIDs = ["statsChart", "clearStatsChart"]
    constructor() {
        for (const id of this.statsIDs) {
            this[id] = document.getElementById(id);
        }
        this._initStatsChart()
    }

    resetChart() {
        this._chartHistory = [];
        this._drawStatsChart();
    }

    updateStatsChart(stats) {
        this._chartHistory.push({ gen: Number(stats.gen_no), live: Number(stats.live) });
        if (this._chartHistory.length > this._MAX_CHART_POINTS) {
            this._chartHistory.shift();
        }
        this._drawStatsChart();
    }

    _initStatsChart() {
        if (this.clearStatsChart) {
            this.clearStatsChart.addEventListener('click', () => {
                this._chartHistory = [];
                this._drawStatsChart();
            });
        }
        const ro = new ResizeObserver(() => this._drawStatsChart());
        if (this.statsChart) ro.observe(this.statsChart);

        if (this.statsChart) {
            this.statsChart.addEventListener('mousemove', (e) => {
                const data = this._chartHistory;
                if (data.length < 2) return;

                const rect  = this.statsChart.getBoundingClientRect();
                const pad   = { left: 46, right: 10, top: 10, bottom: 28 };
                const cW    = rect.width - pad.left - pad.right;
                const mx    = e.clientX - rect.left;

                // Map mouse X → nearest data index
                const t     = (mx - pad.left) / cW;
                const raw   = t * (data.length - 1);
                const idx   = Math.round(Math.max(0, Math.min(data.length - 1, raw)));

                if (idx !== this._hoveredIndex) {
                    this._hoveredIndex = idx;
                    this._drawStatsChart();
                }
            });

            this.statsChart.addEventListener('mouseleave', () => {
                if (this._hoveredIndex !== null) {
                    this._hoveredIndex = null;
                    this._drawStatsChart();
                }
            });
        }

        this._drawStatsChart();
    }

    _drawStatsChart() {
        const canvas = this.statsChart;
        if (!canvas) return;

        const dpr   = window.devicePixelRatio || 1;
        const rect  = canvas.getBoundingClientRect();
        const W     = rect.width  || canvas.parentElement?.clientWidth || 260;
        const H     = rect.height || 140;
        canvas.width  = W * dpr;
        canvas.height = H * dpr;

        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, W, H);

        // Theme-aware colours via CSS variables
        const cs      = getComputedStyle(document.documentElement);
        const getVar  = (v, fb) => cs.getPropertyValue(v).trim() || fb;
        const colGrid = getVar('--chart-grid',  'rgba(128,128,128,0.18)');
        const colLine = getVar('--chart-line',  '#4fc3f7');
        const colFill = getVar('--chart-fill',  'rgba(79,195,247,0.15)');
        const colText = getVar('--chart-text',  '#888');
        const colAxis = getVar('--chart-axis',  'rgba(128,128,128,0.35)');

        const pad = { top: 10, right: 10, bottom: 28, left: 46 };
        const cW  = W - pad.left - pad.right;
        const cH  = H - pad.top  - pad.bottom;

        const data = this._chartHistory;
        if (data.length < 2) {
            ctx.fillStyle  = colText;
            ctx.font       = '12px system-ui, sans-serif';
            ctx.textAlign  = 'center';
            ctx.fillText('Run the simulation to see the chart', W / 2, H / 2);
            return;
        }

        const maxPop   = Math.max(...data.map(d => d.live), 1);
        const minPop   = Math.min(...data.map(d => d.live), 0);
        const popRange = maxPop - minPop || 1;

        const xOf = i => pad.left + (i / (data.length - 1)) * cW;
        const yOf = v => pad.top  + cH - ((v - minPop) / popRange) * cH;

        // Horizontal grid lines + Y labels
        const GRID_LINES = 4;
        ctx.strokeStyle = colGrid;
        ctx.lineWidth   = 1;
        for (let i = 0; i <= GRID_LINES; i++) {
            const y = pad.top + (i / GRID_LINES) * cH;
            ctx.beginPath();
            ctx.moveTo(pad.left, y);
            ctx.lineTo(pad.left + cW, y);
            ctx.stroke();
            const val = maxPop - (i / GRID_LINES) * popRange;
            ctx.fillStyle  = colText;
            ctx.font       = '10px system-ui, sans-serif';
            ctx.textAlign  = 'right';
            ctx.fillText(Math.round(val).toLocaleString(), pad.left - 4, y + 3.5);
        }

        // X-axis generation labels
        ctx.fillStyle  = colText;
        ctx.font       = '10px system-ui, sans-serif';
        ctx.textAlign  = 'left';
        ctx.fillText(`Gen ${data[0].gen}`, pad.left, H - 6);
        ctx.textAlign  = 'right';
        ctx.fillText(`Gen ${data[data.length - 1].gen}`, pad.left + cW, H - 6);

        // Filled area under the line
        ctx.beginPath();
        ctx.moveTo(xOf(0), yOf(data[0].live));
        data.forEach((d, i) => ctx.lineTo(xOf(i), yOf(d.live)));
        ctx.lineTo(xOf(data.length - 1), pad.top + cH);
        ctx.lineTo(xOf(0),               pad.top + cH);
        ctx.closePath();
        ctx.fillStyle = colFill;
        ctx.fill();

        // Line
        ctx.beginPath();
        ctx.moveTo(xOf(0), yOf(data[0].live));
        data.forEach((d, i) => ctx.lineTo(xOf(i), yOf(d.live)));
        ctx.strokeStyle = colLine;
        ctx.lineWidth   = 2;
        ctx.lineJoin    = 'round';
        ctx.stroke();

        // Axis borders
        ctx.strokeStyle = colAxis;
        ctx.lineWidth   = 1;
        ctx.beginPath();
        ctx.moveTo(pad.left, pad.top);
        ctx.lineTo(pad.left, pad.top + cH);
        ctx.lineTo(pad.left + cW, pad.top + cH);
        ctx.stroke();

        // Latest value dot
        const last = data[data.length - 1];
        ctx.beginPath();
        ctx.arc(xOf(data.length - 1), yOf(last.live), 3.5, 0, Math.PI * 2);
        ctx.fillStyle = colLine;
        ctx.fill();

        const hi = this._hoveredIndex;
        if (hi !== null && hi >= 0 && hi < data.length) {
            const hx = xOf(hi);
            const hy = yOf(data[hi].live);

            // Vertical crosshair line
            ctx.strokeStyle = colAxis;
            ctx.lineWidth   = 1;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(hx, pad.top);
            ctx.lineTo(hx, pad.top + cH);
            ctx.stroke();
            ctx.setLineDash([]);

            // Hover dot (larger)
            ctx.beginPath();
            ctx.arc(hx, hy, 5, 0, Math.PI * 2);
            ctx.fillStyle   = colLine;
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.6)';
            ctx.lineWidth   = 1.5;
            ctx.stroke();

            // Tooltip box
            const label  = `Gen ${data[hi].gen}  |  Pop ${data[hi].live.toLocaleString()}`;
            ctx.font     = 'bold 11px system-ui, sans-serif';
            const tw     = ctx.measureText(label).width;
            const bPad   = 5;
            const bW     = tw + bPad * 2;
            const bH     = 20;

            // Keep box inside canvas
            let bx = hx - bW / 2;
            let by = hy - bH - 10;
            bx = Math.max(pad.left, Math.min(bx, W - pad.right - bW));
            by = by < pad.top ? hy + 10 : by;

            ctx.fillStyle   = 'rgba(30,30,30,0.85)';
            ctx.strokeStyle = colLine;
            ctx.lineWidth   = 1;
            ctx.beginPath();
            ctx.roundRect(bx, by, bW, bH, 4);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle  = '#fff';
            ctx.textAlign  = 'left';
            ctx.fillText(label, bx + bPad, by + bH - 6);
        }
    }

}

export { StatsDisplay };