// ============================================================
//  Peekaboo settings
// ============================================================
//
//  SETS
//  The start screen shows one card per set. Each set has a `name` and a list of `items`.
//  Each item has:
//    name:    shown on screen when it's revealed
//    picture: path to an image (photo or drawing). It's cropped to a circle, so keep the
//             subject in the middle with a little space around it.
//    sound:   optional recording of the name, e.g. "sounds/grandma.m4a". Only played
//             when speakNames (below) is true.

const GAME_CONFIG = {
  title: "Peekaboo",

  circlesPerRound: 4,          // how many circles at once (1 to 9). Sets with more items pick a random few each round.

  colors: {
    background: "#bfe6ff",
    cover: "#7d5fe6",          // the solid circle hiding each picture
  },

  effects: true,               // the soft pops and chimes (false = off)
  effectsVolume: 0.6,          // 0 to 1
  speakNames: false,           // true = play each item's `sound` recording when it's revealed and tapped
  voiceVolume: 1,              // volume of the recordings, 0 to 1

  sets: [
    {
      name: "Balls",
      items: [
        { name: "Yoga ball",   picture: "pictures/yoga-ball.svg" },
        { name: "Basketball",  picture: "pictures/little-basketball.svg" },
        { name: "Duck ball",   picture: "pictures/duck-ball.svg" },
        { name: "Soccer ball", picture: "pictures/soccer-ball.svg" },
        { name: "Basketball",  picture: "pictures/big-basketball.svg" },
      ],
    },
    {
      name: "Family",
      items: [
        { name: "Mommy",   picture: "pictures/mommy.svg" },
        { name: "Daddy",   picture: "pictures/daddy.svg" },
        { name: "Grandma", picture: "pictures/grandma.svg" },
        { name: "Grandpa", picture: "pictures/grandpa.svg" },
      ],
    },
  ],
};
