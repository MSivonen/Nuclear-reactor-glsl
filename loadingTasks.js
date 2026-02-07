function createShaderLoadTask(name, path, srcKey, codeKey) {
  return {
    name: `Loading ${name}`,
    func: async () => {
      const response = await fetch(path);
      const text = await response.text();
      glShit.shaderCodes[srcKey] = text.split('\n');
      glShit.shaderCodes[codeKey] = glShit.shaderCodes[srcKey].join('\n');
    }
  };
}

const loadingTasks = [
  createShaderLoadTask("simulation vertex shader", 'shaders/sim.vert', 'simVertSrc', 'simVertCode'),
  createShaderLoadTask("simulation fragment shader", 'shaders/sim.frag', 'simFragSrc', 'simFragCode'),
  createShaderLoadTask("neutron vertex shader", 'shaders/neutron.vert', 'rendVertSrc', 'rendVertCode'),
  createShaderLoadTask("neutron fragment shader", 'shaders/neutron.frag', 'rendFragSrc', 'rendFragCode'),
  createShaderLoadTask("report vertex shader", 'shaders/report.vert', 'reportVertSrc', 'reportVertCode'),
  createShaderLoadTask("report fragment shader", 'shaders/report.frag', 'reportFragSrc', 'reportFragCode'),
  createShaderLoadTask("atoms vertex shader", 'shaders/atoms.vert', 'atomsVertSrc', 'atomsVertCode'),
  createShaderLoadTask("atoms fragment shader", 'shaders/atoms.frag', 'atomsFragSrc', 'atomsFragCode'),
  createShaderLoadTask("atoms core fragment shader", 'shaders/atoms_core.frag', 'atomsCoreFragSrc', 'atomsCoreFragCode'),
  createShaderLoadTask("steam vertex shader", 'shaders/steam.vert', 'steamVertSrc', 'steamVertCode'),
  createShaderLoadTask("steam fragment shader", 'shaders/steam.frag', 'steamFragSrc', 'steamFragCode'),
  createShaderLoadTask("bubbles vertex shader", 'shaders/bubbles.vert', 'bubblesVertSrc', 'bubblesVertCode'),
  createShaderLoadTask("bubbles fragment shader", 'shaders/bubbles.frag', 'bubblesFragSrc', 'bubblesFragCode'),
  createShaderLoadTask("water vertex shader", 'shaders/water.vert', 'waterVertSrc', 'waterVertCode'),
  createShaderLoadTask("water fragment shader", 'shaders/water.frag', 'waterFragSrc', 'waterFragCode'),
  createShaderLoadTask("explosion vertex shader", 'shaders/explosion.vert', 'explosionVertSrc', 'explosionVertCode'),
  createShaderLoadTask("explosion fragment shader", 'shaders/explosion.frag', 'explosionFragSrc', 'explosionFragCode'),
  {
      name: "Pre-Initializing Neutron System",
      func: () => {
        window.neutron = new Neutron();
      }
  },
  {
    name: "Initializing shaders and GL",
    func: () => initShadersAndGL()
  },
  {
    name: "Initializing simulation objects",
    func: () => initSimulationObjects()
  },
  {
    name: "Creating economy objects",
    func: () => {
      upgrades = new Upgrades();
      player = new Player();
      player.updateWaterFlowLimits();
      settings.waterFlowSpeed = player.waterFlowStart;
      shop = new Shop();
      initializePlayerAtomGroups(player);
      playerState = new PlayerState();
    }
  },
  {
    name: "Initializing UI objects",
    func: () => initUiObjects()
  },
  {
    name: "Initializing control rod upgrades",
    func: () => initControlRodUpgrades()
  },
  {
    name: "Setting up event listeners",
    func: () => eventListeners()
  },
  {
    name: "Initializing audio context",
    func: () => audioManager.init()
  },
  ...audioManager.assets.map(asset => ({
    name: `Loading sound: ${asset.key}`,
    func: () => audioManager.loadSoundPromise(asset.key, asset.path)
  })),
  {
    name: "Configuring audio tracks",
    func: async () => {
      audioManager.setupTracks(ui.canvas.uiSettings.audio);
    }
  }
];