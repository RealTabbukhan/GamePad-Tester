/**
 * GPad Tester — Homepage Controller Tester
 * Handles the main interactive gamepad tester on the homepage.
 */

(function () {
  "use strict";

  // Elements
  const statusIndicator = document.getElementById("statusIndicator");
  const statusText = document.getElementById("statusText");
  const controllerTabs = document.getElementById("controllerTabs");
  const noControllerMsg = document.getElementById("noControllerMsg");
  const controllerVisual = document.getElementById("controllerVisual");
  const controllerInfo = document.getElementById("controllerInfo");
  const controllerName = document.getElementById("controllerName");
  const controllerMapping = document.getElementById("controllerMapping");
  const buttonGrid = document.getElementById("buttonGrid");
  const axesPanel = document.getElementById("axesPanel");
  const leftStickCanvas = document.getElementById("leftStickCanvas");
  const rightStickCanvas = document.getElementById("rightStickCanvas");
  const rawDataToggle = document.getElementById("rawDataToggle");
  const rawDataPanel = document.getElementById("rawDataPanel");
  const rawDataContent = document.getElementById("rawDataContent");

  let leftStickCtx, rightStickCtx;
  let rawDataVisible = false;

  // Stick trail history for path rendering
  const TRAIL_MAX = 60;
  let leftStickTrail = [];
  let rightStickTrail = [];

  // ---- Initialize ---- //
  function init() {
    setupStickCanvases();
    generateButtonGrid();
    setupTabs();
    setupRawDataToggle();
    setupControllerSVG();

    // Listen for gamepad events
    gamepadManager.on("connected", onControllerConnected);
    gamepadManager.on("disconnected", onControllerDisconnected);
    gamepadManager.on("poll", onPoll);
    gamepadManager.on("change", updateTabs);
  }

  // ---- Controller SVG ---- //
  function setupControllerSVG() {
    if (!controllerVisual) return;
    controllerVisual.innerHTML = `
      <svg viewBox="0 0 520 340" class="controller-visual__svg" xmlns="http://www.w3.org/2000/svg">
        <!-- Controller Body -->
        <defs>
          <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:var(--bg-surface-elevated);stop-opacity:1" />
            <stop offset="100%" style="stop-color:var(--bg-surface);stop-opacity:1" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        <!-- Main body shape -->
        <path d="M120,80 Q130,40 180,30 L340,30 Q390,40 400,80 L420,180 Q440,280 380,310 Q340,330 310,280 L280,240 Q270,230 260,230 L260,230 L240,230 Q230,230 220,240 L190,280 Q160,330 140,310 Q80,280 100,180 Z"
              fill="url(#bodyGrad)" stroke="var(--border-color-light)" stroke-width="2"/>

        <!-- Left grip -->
        <path d="M120,80 L100,180 Q80,280 140,310 Q145,312 150,305 L170,260 Q190,230 180,200 L140,100 Q135,85 120,80"
              fill="var(--bg-surface)" stroke="none" opacity="0.3"/>

        <!-- Right grip -->
        <path d="M400,80 L420,180 Q440,280 380,310 Q375,312 370,305 L350,260 Q330,230 340,200 L380,100 Q385,85 400,80"
              fill="var(--bg-surface)" stroke="none" opacity="0.3"/>

        <!-- Left Bumper (LB / L1) -->
        <rect id="svg-btn-4" x="135" y="35" width="65" height="22" rx="8"
              fill="var(--bg-surface-light)" stroke="var(--border-color-light)" stroke-width="1.5" class="svg-btn"/>
        <text x="167" y="50" text-anchor="middle" fill="var(--text-secondary)" font-size="10" font-weight="600" font-family="Inter,sans-serif" pointer-events="none">LB</text>

        <!-- Right Bumper (RB / R1) -->
        <rect id="svg-btn-5" x="320" y="35" width="65" height="22" rx="8"
              fill="var(--bg-surface-light)" stroke="var(--border-color-light)" stroke-width="1.5" class="svg-btn"/>
        <text x="352" y="50" text-anchor="middle" fill="var(--text-secondary)" font-size="10" font-weight="600" font-family="Inter,sans-serif" pointer-events="none">RB</text>

        <!-- Left Trigger (LT / L2) -->
        <rect id="svg-btn-6" x="140" y="10" width="55" height="20" rx="6"
              fill="var(--bg-surface-light)" stroke="var(--border-color-light)" stroke-width="1" class="svg-btn"/>
        <text x="167" y="24" text-anchor="middle" fill="var(--text-muted)" font-size="9" font-weight="600" font-family="Inter,sans-serif" pointer-events="none">LT</text>

        <!-- Right Trigger (RT / R2) -->
        <rect id="svg-btn-7" x="325" y="10" width="55" height="20" rx="6"
              fill="var(--bg-surface-light)" stroke="var(--border-color-light)" stroke-width="1" class="svg-btn"/>
        <text x="352" y="24" text-anchor="middle" fill="var(--text-muted)" font-size="9" font-weight="600" font-family="Inter,sans-serif" pointer-events="none">RT</text>

        <!-- Left Stick Base -->
        <circle cx="200" cy="130" r="32" fill="var(--bg-surface)" stroke="var(--border-color-light)" stroke-width="1.5"/>
        <circle id="svg-left-stick" cx="200" cy="130" r="18" fill="var(--bg-surface-light)" stroke="var(--border-color-light)" stroke-width="1.5" class="svg-stick"/>
        <!-- Left Stick Press (LS) -->
        <circle id="svg-btn-10" cx="200" cy="130" r="12" fill="transparent" class="svg-btn"/>

        <!-- Right Stick Base -->
        <circle cx="340" cy="200" r="32" fill="var(--bg-surface)" stroke="var(--border-color-light)" stroke-width="1.5"/>
        <circle id="svg-right-stick" cx="340" cy="200" r="18" fill="var(--bg-surface-light)" stroke="var(--border-color-light)" stroke-width="1.5" class="svg-stick"/>
        <!-- Right Stick Press (RS) -->
        <circle id="svg-btn-11" cx="340" cy="200" r="12" fill="transparent" class="svg-btn"/>

        <!-- D-pad -->
        <g id="svg-dpad">
          <!-- D-pad center -->
          <rect x="183" y="183" width="34" height="34" rx="4" fill="var(--bg-surface-light)" stroke="var(--border-color-light)" stroke-width="1"/>
          <!-- Up -->
          <rect id="svg-btn-12" x="191" y="168" width="18" height="22" rx="4"
                fill="var(--bg-surface-light)" stroke="var(--border-color-light)" stroke-width="1" class="svg-btn"/>
          <text x="200" y="182" text-anchor="middle" fill="var(--text-muted)" font-size="10" pointer-events="none">↑</text>
          <!-- Down -->
          <rect id="svg-btn-13" x="191" y="210" width="18" height="22" rx="4"
                fill="var(--bg-surface-light)" stroke="var(--border-color-light)" stroke-width="1" class="svg-btn"/>
          <text x="200" y="224" text-anchor="middle" fill="var(--text-muted)" font-size="10" pointer-events="none">↓</text>
          <!-- Left -->
          <rect id="svg-btn-14" x="168" y="191" width="22" height="18" rx="4"
                fill="var(--bg-surface-light)" stroke="var(--border-color-light)" stroke-width="1" class="svg-btn"/>
          <text x="179" y="204" text-anchor="middle" fill="var(--text-muted)" font-size="10" pointer-events="none">←</text>
          <!-- Right -->
          <rect id="svg-btn-15" x="210" y="191" width="22" height="18" rx="4"
                fill="var(--bg-surface-light)" stroke="var(--border-color-light)" stroke-width="1" class="svg-btn"/>
          <text x="221" y="204" text-anchor="middle" fill="var(--text-muted)" font-size="10" pointer-events="none">→</text>
        </g>

        <!-- Face Buttons (A/B/X/Y) -->
        <!-- Y / Triangle (top) -->
        <circle id="svg-btn-3" cx="370" cy="100" r="16" fill="var(--bg-surface-light)" stroke="var(--border-color-light)" stroke-width="1.5" class="svg-btn"/>
        <text x="370" y="105" text-anchor="middle" fill="var(--text-secondary)" font-size="12" font-weight="700" font-family="Inter,sans-serif" pointer-events="none">Y</text>

        <!-- B / Circle (right) -->
        <circle id="svg-btn-1" cx="400" cy="130" r="16" fill="var(--bg-surface-light)" stroke="var(--border-color-light)" stroke-width="1.5" class="svg-btn"/>
        <text x="400" y="135" text-anchor="middle" fill="var(--text-secondary)" font-size="12" font-weight="700" font-family="Inter,sans-serif" pointer-events="none">B</text>

        <!-- A / Cross (bottom) -->
        <circle id="svg-btn-0" cx="370" cy="160" r="16" fill="var(--bg-surface-light)" stroke="var(--border-color-light)" stroke-width="1.5" class="svg-btn"/>
        <text x="370" y="165" text-anchor="middle" fill="var(--text-secondary)" font-size="12" font-weight="700" font-family="Inter,sans-serif" pointer-events="none">A</text>

        <!-- X / Square (left) -->
        <circle id="svg-btn-2" cx="340" cy="130" r="16" fill="var(--bg-surface-light)" stroke="var(--border-color-light)" stroke-width="1.5" class="svg-btn"/>
        <text x="340" y="135" text-anchor="middle" fill="var(--text-secondary)" font-size="12" font-weight="700" font-family="Inter,sans-serif" pointer-events="none">X</text>

        <!-- Back / Select -->
        <rect id="svg-btn-8" x="237" y="115" width="22" height="14" rx="4"
              fill="var(--bg-surface-light)" stroke="var(--border-color-light)" stroke-width="1" class="svg-btn"/>
        <text x="248" y="125" text-anchor="middle" fill="var(--text-muted)" font-size="7" font-weight="600" font-family="Inter,sans-serif" pointer-events="none">BCK</text>

        <!-- Start -->
        <rect id="svg-btn-9" x="270" y="115" width="22" height="14" rx="4"
              fill="var(--bg-surface-light)" stroke="var(--border-color-light)" stroke-width="1" class="svg-btn"/>
        <text x="281" y="125" text-anchor="middle" fill="var(--text-muted)" font-size="7" font-weight="600" font-family="Inter,sans-serif" pointer-events="none">SRT</text>

        <!-- Home / Guide -->
        <circle id="svg-btn-16" cx="260" cy="155" r="12" fill="var(--bg-surface-light)" stroke="var(--border-color-light)" stroke-width="1" class="svg-btn"/>
        <text x="260" y="159" text-anchor="middle" fill="var(--text-muted)" font-size="8" font-family="Inter,sans-serif" pointer-events="none">⌂</text>
      </svg>
    `;
  }

  // ---- Stick Canvas Setup ---- //
  function setupStickCanvases() {
    if (leftStickCanvas) {
      const dpr = window.devicePixelRatio || 1;
      leftStickCanvas.width = 140 * dpr;
      leftStickCanvas.height = 140 * dpr;
      leftStickCtx = leftStickCanvas.getContext("2d");
      leftStickCtx.scale(dpr, dpr);
      drawStick(leftStickCtx, 0, 0);
    }
    if (rightStickCanvas) {
      const dpr = window.devicePixelRatio || 1;
      rightStickCanvas.width = 140 * dpr;
      rightStickCanvas.height = 140 * dpr;
      rightStickCtx = rightStickCanvas.getContext("2d");
      rightStickCtx.scale(dpr, dpr);
      drawStick(rightStickCtx, 0, 0);
    }
  }

  function drawStick(ctx, x, y, trail) {
    const cx = 70,
      cy = 70,
      r = 60;
    ctx.clearRect(0, 0, 140, 140);

    // Background circle
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Crosshairs
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - r, cy);
    ctx.lineTo(cx + r, cy);
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx, cy + r);
    ctx.stroke();

    // Inner rings
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.5, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.stroke();

    // Draw trail path (fading dots showing movement history)
    if (trail && trail.length > 1) {
      // Draw trail line
      ctx.beginPath();
      const firstPt = trail[0];
      ctx.moveTo(cx + firstPt.x * r, cy + firstPt.y * r);
      for (let i = 1; i < trail.length; i++) {
        ctx.lineTo(cx + trail[i].x * r, cy + trail[i].y * r);
      }
      ctx.strokeStyle = "rgba(6, 182, 212, 0.12)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Draw trail dots with fading opacity
      for (let i = 0; i < trail.length; i++) {
        const alpha = (i / trail.length) * 0.35;
        const dotSize = 1.2 + (i / trail.length) * 1.5;
        const tx = cx + trail[i].x * r;
        const ty = cy + trail[i].y * r;
        ctx.beginPath();
        ctx.arc(tx, ty, dotSize, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(6, 182, 212, ${alpha})`;
        ctx.fill();
      }
    }

    // Position dot
    const dotX = cx + x * r;
    const dotY = cy + y * r;

    // Glow
    ctx.beginPath();
    ctx.arc(dotX, dotY, 10, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(6, 182, 212, 0.2)";
    ctx.fill();

    // Dot
    ctx.beginPath();
    ctx.arc(dotX, dotY, 5, 0, Math.PI * 2);
    ctx.fillStyle = "#06b6d4";
    ctx.fill();

    // Line from center to dot
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(dotX, dotY);
    ctx.strokeStyle = "rgba(6, 182, 212, 0.4)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // ---- Button Grid Generation ---- //
  function generateButtonGrid() {
    if (!buttonGrid) return;
    const labels = [
      "A",
      "B",
      "X",
      "Y",
      "LB",
      "RB",
      "LT",
      "RT",
      "Back",
      "Start",
      "LS",
      "RS",
      "↑",
      "↓",
      "←",
      "→",
      "Home",
    ];

    buttonGrid.innerHTML = labels
      .map(
        (label, i) => `
      <div class="btn-indicator" id="btn-${i}" data-btn="${i}">
        <span class="btn-indicator__label">${label}</span>
        <span class="btn-indicator__value" id="btn-val-${i}">0.00</span>
      </div>
    `,
      )
      .join("");
  }

  // ---- Tabs ---- //
  function setupTabs() {
    if (!controllerTabs) return;
    controllerTabs.querySelectorAll(".controller-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        const index = parseInt(tab.dataset.index);
        gamepadManager.setActiveGamepad(index);

        controllerTabs
          .querySelectorAll(".controller-tab")
          .forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");

        // Trigger re-highlight animation on the no-controller box
        if (noControllerMsg && !noControllerMsg.classList.contains("hidden")) {
          noControllerMsg.classList.remove("re-highlight");
          // Force reflow to restart animation
          void noControllerMsg.offsetWidth;
          noControllerMsg.classList.add("re-highlight");
        }

        updateUI();
      });
    });
  }

  function updateTabs() {
    if (!controllerTabs) return;
    const connected = gamepadManager.getConnectedGamepads();
    const connectedIndices = new Set(connected.map((g) => g.index));

    controllerTabs.querySelectorAll(".controller-tab").forEach((tab) => {
      const index = parseInt(tab.dataset.index);
      const statusEl = tab.querySelector(".controller-tab__status");

      if (connectedIndices.has(index)) {
        tab.classList.add("connected");
        if (statusEl) statusEl.textContent = "Connected";
      } else {
        tab.classList.remove("connected");
        if (statusEl) statusEl.textContent = "Not found";
      }
    });
  }

  // ---- Raw Data Toggle ---- //
  function setupRawDataToggle() {
    if (rawDataToggle && rawDataPanel) {
      rawDataToggle.addEventListener("click", () => {
        rawDataVisible = !rawDataVisible;
        rawDataPanel.classList.toggle("hidden", !rawDataVisible);
        rawDataToggle.textContent = rawDataVisible
          ? "📊 Hide Raw Data"
          : "📊 Show Raw Data";
      });
    }
  }

  // ---- Controller Events ---- //
  function onControllerConnected(gp) {
    updateUI();
  }

  function onControllerDisconnected() {
    updateUI();
  }

  // ---- Main Poll Loop ---- //
  function onPoll() {
    const gp = gamepadManager.getActiveGamepad();
    if (!gp || !gp.connected) return;

    // Update buttons
    gp.buttons.forEach((btn, i) => {
      const el = document.getElementById(`btn-${i}`);
      const valEl = document.getElementById(`btn-val-${i}`);
      if (el) {
        el.classList.toggle("pressed", btn.pressed);
      }
      if (valEl) {
        valEl.textContent = btn.value.toFixed(2);
      }

      // Update SVG buttons
      const svgBtn = document.getElementById(`svg-btn-${i}`);
      if (svgBtn) {
        if (btn.pressed) {
          svgBtn.setAttribute("fill", "var(--accent-cyan)");
          svgBtn.setAttribute("filter", "url(#glow)");
        } else {
          svgBtn.setAttribute("fill", "var(--bg-surface-light)");
          svgBtn.removeAttribute("filter");
        }
      }
    });

    // Update analog sticks
    if (gp.axes.length >= 2 && leftStickCtx) {
      // Add to trail history
      leftStickTrail.push({ x: gp.axes[0], y: gp.axes[1] });
      if (leftStickTrail.length > TRAIL_MAX) leftStickTrail.shift();

      drawStick(leftStickCtx, gp.axes[0], gp.axes[1], leftStickTrail);
      const lsXEl = document.getElementById("lsX");
      const lsYEl = document.getElementById("lsY");
      if (lsXEl) lsXEl.textContent = gp.axes[0].toFixed(2);
      if (lsYEl) lsYEl.textContent = gp.axes[1].toFixed(2);

      // Move SVG left stick
      const svgLS = document.getElementById("svg-left-stick");
      if (svgLS) {
        svgLS.setAttribute("cx", 200 + gp.axes[0] * 18);
        svgLS.setAttribute("cy", 130 + gp.axes[1] * 18);
      }
    }

    if (gp.axes.length >= 4 && rightStickCtx) {
      // Add to trail history
      rightStickTrail.push({ x: gp.axes[2], y: gp.axes[3] });
      if (rightStickTrail.length > TRAIL_MAX) rightStickTrail.shift();

      drawStick(rightStickCtx, gp.axes[2], gp.axes[3], rightStickTrail);
      const rsXEl = document.getElementById("rsX");
      const rsYEl = document.getElementById("rsY");
      if (rsXEl) rsXEl.textContent = gp.axes[2].toFixed(2);
      if (rsYEl) rsYEl.textContent = gp.axes[3].toFixed(2);

      // Move SVG right stick
      const svgRS = document.getElementById("svg-right-stick");
      if (svgRS) {
        svgRS.setAttribute("cx", 340 + gp.axes[2] * 18);
        svgRS.setAttribute("cy", 200 + gp.axes[3] * 18);
      }
    }

    // Update triggers
    const ltBtn = gp.buttons[6];
    const rtBtn = gp.buttons[7];
    if (ltBtn) {
      const ltFill = document.getElementById("ltFill");
      const ltValue = document.getElementById("ltValue");
      if (ltFill) ltFill.style.height = ltBtn.value * 100 + "%";
      if (ltValue) ltValue.textContent = ltBtn.value.toFixed(2);
    }
    if (rtBtn) {
      const rtFill = document.getElementById("rtFill");
      const rtValue = document.getElementById("rtValue");
      if (rtFill) rtFill.style.height = rtBtn.value * 100 + "%";
      if (rtValue) rtValue.textContent = rtBtn.value.toFixed(2);
    }

    // Update raw data
    if (rawDataVisible && rawDataContent) {
      let raw = `Controller: ${gp.id}\n`;
      raw += `Mapping: ${gp.mapping}\n`;
      raw += `Timestamp: ${gp.timestamp.toFixed(2)}\n\n`;
      raw += `Buttons (${gp.buttons.length}):\n`;
      gp.buttons.forEach((b, i) => {
        raw += `  [${i.toString().padStart(2)}] ${gamepadManager.getButtonLabel(i).padEnd(5)} pressed:${b.pressed ? "✓" : "✗"} value:${b.value.toFixed(3)}\n`;
      });
      raw += `\nAxes (${gp.axes.length}):\n`;
      gp.axes.forEach((a, i) => {
        raw += `  [${i}] ${a.toFixed(4)}\n`;
      });
      rawDataContent.textContent = raw;
    }
  }

  // ---- Update UI State ---- //
  function updateUI() {
    const gp = gamepadManager.getActiveGamepad();
    const connected = gp && gp.connected;

    // Status indicator
    if (statusIndicator) {
      statusIndicator.className = `status-indicator status-indicator--${connected ? "connected" : "disconnected"}`;
    }
    if (statusText) {
      statusText.textContent = connected
        ? `${gp.id.split("(")[0].trim()}`
        : "No controllers detected";
    }

    // Show/hide elements
    if (noControllerMsg) noControllerMsg.classList.toggle("hidden", connected);
    if (controllerVisual)
      controllerVisual.classList.toggle("hidden", !connected);
    if (controllerInfo) controllerInfo.classList.toggle("hidden", !connected);
    if (axesPanel) axesPanel.classList.toggle("hidden", !connected);

    // Controller info
    if (connected) {
      if (controllerName) controllerName.textContent = gp.id;
      if (controllerMapping)
        controllerMapping.textContent = `Mapping: ${gp.mapping || "non-standard"}`;
    
      // Vibration badge
      const vibBadge = document.getElementById("vibrationBadge");
      if (vibBadge) {
        const hasVibration = gp.vibrationActuator || (gp.hapticActuators && gp.hapticActuators.length > 0);
        if (hasVibration) {
          vibBadge.textContent = "Vibration Supported ✓";
          vibBadge.className = "badge badge--success";
        } else {
          vibBadge.textContent = "No Vibration";
          vibBadge.className = "badge badge--secondary";
        }
        vibBadge.style.display = "inline-block";
      }
    }
  }

  // ---- Start ---- //
  document.addEventListener("DOMContentLoaded", init);
})();
