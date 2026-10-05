/* Four Groups for Games in Time.
   Sixteen words hide four groups of four. Pick four words that share something and press Submit.
   A right group locks in with its colour and its name. You may make four mistakes.
   Every puzzle has one red herring: a word that seems to fit one group but belongs in another.

   The mechanic is the 2023 newspaper puzzle by Wyna Liu. The name, look, sounds and all 46 puzzles here
   are our own, written for this site, with subjects from its halls, science, maths, geography and wordplay.

   How the file is organised:
     Part 1  The puzzles. Each was checked by hand, and by a little program, to have only one answer.
     Part 2  The rules. Checking a guess, "one away", and the daily puzzle.
     Part 3  The screen. The tiles, the groups found, the mistakes, the share grid and the list of puzzles.

   See docs/ADDING-A-GAME.md for the contract every game follows. */
(function () {
  'use strict';

  var MISTAKES = 4;          /* mistakes allowed */
  var DAY_MS = 86400000;
  var FIRST_DAY = Date.UTC(2026, 9, 1);   /* 1 October 2026 shows puzzle 1 */

  /* =====================================================================
     PART 1: THE PUZZLES
     ===================================================================== */
  /* Each puzzle: four groups, easiest first (yellow, green, blue, purple). Each group is
     [category, word, word, word, word]. `trap` is shown after the puzzle: it explains the red herring. */
  var PUZZLES = [
    { g: [['Fruits', 'APPLE', 'MANGO', 'GRAPE', 'LEMON'],
          ['Planets', 'MARS', 'VENUS', 'EARTH', 'SATURN'],
          ['Colours of the rainbow', 'ORANGE', 'YELLOW', 'INDIGO', 'VIOLET'],
          ['___ + BALL', 'FOOT', 'BASKET', 'NET', 'SNOW']],
      trap: 'ORANGE looks like a fruit, but the rainbow needs it: red, orange, yellow, green, blue, indigo, violet.' },
    { g: [['Garden tools', 'RAKE', 'HOE', 'TROWEL', 'HOSE'],
          ['Gemstones', 'RUBY', 'EMERALD', 'SAPPHIRE', 'OPAL'],
          ['Card suits', 'HEART', 'CLUB', 'DIAMOND', 'SPADE'],
          ['___ + LIGHT', 'MOON', 'FLASH', 'TRAFFIC', 'CANDLE']],
      trap: 'SPADE is a garden tool and DIAMOND is a gem, but the card suits need them both. The opal is Australia\'s national gemstone.' },
    { g: [['Australian animals', 'KOALA', 'WOMBAT', 'EMU', 'PLATYPUS'],
          ['Famous scientists', 'NEWTON', 'CURIE', 'EINSTEIN', 'GALILEO'],
          ['Australian capital cities', 'PERTH', 'HOBART', 'BRISBANE', 'DARWIN'],
          ['___ + FISH', 'STAR', 'JELLY', 'GOLD', 'CAT']],
      trap: 'Charles DARWIN was a famous scientist, and the port of Darwin was named after him in 1839. Here Darwin is the capital of the Northern Territory.' },
    { g: [['Shapes', 'CIRCLE', 'SQUARE', 'OVAL', 'HEXAGON'],
          ['Musical instruments', 'VIOLIN', 'CELLO', 'HARP', 'TRIANGLE'],
          ['Things with keys', 'PIANO', 'COMPUTER', 'TYPEWRITER', 'MAP'],
          ['Hidden body part', 'CHINA', 'SHIP', 'FARM', 'EARTH']],
      trap: 'TRIANGLE is a shape, but here it is an instrument. PIANO is an instrument, but the keys group needs it. A map\'s key explains its symbols. The hidden body parts: CHINa, sHIP, fARM, EARth.' },
    { g: [['Weather', 'RAIN', 'HAIL', 'SLEET', 'FOG'],
          ['Out in space', 'COMET', 'ASTEROID', 'GALAXY', 'NEBULA'],
          ['Things with tails', 'KITE', 'COIN', 'TADPOLE', 'PLANE'],
          ['___ + DROP', 'TEAR', 'GUM', 'BACK', 'COUGH']],
      trap: 'RAIN makes a raindrop, but the weather needs it. A COMET has a glowing tail, but it belongs out in space. A coin has heads and tails.' },
    { g: [['Board games', 'LUDO', 'DRAUGHTS', 'CHESS', 'HALMA'],
          ['Card games', 'SNAP', 'RUMMY', 'PATIENCE', 'GO FISH'],
          ['Playground games', 'HOPSCOTCH', 'CONKERS', 'SKIPPING', 'TAG'],
          ['Lose your ___', 'MARBLES', 'TEMPER', 'BALANCE', 'VOICE']],
      trap: 'MARBLES is a playground game (it is in our Schoolyard hall), but you can also lose your marbles. You can lose your PATIENCE too, but the card games need it.' },
    { g: [['At the ice-cream shop', 'CONE', 'SCOOP', 'SPRINKLES', 'SUNDAE'],
          ['Ancient Egypt', 'PHARAOH', 'SPHINX', 'NILE', 'PYRAMID'],
          ['3D shapes', 'CUBE', 'SPHERE', 'CYLINDER', 'PRISM'],
          ['Words for mother', 'MAMA', 'MA', 'MOTHER', 'MUMMY']],
      trap: 'CONE and PYRAMID are 3D shapes, and MUMMY sounds like Ancient Egypt, but each one is needed in another group.' },
    { g: [['Feelings', 'JOY', 'ANGER', 'FEAR', 'SURPRISE'],
          ['Things that sting', 'BEE', 'WASP', 'NETTLE', 'JELLYFISH'],
          ['Animal groups', 'PRIDE', 'POD', 'SWARM', 'MOB'],
          ['___ + CORN', 'POP', 'UNI', 'PEPPER', 'SWEET']],
      trap: 'PRIDE is a feeling, but it is also a group of lions. A group of whales is a pod, and a group of kangaroos is a mob.' },
    { g: [['Ways to cook an egg', 'FRIED', 'BOILED', 'POACHED', 'SCRAMBLED'],
          ['In your skeleton', 'RIB', 'FEMUR', 'PELVIS', 'SPINE'],
          ['Parts of a book', 'COVER', 'PAGE', 'CHAPTER', 'INDEX'],
          ['___ + FINGER', 'FISH', 'LITTLE', 'LADY', 'RING']],
      trap: 'A book has a SPINE, and you have an INDEX finger, but the skeleton needs the spine and the book needs its index.' },
    { g: [['Birds', 'EAGLE', 'OWL', 'PARROT', 'PENGUIN'],
          ['Made from clay', 'CHINA', 'BRICK', 'POT', 'TILE'],
          ['Countries', 'FRANCE', 'BRAZIL', 'KENYA', 'TURKEY'],
          ['Starts with a vehicle', 'CARROT', 'BUSY', 'VANILLA', 'TRAMPOLINE']],
      trap: 'TURKEY is a bird and CHINA is a country. Here TURKEY is the country (its government now asks for the name Türkiye), and CHINA means fine plates and cups made from clay.' },
    { g: [['Vegetables', 'PUMPKIN', 'CARROT', 'POTATO', 'PEA'],
          ['Insects', 'BEETLE', 'ANT', 'MOTH', 'WASP'],
          ['Played on a court', 'TENNIS', 'SQUASH', 'NETBALL', 'BADMINTON'],
          ['Played with a bat', 'CRICKET', 'BASEBALL', 'ROUNDERS', 'SOFTBALL']],
      trap: 'SQUASH is a vegetable and a CRICKET is an insect, but here they are both sports.' },
    { g: [['Places to stay', 'MOTEL', 'HOSTEL', 'CABIN', 'TENT'],
          ['Dances', 'WALTZ', 'BALLET', 'LIMBO', 'TANGO'],
          ['Radio alphabet words', 'OSCAR', 'BRAVO', 'ECHO', 'HOTEL'],
          ['Ends with a number', 'OFTEN', 'CANINE', 'WEIGHT', 'PHONE']],
      trap: 'HOTEL looks like a place to stay, but pilots say Hotel for the letter H. TANGO means T on the radio, but the dances need it. The numbers: ofTEN, caNINE, wEIGHT, phONE.' },
    { g: [['Gives off light', 'LAMP', 'CANDLE', 'LANTERN', 'STAR'],
          ['Gases', 'OXYGEN', 'HELIUM', 'HYDROGEN', 'NEON'],
          ['At the Olympics', 'MEDAL', 'PODIUM', 'RINGS', 'TORCH'],
          ['___ + WORM', 'BOOK', 'SILK', 'EARTH', 'INCH']],
      trap: 'A TORCH and a NEON sign both give off light, but the Olympics need the torch and the gases need neon.' },
    { g: [['Hats', 'BEANIE', 'BERET', 'CAP', 'BONNET'],
          ['Capital cities', 'PARIS', 'ROME', 'CAIRO', 'TOKYO'],
          ['Footwear', 'SANDAL', 'SLIPPER', 'SNEAKER', 'WELLINGTON'],
          ['Parts of a car', 'WHEEL', 'HORN', 'BRAKE', 'BOOT']],
      trap: 'WELLINGTON is the capital of New Zealand, but it is also a rubber boot. In Australia a car has a BONNET and a BOOT, but the hats need the bonnet.' },
    { g: [['Even numbers', 'TWO', 'SIX', 'EIGHT', 'TEN'],
          ['Square numbers', 'ONE', 'FOUR', 'NINE', 'SIXTEEN'],
          ['Prime numbers', 'THREE', 'FIVE', 'SEVEN', 'ELEVEN'],
          ['Sounds like a number', 'WON', 'TOO', 'FOR', 'ATE']],
      trap: 'TWO is the only even prime number, so it could join the primes, but the even numbers need it. FOUR and SIXTEEN are even, but they are square numbers (2 × 2 and 4 × 4).' },
    { g: [['Baby animals', 'CUB', 'FOAL', 'JOEY', 'CALF'],
          ['Young people', 'TODDLER', 'TEEN', 'INFANT', 'KID'],
          ['Parts of the leg', 'SHIN', 'THIGH', 'ANKLE', 'KNEE'],
          ['Silent K', 'KNOT', 'KNIT', 'KNOCK', 'KNOB']],
      trap: 'A KID is a baby goat, your CALF is part of your leg, and KNEE has a silent K. Each of them fits two groups.' },
    { g: [['Royal things', 'THRONE', 'SCEPTRE', 'PALACE', 'CROWN'],
          ['Weights', 'GRAM', 'OUNCE', 'TONNE', 'POUND'],
          ['Australian money before 1966', 'PENNY', 'SHILLING', 'FLORIN', 'SIXPENCE'],
          ['Things with teeth', 'COMB', 'SAW', 'ZIP', 'GEAR']],
      trap: 'Until 1966 Australians paid in pounds, and there was even a CROWN coin worth five shillings. Here POUND is a weight and CROWN is royal.' },
    { g: [['Boats', 'CANOE', 'YACHT', 'FERRY', 'RAFT'],
          ['Times of day', 'DAWN', 'DUSK', 'MIDNIGHT', 'SUNSET'],
          ['Video game words', 'BOSS', 'PIXEL', 'SCORE', 'LEVEL'],
          ['Same backwards', 'KAYAK', 'RADAR', 'MADAM', 'NOON']],
      trap: 'KAYAK is a boat and NOON is a time of day, but both read the same backwards. LEVEL does too, but the video game words need it.' },
    { g: [['Kitchen tools', 'WHISK', 'LADLE', 'SPATULA', 'TONGS'],
          ['Breads', 'DAMPER', 'BAGEL', 'CRUMPET', 'PITA'],
          ['Gymnastics moves', 'CARTWHEEL', 'HANDSTAND', 'SPLITS', 'ROLL'],
          ['Ways to be lazy', 'LAZE', 'LOUNGE', 'IDLE', 'LOAF']],
      trap: 'A ROLL and a LOAF are both bread, but a roll is also a gymnastics move and to loaf is to laze about. Damper is a bush bread baked in the coals of a campfire.' },
    { g: [['Parts of a castle', 'MOAT', 'TOWER', 'DRAWBRIDGE', 'TURRET'],
          ['Chess pieces', 'KING', 'BISHOP', 'PAWN', 'KNIGHT'],
          ['Birds', 'CROW', 'ROBIN', 'WREN', 'ROOK'],
          ['___ + BEE', 'BUMBLE', 'SPELLING', 'HONEY', 'QUEEN']],
      trap: 'ROOK and QUEEN are chess pieces too. But a rook is also a bird, and a queen bee rules the hive.' },
    { g: [['Jobs', 'PILOT', 'CHEF', 'NURSE', 'DRIVER'],
          ['Simple machines', 'LEVER', 'PULLEY', 'SCREW', 'RAMP'],
          ['Golf clubs', 'PUTTER', 'IRON', 'WOOD', 'WEDGE'],
          ['Has a face but no eyes', 'CLOCK', 'CLIFF', 'DICE', 'CUBE']],
      trap: 'A DRIVER is a golf club, and a WEDGE is a simple machine. Here the driver has a job and the wedge plays golf.' },
    { g: [['Rivers', 'NILE', 'DANUBE', 'MURRAY', 'THAMES'],
          ['Greek letters', 'ALPHA', 'BETA', 'GAMMA', 'OMEGA'],
          ['Landforms', 'VALLEY', 'CANYON', 'PLATEAU', 'DELTA'],
          ['Animals that start with a body part', 'HIPPO', 'EARWIG', 'ARMADILLO', 'CHINCHILLA']],
      trap: 'DELTA is a Greek letter, but it is also the fan of land where a river spreads out into the sea. It got its name because it is shaped like the Greek letter.' },
    { g: [['Planets', 'JUPITER', 'SATURN', 'VENUS', 'NEPTUNE'],
          ['Famous spacecraft', 'APOLLO', 'VOYAGER', 'SPUTNIK', 'HUBBLE'],
          ['Metals', 'IRON', 'ZINC', 'NICKEL', 'MERCURY'],
          ['___ + SHIP', 'FRIEND', 'SPACE', 'LEADER', 'CHAMPION']],
      trap: 'MERCURY is a planet, but it is also a metal that is liquid at room temperature.' },
    { g: [['Drinks', 'COFFEE', 'COCOA', 'JUICE', 'MILK'],
          ['At the beach', 'TOWEL', 'BUCKET', 'SPADE', 'UMBRELLA'],
          ['Meals', 'LUNCH', 'DINNER', 'SUPPER', 'TEA'],
          ['Aussie slang', 'ARVO', 'FOOTY', 'SUNNIES', 'BREKKIE']],
      trap: 'In Australia TEA can mean the evening meal. BREKKIE (breakfast) and SUNNIES (sunglasses) look like they belong with meals and the beach, but they are Aussie slang, like arvo (afternoon).' },
    { g: [['Soups', 'TOMATO', 'PUMPKIN', 'MINESTRONE', 'PEA'],
          ['Bodies of water', 'LAKE', 'POND', 'LAGOON', 'SEA'],
          ['___ + KEEPER', 'GOAL', 'WICKET', 'ZOO', 'BEE'],
          ['Sounds like a letter', 'EYE', 'QUEUE', 'WHY', 'YOU']],
      trap: 'PEA, SEA and BEE sound like the letters P, C and B, but each one is needed in another group.' },
    { g: [['Parts of a plane', 'WINGS', 'TAIL', 'ENGINE', 'CABIN'],
          ['Parts of a clock', 'HANDS', 'FACE', 'ALARM', 'PENDULUM'],
          ['Parts of your face', 'NOSE', 'CHIN', 'BROW', 'LIP'],
          ['Words for boldness', 'NERVE', 'GUTS', 'DARING', 'CHEEK']],
      trap: 'A plane has a NOSE, and your face has a CHEEK. But CHEEK can also mean being bold, so the plane gives up its nose.' },
    { g: [['Oceans', 'PACIFIC', 'ATLANTIC', 'INDIAN', 'SOUTHERN'],
          ['Parts of a fish', 'FIN', 'GILL', 'TAIL', 'SCALE'],
          ['Music words', 'NOTE', 'CHORD', 'TEMPO', 'KEY'],
          ['Found on a map', 'COMPASS', 'GRID', 'TITLE', 'LEGEND']],
      trap: 'A map has a SCALE and a KEY, and music has scales too. But the fish needs its scale and the music needs its key.' },
    { g: [['Parts of a plant', 'STEM', 'LEAF', 'PETAL', 'SEED'],
          ['In the ocean', 'TIDE', 'WAVE', 'REEF', 'KELP'],
          ['Electricity', 'SWITCH', 'BATTERY', 'PLUG', 'CURRENT'],
          ['Maths words', 'FRACTION', 'ANGLE', 'SUM', 'ROOT']],
      trap: 'A ROOT is part of a plant and a CURRENT flows in the ocean. Here ROOT means a square root, and CURRENT is the flow of electricity.' },
    { g: [['Places in a race', 'FIRST', 'THIRD', 'LAST', 'SECOND'],
          ['Units of time', 'HOUR', 'DECADE', 'CENTURY', 'WEEK'],
          ['Very small', 'TINY', 'TEENY', 'MINI', 'MINUTE'],
          ['___ + GLASS', 'LOOKING', 'STAINED', 'FIBRE', 'EYE']],
      trap: 'SECOND and MINUTE are units of time, but here they mean second place and very small (say it my-NEWT). An hourglass is real, but the units of time need HOUR.' },
    { g: [['Breakfast foods', 'TOAST', 'CEREAL', 'PORRIDGE', 'PANCAKE'],
          ['Railway words', 'ENGINE', 'CARRIAGE', 'TRACK', 'SIGNAL'],
          ['Ways to cook', 'BAKE', 'BOIL', 'FRY', 'STEAM'],
          ['Ways to question someone', 'QUIZ', 'PROBE', 'ASK', 'GRILL']],
      trap: 'TOAST and GRILL sound like ways to cook, but here TOAST is breakfast and to GRILL someone is to ask them lots of questions.' },
    { g: [['Rodents', 'RAT', 'HAMSTER', 'SQUIRREL', 'BEAVER'],
          ['Computer parts', 'KEYBOARD', 'SCREEN', 'WEBCAM', 'SPEAKER'],
          ['Snakes', 'COBRA', 'TAIPAN', 'ADDER', 'VIPER'],
          ['Computer words that are creatures', 'PYTHON', 'BUG', 'WORM', 'MOUSE']],
      trap: 'A MOUSE is a rodent and a computer part, and a PYTHON is a snake. But both are also computer words: Python is a programming language, and a bug is a mistake in a program.' },
    { g: [['Desserts', 'PAVLOVA', 'TRIFLE', 'LAMINGTON', 'JELLY'],
          ['Fall down', 'COLLAPSE', 'TOPPLE', 'TUMBLE', 'CRUMBLE'],
          ['A tiny amount', 'DASH', 'PINCH', 'SPECK', 'SMIDGEN'],
          ['Things that can be wobbly', 'TOOTH', 'TABLE', 'KNEES', 'LADDER']],
      trap: 'CRUMBLE is a dessert, but here it means to fall apart. A TRIFLE can mean a tiny amount, and JELLY wobbles, but the desserts need them both.' },
    { g: [['Loud noises', 'BANG', 'CRASH', 'BOOM', 'THUD'],
          ['Music styles', 'JAZZ', 'REGGAE', 'OPERA', 'POP'],
          ['Kinds of rock', 'GRANITE', 'BASALT', 'PUMICE', 'SANDSTONE'],
          ['In an 1800s classroom', 'INKWELL', 'QUILL', 'ABACUS', 'SLATE']],
      trap: 'POP is a noise and SLATE is a rock, but here POP is music and a SLATE is the little board children wrote on in the 1800s.' },
    { g: [['Old toys', 'HOOP', 'MARBLES', 'CONKERS', 'SPINNING TOP'],
          ['Far away', 'DISTANT', 'FARAWAY', 'ISOLATED', 'REMOTE'],
          ['Things with buttons', 'SHIRT', 'CALCULATOR', 'LIFT', 'JACKET'],
          ['Goes up and down', 'SEESAW', 'YO-YO', 'TIDE', 'POGO STICK']],
      trap: 'A REMOTE has buttons, but here it means far away. A LIFT goes up and down, but the buttons need it. And the YO-YO is an old toy that goes up and down.' },
    { g: [['Your body does it by itself', 'BLINK', 'SNEEZE', 'YAWN', 'HICCUP'],
          ['Directions', 'LEFT', 'UP', 'DOWN', 'FORWARD'],
          ['Kinds of angle', 'ACUTE', 'OBTUSE', 'RIGHT', 'REFLEX'],
          ['___ + PACK', 'ICE', 'JET', 'WOLF', 'BACK']],
      trap: 'RIGHT and BACK are directions too, and a REFLEX is something your body does by itself. But here they are a right angle, a reflex angle and a backpack.' },
    { g: [['Kinds of dog', 'POODLE', 'BEAGLE', 'KELPIE', 'CORGI'],
          ['Horse words', 'PONY', 'MARE', 'FOAL', 'STALLION'],
          ['Come out at night', 'OWL', 'BAT', 'POSSUM', 'BILBY'],
          ['Words that mean pester', 'BADGER', 'BUG', 'HOUND', 'NAG']],
      trap: 'A HOUND is a dog, a NAG is an old horse and a BADGER comes out at night, but all three can mean to keep bothering someone. The kelpie is an Australian sheepdog.' },
    { g: [['Sticky things', 'GLUE', 'TAPE', 'SAP', 'SYRUP'],
          ['Hair things', 'BRUSH', 'CLIP', 'DRYER', 'BAND'],
          ['In the night sky', 'STAR', 'COMET', 'METEOR', 'SATELLITE'],
          ['HONEY + ___', 'BEE', 'DEW', 'MOON', 'COMB']],
      trap: 'The MOON is in the night sky and a COMB is for hair, but both can follow HONEY: honeymoon and honeycomb.' },
    { g: [['Birds', 'DOVE', 'PELICAN', 'GALAH', 'PIGEON'],
          ['Ways to send a message', 'TELEGRAM', 'EMAIL', 'FAX', 'LETTER'],
          ['Ways to play music', 'GRAMOPHONE', 'CASSETTE', 'RADIO', 'JUKEBOX'],
          ['You can break it without dropping it', 'PROMISE', 'RECORD', 'SILENCE', 'RULES']],
      trap: 'Pigeons once carried messages, and a RECORD plays music. But the PIGEON is needed with the birds, and you break a record by being the best ever.' },
    { g: [['Units of length', 'METRE', 'INCH', 'FOOT', 'YARD'],
          ['In the toolbox', 'SCREW', 'BOLT', 'NUT', 'HINGE'],
          ['Parts of a bird', 'BEAK', 'FEATHER', 'TALON', 'CLAW'],
          ['Add S to the front', 'MILE', 'TAR', 'WING', 'NAIL']],
      trap: 'MILE, WING and NAIL look like they belong somewhere else, but put an S in front: SMILE, STAR, SWING, SNAIL.' },
    { g: [['Medicine', 'PILL', 'CAPSULE', 'OINTMENT', 'SYRUP'],
          ['Fairy-tale creatures', 'OGRE', 'GIANT', 'DRAGON', 'ELF'],
          ['Microbes (tiny living things)', 'BACTERIA', 'YEAST', 'MOULD', 'ALGAE'],
          ['Also a computer word', 'TABLET', 'CLOUD', 'VIRUS', 'TROLL']],
      trap: 'A TABLET is medicine, a TROLL lives under a bridge and a VIRUS makes you sick. They are all computer words too.' },
    { g: [['Parts of a cat', 'PAWS', 'TAIL', 'CLAWS', 'FUR'],
          ['Athletics events', 'SPRINT', 'HURDLE', 'RELAY', 'DISCUS'],
          ['Facial hair', 'MOUSTACHE', 'STUBBLE', 'SIDEBURNS', 'WHISKERS'],
          ['Hidden animal', 'SCATTER', 'BEARD', 'PIRATE', 'BATON']],
      trap: 'WHISKERS belong to cats, a BEARD is facial hair and a BATON is passed in a relay. But look closely: sCATter, BEARd, piRATe, BATon.' },
    { g: [['Ways to prepare food', 'CHOP', 'SLICE', 'GRATE', 'PEEL'],
          ['At the shops', 'TILL', 'AISLE', 'TROLLEY', 'CHECKOUT'],
          ['Firefighter\'s things', 'HOSE', 'HELMET', 'SIREN', 'TRUCK'],
          ['In Snakes and Ladders', 'SNAKE', 'LADDER', 'DICE', 'COUNTER']],
      trap: 'You can DICE an onion, shops have a COUNTER and firefighters climb a LADDER, but Snakes and Ladders needs all three.' },
    { g: [['Colours', 'RED', 'GREEN', 'PURPLE', 'PINK'],
          ['On a golf course', 'TEE', 'BUNKER', 'FAIRWAY', 'HOLE'],
          ['Feeling sad', 'GLUM', 'GLOOMY', 'LOW', 'BLUE'],
          ['___ + HILL', 'ANT', 'MOLE', 'UP', 'DOWN']],
      trap: 'BLUE is a colour, DOWN can mean sad, and every golf hole has a GREEN. Each one is needed in a different group.' },
    { g: [['Musical instruments', 'DRUM', 'TUBA', 'TRUMPET', 'BANJO'],
          ['Sea creatures', 'CRAB', 'SQUID', 'WHALE', 'SEAL'],
          ['Mythical creatures', 'UNICORN', 'PHOENIX', 'GRIFFIN', 'CENTAUR'],
          ['Things with scales', 'DRAGON', 'MAP', 'FISH', 'SNAKE']],
      trap: 'A FISH lives in the sea and a DRAGON is mythical, but both have scales, like a SNAKE. A map has a scale too: it shows how far things are.' },
    { g: [['Weather words', 'SUNNY', 'WINDY', 'RAINY', 'SNOWY'],
          ['Australian birds', 'EMU', 'IBIS', 'GALAH', 'MAGPIE'],
          ['Names for someone you love', 'SWEETIE', 'HONEY', 'DEAR', 'DARLING'],
          ['Australian rivers', 'MURRAY', 'YARRA', 'TORRENS', 'SWAN']],
      trap: 'The SNOWY and the DARLING are Australian rivers too, but here they are weather and love. The SWAN is a bird, but the Swan River flows through Perth.' },
    { g: [['Minibeasts', 'SNAIL', 'WORM', 'SLUG', 'BEETLE'],
          ['Sea animals', 'STARFISH', 'URCHIN', 'SEAHORSE', 'DOLPHIN'],
          ['Shapes', 'CIRCLE', 'OVAL', 'RHOMBUS', 'KITE'],
          ['Has eight of something', 'OCTOPUS', 'SPIDER', 'OCTAGON', 'BYTE']],
      trap: 'An OCTOPUS has eight arms, a SPIDER eight legs and an OCTAGON eight sides. A BYTE is eight bits inside a computer.' }
  ];

  /* Where a long word may be split onto two lines on a small screen (only if it would not fit otherwise). */
  var BREAKS = {};
  ('ARMA-DILLO ASTER-OID ATLAN-TIC BACTE-RIA BADMIN-TON BASE-BALL BRIS-BANE CALCU-LATOR CARRI-AGE CART-WHEEL CAS-SETTE ' +
   'CHAM-PION CHECK-OUT CHIN-CHILLA COL-LAPSE COM-PUTER CYLIN-DER DRAW-BRIDGE EIN-STEIN FRAC-TION GRAMO-PHONE HAND-STAND ' +
   'HOP-SCOTCH HYDRO-GEN ISO-LATED JELLY-FISH KEY-BOARD LAMING-TON MID-NIGHT MINE-STRONE MOUS-TACHE OINT-MENT PA-TIENCE ' +
   'PENDU-LUM PLATY-PUS POR-RIDGE ROUND-ERS SAND-STONE SAP-PHIRE SATEL-LITE SCRAM-BLED SEA-HORSE SHIL-LING SIDE-BURNS ' +
   'SIX-PENCE SKIP-PING SOFT-BALL SOUTH-ERN SPELL-ING SPRIN-KLES SQUIR-REL STAL-LION STAR-FISH SUR-PRISE TELE-GRAM ' +
   'TRAM-POLINE TRI-ANGLE TYPE-WRITER UM-BRELLA WELLING-TON WHIS-KERS').split(' ').forEach(function (b) {
    BREAKS[b.replace('-', '')] = b.replace('-', '\u00AD');   /* a soft hyphen: only shows if the word is split there */
  });

  /* The four colours, easiest to trickiest. Each also has a shape, so colour is never the only clue. */
  var LEVELS = [
    { name: 'yellow', colour: '#f2d45c', shape: '●', square: '🟨' },
    { name: 'green', colour: '#8fd17f', shape: '▲', square: '🟩' },
    { name: 'blue', colour: '#7ab8ff', shape: '■', square: '🟦' },
    { name: 'purple', colour: '#c7a4ff', shape: '◆', square: '🟪' }
  ];

  /* =====================================================================
     PART 2: THE RULES
     ===================================================================== */

  /* Which group (0 to 3) a word belongs to in a puzzle. */
  function groupOf(puzzle, word) {
    for (var g = 0; g < 4; g++) if (puzzle.g[g].indexOf(word, 1) > 0) return g;
    return -1;
  }

  /* Checks four picked words. If all four share a group, that group's number comes back as `group`.
     If not, `best` says how many of them share the biggest group: 3 means "one away". */
  function checkGuess(puzzle, words) {
    var counts = [0, 0, 0, 0];
    words.forEach(function (w) { counts[groupOf(puzzle, w)]++; });
    var best = Math.max.apply(null, counts);
    return { group: best === 4 ? counts.indexOf(4) : -1, best: best };
  }

  /* The same four words in any order count as the same guess. */
  function guessKey(words) { return words.slice().sort().join('|'); }

  /* A tiny random number maker that always gives the same numbers for the same seed (mulberry32), so every
     player sees a puzzle's tiles start in the same places. Handy when a teacher says "the top-left word". */
  function seededRandom(seed) {
    var t = seed >>> 0;
    return function () {
      t = (t + 0x6D2B79F5) >>> 0;
      var x = Math.imul(t ^ (t >>> 15), 1 | t);
      x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  }
  /* Fisher-Yates shuffle: walk backwards through the list, swapping each item with a random earlier one. */
  function shuffle(list, rand) {
    var a = list.slice(), i, j, t;
    for (i = a.length - 1; i > 0; i--) { j = Math.floor(rand() * (i + 1)); t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  /* The daily puzzle: the date on this device picks it, so everyone gets the same puzzle on the same day.
     After the last puzzle the list starts again. */
  function todayNumber() {
    var d = new Date();
    return Math.round((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - FIRST_DAY) / DAY_MS) + 1;
  }
  function dailyIndex() {
    var n = PUZZLES.length;
    return (((todayNumber() - 1) % n) + n) % n;
  }

  /* =====================================================================
     PART 3: THE SCREEN
     ===================================================================== */
  var P = '.game-four-groups ';
  var CSS = [
    '.game-four-groups { container: fg / inline-size; color: var(--ink); font-family: var(--font-body); --fg-tile: #efe9dc; --fg-tile-ink: #16181d; --fg-sel: #5a6070; }',
    P + 'button { font: inherit; }',
    P + '.fg-card { position: relative; max-width: 660px; margin: 0 auto; border-radius: 28px; padding: 18px; border: 1px solid var(--line);' +
      ' background: radial-gradient(110% 60% at 0% -10%, rgba(199, 164, 255, .18), transparent 60%), radial-gradient(90% 60% at 110% 110%, rgba(242, 212, 92, .12), transparent 60%), var(--surface, #1c2027);' +
      ' box-shadow: 0 2px 0 rgba(255, 255, 255, .04) inset, 0 24px 60px rgba(0, 0, 0, .45); }',
    /* ----- top ----- */
    P + '.fg-top { display: flex; flex-wrap: wrap; gap: 8px 10px; align-items: center; justify-content: space-between; margin-bottom: 10px; }',
    P + '.fg-top .seg button { min-height: 40px; padding: .35rem .95rem; }',
    P + '.fg-tag { font-family: var(--font-mono); font-size: .76rem; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--ink-muted); }',
    P + '.fg-hint { text-align: center; color: var(--ink-muted); margin: 0 0 12px; font-size: .98rem; }',
    /* ----- groups found ----- */
    P + '.fg-found { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }',
    P + '.fg-found:not(:empty) { margin-bottom: 8px; }',
    P + '.fg-bar { margin: 0; min-height: 72px; border-radius: 12px; background: var(--fg-c); color: #16181d; display: grid; place-content: center; text-align: center; padding: 8px 12px; gap: 2px; }',
    P + '.fg-bar strong { font-family: var(--font-head); font-weight: 800; text-transform: uppercase; letter-spacing: .04em; font-size: 1rem; }',
    P + '.fg-bar span { font-weight: 600; font-size: .98rem; }',
    P + '.fg-bar.is-new { animation: fg-barin .45s cubic-bezier(.2, 1.4, .4, 1) both; }',
    '@keyframes fg-barin { 0% { transform: scale(.7); opacity: 0; } 100% { transform: none; opacity: 1; } }',
    /* ----- tiles ----- */
    P + '.fg-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }',
    P + '.fg-tile { min-height: 72px; min-width: 0; padding: 4px; border: 0; border-radius: 12px; background: var(--fg-tile); color: var(--fg-tile-ink); cursor: pointer;' +
      ' font-family: var(--font-head); font-weight: 800; text-transform: uppercase; letter-spacing: .01em; line-height: 1.1; display: grid; grid-template-columns: minmax(0, 1fr); place-items: center;' +
      ' box-shadow: 0 3px 0 rgba(0, 0, 0, .35); transition: background-color .12s, color .12s, transform .12s; -webkit-tap-highlight-color: transparent; touch-action: manipulation; }',
    P + '.fg-tile:hover { transform: translateY(-2px); }',
    P + '.fg-tile[aria-pressed="true"] { background: var(--fg-sel); color: #ffffff; transform: scale(.96); }',
    P + '.fg-tile:focus-visible { outline: 3px solid var(--focus); outline-offset: 2px; }',
    P + '.fg-word { display: block; width: 100%; min-width: 0; font-size: 1.05rem; white-space: normal; overflow-wrap: normal; text-align: center; }',
    P + '.fg-tile.is-hop { animation: fg-hop .32s ease var(--fg-d, 0ms); }',
    '@keyframes fg-hop { 0%, 100% { transform: scale(.96); } 45% { transform: translateY(-12px) scale(.96); } }',
    P + '.fg-tile.is-shake { animation: fg-shake .4s ease; }',
    '@keyframes fg-shake { 20%, 60% { transform: translateX(-6px) scale(.96); } 40%, 80% { transform: translateX(6px) scale(.96); } }',
    P + '.fg-tile.is-gone { transition: transform .2s ease, opacity .2s ease; transform: scale(.6); opacity: 0; }',
    P + '.fg-grid.is-shuffle .fg-tile { animation: fg-deal .3s ease both; }',
    '@keyframes fg-deal { from { transform: scale(.85) rotate(-3deg); opacity: .3; } }',
    /* ----- mistakes and buttons ----- */
    P + '.fg-mistakes { display: flex; align-items: center; justify-content: center; gap: 8px; margin: 14px 0 4px; color: var(--ink-muted); font-weight: 600; }',
    P + '.fg-dot { width: 14px; height: 14px; border-radius: 50%; background: var(--ink); display: inline-block; transition: transform .3s, opacity .3s; }',
    P + '.fg-dot.is-used { transform: scale(0); opacity: 0; }',
    P + '.fg-actions { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; margin-top: 12px; }',
    P + '.fg-actions .btn { min-width: 6.5rem; }',
    P + '.fg-key { list-style: none; margin: 14px 0 0; padding: 0; display: flex; flex-wrap: wrap; justify-content: center; gap: 4px 12px; font-size: .84rem; color: var(--ink-muted); }',
    P + '.fg-key li { margin: 0; display: inline-flex; align-items: center; gap: 5px; }',
    P + '.fg-chip { width: 18px; height: 18px; border-radius: 4px; display: inline-grid; place-items: center; color: #16181d; font-size: .62rem; line-height: 1; }',
    /* ----- message bubble ----- */
    P + '.fg-stage { position: relative; }',
    P + '.fg-msg { position: absolute; left: 50%; top: 40%; transform: translate(-50%, -50%); z-index: 3; pointer-events: none; max-width: 90%; text-align: center;' +
      ' background: var(--ink); color: var(--bg); font-weight: 800; padding: .6rem 1.1rem; border-radius: 10px; box-shadow: 0 8px 22px rgba(0, 0, 0, .45); }',
    P + '.fg-msg.is-in { animation: fg-msgin .18s ease-out; }',
    '@keyframes fg-msgin { from { opacity: 0; transform: translate(-50%, -40%); } }',
    /* ----- end card ----- */
    P + '.fg-end { margin-top: 16px; display: grid; gap: 12px; justify-items: center; text-align: center; }',
    P + '.fg-end.is-in { animation: fg-rise .4s cubic-bezier(.2, 1.3, .4, 1) both; }',
    '@keyframes fg-rise { from { opacity: 0; transform: translateY(14px); } }',
    P + '.fg-end h3 { font-family: var(--font-head); font-size: clamp(1.35rem, 1.1rem + 2cqi, 1.9rem); }',
    P + '.fg-squares { font-size: 1.35rem; line-height: 1.15; letter-spacing: .08em; }',
    P + '.fg-trap { max-width: 34rem; padding: .8rem 1rem; border-radius: 14px; background: var(--surface-2); border: 1px solid var(--line); text-align: left; }',
    P + '.fg-trap b { color: var(--link); }',
    P + '.fg-endbtns { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; }',
    P + '.fg-share-text { width: 100%; max-width: 320px; min-height: 9em; font: 1rem/1.25 ui-monospace, Menlo, Consolas, monospace; padding: .6rem; border-radius: 10px;' +
      ' border: 2px solid var(--line); background: var(--surface-2); color: var(--ink); resize: none; user-select: text; -webkit-user-select: text; }',
    /* ----- all puzzles ----- */
    P + '.fg-list h3 { font-family: var(--font-head); font-size: 1.2rem; text-align: center; }',
    P + '.fg-list > p { text-align: center; color: var(--ink-muted); margin: 4px 0 14px; }',
    P + '.fg-nums { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(58px, 1fr)); gap: 8px; }',
    P + '.fg-nums li { margin: 0; }',
    P + '.fg-num { position: relative; width: 100%; min-height: 54px; border-radius: 12px; border: 2px solid var(--line); background: var(--surface-2); color: var(--ink);' +
      ' font-family: var(--font-head); font-weight: 800; font-size: 1.1rem; cursor: pointer; }',
    P + '.fg-num:hover { border-color: var(--link); }',
    P + '.fg-num.is-won { background: color-mix(in srgb, #8fd17f 30%, var(--surface-2)); border-color: #8fd17f; }',
    P + '.fg-num.is-lost { border-style: dashed; }',
    P + '.fg-num.is-today { box-shadow: 0 0 0 3px var(--focus); }',
    P + '.fg-badge { position: absolute; top: 2px; right: 5px; font-size: .7rem; font-weight: 900; }',
    /* phones */
    '@container fg (max-width: 480px) {',
    P + '.fg-card { padding: 12px 10px; border-radius: 22px; }',
    P + '.fg-grid { gap: 6px; } ' + P + '.fg-found { gap: 6px; }',
    P + '.fg-tile { min-height: 64px; padding: 3px; border-radius: 10px; }',
    P + '.fg-word { font-size: .95rem; }',
    P + '.fg-bar { min-height: 64px; padding: 6px 8px; } ' + P + '.fg-bar strong { font-size: .9rem; } ' + P + '.fg-bar span { font-size: .86rem; }',
    P + '.fg-actions .btn { min-width: 0; padding: .5rem .9rem; }',
    '}',
    '@container fg (max-width: 330px) { ' + P + '.fg-card { padding: 10px 4px; } ' + P + '.fg-grid { gap: 4px; } }',
    '.classroom ' + P + '.fg-card { max-width: 900px; }',
    '.classroom ' + P + '.fg-tile { min-height: 96px; } .classroom ' + P + '.fg-word { font-size: 1.4rem; }',
    '@media (prefers-reduced-motion: reduce) { ' + P + '.fg-tile, ' + P + '.fg-bar, ' + P + '.fg-msg, ' + P + '.fg-end { animation: none !important; transition: none !important; } }'
  ].join('\n');

  var PRAISE = ['Perfect! Not a single mistake.', 'Solved, with just one mistake.', 'Solved, with two mistakes.', 'Solved, with three mistakes. Phew!'];

  GamesInTime.register({
    id: 'four-groups',
    frame: 'none',     /* the game draws its own dark 2020s app card */
    mount: function (root, api) {
      var h = api.h;
      var RM = !!api.reducedMotion;
      root.appendChild(h('style', null, CSS));

      /* progress: puzzle number -> { found: [group numbers], mistakes, guesses: [[four words]...], over, won }
         best: puzzle number -> fewest mistakes in a win (so a tick stays even if you play it again) */
      var progress = api.store.get('progress', {}) || {};
      var best = api.store.get('best', {}) || {};

      var play = null;           /* the puzzle on screen */
      var view = 'today';        /* 'today', 'list' or 'pick' (a puzzle chosen from the list) */
      var tileEls = {};          /* word -> its button */
      var focusWord = null;      /* the tile the arrow keys are on */
      var busy = false;          /* true while tiles hop and groups slide in */
      var timers = [], msgTimer = null, fitFrame = 0, destroyed = false;

      function later(fn, ms) {
        var id = setTimeout(function () { var k = timers.indexOf(id); if (k >= 0) timers.splice(k, 1); if (!destroyed) fn(); }, ms);
        timers.push(id);
        return id;
      }
      function clearTimers() { timers.forEach(clearTimeout); timers = []; }

      /* ---- the card ---- */
      var todayBtn = h('button', { type: 'button', 'aria-pressed': 'true', onclick: function () { api.sound('click'); openToday(); } }, 'Today\'s puzzle');
      var listBtn = h('button', { type: 'button', 'aria-pressed': 'false', onclick: function () { api.sound('click'); openList(); } }, 'All puzzles');
      var tag = h('span', { class: 'fg-tag' });
      var hint = h('p', { class: 'fg-hint' }, 'Find four groups of four. Pick four words that share something, then press Submit.');
      var found = h('ul', { class: 'fg-found', 'aria-label': 'Groups found' });
      var grid = h('div', { class: 'fg-grid', role: 'group', 'aria-label': 'Words. Use the arrow keys to move, and Space to pick a word.', onkeydown: onGridKey });
      var msg = h('div', { class: 'fg-msg', hidden: true, 'aria-hidden': 'true' });
      var stage = h('div', { class: 'fg-stage' }, found, grid, msg);
      var dots = [];
      for (var i = 0; i < MISTAKES; i++) dots.push(h('span', { class: 'fg-dot', 'aria-hidden': 'true' }));
      var mistakesText = h('span', null, 'Mistakes left:');
      var mistakesEl = h('div', { class: 'fg-mistakes' }, mistakesText, dots);
      var shuffleBtn = h('button', { type: 'button', class: 'btn', onclick: doShuffle }, 'Shuffle');
      var clearBtn = h('button', { type: 'button', class: 'btn', onclick: deselectAll }, 'Deselect all');
      var submitBtn = h('button', { type: 'button', class: 'btn btn-primary', onclick: submit }, 'Submit');
      var actions = h('div', { class: 'fg-actions' }, shuffleBtn, clearBtn, submitBtn);
      var key = h('ul', { class: 'fg-key', 'aria-label': 'Colours' },
        LEVELS.map(function (L, i) {
          return h('li', null, h('span', { class: 'fg-chip', style: { background: L.colour }, 'aria-hidden': 'true' }, L.shape), ['Easiest', 'Easy', 'Tricky', 'Trickiest'][i]);
        }));
      var endEl = h('section', { class: 'fg-end', hidden: true, 'aria-label': 'Result' });
      var playEl = h('div', null, hint, stage, mistakesEl, actions, endEl, key);
      var listEl = h('section', { class: 'fg-list', hidden: true, 'aria-label': 'All puzzles' });
      var card = h('div', { class: 'fg-card' },
        h('div', { class: 'fg-top' }, h('div', { class: 'seg', role: 'group', 'aria-label': 'Which puzzle' }, todayBtn, listBtn), tag),
        playEl, listEl);
      root.appendChild(card);

      /* =========================== opening a puzzle =========================== */
      function openToday() { view = 'today'; openPuzzle(dailyIndex()); }
      function openPuzzle(index) {
        clearTimers();
        busy = false;
        hideMessage();
        var puzzle = PUZZLES[index], num = index + 1;
        var saved = progress[num] || null;
        play = {
          index: index, num: num, puzzle: puzzle,
          found: saved ? saved.found.slice() : [],
          mistakes: saved ? saved.mistakes : 0,
          guesses: saved ? saved.guesses.map(function (g) { return g.slice(); }) : [],
          over: saved ? !!saved.over : false,
          won: saved ? !!saved.won : false,
          selected: []
        };
        /* the tiles start in the same order for everyone (shuffled with the puzzle number as the seed) */
        var all = [];
        puzzle.g.forEach(function (grp) { all = all.concat(grp.slice(1)); });
        play.order = shuffle(all, seededRandom(num * 7919)).filter(function (w) { return play.found.indexOf(groupOf(puzzle, w)) < 0; });
        todayBtn.setAttribute('aria-pressed', String(view === 'today'));
        listBtn.setAttribute('aria-pressed', String(view === 'list'));
        tag.textContent = 'Puzzle ' + num + (index === dailyIndex() ? ' · today' : '');
        listEl.hidden = true;
        playEl.hidden = false;
        buildTiles();
        drawFound();
        drawMistakes();
        drawButtons();
        if (play.over) showEnd(false); else endEl.hidden = true;
        sayStatus();
      }

      function sayStatus(extra) {
        if (!play) return;
        var name = 'Puzzle ' + play.num;
        if (play.over) {
          api.status(play.won ? name + ': solved' + (play.mistakes ? ' with ' + plural(play.mistakes, 'mistake') : ' with no mistakes') + '!' : name + ': out of mistakes. Here are the groups.');
          return;
        }
        var left = MISTAKES - play.mistakes;
        var text = extra || (play.selected.length ? play.selected.length + ' of 4 picked' : play.found.length ? plural(play.found.length, 'group') + ' found' : 'Pick four words that belong together');
        api.status(name + ' · ' + text + ' · ' + plural(left, 'mistake') + ' left');
      }
      function plural(n, word) { return n + ' ' + word + (n === 1 ? '' : 's'); }

      /* =========================== drawing =========================== */
      function buildTiles() {
        grid.replaceChildren();
        tileEls = {};
        play.order.forEach(function (w) {
          var b = h('button', { type: 'button', class: 'fg-tile', 'aria-pressed': 'false', tabindex: '-1', 'aria-label': w, onclick: function () { toggle(w); } }, h('span', { class: 'fg-word', 'aria-hidden': 'true' }, w));
          b.addEventListener('animationend', function (ev) { if (ev.target === b) b.classList.remove('is-hop', 'is-shake'); });
          b.addEventListener('focus', function () { focusWord = w; setRoving(); });
          tileEls[w] = b;
          grid.appendChild(b);
        });
        if (play.order.indexOf(focusWord) < 0) focusWord = play.order[0] || null;
        setRoving();
        grid.hidden = play.order.length === 0;
        scheduleFit();
      }
      /* Only one tile can be reached with Tab; the arrow keys move between the others. */
      function setRoving() {
        play.order.forEach(function (w) { if (tileEls[w]) tileEls[w].setAttribute('tabindex', w === focusWord ? '0' : '-1'); });
      }
      function drawSelection() {
        play.order.forEach(function (w) { tileEls[w].setAttribute('aria-pressed', String(play.selected.indexOf(w) >= 0)); });
        drawButtons();
      }
      function drawButtons() {
        var live = !play.over && !busy;
        submitBtn.disabled = !live || play.selected.length !== 4;
        clearBtn.disabled = !live || play.selected.length === 0;
        shuffleBtn.disabled = !live;
        actions.hidden = play.over;
        mistakesEl.hidden = play.over;
        hint.hidden = play.over || play.found.length > 0 || play.guesses.length > 0;
      }
      function drawMistakes() {
        dots.forEach(function (d, i) { d.classList.toggle('is-used', i >= MISTAKES - play.mistakes); });
        mistakesEl.setAttribute('aria-label', 'Mistakes left: ' + (MISTAKES - play.mistakes));
      }
      function barFor(g, fresh) {
        var grp = play.puzzle.g[g], L = LEVELS[g];
        return h('li', { class: 'fg-bar' + (fresh && !RM ? ' is-new' : ''), style: { '--fg-c': L.colour } },
          h('strong', null, h('span', { 'aria-hidden': 'true' }, L.shape + ' '), grp[0]),
          h('span', null, grp.slice(1).join(', ')));
      }
      function drawFound() {
        found.replaceChildren();
        play.found.forEach(function (g) { found.appendChild(barFor(g, false)); });
      }

      /* Make every word fit its tile. First the letters shrink a little. If a long word would get too small
         (DRAWBRIDGE on a phone), it is split onto two lines at a sensible place instead, with a hyphen. */
      function scheduleFit() { cancelAnimationFrame(fitFrame); fitFrame = requestAnimationFrame(fitTiles); }
      function shrinkToFit(span, smallest) {
        span.style.fontSize = '';
        var size = parseFloat(getComputedStyle(span).fontSize) || 16, guard = 0;
        while (span.scrollWidth > span.clientWidth + 1 && size > smallest && guard++ < 40) {
          size -= 0.5;
          span.style.fontSize = size + 'px';
        }
        return span.scrollWidth <= span.clientWidth + 1;
      }
      function fitTiles() {
        if (destroyed || !play) return;
        play.order.forEach(function (w) {
          var span = tileEls[w] && tileEls[w].firstChild;
          if (!span) return;
          span.textContent = w;
          if (shrinkToFit(span, 12) || !BREAKS[w]) { if (!BREAKS[w]) shrinkToFit(span, 8); return; }
          span.textContent = BREAKS[w];
          shrinkToFit(span, 8);
        });
      }
      var resizer = window.ResizeObserver ? new ResizeObserver(scheduleFit) : null;
      if (resizer) resizer.observe(root);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(scheduleFit, function () {});

      function showMessage(text, ms) {
        clearTimeout(msgTimer);
        msg.textContent = text;
        msg.hidden = false;
        msg.classList.remove('is-in');
        void msg.offsetWidth;
        msg.classList.add('is-in');
        api.announce(text);
        msgTimer = setTimeout(hideMessage, ms || 1800);
      }
      function hideMessage() { clearTimeout(msgTimer); msg.hidden = true; }

      /* =========================== playing =========================== */
      function toggle(w) {
        if (!play || play.over || busy) return;
        api.unlockSound();
        var at = play.selected.indexOf(w);
        if (at >= 0) {
          play.selected.splice(at, 1);
          api.sound('tick');
        } else {
          if (play.selected.length >= 4) { api.sound('wrong'); showMessage('Four words at most. Tap one to unpick it.'); return; }
          play.selected.push(w);
          if (api.tone) api.tone(392 + play.selected.length * 98, 0.07, 'triangle', 0.07); else api.sound('click');
        }
        drawSelection();
        sayStatus();
      }
      function deselectAll() {
        if (!play.selected.length) return;
        play.selected = [];
        api.sound('tick');
        drawSelection();
        sayStatus();
      }
      function doShuffle() {
        if (busy || play.over) return;
        play.order = shuffle(play.order, api.random);
        play.order.forEach(function (w) { grid.appendChild(tileEls[w]); });
        api.sound('shuffle');
        if (!RM) { grid.classList.remove('is-shuffle'); void grid.offsetWidth; grid.classList.add('is-shuffle'); later(function () { grid.classList.remove('is-shuffle'); }, 400); }
        api.announce('Shuffled. The first word is now ' + play.order[0] + '.');
      }

      function submit() {
        if (!play || play.over || busy || play.selected.length !== 4) return;
        var words = play.selected.slice();
        var k = guessKey(words);
        for (var i = 0; i < play.guesses.length; i++) {
          if (guessKey(play.guesses[i]) === k) { api.sound('wrong'); showMessage('You already tried those four'); return; }
        }
        busy = true;
        drawButtons();
        /* the four picked tiles hop one after another, like the computer is checking them */
        var gap = RM ? 0 : 90;
        play.order.forEach(function (w) {
          var at = words.indexOf(w);
          if (at < 0 || RM) return;
          var t = tileEls[w];
          t.style.setProperty('--fg-d', (at * gap) + 'ms');
          t.classList.remove('is-hop'); void t.offsetWidth; t.classList.add('is-hop');
        });
        later(function () { judge(words); }, RM ? 0 : 3 * gap + 360);
      }

      function judge(words) {
        var result = checkGuess(play.puzzle, words);
        play.guesses.push(words);
        if (result.group >= 0) {
          rightGroup(result.group, words);
        } else {
          play.mistakes++;
          api.sound('wrong');
          words.forEach(function (w) { var t = tileEls[w]; if (!RM) { t.classList.remove('is-shake'); void t.offsetWidth; t.classList.add('is-shake'); } });
          drawMistakes();
          if (play.mistakes >= MISTAKES) {
            showMessage('Out of mistakes', 1800);
            play.over = true;
            save();
            later(revealRest, RM ? 0 : 700);
          } else {
            showMessage(result.best === 3 ? 'One away…' : 'Not a group. Try again!', 1800);
            save();
            busy = false;
            drawButtons();
            sayStatus(result.best === 3 ? 'one away' : 'not a group');
          }
        }
      }

      /* A group is found: its tiles shrink away and its coloured bar pops in at the top. */
      var NOTES = [[523, 659, 784], [587, 740, 880], [659, 831, 988], [698, 880, 1047, 1397]];
      function rightGroup(g, words) {
        play.found.push(g);
        play.selected = [];
        if (api.tone) NOTES[g].forEach(function (f, i) { later(function () { api.tone(f, 0.18, 'triangle', 0.11); }, i * 80); });
        else api.sound('coin');
        words.forEach(function (w) { tileEls[w].classList.add('is-gone'); });
        save();
        later(function () {
          play.order = play.order.filter(function (w) { return words.indexOf(w) < 0; });
          words.forEach(function (w) { tileEls[w].remove(); delete tileEls[w]; });
          if (play.order.indexOf(focusWord) < 0) { focusWord = play.order[0] || null; setRoving(); }
          grid.hidden = play.order.length === 0;
          found.appendChild(barFor(g, true));
          var grp = play.puzzle.g[g];
          api.announce('Right! ' + grp[0] + ': ' + grp.slice(1).join(', ') + '.');
          if (play.found.length === 4) {
            play.over = true;
            play.won = true;
            if (best[play.num] == null || play.mistakes < best[play.num]) best[play.num] = play.mistakes;
            api.store.set('best', best);
            save();
            later(function () {
              api.celebrate(play.mistakes === 0 ? 'Puzzle ' + play.num + ': perfect!' : 'Puzzle ' + play.num + ' solved!');
              showEnd(true);
              sayStatus();
              drawButtons();
            }, RM ? 0 : 500);
          } else {
            busy = false;
            drawButtons();
            sayStatus(plural(play.found.length, 'group') + ' found');
            scheduleFit();
          }
        }, RM ? 0 : 230);
      }

      /* Out of mistakes: the groups you did not find slide in one by one, easiest first. */
      function revealRest() {
        play.selected = [];
        var missing = [0, 1, 2, 3].filter(function (g) { return play.found.indexOf(g) < 0; });
        api.sound('lose');
        missing.forEach(function (g, i) {
          later(function () {
            var grp = play.puzzle.g[g];
            grp.slice(1).forEach(function (w) { if (tileEls[w]) { tileEls[w].remove(); delete tileEls[w]; } });
            play.order = play.order.filter(function (w) { return grp.indexOf(w, 1) < 0; });
            grid.hidden = play.order.length === 0;
            found.appendChild(barFor(g, true));
            if (i === missing.length - 1) { showEnd(true); sayStatus(); drawButtons(); }
          }, RM ? 0 : i * 650);
        });
      }

      function save() {
        progress[play.num] = { found: play.found, mistakes: play.mistakes, guesses: play.guesses, over: play.over, won: play.won };
        api.store.set('progress', progress);
      }

      /* =========================== the end card =========================== */
      function showEnd(fresh) {
        busy = false;
        endEl.hidden = false;
        endEl.replaceChildren();
        if (!fresh) { found.replaceChildren(); drawAllBars(); }
        var squares = play.guesses.map(function (gs) { return gs.map(function (w) { return LEVELS[groupOf(play.puzzle, w)].square; }).join(''); });
        endEl.appendChild(h('h3', null, play.won ? PRAISE[play.mistakes] : 'Out of mistakes. Good try!'));
        endEl.appendChild(h('div', { class: 'fg-squares', role: 'img', 'aria-label': 'Your guesses as coloured squares' }, squares.map(function (s) { return h('div', null, s); })));
        endEl.appendChild(h('p', { class: 'fg-trap' }, h('b', null, 'The red herring: '), play.puzzle.trap));
        var shareText = 'Four Groups · Puzzle ' + play.num + '\n' + squares.join('\n') + '\n\nGames in Time · gamesintime.com';
        var box = h('textarea', { class: 'fg-share-text', readonly: true, rows: 8, hidden: true, 'aria-label': 'Your result to copy' });
        box.value = shareText;
        var copyBtn = h('button', { type: 'button', class: 'btn btn-primary', onclick: function () { copyResult(shareText, box, copyBtn); } }, 'Copy my result');
        var nextIndex = (play.index + 1) % PUZZLES.length;
        endEl.appendChild(h('div', { class: 'fg-endbtns' }, copyBtn,
          h('button', { type: 'button', class: 'btn', onclick: function () { api.sound('click'); view = 'pick'; openPuzzle(nextIndex); } }, 'Next: puzzle ' + (nextIndex + 1)),
          h('button', { type: 'button', class: 'btn', onclick: playAgain }, 'Play it again')));
        endEl.appendChild(box);
        if (play.index === dailyIndex()) endEl.appendChild(h('p', { class: 'muted' }, 'A new puzzle comes out every day at midnight. You can play all ' + PUZZLES.length + ' from All puzzles.'));
        if (fresh && !RM) { endEl.classList.remove('is-in'); void endEl.offsetWidth; endEl.classList.add('is-in'); }
      }
      /* After a reload, a finished puzzle shows the groups in the order they were found, then any missed ones. */
      function drawAllBars() {
        var order = play.found.slice();
        [0, 1, 2, 3].forEach(function (g) { if (order.indexOf(g) < 0) order.push(g); });
        order.forEach(function (g) { found.appendChild(barFor(g, false)); });
        play.order = [];
        grid.replaceChildren();
        grid.hidden = true;
      }
      function playAgain() {
        api.sound('click');
        delete progress[play.num];
        api.store.set('progress', progress);
        openPuzzle(play.index);
      }

      /* Copy to the clipboard. It all happens on this device, so it works with no internet. */
      function copyResult(text, box, btn) {
        function done() { api.sound('pop'); btn.textContent = 'Copied!'; showMessage('Copied. Paste it to share.'); later(function () { btn.textContent = 'Copy my result'; }, 2200); }
        function fallback() {
          box.hidden = false;
          box.focus();
          box.select();
          var ok = false;
          try { ok = document.execCommand && document.execCommand('copy'); } catch (e) { ok = false; }
          if (ok) done(); else showMessage('Select the text below and copy it.', 2600);
        }
        try {
          if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, fallback);
          else fallback();
        } catch (e) { fallback(); }
      }

      /* =========================== all puzzles =========================== */
      function openList() {
        clearTimers();
        busy = false;
        hideMessage();
        view = 'list';
        todayBtn.setAttribute('aria-pressed', 'false');
        listBtn.setAttribute('aria-pressed', 'true');
        playEl.hidden = true;
        listEl.hidden = false;
        listEl.replaceChildren();
        var solved = 0, perfect = 0, today = dailyIndex();
        PUZZLES.forEach(function (p, i) { if (best[i + 1] != null) { solved++; if (best[i + 1] === 0) perfect++; } });
        tag.textContent = solved + ' of ' + PUZZLES.length + ' solved';
        listEl.appendChild(h('h3', null, 'All ' + PUZZLES.length + ' puzzles'));
        listEl.appendChild(h('p', null, 'Solved ' + solved + ', perfect ' + perfect + '. The ringed one is today\'s puzzle.'));
        listEl.appendChild(h('ul', { class: 'fg-nums' }, PUZZLES.map(function (p, i) {
          var num = i + 1, pr = progress[num], won = best[num] != null;
          var state = won ? (best[num] === 0 ? 'solved, perfect' : 'solved') : pr && pr.over ? 'not solved yet' : pr && pr.guesses && pr.guesses.length ? 'started' : 'new';
          return h('li', null, h('button', {
            type: 'button', class: 'fg-num' + (won ? ' is-won' : pr && pr.over ? ' is-lost' : '') + (i === today ? ' is-today' : ''),
            'aria-label': 'Puzzle ' + num + ', ' + state + (i === today ? ', today\'s puzzle' : ''),
            onclick: function () { api.sound('click'); view = 'pick'; openPuzzle(i); }
          }, String(num), won ? h('span', { class: 'fg-badge', 'aria-hidden': 'true' }, best[num] === 0 ? '★' : '✓') : null));
        })));
        api.status('All puzzles · solved ' + solved + ' of ' + PUZZLES.length + ' · pick a number to play');
      }

      /* =========================== the keyboard =========================== */
      /* Arrow keys move between the tiles (four in a row). Space or Enter picks a tile, like a click. */
      function onGridKey(ev) {
        if (!play || !play.order.length) return;
        var at = play.order.indexOf(focusWord), n = play.order.length, to = at;
        if (ev.key === 'ArrowRight') to = Math.min(n - 1, at + 1);
        else if (ev.key === 'ArrowLeft') to = Math.max(0, at - 1);
        else if (ev.key === 'ArrowDown') to = at + 4 < n ? at + 4 : at;
        else if (ev.key === 'ArrowUp') to = at - 4 >= 0 ? at - 4 : at;
        else if (ev.key === 'Home') to = 0;
        else if (ev.key === 'End') to = n - 1;
        else return;
        ev.preventDefault();
        focusWord = play.order[to];
        setRoving();
        tileEls[focusWord].focus();
      }

      openToday();

      return {
        destroy: function () {
          destroyed = true;
          clearTimers();
          clearTimeout(msgTimer);
          cancelAnimationFrame(fitFrame);
          if (resizer) resizer.disconnect();
        }
      };
    }
  });
})();
