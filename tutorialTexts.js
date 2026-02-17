const TUTORIAL_PAGES = {
    start_welcome_1: {
        title: 'Decayed history',
        text: 'You won a strange industrial building from an East European lottery. As you arrive there, you notice a Swedish car branded Tserno outside. It emits a barely audible eerie hum... Or are your ears playing tricks on you? You don\'t waste many thoughts on the car, and step inside the building.',
        windowLayout: { x: 0.5, y: 0.44, width: 0.72, height: 0.30, relative: 'sim' }
    },
    start_welcome_2: {
        title: 'What does the inside of your nose smell like?',
        text: 'Inside the old building is some big industrial machines that you don\'t recognize. It has a slightly repulsive smell of ozone and burnt metal lingering in the air. You go in to explore.',
        windowLayout: { x: 0.5, y: 0.56, width: 0.72, height: 0.30, relative: 'sim' }
    },
    start_welcome_3: {
        title: 'ow.',
        text: 'You hit your toe on something hard. It\'s a fist-sized rock. It\'s a bit warm, and emits a faint green glow. You find the rock mildly interesting, so you put it in your pocket and continue to explore the building.',
        windowLayout: { x: 0.5, y: 0.56, width: 0.72, height: 0.30, relative: 'sim' }
    },
    shop_unlock_10_money: {
        title: 'Shop!',
        text: 'You earned your first money. A dusty vending machine powers up and shows reactor upgrades for sale.',
        windowLayout: { x: 0.5, y: 0.30, width: 0.68, height: 0.28, relative: 'sim' }
    },
    shop_unlock_10_money_2: {
        title: 'Shop?',
        text: 'Really? A vending machine? Who the hell thought it\'d be a good idea to have a vending machine for nuclear reactor parts? You can\'t help but feel this is some kind of a joke.',
        windowLayout: { x: 0.5, y: 0.30, width: 0.68, height: 0.28, relative: 'sim' }
    },
    shop_unlock_10_money_3: {
        title: 'Wanna play a game? Sure, let\'s play a game.',
        text: 'You stop to think for a bit. Just for curiosity\'s sake, you search a trashcan, a ventilation shaft, and a kitchen cabinet. In disappointment, you do not find any ammo, coins, or stimpaks...',
        windowLayout: { x: 0.5, y: 0.30, width: 0.68, height: 0.28, relative: 'sim' }
    },
    unlock_atom: {
        title: 'Uranium Unlocked', 
        text: 'The vending machine lets out a self-important beep. The button on it labeled Uranium lights up. More uranium means more targets for neutrons to hit. You need more of it to make any real power.',
        blinkLayer: 'uranium'
    },
    unlock_californium: {
        title: 'Dr. Feelgood',
        text: 'Californium can now be purchased. It is an element that emits a steady-ish stream of neutrons that can kickstart uranium chain reactions, or trigger a runaway in an existing chain reaction.',
    },
    unlock_group: {
        title: 'Uranium Groups Unlocked',//bad text.. something about vending machine? idk
        text: 'A new group increases reactor footprint and potential output. But there\'s always a risk with a reward.',
        blinkLayer: 'uranium'
    },
    unlock_water_flow: {
        title: 'Balancing the flow',
        text: 'Manual water flow control is now unlocked. Yes, for some reason there exists a valve that must be upgraded with money. How does that even work?'
    },
    unlock_control_rod: { 
        title: 'Moderating the control',
        text: 'Additional control rods are now available to purchase. They are also upgradeable to move further down. When a neutron hits a control rod, it slows down. A slower neutron is more likely to hit a uranium atom and cause it to decay.',
        blinkLayer: 'rods'
    },
    scram_intro: {
        title: 'What Is This Place?',
        text: 'You push a button labeled "AZ-5 - Don\'t push" and the lights flicker on. A console blinks to life, displaying a single line of text: "Reactor core panic! Operator meditating?". The weird building starts to make sense. This is an ancient prototype nuclear reactor facility. Probably unsafe. Definitely interesting.',
        windowLayout: { x: 0.5, y: 0.40, width: 0.70, height: 0.30, relative: 'sim' }
    },
    plutonium_intro_1: {
        title: 'Too Weak to Matter',
        text: 'This reactor seems to be useless - it generates little to no power. The rock in your pocket though is getting a bit warm, and emits an eerie green glow. A very nice glow, you seem to decide without even thinking about it. You assume it\'s not very good to store it close to your man-parts, and throw it into the reactor instead. Some water starts to boil instantly.',
        highlightTarget: { type: 'sim-object', object: 'plutonium' }
    },
    plutonium_intro_2: {
        title: 'Warm rock',
        text: 'This is plutonium, a highly radioactive element. When used inside a reactor, it\'s just a heat source, and doesn\'t emit any neutrons that would help sustain a chain reaction. But it might be better than nothing. At least it\'s pretty.',
        highlightTarget: { type: 'sim-object', object: 'plutonium' }
    },
    heat_warning_1: {
        title: 'Heat Rising',
        text: 'An old thermometer flickers to life. Bit by bit the building feels to wake up from its decades-long hibernation. You feel a slight glow inside you. Quite a pleasant glow indeed. Oh, by the way, you have to monitor the temperature and be careful not to overheat the core.',
        highlightTarget: { type: 'sim-object', object: 'temp_meter' }
    },
    heat_warning_2: {
        title: 'Tempting',
        text: 'On the other hand, you do feel a curious urge to push it to the limit, past the point of no return.',
    },
    first_power_output: {
        title: 'First Output',
        text: 'Suddenly a low hum fills the hall as the reactor begins to feel alive. You notice a dusty power meter moving slightly. It\'s a simple dial, but it gives you a sense of accomplishment. You wonder how high it can go.',
        highlightTarget: { type: 'sim-object', object: 'power_meter' }
    },
    income_intro: {
        title: 'Greed',
        text: 'If this machine can make power, it can make money. With good pay, you\'ll be okay.'
    },
    neutron_intro: {
        title: 'Yo science!',
        text: 'Uranium atoms spontaneously decay, releasing some neutrons slowly. When those neutrons hit other uranium atoms, they can cause them to decay on hit, and release two more neutrons and heat. If there is enough uranium around, this will cause a chain reaction, hopefully a controlled one.',
        blinkLayer: 'neutrons',
        windowLayout: { x: 0.5, y: 0.30, width: 0.70, height: 0.30, relative: 'sim' }
    },
    found_a_weird_device: {
        title: 'A Strange Device',
        text: 'Near the reactor wall you spot a Y-shaped rig with three dimly glowing channels and a pulsing central chamber. It looks home made and clumsy, but seems to be intact.',
        windowLayout: { x: 0.5, y: 0.36, width: 0.75, height: 0.30, relative: 'sim' }
    },
    first_prestige_available: {
        title: 'The Strange Device',
        text: 'The device on the reactor wall has its channels glowing brighter and the central chamber glowing bright. You feel the glow inside you warmer than ever.',
        windowLayout: { x: 0.5, y: 0.36, width: 0.75, height: 0.30, relative: 'sim' }
    },
    endless_mode_start: {
        title: 'An unquenchable thirst',
        text: 'The Great Glow has taken control of you. You will do this over and over again, without end. May the Atom\'s blessing be upon you.'
    },
    shop_atom_purchase: {
        title: 'New blocks in the dip',
        text: 'The vending machine clunks and whirs as it dispenses a piece of uranium into the reactor. You see little to no effect.',
        blinkLayer: 'uranium'
    },
    shop_group_purchase: {
        title: 'New Uranium Group',
        text: 'You have reactivated a whole new chamber of the reactor. There even seems to be a bit of uranium left behind in there.',
        blinkLayer: 'uranium'
    },
    shop_control_rod_purchase: { //actually triggers when a control rod is dragged
        title: 'Control Rod Controls',
        text: 'As you push the rod down to the core, the power meter is jumping up instead of down. You get the feeling this machine was built by people who valued excitement over safety.',
        blinkLayer: 'rods'
    },
    shop_water_flow_purchase: {
        title: 'Water Valve',
        text: 'Adjust the water flow to keep the reactor hot, but not overheating. Hot water and steam running to the turbines from the top of the reactor\'s core is what generates power.',
    },
    shop_plutonium_purchase: {
        title: 'Denser Heat Source',
        text: 'Upgrading plutonium increases its heating power and size. Yay, your warm rock is now a bit warmer.',
        highlightTarget: { type: 'sim-object', object: 'plutonium' }
    },
    shop_californium_purchase: {
        title: 'The heart of the spark... or the spark of the heart?',
        text: 'The vending machine groans as it drops a pellet of Californium-252 into the mix. It glows with a violet intensity of yellow. That description makes your teeth ache in a pleasant way.',
        highlightTarget: { type: 'sim-object', object: 'californium' }
    },
    failed_prestige: {
        title: 'Not so great glow',
        text: 'You have failed the Atom\'s calling, the reactor is melting. You grab the device you found earlier and run to the car. You must escape. The clock of the car flickers and it snaps a bit backwards.'
    },
    successful_prestige: {
        title: 'Prestigeous!',
        text: 'The reactor collapses and reforms around a stronger baseline. You return stronger. The building emits a soft and appreciative hum. You feel the glow inside you getting deeper.'
    }
};

const TUTORIAL_SEQUENCES = {
    start_welcome: ['start_welcome_1', 'start_welcome_2', 'start_welcome_3'],
    plutonium_intro: ['plutonium_intro_1', 'plutonium_intro_2'],
    heat_warning: ['heat_warning_1', 'heat_warning_2']
};

window.TUTORIAL_PAGES = TUTORIAL_PAGES;
window.TUTORIAL_SEQUENCES = TUTORIAL_SEQUENCES;