/**
 * user/custom.js — 可视化上下文容量圆环胶囊 + 仪表盘详情卡
 * 仿照 antigravity-context-viewer / EasyAntigravity 设计，完全基于 ctx 与既有数据流运行，
 * 零侵入 core/ 内核，支持实时增量更新、昼夜双模式与点击固定卡片。
 */
(() => {
  if (!ctx || !ctx.modules || !ctx.modules.metrics) return;
  const origRender = window.__ag_render_metrics;
  if (typeof origRender !== 'function') return;

  const RING_RADIUS = 6.6;
  const RING_CIRC = 2 * Math.PI * RING_RADIUS; // ~41.469

  function escHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function fmtTok(n) {
    if (!n || n <= 0) return '0';
    if (n >= 1000000) return (n / 1000000).toFixed(2) + 'M';
    if (n >= 10000) return Math.round(n / 1000) + 'k';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return String(Math.round(n));
  }

  function parseIntSafe(str) {
    const num = parseInt(String(str || '').replace(/,/g, ''), 10);
    return Number.isFinite(num) ? num : 0;
  }

  function parseCeilingTokens(limitStr) {
    const s = String(limitStr || '').trim();
    if (!s) return 0;
    if (/m$/i.test(s)) return Math.round(parseFloat(s) * 1000000);
    if (/k$/i.test(s)) return Math.round(parseFloat(s) * 1000);
    const num = parseFloat(s);
    return Number.isFinite(num) ? num : 0;
  }

  function getLevelInfo(pct) {
    if (pct >= 90) return { level: 'crit', label: '即将压缩' };
    if (pct >= 75) return { level: 'warn', label: '偏高预警' };
    if (pct >= 50) return { level: 'mid', label: '适中' };
    return { level: 'low', label: '充裕' };
  }

  function parseDaemonPayload(payload) {
    if (!payload || !payload.hasData) return null;

    const inlineBox = document.createElement('div');
    inlineBox.innerHTML = payload.inlineHtml || '';
    const inlineTxt = inlineBox.textContent || '';

    const ttBox = document.createElement('div');
    ttBox.innerHTML = payload.tooltipHtml || '';

    const speedMatch = inlineTxt.match(/(\d+)\s*tok\/s/);
    const inlineSpeed = speedMatch ? speedMatch[1] : '--';

    const latencyMatch = inlineTxt.match(/\b(TTFT|Hold)\s*([\d.]+s)/);
    const latencyLabel = latencyMatch ? (latencyMatch[1] === 'TTFT' ? '首字等待' : '缓冲等待') : '首字等待';
    const inlineLatency = latencyMatch ? latencyMatch[2] : '--';

    const ctxInlineMatch = inlineTxt.match(/Ctx\s*([^/\s]+)\/([^\s(]+)\s*\((\d+)%\)/);
    let usedShort = ctxInlineMatch ? ctxInlineMatch[1] : '--';
    let limitStr = ctxInlineMatch ? ctxInlineMatch[2] : '--';
    let ctxPct = ctxInlineMatch ? parseInt(ctxInlineMatch[3], 10) : 0;

    const outInlineMatch = inlineTxt.match(/\bOut\s*([^\s·]+)/);
    const inlineOut = outInlineMatch ? outInlineMatch[1] : '--';

    const subBadgeEl = inlineBox.querySelector('.ag-sub-badge');
    const subBadgeText = subBadgeEl ? subBadgeEl.textContent.trim() : '';

    const warnDotEl = inlineBox.querySelector('.ag-zh-warn-dot');
    const warnDotTitle = warnDotEl ? warnDotEl.getAttribute('title') || '' : '';

    const hdrs = Array.from(ttBox.querySelectorAll('.ag-tt-hdr')).map((el) => el.textContent.trim());
    const genMatch = (hdrs[0] || '').match(/(Gen #\d+)/);
    const genLabel = genMatch ? genMatch[1] : '';
    const sessionSummaryMatch = (hdrs[1] || '').match(/\(([^)]+)\)/);
    const sessionSummary = sessionSummaryMatch ? sessionSummaryMatch[1] : '';

    const rows = {};
    let turnRow = null;
    let subRow = null;
    for (const row of ttBox.querySelectorAll('.ag-tt-row')) {
      const lbl = row.querySelector('.ag-tt-lbl')?.textContent.trim() || '';
      const val = row.querySelector('.ag-tt-val')?.textContent.trim() || '';
      if (!lbl) continue;
      if (lbl.startsWith('本轮合计')) {
        turnRow = { lbl, val };
      } else if (lbl.startsWith('子 Agent')) {
        subRow = { lbl, val };
      } else {
        rows[lbl] = val;
      }
    }

    const ceilingMatch = (rows['压缩水位线'] || '').match(
      /^([^/\s]+)\s*\/\s*([^\s(]+)\s*\((\d+)%\)\s*·\s*距压缩余\s*(\S+)/
    );
    let remainShort = '--';
    if (ceilingMatch) {
      usedShort = ceilingMatch[1];
      limitStr = ceilingMatch[2];
      ctxPct = parseInt(ceilingMatch[3], 10);
      remainShort = ceilingMatch[4];
    }

    const curCtxMatch = (rows['当前上下文'] || '').match(
      /([\d,]+)\s*\(新增\s*([\d,]+)\s*\+\s*缓存\s*([\d,]+),\s*([\d.]+)%\)/
    );
    const exactUsed = curCtxMatch ? parseIntSafe(curCtxMatch[1]) : 0;
    const exactFresh = curCtxMatch ? parseIntSafe(curCtxMatch[2]) : 0;
    const exactCache = curCtxMatch ? parseIntSafe(curCtxMatch[3]) : 0;
    const lastCacheRate = curCtxMatch ? curCtxMatch[4] + '%' : '--';

    const stepOutMatch = (rows['本步输出量'] || '').match(
      /([\d,]+)\s*\(思考链\s*([\d,]+)\s*\+\s*正文\/工具\s*([\d,]+)\)/
    );
    const stepOutExact = stepOutMatch ? stepOutMatch[1] : inlineOut;

    const totalDurMatch = (rows['响应耗时'] || '').match(/总计\s*([\d.]+s)/);
    const totalDur = totalDurMatch ? totalDurMatch[1] : '';

    const warnEl = ttBox.querySelector('.ag-tt-warn');
    const warnHtml = warnEl ? warnEl.outerHTML : '';

    const limitTokens = parseCeilingTokens(limitStr);
    const totalFrac =
      limitTokens > 0 && exactUsed > 0
        ? Math.min(1, Math.max(0, exactUsed / limitTokens))
        : Math.min(1, Math.max(0, ctxPct / 100));
    const cacheShare = exactUsed > 0 ? Math.min(1, Math.max(0, exactCache / exactUsed)) : 0;
    const cacheBarPct = (totalFrac * cacheShare * 100).toFixed(2);
    const freshBarPct = (totalFrac * (1 - cacheShare) * 100).toFixed(2);
    const remainTokens = limitTokens > 0 && exactUsed > 0 ? Math.max(0, limitTokens - exactUsed) : 0;
    if (remainShort === '--' && remainTokens > 0) {
      remainShort = fmtTok(remainTokens);
    }

    const pctDisplay = exactUsed > 0 && ctxPct === 0 ? '<1%' : `${ctxPct}%`;
    const ringFrac = exactUsed > 0 ? Math.max(0.03, Math.min(1, totalFrac)) : 0;
    const dashOffset = (RING_CIRC * (1 - ringFrac)).toFixed(2);
    const levelInfo = getLevelInfo(ctxPct);

    return {
      level: levelInfo.level,
      statusLabel: levelInfo.label,
      pctDisplay,
      ctxPct,
      usedShort,
      limitStr,
      remainShort,
      exactUsed,
      exactFresh,
      exactCache,
      lastCacheRate,
      cacheBarPct,
      freshBarPct,
      dashOffset,
      inlineSpeed,
      inlineLatency,
      latencyLabel,
      inlineOut,
      stepOutExact,
      totalDur,
      genLabel,
      sessionSummary,
      subBadgeText,
      warnDotTitle,
      turnRow,
      subRow,
      cumInText: rows['累计输入量'] || '',
      cumOutText: rows['累计输出量'] || '',
      warnHtml
    };
  }

  function buildInlineHtml(m) {
    const ringSvg =
      `<svg class="ag-ctx-ring" viewBox="0 0 18 18" aria-hidden="true">` +
      `<circle class="ag-ctx-ring-track" cx="9" cy="9" r="${RING_RADIUS}" stroke-width="2.2"></circle>` +
      `<circle class="ag-ctx-ring-fill" cx="9" cy="9" r="${RING_RADIUS}" stroke-width="2.2" ` +
      `stroke-linecap="round" transform="rotate(-90 9 9)" ` +
      `stroke-dasharray="${RING_CIRC.toFixed(3)}" stroke-dashoffset="${m.dashOffset}"></circle>` +
      `</svg>`;

    const capsule =
      `<span class="ag-ctx-capsule" data-ctx-level="${m.level}" title="点击固定或悬停查看上下文容量详情">` +
      ringSvg +
      `<span class="ag-ctx-pct">${escHtml(m.pctDisplay)}</span>` +
      `<span class="ag-ctx-ratio">${escHtml(m.usedShort)}/${escHtml(m.limitStr)}</span>` +
      `</span>`;

    const tailParts = [`<span>${escHtml(m.inlineSpeed)} tok/s</span>`, `<span>Out ${escHtml(m.inlineOut)}</span>`];
    if (m.subBadgeText) {
      tailParts.push(`<span class="ag-sub-badge">${escHtml(m.subBadgeText)}</span>`);
    }
    if (m.warnDotTitle) {
      tailParts.push(`<span class="ag-zh-warn-dot" title="${escHtml(m.warnDotTitle)}">●</span>`);
    }

    const tail = `<span class="ag-ctx-tail">${tailParts.join('<span class="ag-ctx-tail-sep">·</span>')}</span>`;
    return `${capsule} ${tail}`;
  }

  function buildTooltipHtml(m) {
    const exactUsedFmt = m.exactUsed > 0 ? m.exactUsed.toLocaleString('en-US') : m.usedShort;
    const cacheLegend = m.exactUsed > 0 ? fmtTok(m.exactCache) : '--';
    const freshLegend = m.exactUsed > 0 ? fmtTok(m.exactFresh) : '--';

    const footRows = [];
    if (m.turnRow) {
      footRows.push(
        `<div class="ag-ctx-foot-row"><span class="ag-ctx-foot-lbl">${escHtml(m.turnRow.lbl)}</span><span class="ag-ctx-foot-val">${escHtml(m.turnRow.val)}</span></div>`
      );
    }
    if (m.subRow) {
      footRows.push(
        `<div class="ag-ctx-foot-row"><span class="ag-ctx-foot-lbl">${escHtml(m.subRow.lbl)}</span><span class="ag-ctx-foot-val">${escHtml(m.subRow.val)}</span></div>`
      );
    }
    if (m.cumInText) {
      footRows.push(
        `<div class="ag-ctx-foot-row"><span class="ag-ctx-foot-lbl">累计输入</span><span class="ag-ctx-foot-val">${escHtml(m.cumInText)}</span></div>`
      );
    }
    if (m.cumOutText) {
      footRows.push(
        `<div class="ag-ctx-foot-row"><span class="ag-ctx-foot-lbl">累计输出</span><span class="ag-ctx-foot-val">${escHtml(m.cumOutText)}</span></div>`
      );
    }

    return [
      `<div class="ag-ctx-card">`,
      `  <div class="ag-ctx-head">`,
      `    <div class="ag-ctx-head-left">`,
      `      <span class="ag-ctx-title">上下文窗口容量</span>`,
      `      <span class="ag-ctx-status-pill">${escHtml(m.statusLabel)} · ${escHtml(m.pctDisplay)}</span>`,
      `    </div>`,
      `    <div class="ag-ctx-head-right">`,
      m.genLabel ? `<span class="ag-ctx-gen">${escHtml(m.genLabel)}</span>` : '',
      `      <span class="ag-ctx-pin-hint">点击固定</span>`,
      `      <button type="button" class="ag-ctx-close-btn" aria-label="关闭详情卡" title="关闭">×</button>`,
      `    </div>`,
      `  </div>`,
      `  <div class="ag-ctx-bar-wrap">`,
      `    <div class="ag-ctx-bar-track">`,
      `      <div class="ag-ctx-bar-cache" style="width:${m.cacheBarPct}%"></div>`,
      `      <div class="ag-ctx-bar-fresh" style="width:${m.freshBarPct}%"></div>`,
      `      <span class="ag-ctx-bar-tick" style="left:50%"></span>`,
      `      <span class="ag-ctx-bar-tick" style="left:80%"></span>`,
      `    </div>`,
      `    <div class="ag-ctx-legend">`,
      `      <span class="ag-ctx-legend-item"><i class="ag-ctx-dot ag-ctx-dot-cache"></i>缓存 ${escHtml(cacheLegend)}</span>`,
      `      <span class="ag-ctx-legend-item"><i class="ag-ctx-dot ag-ctx-dot-fresh"></i>新增 ${escHtml(freshLegend)}</span>`,
      `      <span class="ag-ctx-legend-item"><i class="ag-ctx-dot ag-ctx-dot-remain"></i>距压缩余 ${escHtml(m.remainShort)}</span>`,
      `    </div>`,
      `  </div>`,
      `  <div class="ag-ctx-stat-grid">`,
      `    <div class="ag-ctx-stat-box">`,
      `      <span class="ag-ctx-stat-lbl">当前已用</span>`,
      `      <span class="ag-ctx-stat-val is-accent">${escHtml(m.usedShort)}</span>`,
      `      <span class="ag-ctx-stat-sub">${escHtml(exactUsedFmt)} tok</span>`,
      `    </div>`,
      `    <div class="ag-ctx-stat-box">`,
      `      <span class="ag-ctx-stat-lbl">模型上限</span>`,
      `      <span class="ag-ctx-stat-val">${escHtml(m.limitStr)}</span>`,
      `      <span class="ag-ctx-stat-sub">${escHtml(m.sessionSummary || '单轮动态水位')}</span>`,
      `    </div>`,
      `    <div class="ag-ctx-stat-box">`,
      `      <span class="ag-ctx-stat-lbl">剩余可用</span>`,
      `      <span class="ag-ctx-stat-val">${escHtml(m.remainShort)}</span>`,
      `      <span class="ag-ctx-stat-sub">占用 ${escHtml(m.pctDisplay)}</span>`,
      `    </div>`,
      `  </div>`,
      `  <div class="ag-ctx-speed-grid">`,
      `    <div class="ag-ctx-mini-item"><span class="ag-ctx-mini-lbl">输出速度</span><span class="ag-ctx-mini-val">${escHtml(m.inlineSpeed)} tok/s</span></div>`,
      `    <div class="ag-ctx-mini-item"><span class="ag-ctx-mini-lbl">${escHtml(m.latencyLabel)}</span><span class="ag-ctx-mini-val">${escHtml(m.inlineLatency)}</span></div>`,
      `    <div class="ag-ctx-mini-item"><span class="ag-ctx-mini-lbl">本步输出</span><span class="ag-ctx-mini-val">${escHtml(m.stepOutExact)}</span></div>`,
      `    <div class="ag-ctx-mini-item"><span class="ag-ctx-mini-lbl">缓存命中</span><span class="ag-ctx-mini-val">${escHtml(m.lastCacheRate)}</span></div>`,
      `  </div>`,
      footRows.length > 0 ? `  <div class="ag-ctx-foot">${footRows.join('')}</div>` : '',
      m.warnHtml || '',
      `</div>`
    ].join('');
  }

  function positionTooltip(pill, tt) {
    if (!pill || !tt || !pill.isConnected) return;
    const r = pill.getBoundingClientRect();
    if (!r.width && !r.height) return;
    const ttWidth = Math.min(388, Math.max(340, tt.offsetWidth || 388));
    const ttHeight = tt.offsetHeight || 260;
    const left = Math.max(12, Math.min(r.left, window.innerWidth - ttWidth - 12));
    tt.style.left = left + 'px';

    if (r.top >= ttHeight + 16) {
      tt.style.top = 'auto';
      tt.style.bottom = Math.max(12, window.innerHeight - r.top + 8) + 'px';
    } else {
      tt.style.bottom = 'auto';
      tt.style.top = Math.max(12, Math.min(r.bottom + 8, window.innerHeight - ttHeight - 12)) + 'px';
    }
  }

  function setPinned(pinned) {
    const pill = document.getElementById('ag-live-metrics-pill');
    const tt = document.getElementById('ag-live-metrics-tooltip');
    if (pinned && pill && tt && tt.innerHTML) {
      pill.setAttribute('data-pinned', '1');
      tt.setAttribute('data-pinned', '1');
      positionTooltip(pill, tt);
    } else {
      if (pill) pill.removeAttribute('data-pinned');
      if (tt) {
        tt.removeAttribute('data-pinned');
        tt.removeAttribute('data-visible');
      }
    }
  }

  const onMouseOver = (e) => {
    const pill = e.target && e.target.closest ? e.target.closest('#ag-live-metrics-pill') : null;
    if (!pill) return;
    const tt = document.getElementById('ag-live-metrics-tooltip');
    if (!tt || !tt.innerHTML) return;
    requestAnimationFrame(() => positionTooltip(pill, tt));
  };

  const onDocClick = (e) => {
    const target = e.target;
    if (!target || !target.closest) return;
    if (target.closest('#ag-live-metrics-tooltip .ag-ctx-close-btn')) {
      e.preventDefault();
      e.stopPropagation();
      setPinned(false);
      return;
    }
    const pill = target.closest('#ag-live-metrics-pill');
    if (pill) {
      e.preventDefault();
      e.stopPropagation();
      const tt = document.getElementById('ag-live-metrics-tooltip');
      const isPinned = tt && tt.getAttribute('data-pinned') === '1';
      setPinned(!isPinned);
      return;
    }
    if (!target.closest('#ag-live-metrics-tooltip')) {
      const tt = document.getElementById('ag-live-metrics-tooltip');
      if (tt && tt.getAttribute('data-pinned') === '1') {
        setPinned(false);
      }
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      const tt = document.getElementById('ag-live-metrics-tooltip');
      if (tt && tt.getAttribute('data-pinned') === '1') {
        setPinned(false);
      }
    }
  };

  document.addEventListener('mouseover', onMouseOver, true);
  document.addEventListener('click', onDocClick, true);
  document.addEventListener('keydown', onKeyDown, true);

  window.__ag_render_metrics = function (payload) {
    origRender.call(this, payload);
    try {
      const pill = document.getElementById('ag-live-metrics-pill');
      const tt = document.getElementById('ag-live-metrics-tooltip');
      if (!payload || !payload.hasData) {
        setPinned(false);
        if (tt) tt.removeAttribute('data-ctx-level');
        return;
      }
      const parsed = parseDaemonPayload(payload);
      if (!parsed || !pill) return;

      const textEl = pill.querySelector('#ag-live-metrics-text');
      const nextInline = buildInlineHtml(parsed);
      if (textEl && textEl.innerHTML !== nextInline) {
        textEl.innerHTML = nextInline;
      }

      if (tt) {
        tt.setAttribute('data-ctx-level', parsed.level);
        const nextTooltip = buildTooltipHtml(parsed);
        if (tt.innerHTML !== nextTooltip) {
          tt.innerHTML = nextTooltip;
        }
        if (tt.getAttribute('data-visible') === '1' || tt.getAttribute('data-pinned') === '1') {
          positionTooltip(pill, tt);
        }
      }

      if (typeof ctx.ensureMetricsPill === 'function') {
        ctx.ensureMetricsPill(true);
      }
    } catch (err) {
      console.error('[Antigravity Context UI] Render error:', err);
    }
  };

  ctx.onCleanup(() => {
    document.removeEventListener('mouseover', onMouseOver, true);
    document.removeEventListener('click', onDocClick, true);
    document.removeEventListener('keydown', onKeyDown, true);
    setPinned(false);
    const tt = document.getElementById('ag-live-metrics-tooltip');
    if (tt) tt.removeAttribute('data-ctx-level');
    if (window.__ag_render_metrics !== origRender) {
      window.__ag_render_metrics = origRender;
    }
  });

  if (ctx.metrics && ctx.metrics.hasData) {
    window.__ag_render_metrics(ctx.metrics);
  }
})();


/* ============================================================================
 * 外观设置原生胶囊扩展：放出全部 3 套白天主题（书卷暖白 / Claude 净白 / 复古羊皮纸）
 * 与原版 暖纸深夜 / 官方冷黑 无缝并列，共 6 键，0 改动 core/ 内核
 * ============================================================================ */
(() => {
  const LIGHT_EXTRAS = [
    {
      id: 'claude-desktop-purewhite',
      slotAttr: 'light-purewhite',
      label: 'Claude 净白（浅色）',
      // 极简四芒星净白图标（16x16 线性，与原生图标视觉字重一致）
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z"/><path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16z"/></svg>'
    },
    {
      id: 'vintage-deep',
      slotAttr: 'light-vintage',
      label: '复古羊皮纸（浅色）',
      // 极简复古卷轴/书页图标（16x16 线性）
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 21h12a2 2 0 0 0 2-2v-2H10v2a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v3h4"/><path d="M19 17V5a2 2 0 0 0-2-2H4"/><path d="M9 8h6"/><path d="M9 12h4"/></svg>'
    }
  ];

  let internalLightClick = false;
  const hookedLightBtns = new WeakSet();
  const attrObservers = [];

  function getActiveLightPreset() {
    const attr = document.documentElement.getAttribute('data-ag-preset');
    if (attr) return attr;
    try {
      const saved = Storage.prototype.getItem.call(localStorage, 'theme-color-flavor');
      if (saved) return saved;
    } catch (_) {}
    return (ctx && ctx.preset) || 'high-contrast';
  }

  function applyLightPreset(presetId) {
    try {
      Storage.prototype.setItem.call(localStorage, 'theme-color-flavor', presetId);
    } catch (_) {}
    document.documentElement.setAttribute('data-ag-preset', presetId);
    if (typeof ctx.syncPreset === 'function') {
      ctx.syncPreset();
    }
  }

  function syncLightExtraButtons() {
    const activePreset = getActiveLightPreset();
    const groups = document.querySelectorAll('[data-slot="toggle-group"][data-ag-theme-toggle-group="1"]');
    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      const lightBtn = group.querySelector('button[data-ag-native-theme-slot="light"]');
      if (!lightBtn) continue;

      const isExplicitLight =
        lightBtn.hasAttribute('data-pressed') || lightBtn.getAttribute('aria-pressed') === 'true';

      let activeExtraId = '';
      for (const spec of LIGHT_EXTRAS) {
        const btn = group.querySelector(`button[data-ag-light-extra-btn="${spec.id}"]`);
        if (!btn) continue;
        const isThisActive = isExplicitLight && activePreset === spec.id;
        if (isThisActive) {
          activeExtraId = spec.id;
          if (!btn.hasAttribute('data-pressed')) btn.setAttribute('data-pressed', '');
          if (btn.getAttribute('aria-pressed') !== 'true') btn.setAttribute('aria-pressed', 'true');
        } else {
          if (btn.hasAttribute('data-pressed')) btn.removeAttribute('data-pressed');
          if (btn.getAttribute('aria-pressed') !== 'false') btn.setAttribute('aria-pressed', 'false');
        }
      }

      if (activeExtraId) {
        if (group.getAttribute('data-ag-active-light') !== activeExtraId) {
          group.setAttribute('data-ag-active-light', activeExtraId);
        }
      } else {
        if (group.hasAttribute('data-ag-active-light')) {
          group.removeAttribute('data-ag-active-light');
        }
      }
    }
  }

  function mountLightExtrasOnGroup(group) {
    const lightBtn = group.querySelector('button[data-ag-native-theme-slot="light"]');
    if (!lightBtn) return;

    if (!lightBtn.getAttribute('title')) {
      lightBtn.setAttribute('title', '书卷暖白（浅色）');
    }

    if (!hookedLightBtns.has(lightBtn)) {
      hookedLightBtns.add(lightBtn);
      lightBtn.addEventListener(
        'click',
        () => {
          if (internalLightClick) return;
          applyLightPreset('high-contrast');
          requestAnimationFrame(syncLightExtraButtons);
        },
        true
      );
      const mo = new MutationObserver(() => syncLightExtraButtons());
      mo.observe(lightBtn, { attributes: true, attributeFilter: ['data-pressed', 'aria-pressed'] });
      attrObservers.push(mo);
    }

    for (const spec of LIGHT_EXTRAS) {
      if (group.querySelector(`button[data-ag-light-extra-btn="${spec.id}"]`)) continue;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = lightBtn.className;
      // 带上 data-ag-warm-night-btn（值非 "1"），可被原版 identifyNativeThemeButtons 安全跳过，不影响原版 3 键识别
      btn.setAttribute('data-ag-warm-night-btn', spec.slotAttr);
      btn.setAttribute('data-ag-light-extra-btn', spec.id);
      btn.setAttribute('aria-label', spec.label);
      btn.setAttribute('title', spec.label);
      btn.setAttribute('aria-pressed', 'false');
      btn.innerHTML = spec.svg;

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        applyLightPreset(spec.id);
        const alreadyLight =
          lightBtn.hasAttribute('data-pressed') || lightBtn.getAttribute('aria-pressed') === 'true';
        if (!alreadyLight) {
          internalLightClick = true;
          try {
            lightBtn.click();
          } finally {
            setTimeout(() => {
              internalLightClick = false;
              syncLightExtraButtons();
            }, 0);
          }
        }
        requestAnimationFrame(syncLightExtraButtons);
      });

      group.appendChild(btn);
    }

    syncLightExtraButtons();
  }

  function scanAppearanceGroups() {
    const groups = document.querySelectorAll('[data-slot="toggle-group"][data-ag-theme-toggle-group="1"]');
    for (let i = 0; i < groups.length; i++) {
      mountLightExtrasOnGroup(groups[i]);
    }
  }

  let scanScheduled = false;
  function scheduleScan() {
    if (scanScheduled) return;
    scanScheduled = true;
    requestAnimationFrame(() => {
      scanScheduled = false;
      scanAppearanceGroups();
    });
  }

  const domObserver = new MutationObserver(scheduleScan);
  domObserver.observe(document.body, { childList: true, subtree: true });
  scanAppearanceGroups();

  ctx.onCleanup(() => {
    try { domObserver.disconnect(); } catch (_) {}
    for (const mo of attrObservers) {
      try { mo.disconnect(); } catch (_) {}
    }
    attrObservers.length = 0;
    document.querySelectorAll('button[data-ag-light-extra-btn]').forEach((el) => el.remove());
    document.querySelectorAll('[data-ag-active-light]').forEach((g) => g.removeAttribute('data-ag-active-light'));
  });
})();
