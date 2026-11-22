/* =========================================================
   CUSail Family Feud — all the editable content lives here.
   Change team names, questions, minigames, or challenges
   in this file; the rest of the site updates automatically.
   ========================================================= */

window.FEUD = {
  teams: ["Team 1", "Team 2", "Team 3", "Team 4", "Team 5", "Team 6"],

  // Face-off questions (one rep per team — decides who plays the board).
  // Round 1 uses the first one, round 2 the second, and so on.
  faceoffs: [
    { q: "Name a 2-word phrase that includes the word “Secret”",
      answers: [["Secret Garden", 26], ["Top Secret", 21], ["Secret Agent", 17], ["Secret Admirer / Lover", 14], ["Secret Service", 6], ["Secret Santa", 4], ["Secret Society", 3]] },
    { q: "Name a phrase that begins with the word “Jump”",
      answers: [["Jump Rope", 25], ["Jumpstart", 23], ["Jump Up", 15], ["Jumping Jacks", 14], ["Jump for Joy", 9], ["Jump the Broom", 6], ["Jump the Gun", 4]] },
    { q: "Name an expression people often say that ends with the word “Up”",
      answers: [["What’s Up", 49], ["Shut Up", 17], ["Look Up", 15], ["Heads Up", 7], ["Screw Up", 4], ["Straight Up", 4], ["7 Up", 4]] },
    { q: "Name a phrase that begins with the word “Open”",
      answers: [["Open House", 32], ["Open Sesame", 25], ["Open Door", 13], ["Open-Minded", 9], ["Open Book", 9], ["Open Season", 4], ["Open Bar", 3]] },
    { q: "Name a word that begins with “Comp”",
      answers: [["Computer", 39], ["Competition", 17], ["Company", 12], ["Complimentary", 11], ["Composition", 7], ["Compensation", 7], ["Complete", 4]] },
    { q: "Name a word that begins with “Uni”",
      answers: [["Unicorn", 30], ["Universe", 26], ["Uniform", 14], ["Unite / Unity", 10], ["Unisex", 7], ["Unibrow", 6], ["Unicycle", 3]] },
  ],

  // Main board questions (the winning team plays these).
  mains: [
    { q: "Name something a male rockstar might do to make himself look more rebellious",
      answers: [["Tattoos", 26], ["Get Body Pierced", 25], ["Dye Hair", 16], ["Shave Head", 7], ["Paint Face", 7], ["Long Hair", 6], ["Facial Hair", 3]] },
    { q: "Name another word for toilet",
      answers: [["John", 37], ["Commode", 18], ["Potty", 14], ["Can", 12], ["Latrine", 7], ["Loo", 4], ["Bathroom", 2]] },
    { q: "Which band/orchestra instrument would be most effective if you wanted to wake someone up?",
      answers: [["Trumpet", 40], ["Tuba", 23], ["French Horn", 17], ["Drums", 7], ["Cymbals", 5], ["Xylophone", 3], ["Trombone", 3]] },
    { q: "Name an odor that’s so distinct, you know right away what it is",
      answers: [["Skunk", 22], ["Garlic", 18], ["Onions", 17], ["Poop", 13], ["Roses", 10], ["Gasoline", 8], ["Body Odor", 7]] },
    { q: "Name something a person with extra long arms would be good at",
      answers: [["Sports", 51], ["Reaching", 26], ["Hugging", 6], ["Rock Climbing", 6], ["Painting Ceilings", 5], ["Changing Lightbulbs", 3]] },
    { q: "If a group of senior citizens formed a punk rock band, what might their songs be about?",
      answers: [["Young People", 34], ["Medicine / Health", 32], ["Dentures", 12], ["Getting Old", 12], ["Fixed Income", 7], ["Aches and Pains", 3]] },
  ],

  // One minigame plays after each round.
  // `minutes` sets the timer. `reveal` = a hidden list you click to uncover one at a time.
  minigames: [
    { name: "Warheads Poker Face", minutes: 3,
      steps: ["Each team sends 1 champion to eat a Warhead.",
              "1 rival from another team watches them like a hawk.",
              "Last ones standing without flinching or making a face win points."] },
    { name: "Finish the Lyric", minutes: 8,
      steps: ["1 rep per team comes to the front.",
              "We play 5–7 songs and stop the music.",
              "First to sing the next line correctly wins points."] },
    { name: "Hot / Cold Noise Guide", minutes: 8,
      steps: ["1 person from each team steps outside.",
              "The room sees each team’s secret action (below).",
              "Seekers come back in and race to do their action, guided ONLY by teammates’ noises — no words!"],
      reveal: { label: "Secret actions", warn: "Make sure the seekers are outside first!",
        items: ["Put a traffic cone on your head", "Do 3 jumping jacks in the corner",
                "Sit under a table", "Shake hands with the host",
                "Spin around twice by the door", "Write your name on the whiteboard"] } },
    { name: "Charades Telephone", minutes: 8,
      steps: ["Each team writes down a charades-able phrase.",
              "Hand it off to another team.",
              "Act it out — whoever guesses it wins points."] },
    { name: "Scavenger Hunt", minutes: 5,
      steps: ["The host calls out an item.",
              "First team to bring it to the host wins points.",
              "Click the next card for the next item!"],
      reveal: { label: "Whoever brings me a…", warn: "Placeholder items — edit them in data.js.",
        items: ["Cornell ID with the number 5 on it", "Animal card folded 4 times", "Shoelace",
                "Something blue", "A paper boat (make one!)"] } },
    { name: "FINAL SPEED PLAY", minutes: 1,
      steps: ["I don't know how to format this one so it's just gonna be manual"] },
  ],

  // Steal challenges — the 5 non-playing teams race to do it.
  challenges: [
    { name: "Captain’s Coming!", call: "AYE AYE!", img: "images/captains-coming.png",
      action: "Stand shoulder to shoulder, salute, and yell AYE AYE!" },
    { name: "Lifeboat!", call: "ROW ROW ROW!", img: "images/lifeboat.png",
      action: "Sit single file and row while yelling ROW ROW ROW!" },
    { name: "Man Overboard!", call: "HELP! HELP! HELP!", img: "images/man-overboard.webp",
      action: "One person sits in the middle while everyone else circles around yelling HELP HELP HELP!" },
    { name: "Octopus!", call: "WIGGLE!", img: "images/octopus.png",
      action: "Sit back to back, lock arms, and wiggle your legs like tentacles!" },
    { name: "Mess Table!", call: "YUM YUM YUM YUM!", img: "images/mess-table.webp",
      action: "Sit in a circle, rub your stomachs, and yell YUM YUM YUM YUM!" },
    { name: "Tidal Wave!", call: "WHOOSH WHOOSH!", img: "images/tidal-wave.webp",
      action: "Do the wave with arms together and yell WHOOSH WHOOSH WHOOSH WHOOSH!" },
  ],
};
