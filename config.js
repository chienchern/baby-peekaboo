// ============================================================
//  Ball Peekaboo settings: edit this file to make it your own.
// ============================================================
//
//  BALLS
//  Each ball needs a `name` (shown on screen). Then give it ONE OR BOTH of:
//    photo:   path to a picture, e.g. "photos/red-ball.jpg"
//    drawing: a built-in cartoon used if there's no photo, or the photo fails to load.
//             Choices: "soccer", "basketball", "tennis", "football", "plain"
//             ("plain" is a simple shiny ball. Set its colour with `color`.)
//  Optional:
//    focus:   which part of the photo to keep centred in the circle, as
//             "left% top%". Default "50% 50%" (the middle). E.g. "50% 30%" = higher up.
//    color:   colour for the "plain" drawing, e.g. "#e63946" or "red".
//
//  If there are more balls than circles, a random set is picked each round.
//
//  KEEPING YOUR OWN PHOTOS PRIVATE
//  Put photos in the photos/ folder and list them in a file called config.local.js
//  (see config.local.example.js). Both are ignored by git, so they're never uploaded,
//  but the game uses them on your computer instead of the drawings.

const GAME_CONFIG = {
  title: "Ball Peekaboo",

  circlesPerRound: 4,          // how many circles on screen at once (1 to 9)

  colors: {
    background: "#bfe6ff",
    cover: "#7d5fe6",          // the solid circle hiding each ball
    cursor: "#ffeb3b",
  },

  effects: true,               // the soft chimes and pops (false = silent)
  effectsVolume: 0.6,          // 0 to 1

  balls: [
    { name: "Yoga ball",   photo: "pictures/yoga-ball.svg" },
    { name: "Basketball",  photo: "pictures/little-basketball.svg" },
    { name: "Duck ball",   photo: "pictures/duck-ball.svg" },
    { name: "Soccer ball", photo: "pictures/soccer-ball.svg" },
    { name: "Basketball",  photo: "pictures/big-basketball.svg" },

    // Built-in cartoons you can add too:
    // { name: "Tennis ball",       drawing: "tennis" },
    // { name: "American football", drawing: "football" },
  ],
};
