# Ball Peekaboo

A simple mouse game for toddlers. Big solid circles hide pictures of balls.

- **Move the mouse over a circle** and the ball underneath appears with a soft sound, and its name is shown.
- **Move away** and the circle closes again.
- **Click while the ball is showing** and it stays revealed.
- **Keep them all** and there's a celebration, then a new round with the balls shuffled.

The cursor is a large, bright dot so little ones can follow it easily. Each circle also counts the cursor as "on" it slightly outside its edge, so aiming is forgiving.

## Play

Open `index.html` in a web browser and click **Play**. The game goes full screen. Press **Esc** to leave.

No install, no internet connection and no build step needed.

## Use your own balls

The game comes with drawings of five balls in the `pictures` folder. To use photos of your own balls without sharing them:

1. Put your pictures in the `photos` folder.
2. Copy `config.local.example.js` to `config.local.js` and list your balls:

   ```js
   GAME_CONFIG.balls = [
     { name: "Big red ball", photo: "photos/big-red-ball.jpg" },
     { name: "Soccer ball",  photo: "photos/soccer.jpg", focus: "50% 40%" },
   ];
   ```

   - `name`: shown on screen when the ball appears.
   - `photo`: path to the picture. It's cropped to a circle, so a photo with the whole ball in the middle and some space around it works best.
   - `focus` (optional): which part of the photo to centre, as `"left% top%"`.
   - `drawing` (optional): a built-in cartoon used if the photo can't be found: `soccer`, `basketball`, `tennis`, `football` or `plain` (set its colour with `color`).

3. Save the file and reload the page.

`config.local.js` and the `photos` folder are ignored by git, so your photos are never uploaded to GitHub.

## More settings

`config.js` also lets you change the number of circles per round, the colours and the sound effects. If more balls are listed than there are circles, a random set is chosen each round.

If a photo can't be found, the start screen says which one.

## License

MIT. See [LICENSE](LICENSE).
