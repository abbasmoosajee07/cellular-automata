class StatsDisplay {
    _chartHistory = new Map();
    _hoveredIndex = null;
    _pausePlotting = false;
    _speedFPS     = 0.0;
    _cachedData   = [];       // avoid re-spreading every draw
    _cachedMax    = 1;        // avoid recomputing min/max
    _cachedMin    = 0;
    _peakPop      = 0;
    statsIDs = [
        "statsPanel", "statsChart", "status_pop", "status_tick",
        "card_live", "card_net_change", "card_ticks", "status_fps",
        "card_density_val", "card_density_bar", "card_total",
        "card_births", "card_deaths", "card_mutation", "card_activity",
        "card_shape", "card_topology", "card_neighbor",
        "card_fps","card_render_time", "card_peak_pop",
        "pauseGraph", "clearGraph", "exportGraph"
    ];
    _prevLive = null;
    y_var = "live";
    x_var = "ticks";
    graphFont = '10px system-ui, sans-serif';

    _toNum(val) {
        return typeof val === 'number' ? val : parseFloat(val) || 0;
    }

    _pct(val, decimals = 1) {
        return (this._toNum(val) * 100).toFixed(decimals) + '%';
    }

    _fmtLabel(str) {
        return str
            .replace(/([a-z])([A-Z])/g, '$1 $2')  // camelCase → words
            .replace(/_/g, ' ')                     // snake_case → words
            .replace(/\b\w/g, c => c.toUpperCase()) // title case
            .trim();
    }

    constructor(parentSim) {
        this.simManager = parentSim;
        for (const id of this.statsIDs) {
            this[id] = document.getElementById(id);
        }
        this.selectStatGraph();
        this._initStatsChart();
        this.graphControls();
    }

    _updateStatsPanel(stats) {
        const net  = this._prevLive !== null ? stats.live - this._prevLive : 0;
        const sign = net > 0 ? '+' : '';
        this._peakPop = Math.max(stats.live, this._peakPop);
        this.card_peak_pop.textContent   = this._peakPop.toLocaleString();

        this.card_ticks.textContent      = stats.ticks.toLocaleString();
        this.card_live.textContent       = stats.live.toLocaleString();
        this.card_total.textContent      = stats.total.toLocaleString() + ' cells';
        this.card_births.textContent     = stats.births.toLocaleString();
        this.card_deaths.textContent     = stats.deaths.toLocaleString();
        this.card_net_change.textContent = `${sign}${net.toLocaleString()}`;
        this.card_net_change.className   = 'stat-card__net ' +
            (net > 0 ? 'stat-card__net--up' : net < 0 ? 'stat-card__net--down' : '');
    
        this._prevLive = stats.live;

        this.card_density_val.textContent = this._pct(stats.density);
        this.card_density_bar.style.width = Math.min(stats.density * 100, 100) + '%';

        this.card_mutation.textContent = this._pct(stats.mutation);
        this.card_activity.textContent = this._pct(stats.activity);

        this.card_fps.textContent   = this._speedFPS;
    }

    updateStats_CA(stats) {
        const ticks = Number(stats.ticks);
        if (stats.dt_js) {
            this._speedFPS = (1000 / stats.dt_js).toFixed(1);
            this.status_fps.textContent = this._speedFPS;
            this.card_render_time.innerHTML =
                `dt: <span class="time-rust">${stats.dt_rs.toFixed(1)} ms</span>` +
                ` | <span class="time-js">${stats.dt_js.toFixed(1)} ms</span>`;
        }

        this.status_pop.textContent     = stats.live.toLocaleString();
        this.status_tick.textContent    = ticks.toLocaleString();
        this._chartHistory.set(ticks, { ticks: ticks, ...stats });
        if (this._chartHistory.size > 200) {
            this._chartHistory.delete(this._chartHistory.keys().next().value);
        }

        if (!this.statsPanel?.classList.contains('active')) return
        this._updateStatsPanel(stats);
        this._invalidateCache();
        if (!this._pausePlotting) this._drawStatsChart();
        console.log("Rust=", stats.dt_rs, "Total=", stats.dt_js);
    }

    updateStats_GRID(grid_config) {
        this.card_shape.textContent = this._fmtLabel(grid_config.shape);
        this.card_topology.textContent = this._fmtLabel(grid_config.topology_type);
        this.card_neighbor.textContent = this._fmtLabel(grid_config.neighbor_type);
    }

    selectStatGraph(preffered = null) {
        const statsProperty = {
            selectId: 'stats-type',
            descId: 'stats-desc',
            defaultValue: preffered || 'live',
            types: {
                live:          { label: "Population",           desc: "" },
                density:       { label: "Density",              desc: "" },
                mutation: { label: "Mutation",             desc: "" },
                births:        { label: "Births",               desc: "" },
                deaths:        { label: "Deaths",               desc: "" },
                histogram:     { label: "Population histogram", desc: "" },
            }
        };

        this.simManager.setupDropdown(statsProperty, 'statGraphType', (value) => {
            this.y_var = value;
            this._invalidateCache();
            this._drawStatsChart();
        });
    }

    _invalidateCache() {
        this._cachedData = [...this._chartHistory.values()];
        this._recomputeMinMax();
    }

    _recomputeMinMax() {
        const data = this._cachedData;
        const prop = this.y_var === 'histogram' ? 'live' : this.y_var;
        if (data.length === 0) {
            this._cachedMax = 1;
            this._cachedMin = 0;
            return;
        }
        let max = -Infinity, min = Infinity;
        for (let i = 0; i < data.length; i++) {
            const v = data[i][prop];
            if (v > max) max = v;
            if (v < min) min = v;
        }
        this._cachedMax = Math.max(max, 1);
        this._cachedMin = Math.min(min, 0);
    }

    resetChart() {
        this._chartHistory.clear();
        this._invalidateCache();
        this._drawStatsChart();
    }

    graphControls() {
        this.pauseGraph.addEventListener("click", () => {
            this._pausePlotting = !this._pausePlotting;
            this.pauseGraph.style.backgroundColor = this._pausePlotting ? "red" : "";
        });

        this.exportGraph.addEventListener("click", () => {
            const a = document.createElement('a');
            a.download = `chart_${this.y_var}_tick${[...this._chartHistory.keys()].at(-1) ?? 0}.png`;
            a.href = this.statsChart.toDataURL('image/png');
            a.click();
        });

        this.clearGraph.addEventListener("click", () => {
            this.resetChart();
        });
    }

    _initStatsChart() {
        const ro = new ResizeObserver(() => this._drawStatsChart());
        if (this.statsChart) ro.observe(this.statsChart);

        if (this.statsChart) {
            this.statsChart.addEventListener('mousemove', (e) => {
                if (this.y_var === 'histogram') return;

                const data = this._cachedData;
                if (!data.length) return;

                const rect = this.statsChart.getBoundingClientRect();
                const pad  = { left: 46, right: 10, top: 10, bottom: 28 };
                const cW   = rect.width  - pad.left - pad.right;
                const cH   = rect.height - pad.top  - pad.bottom;
                const mx   = e.clientX - rect.left;
                const my   = e.clientY - rect.top;

                const t    = (mx - pad.left) / cW;
                const idx  = Math.round(Math.max(0, Math.min(data.length - 1, t * (data.length - 1))));

                // Use cached min/max — no recompute on mousemove
                const popRange = this._cachedMax - this._cachedMin || 1;
                const lineY    = pad.top + cH - ((data[idx][this.y_var] - this._cachedMin) / popRange) * cH;

                const newIndex = Math.abs(my - lineY) <= 12 ? idx : null;
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

    _drawGridLines(ctx, data, y_var, pad, cW, cH, col) {
        const maxPop   = this._cachedMax;
        const minPop   = this._cachedMin;
        const popRange = maxPop - minPop || 1;

        const GRID_LINES = 5;
        ctx.strokeStyle  = col.grid;
        ctx.lineWidth    = 1;
        ctx.fillStyle    = col.text;
        ctx.font         = this.graphFont;
        ctx.textAlign    = 'right';

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
            ctx.fillText(formatted, pad.left - 4, y + 3.5);
        }

        return { maxPop, minPop, popRange };
    }

    _drawLine(ctx, data, y_var, xOf, yOf, col, minPop) {
        ctx.beginPath();
        ctx.moveTo(xOf(0), yOf(data[0][y_var]));
        for (let i = 1; i < data.length; i++) ctx.lineTo(xOf(i), yOf(data[i][y_var]));
        ctx.lineTo(xOf(data.length - 1), yOf(minPop));
        ctx.lineTo(xOf(0), yOf(minPop));
        ctx.closePath();
        ctx.fillStyle = col.fill;
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(xOf(0), yOf(data[0][y_var]));
        for (let i = 1; i < data.length; i++) ctx.lineTo(xOf(i), yOf(data[i][y_var]));
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

    _drawLastDot(ctx, data, y_var, xOf, yOf, col) {
        const last = data[data.length - 1];
        ctx.beginPath();
        ctx.arc(xOf(data.length - 1), yOf(last[y_var]), 3.5, 0, Math.PI * 2);
        ctx.fillStyle = col.line;
        ctx.fill();
    }

    _drawTooltip(ctx, data, y_var, xOf, yOf, pad, W, col) {
        const hi = this._hoveredIndex;
        if (hi === null || hi < 0 || hi >= data.length) return;

        const hx = xOf(hi);
        const hy = yOf(data[hi][y_var]);

        ctx.strokeStyle = col.axis;
        ctx.lineWidth   = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(hx, pad.top);
        ctx.lineTo(hx, pad.top + (yOf(0) - pad.top));
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.beginPath();
        ctx.arc(hx, hy, 5, 0, Math.PI * 2);
        ctx.fillStyle   = col.line;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth   = 1.5;
        ctx.stroke();

        const val   = data[hi][y_var];
        const label = `x= ${hi} | y= ${typeof val === 'number' && !Number.isInteger(val) ? val.toFixed(4) : val}`;
        ctx.font     = 'bold 11px system-ui, sans-serif';
        const bPad   = 5;
        const bW     = ctx.measureText(label).width + bPad * 2;
        const bH     = 20;
        const bx     = Math.max(pad.left, Math.min(hx - bW / 2, W - pad.right - bW));
        const by     = hy - bH - 10 < pad.top ? hy + 10 : hy - bH - 10;

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

    _labelYaxis(ctx, y_var, pad, cH, col) {
        const label = y_var === 'live'
            ? 'Population'
            : y_var === 'frequency'
            ? 'Frequency'
            : y_var.charAt(0).toUpperCase() + y_var.slice(1);
        ctx.save();
        ctx.fillStyle = col.text;
        ctx.font      = this.graphFont;
        ctx.textAlign = 'center';
        ctx.translate(10, pad.top + cH / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(label, 0, 0);
        ctx.restore();
    }

    _drawXLabels(ctx, data, pad, cW, H, col) {
        const X_LINES = Math.min(data.length, 5);
        ctx.strokeStyle = col.grid;
        ctx.lineWidth   = 1;
        ctx.fillStyle   = col.text;
        ctx.font        = this.graphFont;
        ctx.textAlign   = 'center';

        for (let i = 0; i <= X_LINES; i++) {
            const x         = pad.left + (i / X_LINES) * cW;
            const tickIndex = Math.round((i / X_LINES) * (data.length - 1));
            ctx.beginPath();
            ctx.moveTo(x, pad.top);
            ctx.lineTo(x, pad.top + 1);
            ctx.stroke();
            ctx.fillText(`${tickIndex}`, x, H - 6);
        }
    }

    _labelXaxis(ctx, y_var, pad, cH, col) {
        ctx.save();
        ctx.fillStyle = col.text;
        ctx.font      = this.graphFont;
        ctx.textAlign = 'center';
        ctx.fillText('Ticks', pad.left * 3, cH + 25);
        ctx.restore();
    }

    _drawHistogram() {
        const canvas = this.statsChart;
        if (!canvas) return;

        const { ctx, W, H }   = this._setupCanvas();
        const col              = this._getChartColors();
        const { pad, cW, cH } = this._getChartLayout(W, H);
        const data             = this._cachedData;

        if (data.length < 2) {
            ctx.fillStyle = col.text;
            ctx.font      = this.graphFont;
            ctx.textAlign = 'center';
            ctx.fillText('Not enough data for histogram', W / 2, H / 2);
            return;
        }

        const values  = data.map(d => d.live);
        const min     = Math.min(...values);
        const max     = Math.max(...values);
        const BINS    = Math.min(20, Math.max(4, Math.ceil(Math.sqrt(data.length))));
        const binSize = (max - min) / BINS || 1;

        const counts = new Array(BINS).fill(0);
        values.forEach(v => {
            const b = Math.min(Math.floor((v - min) / binSize), BINS - 1);
            counts[b]++;
        });

        const maxCount = Math.max(...counts, 1);
        const barW     = cW / BINS;

        // horizontal grid lines + y-axis labels
        const GRID = 5;
        ctx.strokeStyle = col.grid;
        ctx.lineWidth   = 1;
        ctx.fillStyle   = col.text;
        ctx.font        = this.graphFont;
        ctx.textAlign   = 'right';
        for (let i = 0; i <= GRID; i++) {
            const y   = pad.top + (i / GRID) * cH;
            const val = Math.round(maxCount * (1 - i / GRID));
            ctx.beginPath();
            ctx.moveTo(pad.left, y);
            ctx.lineTo(pad.left + cW, y);
            ctx.stroke();
            ctx.fillText(val.toLocaleString(), pad.left - 4, y + 3.5);
        }

        // bars
        counts.forEach((count, i) => {
            const x  = pad.left + i * barW;
            const bH = (count / maxCount) * cH;
            const y  = pad.top + cH - bH;

            ctx.fillStyle = col.fill;
            ctx.fillRect(x + 0.5, y, barW - 1, bH);
            ctx.strokeStyle = col.line;
            ctx.lineWidth   = 1;
            ctx.strokeRect(x + 0.5, y, barW - 1, bH);
        });

        // x-axis bin boundary labels (~5 evenly spaced)
        const labelStep = Math.max(1, Math.floor(BINS / 5));
        ctx.fillStyle   = col.text;
        ctx.font        = this.graphFont;
        ctx.textAlign   = 'center';
        for (let i = 0; i <= BINS; i += labelStep) {
            const x   = pad.left + i * barW;
            const val = Math.round(min + i * binSize);
            ctx.fillText(val.toLocaleString(), x, H - 6);
        }

        // axes frame
        this._drawAxes(ctx, pad, cW, cH, col);

        // y-axis label
        this._labelYaxis(ctx, 'frequency', pad, cH, col);

        // x-axis label
        ctx.save();
        ctx.fillStyle = col.text;
        ctx.font      = this.graphFont;
        ctx.textAlign = 'center';
        ctx.fillText('Population', pad.left + cW / 2, H - 2);
        ctx.restore();
    }

    _drawStatsChart() {
        const canvas = this.statsChart;
        if (!canvas) return;

        // Route histogram to its own renderer
        if (this.y_var === 'histogram') {
            this._drawHistogram();
            return;
        }

        const { ctx, W, H }    = this._setupCanvas();
        const col               = this._getChartColors();
        const { pad, cW, cH }  = this._getChartLayout(W, H);
        const data              = this._cachedData;
        const y_var             = this.y_var;

        if (data.length < 1) {
            ctx.fillStyle = col.text;
            ctx.font      = this.graphFont;
            ctx.textAlign = 'center';
            ctx.fillText('Run the simulation to see the chart', W / 2, H / 2);
            return;
        }

        const { maxPop, minPop, popRange } = this._drawGridLines(ctx, data, y_var, pad, cW, cH, col);

        if (data.length === 1) {
            const xOf = () => pad.left + cW / 2;
            const yOf = v => pad.top + cH - ((v - minPop) / popRange) * cH;
            this._drawAxes(ctx, pad, cW, cH, col);
            this._drawLastDot(ctx, data, y_var, xOf, yOf, col);
            this._drawXLabels(ctx, data, pad, cW, H, col);
            this._labelYaxis(ctx, y_var, pad, cH, col);
            this._labelXaxis(ctx, y_var, pad, cH, col);
            return;
        }

        const xOf = i => pad.left + (i / (data.length - 1)) * cW;
        const yOf = v => pad.top  + cH - ((v - minPop) / popRange) * cH;

        this._drawXLabels(ctx, data, pad, cW, H, col);
        this._drawLine(ctx, data, y_var, xOf, yOf, col, minPop);
        this._drawAxes(ctx, pad, cW, cH, col);
        this._drawLastDot(ctx, data, y_var, xOf, yOf, col);
        this._labelYaxis(ctx, y_var, pad, cH, col);
        this._labelXaxis(ctx, y_var, pad, cH, col);
        this._drawTooltip(ctx, data, y_var, xOf, yOf, pad, W, col);
    }
}

export { StatsDisplay };