# Peekaboo

A simple touch game for toddlers, made for phones and tablets. Big solid circles hide pictures.

- **Touch a circle** (or slide a finger onto it) and the picture underneath pops into view with its name.
- **Slide away** and the circle closes again.
- **Tap** and the picture stays revealed with a chime.
- **Reveal them all** and there's a celebration, then a new round with the pictures shuffled.

It comes with two sets: **Balls** and **Family** (Mommy, Daddy, Grandma, Grandpa), all drawings.

**Play it:** https://chienchern.github.io/baby-ball-peekaboo/

## On a phone or tablet

Open the link in Safari (iPhone/iPad) or Chrome (Android). For a full-screen app with its own icon, add it to your home screen:

- **iPhone/iPad:** Share button, then **Add to Home Screen**.
- **Android:** ⋮ menu, then **Add to Home screen** (or **Install app**).

To keep a toddler inside the game, use **Guided Access** on iPhone/iPad (Settings → Accessibility) or **App pinning** on Android.

In the game, the ↻ button (top right) starts a new round. To go back to the start screen, **press and hold** the ⌂ button (top left) for a second, so little fingers don't leave by accident.

On a computer, the start screen explains the game is meant for touch devices, but you can still try it with a mouse.

## Why the names aren't spoken

Little ones respond best to a voice they know, and computer voices sound robotic. So names are shown as text, and spoken names are meant for a parent's own copy, recorded in their own voice.

## Make your own copy (with your photos and voice)

1. Fork or download this project.
2. Put your pictures in the `pictures` folder. Square photos with the face or object in the middle and a little space around it work best.
3. Record each name (a phone's voice memo app is fine) and put the files in a `sounds` folder.
4. Edit `config.js`:

   ```js
   speakNames: true,
   sets: [
     {
       name: "Family",
       items: [
         { name: "Grandma", picture: "pictures/grandma.jpg", sound: "sounds/grandma.m4a" },
       ],
     },
   ],
   ```

   With `speakNames: true`, a name plays when its picture appears, and again after the chime when it's tapped.

5. Host it somewhere private and open it on your phone or tablet. Recordings only play when the game is served from a website, not when the file is opened directly.

**Keep personal photos and recordings out of public repositories.**

`config.js` also sets the number of circles per round, the colours and the volume of the sound effects.

## License

MIT. See [LICENSE](LICENSE).
