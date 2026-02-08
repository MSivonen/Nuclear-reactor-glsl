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
  heatingRate: 50,
  uraniumToWaterHeatTransfer: 0.3,
  heatTransferCoefficient: 0.14,
  inletTemperature: 25,
  moneyExponent: 1.5,
  uraniumSize: 10,
  neutronSize: 30,
  neutronsDownSizeMaxAmount:5000,
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
let loading = true;

let waterSystem;
let plutonium;
let californium;


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
      loading = false;
      if (loadingScreen) loadingScreen.style.display = 'none';
      audioManager.startAmbience();
    });
  })();
}

function draw() {
  if (loading) {
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
  if (loading) {
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
  }

  // Update dimensions for objects
  if (plutonium) plutonium.updateDimensions();
  if (californium) californium.updateDimensions();
}
