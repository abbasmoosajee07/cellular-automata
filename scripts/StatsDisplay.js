class StatsDisplay {
    _chartHistory = new Map();
    _hoveredIndex = null;
    statsIDs = ["statsChart"]
    activeProp = "live";
    constructor(parentSim) {
        this.simManager = parentSim;
        for (const id of this.statsIDs) {
            this[id] = document.getElementById(id);
        }
        this.selectStatGraph();
        this._initStatsChart()
    }

    selectStatGraph(preffered = null) {
        const statsProperty = {
            selectId: 'stats-type',
            descId: 'stats-desc',
            defaultValue:  preffered || 'live',
            types: {
                live: {label: "Population vs Time", desc: ""},
                density: {label: "Density vs Time", desc: ""},
            }
        };

        this.simManager.setupDropdown(statsProperty, 'statGraphType', (value) => {
            this.activeProp = value;
            // console.log(value);
            this._drawStatsChart();
        });
    }

    resetChart() {
        this._chartHistory.clear();
        this._drawStatsChart();
    }

    updateStatsChart(stats) {
        const tick = Number(stats.ticks);
        this._chartHistory.set(tick, {
            ticks:   tick,
            live:    Number(stats.live),
            density: Number(stats.density)
        });
        if (this._chartHistory.size > 200) {
            const oldestKey = this._chartHistory.keys().next().value;
            this._chartHistory.delete(oldestKey);
        }
        this._drawStatsChart();
    }

    _initStatsChart() {
        // if (this.clearStatsChart) {
        //     this.clearStatsChart.addEventListener('click', () => {
        //         this._chartHistory.clear();
        //         this._drawStatsChart();
        //     });
        // }
        const ro = new ResizeObserver(() => this._drawStatsChart());
        if (this.statsChart) ro.observe(this.statsChart);
        const activeProp = this.activeProp;

        if (this.statsChart) {
            this.statsChart.addEventListener('mousemove', (e) => {
                const data = [...this._chartHistory.values()];

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
                const maxPop   = Math.max(...data.map(d => d[this.activeProp]), 1);
                const minPop   = Math.min(...data.map(d => d[this.activeProp]), 0);
                const popRange = maxPop - minPop || 1;
                const lineY    = pad.top + cH - ((data[idx][this.activeProp] - minPop) / popRange) * cH;

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

        const GRID_LINES = 5;
        ctx.strokeStyle  = col.grid;
        ctx.lineWidth    = 1;
        for (let i = 0; i <= GRID_LINES; i++) {
            const y   = pad.top + (i / GRID_LINES) * cH;
            const val = maxPop - (i / GRID_LINES) * popRange;
            const formatted = popRange < 10
                ? val.toFixed(2)
                : Math.round(val).toLocaleString();
            ctx.beginPath();
            ctx.moveTo(pad.left, y);
            ctx.lineTo(pad.left + cW, y);
            ctx.stroke();
            ctx.fillStyle = col.text;
            ctx.font      = '10px system-ui, sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(formatted, pad.left - 4, y + 3.5);
        }

        return { maxPop, minPop, popRange };
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
        const label = `x= ${data[hi].ticks} | y= ${data[hi][activeProp].toLocaleString()}`;
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

    _labelYaxis(ctx, activeProp, pad, cH, col) {
        const label = activeProp === 'density' ? 'Density' : 'Population';
        ctx.save();
        ctx.fillStyle = col.text;
        ctx.font      = '10px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.translate(10, pad.top + cH / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(label, 0, 0);
        ctx.restore();
    }

    _drawXLabels(ctx, data, pad, cW, H, col) {
        const X_LINES = 5;
        ctx.strokeStyle = col.grid;
        ctx.lineWidth   = 1;
        for (let i = 0; i <= X_LINES; i++) {
            const x = pad.left + (i / X_LINES) * cW;
            const tickIndex = Math.round((i / X_LINES) * (data.length - 1));
            ctx.beginPath();
            ctx.moveTo(x, pad.top);
            ctx.lineTo(x, pad.top + 1);
            ctx.stroke();
            ctx.fillStyle = col.text;
            ctx.font      = '10px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`${data[tickIndex].ticks}`, x, H - 6);
        }
    }



    _labelXaxis(ctx, activeProp, pad, cH, col) {
        const label = "Ticks";
        ctx.save();
        ctx.fillStyle = col.text;
        ctx.font      = '10px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(label, pad.left * 3, cH + 25);
        ctx.restore();
    }

    _drawStatsChart() {
        const canvas = this.statsChart;
        if (!canvas) return;

        const { ctx, W, H } = this._setupCanvas();
        const col            = this._getChartColors();
        const { pad, cW, cH } = this._getChartLayout(W, H);
        const data           = [...this._chartHistory.values()];
        const activeProp     = this.activeProp;

        if (data.length < 1) {
            ctx.fillStyle = col.text;
            ctx.font      = '12px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Run the simulation to see the chart', W / 2, H / 2);
            return;
        }

        if (data.length === 1) {
            const { maxPop, minPop, popRange } = this._drawGridLines(ctx, data, activeProp, pad, cW, cH, col);
            const xOf = i => pad.left + cW / 2; // centre horizontally
            const yOf = v => pad.top + cH - ((v - minPop) / popRange) * cH;
            this._drawAxes(ctx, pad, cW, cH, col);
            this._drawLastDot(ctx, data, activeProp, xOf, yOf, col);
            this._drawXLabels(ctx, data, pad, cW, H, col);
            this._labelYaxis(ctx, activeProp, pad, cH, col);
            this._labelXaxis(ctx, activeProp, pad, cH, col);
            return;
        }

        const { maxPop, minPop, popRange } = this._drawGridLines(ctx, data, activeProp, pad, cW, cH, col);

        const xOf = i => pad.left + (i / (data.length - 1)) * cW;
        const yOf = v => pad.top  + cH - ((v - minPop) / popRange) * cH;

        this._drawXLabels(ctx, data, pad, cW, H, col);
        this._drawLine(ctx, data, activeProp, xOf, yOf, col);
        this._drawAxes(ctx, pad, cW, cH, col);
        this._drawLastDot(ctx, data, activeProp, xOf, yOf, col);
        this._labelYaxis(ctx, activeProp, pad, cH, col);
        this._labelXaxis(ctx, activeProp, pad, cH, col);
        this._drawTooltip(ctx, data, activeProp, xOf, yOf, pad, W, col);
    }

}

export { StatsDisplay };