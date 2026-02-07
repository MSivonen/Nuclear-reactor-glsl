let screenHeight = 600;
let screenWidth = Math.floor(screenHeight * 1.7778);
let screenSimWidth = Math.floor(screenHeight * (4 / 3));
let SHOP_WIDTH = screenWidth - screenSimWidth;
let controlRodsStartPos = -screenHeight * .9;
let globalScale = screenHeight / 600;

const defaultSettings = {
  neutronSpeed: 5, // Restored to original speed now that simulation is fixed
  collisionProbability: 0.055,
  decayProbability: 0.0001,
  controlRodAbsorptionProbability: 0.1,
  controlRodHitProbability: 0.325,
  waterFlowSpeed: 0.15,
  heatingRate: 50,
  uraniumToWaterHeatTransfer: 0.3,
  heatTransferCoefficient: 0.04,
  inletTemperature: 25,
  moneyExponent: 1.5,
  uraniumSize: 10,
  neutronSize: 30,
  neutronsDownSizeMaxAmount:5000,
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

  settings.uraniumSize = settings.uraniumSize * globalScale;
  settings.neutronSize = settings.neutronSize * globalScale;
  settings.neutronSpeed = settings.neutronSpeed * globalScale;
}

function setup() {
  updateDimensions();

  noCanvas(); //For mouse etc, do not remove

  const gameCnv = document.getElementById('gameCanvas');
  gameCnv.width = screenRenderWidth;
  gameCnv.height = screenHeight;
}

(async () => {
  await loader.startLoading(loadingTasks, () => {
    loading = false;
    document.getElementById('loading-screen').style.display = 'none';
    audioManager.startAmbience();
  });
})();

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
