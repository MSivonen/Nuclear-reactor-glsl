let screenHeight = 900;
let screenWidth = Math.floor(screenHeight * 1.7778);
let screenSimWidth = Math.floor(screenHeight * (4 / 3));
let SHOP_WIDTH = screenWidth - screenSimWidth;
let controlRodsStartPos = -screenHeight * .9;
let globalScale = screenHeight / 600;

const defaultSettings = {
  neutronSpeed: 5,
  collisionProbability: 0.055,
  decayProbability: 0.0001,
  controlRodAbsorptionProbability: 0.1,
  controlRodHitProbability: 0.325,
  waterFlowSpeed: 0.15,
  heatingRate: 150,
  uraniumToWaterHeatTransfer: 0.2,
  heatTransferCoefficient: 0.14, //water to water
  inletTemperature: 25,
  moneyExponent: 1.5,
  uraniumSize: 10,
  neutronSize: 30,
  neutronsDownSizeMaxAmount: 5000,
  hitboxYScale: 2.6,
  linkRods: false,
  cheatMode: false
};
let settings = { ...defaultSettings };

let uraniumAtoms = [];
let controlRods = [];
let controlRodSlotXs = [];
let controlRodPurchaseCount = 0;
let controlRodUpgradeLevels = [];
let waterCells = [];
let grid;
let boom = false;
let boomStartTime = 0;
let boomOutcome = 'NONE';
let boomInputLocked = false;
let boomPrestigePopupShown = false;
let boomSetbackLoss = 0;
let energyOutput = 0;
let energyThisFrame = 0;
let energyOutputCounter = 0;
let lastMoneyPerSecond = 0;
let paused = false;
let renderTime = 0;
let gameState = 'LOADING';
let prestigeTransitionStartedAt = -1;
let prestigeScreen = null;

let waterSystem;
let plutonium;
let californium;
// let titleRenderer; // Removed to use window.titleRenderer directly

function setUiVisibility(visible) {
  const uiLayer = document.getElementById('ui-layer');
  if (uiLayer) {
    uiLayer.style.display = visible ? 'block' : 'none';
  }
  const uiCanvas = document.getElementById('UI-Canvas');
  if (uiCanvas) {
    uiCanvas.style.display = visible ? 'block' : 'none';
  }
}


const ui = {
  lastUpdateTime: performance.now(),
  collisionsThisSecond: 0,
  fpsText: 0,
  avgFps: 0,
  prevTime: 0,
  framesCounted: 0,
  accumulatedTime: 0,
  powerMeter: null,
  tempMeter: null,
  controlSlider: null
};

const game = {
  boomValue: 1000
}

function drawTitleRockBackground() {
  if (!window.titleRenderer) return;
  const gl = window.titleRenderer.gl;
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  window.titleRenderer.update(deltaTime / 1000.0, mouseX, mouseY, gl.canvas.width, gl.canvas.height);
  if (typeof window.titleRenderer.drawRockBackground === 'function') {
    window.titleRenderer.drawRockBackground(gl.canvas.width, gl.canvas.height);
  } else {
    window.titleRenderer.draw(gl.canvas.width, gl.canvas.height);
  }
}

function clearMainCanvasBlack() {
  if (!window.titleRenderer || !window.titleRenderer.gl) return;
  const gl = window.titleRenderer.gl;
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
}

function beginPrestigeTransition() {
  if (gameState === 'PRESTIGE_TRANSITION' || gameState === 'PRESTIGE') return;
  gameState = 'PRESTIGE_TRANSITION';
  prestigeTransitionStartedAt = renderTime;
  setUiVisibility(false);
  if (ui && ui.canvas && ui.canvas.canvas) {
    ui.canvas.canvas.style.display = 'block';
  }
}

function runPrestigeTransition() {
  if (!prestigeScreen) return;
  const elapsed = Math.max(0, renderTime - prestigeTransitionStartedAt);
  const visuals = prestigeScreen.getTransitionVisuals(elapsed);

  if (visuals.showBoom) {
    drawScene();
  } else if (visuals.showPrestige) {
    drawTitleRockBackground();
    const coords = (typeof getRelativeMouseCoords === 'function') ? getRelativeMouseCoords() : { x: mouseX, y: mouseY };
    prestigeScreen.updateHover(coords.x, coords.y);
    prestigeScreen.drawPrestigeScreen(visuals.prestigeAlpha);
  } else {
    clearMainCanvasBlack();
    prestigeScreen.clearOverlayCanvas();
  }

  prestigeScreen.drawGreenOverlay(visuals.greenAlpha);

  if (visuals.done) {
    gameState = 'PRESTIGE';
  }
}

function transitionToPlayingFromPrestige() {
  gameState = 'PLAYING';
  prestigeTransitionStartedAt = -1;
  setUiVisibility(true);
  if (ui && ui.canvas && ui.canvas.canvas) {
    ui.canvas.canvas.style.display = 'none';
  }
  paused = false;
}

window.transitionToPlayingFromPrestige = transitionToPlayingFromPrestige;

const uraniumAtomsCountX = 41;
const uraniumAtomsCountY = 30;
let uraniumAtomsSpacingX;
let uraniumAtomsSpacingY;
const controlRodCount = 5;
let controlRodWidth;
let controlRodHeight;
const NEUTRON_STRIDE = 4;
const MAX_NEUTRONS = 512;
const MAX_NEUTRONS_SQUARED = MAX_NEUTRONS * MAX_NEUTRONS;
function updateDimensions() {
  screenWidth = Math.floor(screenHeight * 1.7778);
  screenSimWidth = Math.floor(screenHeight * (4 / 3));
  SHOP_WIDTH = screenWidth - screenSimWidth;
  screenRenderWidth = screenWidth;

  globalScale = screenHeight / 600;

  uraniumAtomsSpacingX = screenSimWidth / uraniumAtomsCountX;
  uraniumAtomsSpacingY = screenHeight / uraniumAtomsCountY;

  controlRodWidth = 10 * globalScale;
  controlRodHeight = 600 * globalScale;
  controlRodsStartPos = -screenHeight * 0.9;

  settings.uraniumSize = defaultSettings.uraniumSize * globalScale;
  settings.neutronSize = defaultSettings.neutronSize * globalScale;
  settings.neutronSpeed = defaultSettings.neutronSpeed * globalScale;

  if (plutonium) plutonium.updateDimensions();

  if (californium) californium.updateDimensions();
}

function setup() {
  updateDimensions();

  // Resize DOM elements to match resolution
  const container = document.getElementById('canvas-container');
  container.style.width = screenWidth + 'px';
  container.style.height = screenHeight + 'px';

  const loadingPanel = document.getElementById('loading-panel');
  loadingPanel.style.width = (360 * globalScale) + 'px';
  loadingPanel.style.height = (260 * globalScale) + 'px';

  const loadingBarContainer = document.getElementById('loading-bar-container');
  loadingBarContainer.style.width = (220 * globalScale) + 'px';
  loadingBarContainer.style.height = (20 * globalScale) + 'px';

  const loadingPercentage = document.getElementById('loading-percentage');
  loadingPercentage.style.fontSize = (16 * globalScale) + 'px';

  const loadingTask = document.getElementById('loading-task');
  loadingTask.style.fontSize = (16 * globalScale) + 'px';

  const loadingStartBtn = document.getElementById('loading-start-btn');
  loadingStartBtn.style.fontSize = (18 * globalScale) + 'px';
  loadingStartBtn.style.padding = (12 * globalScale) + 'px ' + (28 * globalScale) + 'px';

  noCanvas(); //For mouse etc, do not remove

  const gameCnv = document.getElementById('gameCanvas');
  gameCnv.width = screenRenderWidth;
  gameCnv.height = screenHeight;

  plutonium = new Plutonium();
  californium = new Californium();
  prestigeScreen = (typeof PrestigeScreen !== 'undefined') ? new PrestigeScreen() : null;
  window.prestigeScreen = prestigeScreen;
  californium.updateDimensions();
  if (typeof plutonium.syncFromPlayer === 'function') {
    plutonium.syncFromPlayer();
  }
  plutonium.updateDimensions();
  // Show loading screen after we've resized DOM to avoid tiny flicker
  const loadingScreen = document.getElementById('loading-screen');
  if (loadingScreen) loadingScreen.style.display = 'flex';

  // Start loading now that canvas/DOM are correctly sized
  (async () => {
    await loader.startLoading(loadingTasks, () => {
      gameState = 'PLAYING';
      setUiVisibility(true);

      const loadingScreen = document.getElementById('loading-screen');
      if (loadingScreen) loadingScreen.style.display = 'none';

      audioManager.startAmbience();

      if (window.tutorialManager && typeof window.tutorialManager.onRunStarted === 'function') {
        window.tutorialManager.onRunStarted();
      }
    });

    gameState = 'TITLE';
    setUiVisibility(false);
    // Show title save-slot selection overlay
    try {
      if (ui && ui.canvas && typeof ui.canvas.showTitleSlotMenu === 'function') ui.canvas.showTitleSlotMenu();
    } catch (e) { /* ignore if UI not ready */ }

  })();
}

function draw() {
  if (gameState === 'LOADING') {
    return;
  }

  if (gameState === 'TITLE') {
    if (window.titleRenderer) {
      const gl = window.titleRenderer.gl;
      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      // Update title renderer
      window.titleRenderer.update(deltaTime / 1000.0, mouseX, mouseY, gl.canvas.width, gl.canvas.height);
      window.titleRenderer.draw(gl.canvas.width, gl.canvas.height);
    }
    return;
  }

  if (gameState === 'PRESTIGE_TRANSITION') {
    if (!paused) {
      renderTime += deltaTime / 1000.0;
    }
    runPrestigeTransition();
    return;
  }

  if (gameState === 'PRESTIGE') {
    drawTitleRockBackground();
    if (prestigeScreen) {
      const coords = (typeof getRelativeMouseCoords === 'function') ? getRelativeMouseCoords() : { x: mouseX, y: mouseY };
      prestigeScreen.updateHover(coords.x, coords.y);
      prestigeScreen.drawPrestigeScreen(1);
    }
    return;
  }

  if (!paused) {
    renderTime += deltaTime / 1000.0;

    if (!boom) {
      updateScene();
    } else if (boomOutcome === 'PRESTIGE' && boomStartTime > 0 && (renderTime - boomStartTime) >= 3) {
      beginPrestigeTransition();
      return;
    }
  }

  audioManager.update(deltaTime, settings, energyOutput, paused, game.boomValue);

  drawScene();
}

function windowResized() {
  updateDimensions();

  // Resize canvas
  const gameCnv = document.getElementById('gameCanvas');
  gameCnv.width = screenRenderWidth;
  gameCnv.height = screenHeight;

  // Resize DOM elements
  const container = document.getElementById('canvas-container');
  container.style.width = screenWidth + 'px';
  container.style.height = screenHeight + 'px';

  // If loading screen is visible, resize it too
  if (gameState === 'LOADING' || gameState === 'TITLE') {
    const loadingPanel = document.getElementById('loading-panel');
    loadingPanel.style.width = (360 * globalScale) + 'px';
    loadingPanel.style.height = (260 * globalScale) + 'px';

    const loadingBarContainer = document.getElementById('loading-bar-container');
    loadingBarContainer.style.width = (220 * globalScale) + 'px';
    loadingBarContainer.style.height = (20 * globalScale) + 'px';

    const loadingPercentage = document.getElementById('loading-percentage');
    loadingPercentage.style.fontSize = (16 * globalScale) + 'px';

    const loadingTask = document.getElementById('loading-task');
    loadingTask.style.fontSize = (16 * globalScale) + 'px';

    const loadingStartBtn = document.getElementById('loading-start-btn');
    loadingStartBtn.style.fontSize = (18 * globalScale) + 'px';
    loadingStartBtn.style.padding = (12 * globalScale) + 'px ' + (28 * globalScale) + 'px';
    loadingStartBtn.style.marginTop = '0px';

    const loadingStart = document.getElementById('loading-start');
    // Position start button at 15% from bottom of the canvas
    loadingStart.style.position = 'absolute';
    loadingStart.style.bottom = '15%';
    loadingStart.style.left = '50%';
    loadingStart.style.transform = 'translateX(-50%)';
    loadingStart.style.display = 'block';
    loadingStart.style.width = 'auto';
  }

  // Update dimensions for objects
  if (plutonium) plutonium.updateDimensions();
  if (californium) californium.updateDimensions();
}
