// === Screen constants ===
const screenSimWidth = 800;
const screenHeight = 600;
const controlRodsStartPos = screenHeight * .1;

// Render resolution matching 1.7777 aspect ratio with 600px height.
const screenRenderWidth = 1067; // Math.ceil(600 * (16/9))
const waterColor = [52, 95, 214];

const settings = {
  neutronSpeed: 5,
  collisionProbability: 0.055,
  decayProbability: 0.0001,
  controlRodAbsorptionProbability: 0.1,
  controlRodHitProbability: 0.325,
  waterFlowSpeed: 0.3,
  heatingRate: 1500,
  uraniumToWaterHeatTransfer: 0.1,
  heatTransferCoefficient: 0.04,
  uraniumSize: 10,
  neutronSize: 80
};

const defaultSettings = { ...settings };

// === Misc shit ===
let uraniumAtoms = [];
let controlRods = [];
let waterCells = [];
let grid;
let boom = false;
let collisionReport;
let currentNeutronIndex = 0;
let font;
let energyOutput = 0;
let energyThisFrame = 0;
let energyOutputCounter = 0;
let tex;
let paused = false;



const glShit = {
  simGL: null,
  simCanvas: null,
  simProgram: null,
  renderProgram: null,
  readTex: null,
  writeTex: null,
  readFBO: null,
  writeFBO: null,
  quadVao: null,
  uNeutronsLoc: null,
  uRenderResLoc: null,
  uRenderTexSizeLoc: null,
  uRenderSimSizeLoc: null,
  uRenderNeutronSizeLoc: null,
  uRenderNeutronsLoc: null,
  reportTex: null,
  reportFBO: null,
  reportVao: null,
  reportData: null,
  useGpuSteam: false,

  shaderCodes: {
    simVertSrc: null,
    simFragSrc: null,
    rendVertSrc: null,
    rendFragSrc: null,
    reportVertSrc: null,
    reportFragSrc: null,
    atomsVertSrc: null,
    atomsFragSrc: null,
    steamVertSrc: null,
    steamFragSrc: null,
    simVertCode: null,
    simFragCode: null,
    rendVertCode: null,
    rendFragCode: null,
    reportVertCode: null,
    reportFragCode: null,
    atomsVertCode: null,
    atomsFragCode: null,
    steamVertCode: null,
    steamFragCode: null,
    atomsCoreFragCode: null,
    atomsCoreFragSrc: null
  }
};

const ui = {
  totalNeutrons: 0,
  decayNeutrons: 0,
  collisionNeutrons: 0,
  lastUpdateTime: performance.now(),
  collisionsThisSecond: 0,
  fpsText: 0,
  avgFps: 0,
  prevTime: 0,
  framesCounted: 0,
  meter: null,
  controlSlider: null
};

//scene variables
const uraniumAtomsCountX = 41;
const uraniumAtomsCountY = 30;
const uraniumAtomsSpacingX = screenSimWidth / uraniumAtomsCountX;
const uraniumAtomsSpacingY = screenHeight / uraniumAtomsCountY;
const controlRodCount = 5;
const controlRodWidth = 10;
const controlRodHeight = 600;
const NEUTRON_STRIDE = 4;
const MAX_NEUTRONS = 512;
const MAX_NEUTRONS_SQUARED = MAX_NEUTRONS * MAX_NEUTRONS;


function preload() {
  font = loadFont("HARRYP_.TTF");
  glShit.shaderCodes.simVertSrc = loadStrings('shaders/sim.vert');
  glShit.shaderCodes.simFragSrc = loadStrings('shaders/sim.frag');
  glShit.shaderCodes.rendVertSrc = loadStrings('shaders/render.vert');
  glShit.shaderCodes.rendFragSrc = loadStrings('shaders/render.frag');
  glShit.shaderCodes.reportVertSrc = loadStrings('shaders/report.vert');
  glShit.shaderCodes.reportFragSrc = loadStrings('shaders/report.frag');
  glShit.shaderCodes.atomsVertSrc = loadStrings('shaders/atoms.vert');
  glShit.shaderCodes.atomsFragSrc = loadStrings('shaders/atoms.frag');
  glShit.shaderCodes.atomsCoreFragSrc = loadStrings('shaders/atoms_core.frag');
  glShit.shaderCodes.steamVertSrc = loadStrings('shaders/steam.vert');
  glShit.shaderCodes.steamFragSrc = loadStrings('shaders/steam.frag');
  glShit.shaderCodes.bubblesVertSrc = loadStrings('shaders/bubbles.vert');
  glShit.shaderCodes.bubblesFragSrc = loadStrings('shaders/bubbles.frag');
}

function setup() {
  const cnv = createCanvas(screenRenderWidth, screenHeight, WEBGL);
  // Ensure the p5 canvas and simCanvas share the same positioned parent so
  // the WebGL overlay lines up (no unexpected offset from other DOM elements).
  cnv.parent('canvas-container');
  glShit.shaderCodes.simVertCode = glShit.shaderCodes.simVertSrc.join('\n');
  glShit.shaderCodes.simFragCode = glShit.shaderCodes.simFragSrc.join('\n');
  glShit.shaderCodes.rendVertCode = glShit.shaderCodes.rendVertSrc.join('\n');
  glShit.shaderCodes.rendFragCode = glShit.shaderCodes.rendFragSrc.join('\n');
  glShit.shaderCodes.reportVertCode = glShit.shaderCodes.reportVertSrc.join('\n');
  glShit.shaderCodes.reportFragCode = glShit.shaderCodes.reportFragSrc.join('\n');
  glShit.shaderCodes.atomsVertCode = glShit.shaderCodes.atomsVertSrc.join('\n');
  glShit.shaderCodes.atomsFragCode = glShit.shaderCodes.atomsFragSrc.join('\n');
  glShit.shaderCodes.atomsCoreFragCode = glShit.shaderCodes.atomsCoreFragSrc.join('\n');
  glShit.shaderCodes.steamVertCode = glShit.shaderCodes.steamVertSrc.join('\n');
  glShit.shaderCodes.steamFragCode = glShit.shaderCodes.steamFragSrc.join('\n');
  glShit.shaderCodes.bubblesVertCode = glShit.shaderCodes.bubblesVertSrc.join('\n');
  glShit.shaderCodes.bubblesFragCode = glShit.shaderCodes.bubblesFragSrc.join('\n');
  // Delegate initialization to helpers
  initShadersAndGL();
  collisionReport = new CollisionReport();
  initSceneObjects();
  eventListeners();

}

function draw() {
  //Menu and other similar goes here, before paused check


  if (paused) {
    //requestAnimationFrame(frame); //this will be used when we move away from p5
    return;
  }

  // Update neutrons in GPU
  gpuUpdateNeutrons(glShit.simGL);
  processCollisions(glShit.simGL);

  // Update CPU-side state
  updateScene();

  // Render p5 portion
  renderScene();

  // Core layer (steam + atom cores) on coreCanvas
  renderCoreLayer();

  // GPU overlays (steam/atoms/neutrons) on simCanvas
  renderSimOverlay();

  energyThisFrame = 0;
}