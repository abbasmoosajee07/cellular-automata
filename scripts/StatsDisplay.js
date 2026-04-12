class StatsDisplay {
    // Rolling history for the population chart
    _chartHistory = [];
    _hoveredIndex = null;
    statsIDs = ["statsChart", "clearStatsChart"]
    activeProp = "live";
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
        this._chartHistory.push({
            ticks: Number(stats.ticks),
            live: Number(stats.live),
            density: Number(stats.density)
        });
        if (this._chartHistory.length > 250) {
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
        const activeProp = this.activeProp;

        if (this.statsChart) {
            this.statsChart.addEventListener('mousemove', (e) => {
                const data = this._chartHistory;
                if (data.length < 2) return;

                const rect   = this.statsChart.getBoundingClientRect();
                const pad    = { left: 46, right: 10, top: 10, bottom: 28 };
                const cW     = rect.width  - pad.left - pad.right;
                const cH     = rect.height - pad.top  - pad.bottom;
                const mx     = e.clientX - rect.left;
                const my     = e.clientY - rect.top;

                // Map mouse X → nearest data index
                const t      = (mx - pad.left) / cW;
                const raw    = t * (data.length - 1);
                const idx    = Math.round(Math.max(0, Math.min(data.length - 1, raw)));

                // Map that index back to the line's Y position
                const maxPop   = Math.max(...data.map(d => d[activeProp]), 1);
                const minPop   = Math.min(...data.map(d => d.live), 0);
                const popRange = maxPop - minPop || 1;
                const lineY    = pad.top + cH - ((data[idx][activeProp] - minPop) / popRange) * cH;

                // Only show tooltip when cursor is within 12px of the line
                const HIT_RADIUS = 12;
                const newIndex   = Math.abs(my - lineY) <= HIT_RADIUS ? idx : null;

                if (newIndex !== this._hoveredIndex) {
                    this._hoveredIndex = newIndex;
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

    _getChartColors() {
        const cs     = getComputedStyle(document.documentElement);
        const getVar = (v, fb) => cs.getPropertyValue(v).trim() || fb;
        return {
            grid: getVar('--chart-grid', 'rgba(128,128,128,0.18)'),
            line: getVar('--chart-line', '#32cd32'),
            fill: getVar('--chart-fill', 'rgba(79, 247, 129, 0.15)'),
            text: getVar('--chart-text', '#888'),
            axis: getVar('--chart-axis', 'rgba(128,128,128,0.35)'),
        };
    }

    _setupCanvas() {
        const canvas = this.statsChart;
        if (!canvas) return null;

        const dpr  = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        const W    = rect.width  || canvas.parentElement?.clientWidth || 260;
        const H    = rect.height || 140;
        canvas.width  = W * dpr;
        canvas.height = H * dpr;

        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, W, H);
        return { ctx, W, H };
    }

    _getChartLayout(W, H) {
        const pad = { top: 10, right: 10, bottom: 28, left: 46 };
        return { pad, cW: W - pad.left - pad.right, cH: H - pad.top - pad.bottom };
    }

    _drawGridLines(ctx, data, activeProp, pad, cW, cH, col) {
        const maxPop   = Math.max(...data.map(d => d[activeProp]), 1);
        const minPop   = Math.min(...data.map(d => d[activeProp]), 0);
        const popRange = maxPop - minPop || 1;

        const GRID_LINES = 4;
        ctx.strokeStyle  = col.grid;
        ctx.lineWidth    = 1;
        for (let i = 0; i <= GRID_LINES; i++) {
            const y   = pad.top + (i / GRID_LINES) * cH;
            const val = maxPop - (i / GRID_LINES) * popRange;
            ctx.beginPath();
            ctx.moveTo(pad.left, y);
            ctx.lineTo(pad.left + cW, y);
            ctx.stroke();
            ctx.fillStyle = col.text;
            ctx.font      = '10px system-ui, sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(Math.round(val).toLocaleString(), pad.left - 4, y + 3.5);
        }

        return { maxPop, minPop, popRange };
    }

    _drawXLabels(ctx, data, pad, cW, H, col) {
        ctx.fillStyle = col.text;
        ctx.font      = '10px system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`ticks ${data[0].ticks}`, pad.left, H - 6);
        ctx.textAlign = 'right';
        ctx.fillText(`ticks ${data[data.length - 1].ticks}`, pad.left + cW, H - 6);
    }

    _drawLine(ctx, data, activeProp, xOf, yOf, col) {
        // Fill
        ctx.beginPath();
        ctx.moveTo(xOf(0), yOf(data[0][activeProp]));
        data.forEach((d, i) => ctx.lineTo(xOf(i), yOf(d[activeProp])));
        ctx.lineTo(xOf(data.length - 1), yOf(0));
        ctx.lineTo(xOf(0),               yOf(0));
        ctx.closePath();
        ctx.fillStyle = col.fill;
        ctx.fill();

        // Line
        ctx.beginPath();
        ctx.moveTo(xOf(0), yOf(data[0][activeProp]));
        data.forEach((d, i) => ctx.lineTo(xOf(i), yOf(d[activeProp])));
        ctx.strokeStyle = col.line;
        ctx.lineWidth   = 2;
        ctx.lineJoin    = 'round';
        ctx.stroke();
    }

    _drawAxes(ctx, pad, cW, cH, col) {
        ctx.strokeStyle = col.axis;
        ctx.lineWidth   = 1;
        ctx.beginPath();
        ctx.moveTo(pad.left, pad.top);
        ctx.lineTo(pad.left, pad.top + cH);
        ctx.lineTo(pad.left + cW, pad.top + cH);
        ctx.stroke();
    }

    _drawLastDot(ctx, data, activeProp, xOf, yOf, col) {
        const last = data[data.length - 1];
        ctx.beginPath();
        ctx.arc(xOf(data.length - 1), yOf(last[activeProp]), 3.5, 0, Math.PI * 2);
        ctx.fillStyle = col.line;
        ctx.fill();
    }

    _drawTooltip(ctx, data, activeProp, xOf, yOf, pad, W, col) {
        const hi = this._hoveredIndex;
        if (hi === null || hi < 0 || hi >= data.length) return;

        const hx = xOf(hi);
        const hy = yOf(data[hi][activeProp]);

        // Crosshair
        ctx.strokeStyle = col.axis;
        ctx.lineWidth   = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(hx, pad.top);
        ctx.lineTo(hx, pad.top + (yOf(0) - pad.top));
        ctx.stroke();
        ctx.setLineDash([]);

        // Hover dot
        ctx.beginPath();
        ctx.arc(hx, hy, 5, 0, Math.PI * 2);
        ctx.fillStyle   = col.line;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth   = 1.5;
        ctx.stroke();

        // Tooltip box
        const label = `ticks ${data[hi].ticks}  |  Pop ${data[hi][activeProp].toLocaleString()}`;
        ctx.font     = 'bold 11px system-ui, sans-serif';
        const bPad   = 5;
        const bW     = ctx.measureText(label).width + bPad * 2;
        const bH     = 20;
        let   bx     = Math.max(pad.left, Math.min(hx - bW / 2, W - pad.right - bW));
        let   by     = hy - bH - 10;
        if (by < pad.top) by = hy + 10;

        ctx.fillStyle   = 'rgba(30,30,30,0.85)';
        ctx.strokeStyle = col.line;
        ctx.lineWidth   = 1;
        ctx.beginPath();
        ctx.roundRect(bx, by, bW, bH, 4);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#fff';
        ctx.textAlign = 'left';
        ctx.fillText(label, bx + bPad, by + bH - 6);
    }

    _drawStatsChart() {
        const canvas = this.statsChart;
        if (!canvas) return;

        const { ctx, W, H } = this._setupCanvas();
        const col            = this._getChartColors();
        const { pad, cW, cH } = this._getChartLayout(W, H);
        const data           = this._chartHistory;
        const activeProp     = this.activeProp;

        if (data.length < 2) {
            ctx.fillStyle = col.text;
            ctx.font      = '12px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Run the simulation to see the chart', W / 2, H / 2);
            return;
        }

        const { maxPop, minPop, popRange } = this._drawGridLines(ctx, data, activeProp, pad, cW, cH, col);

        const xOf = i => pad.left + (i / (data.length - 1)) * cW;
        const yOf = v => pad.top  + cH - ((v - minPop) / popRange) * cH;

        this._drawXLabels(ctx, data, pad, cW, H, col);
        this._drawLine(ctx, data, activeProp, xOf, yOf, col);
        this._drawAxes(ctx, pad, cW, cH, col);
        this._drawLastDot(ctx, data, activeProp, xOf, yOf, col);
        this._drawTooltip(ctx, data, activeProp, xOf, yOf, pad, W, col);
    }

}

export { StatsDisplay };