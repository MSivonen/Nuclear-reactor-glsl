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
  heatTransferCoefficient: 0.14,
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
var boom = false;
var boomStartTime = 0;
var energyOutput = 0;
let energyThisFrame = 0;
var energyOutputCounter = 0;
let lastMoneyPerSecond = 0;
let paused = false;
var renderTime = 0;
// States: LOADING, TITLE, PLAYING
let gameState = 'LOADING';

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

  const loadingTitle = document.getElementById('loading-title');
  loadingTitle.style.fontSize = (48 * globalScale) + 'px';

  const loadingSubtitle = document.getElementById('loading-subtitle');
  loadingSubtitle.style.fontSize = (20 * globalScale) + 'px';

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
  californium.updateDimensions();
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

      // Stop the title renderer/cleanup if needed?
      // titleRenderer.cleanup(); 

      audioManager.startAmbience();
    });

    // Tasks finished, now showing title screen while waiting for Start click
    gameState = 'TITLE';
    setUiVisibility(false);

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

  if (!paused) {
    renderTime += deltaTime / 1000.0;

    // Update CPU-side state
    updateScene();

    if (boom && boomStartTime == 0) {
      boomStartTime = renderTime;
      audioManager.playSfx('boom');
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

    const loadingTitle = document.getElementById('loading-title');
    loadingTitle.style.fontSize = (48 * globalScale) + 'px';

    const loadingSubtitle = document.getElementById('loading-subtitle');
    loadingSubtitle.style.fontSize = (20 * globalScale) + 'px';

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
