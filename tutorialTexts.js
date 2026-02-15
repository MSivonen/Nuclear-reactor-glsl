const TUTORIAL_PAGES = {
    start_welcome_1: {
        title: 'Decayed history',
        text: 'You bought a strange industrial building from an Ukrainian auction. As you arrive there, you notice a Swedish car branded Tserno outside. It emits an eerie hum... Or are your ears playing tricks on you? You don\'t waste many thoughts on the car, and step inside the building.',
        windowLayout: { x: 0.5, y: 0.44, width: 0.72, height: 0.30, relative: 'sim' }
    },
    start_welcome_2: {
        title: 'What does the inside of your nose smell like?',
        text: 'Inside the old building is some weird stuff that you don\'t recognize. It has a weird smell of ozone and burnt metal lingering in the air. You go in to explore.',
        highlightTarget: { type: 'panel', panel: 'controls' },
        windowLayout: { x: 0.5, y: 0.56, width: 0.72, height: 0.30, relative: 'sim' }
    },
    shop_unlock_10_money: {
        title: 'Shop!',
        text: 'You earned your first money. A dusty vending machine powers up and shows reactor upgrades for sale.',
        windowLayout: { x: 0.5, y: 0.30, width: 0.68, height: 0.28, relative: 'sim' }
    },
        shop_unlock_10_money_2: {
        title: 'Shop?',
        text: 'Really? A vending machine? Who the hell designs a vending machine for a nuclear reactor? You can\'t help but feel that this is some kind of a joke.',
        windowLayout: { x: 0.5, y: 0.30, width: 0.68, height: 0.28, relative: 'sim' }
    },
        shop_unlock_10_money_3: {
        title: 'Oh really...',
        text: 'Just for curiosity\'s sake, you search a trashcan, a ventilation shaft, and a kitchen cabinet. In disappointment, you do not find any ammo, coins, or stimpaks...',
        windowLayout: { x: 0.5, y: 0.30, width: 0.68, height: 0.28, relative: 'sim' }
    },
    unlock_atom: {
        title: 'Uranium Unlocked',
        text: 'Uranium can now be bought. More uranium means more targets for neutron hits and stronger chain reactions.',
        blinkLayer: 'uranium'
    },
    unlock_californium: {
        title: 'Californium Unlocked',
        text: 'Californium can now be used. It emits neutrons and helps kickstart stronger fission activity.',
        blinkLayer: 'neutrons'
    },
    unlock_group: {
        title: 'Uranium Groups Unlocked',
        text: 'You can now expand the reactor with whole uranium groups. Expansion increases both output and risk.',
        blinkLayer: 'uranium'
    },
    unlock_water_flow: {
        title: 'Water Valve Control',
        text: 'Manual water flow control is now unlocked. Flow speed directly affects cooling and power behavior.'
    },
    unlock_control_rod: {
        title: 'Control Rod Upgrades',
        text: 'Additional control rods are now available. Use them to tame neutron growth and stabilize the core.',
        blinkLayer: 'rods'
    },
    scram_intro: {
        title: 'What Is This Place?',
        text: 'You push a button labeled "Don\'t push" and the lights flicker on. A console blinks to life, displaying a single line of text: "Reactor core functional". The weird building starts to make sense. This is a retired nuclear reactor facility. Probably unsafe. Definitely useful.',
        windowLayout: { x: 0.5, y: 0.40, width: 0.70, height: 0.30, relative: 'sim' }
    },
    plutonium_intro_1: {
        title: 'Too Weak to Matter',
        text: 'This reactor is currently useless, it generates little to no power. You find a strange glowing green rock, and throw it into the reactor. Some water starts to boil instantly.',
        highlightTarget: { type: 'sim-object', object: 'plutonium' }
    },
    plutonium_intro_2: {
        title: 'Plutonium',
        text: 'This is plutonium, a highly radioactive element that can\'t sustain a chain reaction. It\'s just a heat source, and doesn\'t emit any neutrons.',
        highlightTarget: { type: 'sim-object', object: 'plutonium' }
    },
    heat_warning_1: {
        title: 'Heat Rising',
        text: 'An old thermometer flickers to life. Monitor the temperature to avoid an expensive and fiery life lesson.',
        highlightTarget: { type: 'sim-object', object: 'temp_meter' }
    },
    heat_warning_2: {
        title: 'Tempting',
        text: 'On the other hand, you do feel tempted to push the limits.'
    },
    first_power_output: {
        title: 'First Output',
        text: 'Suddenly a low hum fills the hall as the reactor begins to feel alive. You notice a dusty power meter moving slightly. It\'s a simple dial, but it gives you a sense of accomplishment. You wonder how high it can go.',
        highlightTarget: { type: 'sim-object', object: 'power_meter' }
    },
    income_intro: {
        title: 'Sell the Output',
        text: 'If this machine makes power, it can make money. Time to get rich.'
    },
    neutron_intro: {
        title: 'Neutrons',
        text: 'Uranium atoms spontaneously decay, releasing some neutrons slowly. When those neutrons hit other uranium atoms, they can cause them to decay on hit, and release two more neutrons. If there is enough uranium around, this will cause a (controlled) chain reaction.',
        blinkLayer: 'neutrons',
        windowLayout: { x: 0.5, y: 0.30, width: 0.70, height: 0.30, relative: 'sim' }
    },
    first_prestige_available: {
        title: 'A Strange Device',
        text: 'Near the reactor wall you spot a Y-shaped rig with three glowing channels and a pulsing central chamber. It looks home made and clumsy, but seems to be functional. This might have been a good time to find it.',
        windowLayout: { x: 0.5, y: 0.36, width: 0.75, height: 0.30, relative: 'sim' }
    },
    endless_mode_start: {
        title: 'Endless Phase',
        text: 'The Great Glow has taken control of you. You will do this over and over again, without end. May the Atom\'s blessing be upon you.'
    },
    shop_atom_purchase: {
        title: 'Uranium',
        text: 'Uranium pieces are the heart of your reactor. More pieces means more targets for neutrons to hit.',
        blinkLayer: 'uranium'
    },
    shop_group_purchase: {
        title: 'New Uranium Group',
        text: 'A new group increases reactor footprint and potential output. But there\'s always a risk with a reward.',
        blinkLayer: 'uranium'
    },
    shop_control_rod_purchase: {
        title: 'Control Rod Added',
        text: 'Control rods are used to slow down neutrons and make them more probable to hit uranium atoms.',
        blinkLayer: 'rods'
    },
    shop_water_flow_purchase: {
        title: 'Water Valve',
        text: 'Control the water flow to keep the reactor hot, but not overheating.'
    },
    shop_plutonium_purchase: {
        title: 'Denser Heat Source',
        text: 'Upgrading plutonium increases its heating power and size. Yay, your warm rock is now a bit warmer.',
        highlightTarget: { type: 'sim-object', object: 'plutonium' }
    },
    failed_prestige: {
        title: 'Not so great glow',
        text: 'You have failed the Atom\'s calling, the reactor is melting. You grab the device you found earlier and run to the car. You must escape. The clock of the car flickers and it snaps a bit backwards.'
    },
    successful_prestige: {
        title: 'Prestigeous!',
        text: 'The reactor collapses and reforms around a stronger baseline. You return stronger. The building emits a soft and appreciative hum. You feel a glow inside you.'
    }
};

const TUTORIAL_SEQUENCES = {
    start_welcome: ['start_welcome_1', 'start_welcome_2'],
    plutonium_intro: ['plutonium_intro_1', 'plutonium_intro_2'],
    heat_warning: ['heat_warning_1', 'heat_warning_2']
};

window.TUTORIAL_PAGES = TUTORIAL_PAGES;
window.TUTORIAL_SEQUENCES = TUTORIAL_SEQUENCES;