class StatsDisplay {
    _chartHistory = new Map();
    _hoveredIndex = null;
    _cachedData   = [];       // avoid re-spreading every draw
    _cachedMax    = 1;        // avoid recomputing min/max
    _cachedMin    = 0;
    statsIDs = [
        "statsChart", "status_pop", "status_tick",
        "card_live", "card_net_change", "card_ticks",
        "card_density_val", "card_density_bar", "card_total_cells",
        "card_births", "card_deaths", "card_mutation",
        "card_shape", "card_topology", "card_neighbor", "card_render_time"
    ];
    _prevLive = null;
    y_var = "live";
    x_var = "ticks";
    graphFont = '10px system-ui, sans-serif';

    constructor(parentSim) {
        this.simManager = parentSim;
        for (const id of this.statsIDs) {
            this[id] = document.getElementById(id);
        }
        this.selectStatGraph();
        this._initStatsChart();
    }

    selectStatGraph(preffered = null) {
        const statsProperty = {
            selectId: 'stats-type',
            descId: 'stats-desc',
            defaultValue: preffered || 'live',
            types: {
                live:          { label: "Population vs Time", desc: "" },
                density:       { label: "Density vs Time",    desc: "" },
                mutation_rate: { label: "Mutation vs Time",   desc: "" },
                births:        { label: "Births vs Time",     desc: "" },
                deaths:        { label: "Deaths vs Time",     desc: "" },
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
        const prop = this.y_var;
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

    updateStatusText(stats) {
        // Legacy bindings (status bar + hidden preview elements)
        this.statBindings = [
            [this.status_pop, 'live'],
            [this.status_tick, 'ticks'],
            [this.card_ticks, 'ticks'],
        ];
        for (const [el, statKey] of this.statBindings) {
            if (!el) continue;
            const value = stats[statKey];
            el.textContent = typeof value === 'number' ? value.toLocaleString() : value;
        }

        if (this.card_render_time) {
            this.card_render_time.textContent = stats.js_time != null
                ? stats.js_time.toFixed(1) + 'ms'
                : '—';
        }

        // ── Hero row: Population card ─────────────────────────────
        if (this.card_live) {
            this.card_live.textContent = Number(stats.live).toLocaleString();
        }
        if (this.card_net_change) {
            const net = this._prevLive !== null ? stats.live - this._prevLive : 0;
            const sign = net > 0 ? '+' : '';
            this.card_net_change.textContent = `${sign}${net.toLocaleString()}`;
            this.card_net_change.className = 'stat-card__net ' +
                (net > 0 ? 'stat-card__net--up' : net < 0 ? 'stat-card__net--down' : '');
        }
        this._prevLive = stats.live;

        // ── Hero row: Density card ───────────────────────────────
        if (this.card_density_val) {
            const d = typeof stats.density === 'number' ? stats.density : parseFloat(stats.density) || 0;
            this.card_density_val.textContent = (d * 100).toFixed(1) + '%';
            if (this.card_density_bar) {
                this.card_density_bar.style.width = Math.min(d * 100, 100) + '%';
            }
        }
        if (this.card_total_cells) {
            this.card_total_cells.textContent = Number(stats.total).toLocaleString() + ' cells';
        }

        // ── Births / Deaths / Mutation ───────────────────────────
        if (this.card_births)   this.card_births.textContent   = Number(stats.births).toLocaleString();
        if (this.card_deaths)   this.card_deaths.textContent   = Number(stats.deaths).toLocaleString();
        if (this.card_mutation) {
            const m = typeof stats.mutation_rate === 'number' ? stats.mutation_rate : parseFloat(stats.mutation_rate) || 0;
            this.card_mutation.textContent = (m * 100).toFixed(2) + '%';
        }
    }

    _fmtLabel(str) {
        return str
            .replace(/([a-z])([A-Z])/g, '$1 $2')  // camelCase → words
            .replace(/_/g, ' ')                     // snake_case → words
            .replace(/\b\w/g, c => c.toUpperCase()) // title case
            .trim();
    }

    updateStats_GRID(grid_config) {
        this.card_shape.textContent = this._fmtLabel(grid_config.shape);
        this.card_topology.textContent = this._fmtLabel(grid_config.topology_type);
        this.card_neighbor.textContent = this._fmtLabel(grid_config.neighbor_type);
    }

    updateStats_CA(stats) {
        const tick = Number(stats.ticks);
        this.updateStatusText(stats);

        this._chartHistory.set(tick, { ticks: tick, ...stats });

        if (this._chartHistory.size > 200) {
            this._chartHistory.delete(this._chartHistory.keys().next().value);
        }

        this._invalidateCache();
        this._drawStatsChart();
        console.log("Rust=", stats.tick_time_ms, "Total=", stats.js_time);
    }

    _initStatsChart() {
        const ro = new ResizeObserver(() => this._drawStatsChart());
        if (this.statsChart) ro.observe(this.statsChart);

        if (this.statsChart) {
            this.statsChart.addEventListener('mousemove', (e) => {
                const data = this._cachedData;           // no allocation
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

    _drawStatsChart() {
        const canvas = this.statsChart;
        if (!canvas) return;

        const { ctx, W, H }    = this._setupCanvas();
        const col               = this._getChartColors();
        const { pad, cW, cH }  = this._getChartLayout(W, H);
        const data              = this._cachedData;          // no allocation
        const y_var        = this.y_var;

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