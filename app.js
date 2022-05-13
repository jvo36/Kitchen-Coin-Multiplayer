// ISSUE: when grabbing the coin, only visually disappear, the coin is still inside the game/cell

const mapData = {
  minX: 1,
  maxX: 14,
  minY: 4,
  maxY: 12,
  blockedSpaces: {
    '7x4': true,
    '1x11': true,
    '12x10': true,
    '4x7': true,
    '5x7': true,
    '6x7': true,
    '8x6': true,
    '9x6': true,
    '10x6': true,
    '7x9': true,
    '8x9': true,
    '9x9': true,
  },
};

/* Date about the game */
// Option for Player Colors... same order as the sprite
const playerColors = ['blue', 'red', 'orange', 'yellow', 'green', 'purple'];

// Misc Helpers for random spawns and coins
function randomFromArray(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function getKeyString(x, y) {
  return `${x}x${y}`;
}

function createName() {
  const prefix = randomFromArray([
    'VANILLA',
    'CHOCOLATE',
    'STRAWBERRY',
    'COFFEE',
    'MATCHA',
    'UBE',
    'MANGO',
    'MAPLE',
    'PISTACHIO',
    'OREO',
    'MINT',
    'COCONUT',
    'M&M',
    'PEACH',
    'PINEAPPLE',
    'LYCHEE',
    'BANANA',
  ]);
  const dessert = randomFromArray([
    'BROWNIE',
    'CHEESECAKE',
    'TART',
    'CAKE',
    'PIE',
    'COOKIE',
    'WAFFLE',
    'PANCAKE',
    'CREAM',
    'CUSTARD',
    'BRULEE',
    'PUDDING',
    'BINGSU',
    'FLAN',
    'JELLY',
  ]);
  return `${prefix} ${dessert}`;
}

// function for certain space being blocked by a game object
function isSolid(x, y) {
  const blockedNextSpace = mapData.blockedSpaces[getKeyString(x, y)];
  return (
    blockedNextSpace ||
    x >= mapData.maxX ||
    x < mapData.minX ||
    y >= mapData.maxY ||
    y < mapData.minY
  );
}

function getRandomSafeSpot() {
  //We don't look things up by key here, so just return an x/y
  return randomFromArray([
    { x: 1, y: 4 },
    { x: 2, y: 4 },
    { x: 1, y: 5 },
    { x: 2, y: 6 },
    { x: 2, y: 8 },
    { x: 2, y: 9 },
    { x: 4, y: 8 },
    { x: 5, y: 5 },
    { x: 5, y: 8 },
    { x: 5, y: 10 },
    { x: 5, y: 11 },
    { x: 11, y: 7 },
    { x: 12, y: 7 },
    { x: 13, y: 7 },
    { x: 13, y: 6 },
    { x: 13, y: 8 },
    { x: 7, y: 6 },
    { x: 7, y: 7 },
    { x: 7, y: 8 },
    { x: 8, y: 8 },
    { x: 10, y: 8 },
    { x: 8, y: 8 },
    { x: 11, y: 4 },
  ]);
}

(function () {
  let playerId; // string of who logged in in Firebase
  let playerRef; // Firebase ref to interact with data
  let players = {}; // local list of state of where everyone is
  let playerElements = {}; // list of references in our DOM element
  let coins = {};
  let coinElements = {};

  const gameContainer = document.querySelector('.game-container');
  const playerNameInput = document.querySelector('#player-name');
  const playerColorButton = document.querySelector('#player-color');

  // function to place the coins randomly on the map
  function placeCoin() {
    const { x, y } = getRandomSafeSpot();
    const coinRef = firebase.database().ref(`coins/${getKeyString(x, y)}`);
    coinRef.set({
      x,
      y,
    });

    // coin timeout
    const coinTimeouts = [2000, 3000, 4000, 5000];
    setTimeout(() => {
      placeCoin();
    }, randomFromArray(coinTimeouts));
  }

  function attemptGrabCoin(x, y) {
    const key = getKeyString(x, y);
    if (coins[key]) {
      // Remove this key from data, then uptick Player's coin count
      firebase.database().ref(`coins/${key}`).remove();
      playerRef.update({
        coins: players[playerId].coins + 1,
      });
    }
  }

  function handleArrowPress(xChange = 0, yChange = 0) {
    const newX = players[playerId].x + xChange;
    const newY = players[playerId].y + yChange;

    if (!isSolid(newX, newY)) {
      // move to the next space
      players[playerId].x = newX;
      players[playerId].y = newY;
      if (xChange === 1) {
        players[playerId].direction = 'right';
      }
      if (xChange === -1) {
        players[playerId].direction = 'left';
      }
      playerRef.set(players[playerId]);
      attemptGrabCoin(newX, newY);
    }
  }

  // Read all the players and coins in the game
  function initGame() {
    new KeyPressListener('ArrowUp', () => handleArrowPress(0, -1));
    new KeyPressListener('ArrowDown', () => handleArrowPress(0, 1));
    new KeyPressListener('ArrowLeft', () => handleArrowPress(-1, 0));
    new KeyPressListener('ArrowRight', () => handleArrowPress(1, 0));

    const allPlayersRef = firebase.database().ref('players');
    const allCoinsRef = firebase.database().ref('coins');

    allPlayersRef.on('value', (snapshot) => {
      // Fires whenever a change occurs
      players = snapshot.val() || {};
      Object.keys(players).forEach((key) => {
        const characterState = players[key];
        let el = playerElements[key];
        // Update the DOM
        el.querySelector('.Character_name').innerText = characterState.name;
        el.querySelector('.Character_coins').innerText = characterState.coins;
        el.setAttribute('data-color', characterState.color);
        el.setAttribute('data-direction', characterState.direction);
        const left = 16 * characterState.x + 'px';
        const top = 16 * characterState.y - 4 + 'px';
        el.style.transform = `translate3d(${left}, ${top}, 0)`;
      });
    });

    allPlayersRef.on('child_added', (snapshot) => {
      // Fires whenever a new node is added to tree
      const addedPlayer = snapshot.val();
      const characterElement = document.createElement('div');
      characterElement.classList.add('Character', 'grid-cell');

      if (addedPlayer.id === playerId) {
        characterElement.classList.add('you');
      }
      characterElement.innerHTML = `
        <div class="Character_sprite grid-cell"></div>
        <div class="Character_name-container">
          <span class="Character_name"></span>
          <span class="Character_coins">0</span>
        </div>
        <div class="Character_you-arrow"></div>
      `;

      playerElements[addedPlayer.id] = characterElement;

      // Fill in some initial state, selected from the div
      characterElement.querySelector('.Character_name').innerText =
        addedPlayer.name;
      characterElement.querySelector('.Character_coins').innerText =
        addedPlayer.coins;
      characterElement.setAttribute('data-color', addedPlayer.color);
      characterElement.setAttribute('data-direction', addedPlayer.direction);
      const left = 16 * addedPlayer.x + 'px';
      const top = 16 * addedPlayer.y + -4 + 'px';
      characterElement.style.transform = `translate3d(${left}, ${top}, 0)`;
      gameContainer.appendChild(characterElement);
    });

    // Remove character DOM element after they leave game
    allPlayersRef.on('child_removed', (snapshot) => {
      const removedKey = snapshot.val().id;
      gameContainer.removeChild(playerElements[removedKey]);
      delete playerElements[removedKey];
    });

    allCoinsRef.on('child_added', (snapshot) => {
      const coin = snapshot.val();
      const key = getKeyString(coin.x, coin.y);
      coins[key] = true;

      // Create the DOM Element for the coins
      const coinElement = document.createElement('div');
      coinElement.classList.add('Coin', 'grid-cell');
      coinElement.innerHTML = `
        <div class="Coin_sprite grid-cell"></div>
      `;

      // Position the coin element
      const left = 16 * coin.x + 'px';
      const top = 16 * coin.y - 4 + 'px';
      coinElement.style.transform = `translate3d(${left}, ${top}, 0)`;

      // Keep a reference for removal later and add to DOM
      coinElements[key] = coinElement;
      gameContainer.appendChild(coinElement);
    });

    allCoinsRef.on('child_removed', (snapshot) => {
      const { x, y } = snapshot.val();
      const keyToRemove = getKeyString(x, y);
      gameContainer.removeChild(coinElements[keyToRemove]);
      delete coinElements[keyToRemove];
    });

    // Update the player name with text input
    playerNameInput.addEventListener('change', (e) => {
      const newName = e.target.value || createName();
      playerNameInput.value = newName;
      playerRef.update({
        name: newName,
      });
    });

    // Update player color on button click
    playerColorButton.addEventListener('click', () => {
      const mySkinIndex = playerColors.indexOf(players[playerId].color);
      const nextColor = playerColors[mySkinIndex + 1] || playerColors[0];
      playerRef.update({
        color: nextColor,
      });
    });

    // Place the first coin
    placeCoin();
  }

  /*--------------------------------------------------------------------*/
  firebase.auth().onAuthStateChanged((user) => {
    console.log(user);
    if (user) {
      // You're logged in!
      playerId = user.uid; // uid from the console in index.html
      playerRef = firebase.database().ref(`players/${playerId}`);

      const name = createName();

      playerNameInput.value = name;
      const { x, y } = getRandomSafeSpot();

      // read and write to Firebase with the players info
      playerRef.set({
        id: playerId,
        name,
        direction: 'right',
        color: randomFromArray(playerColors),
        // players position in x and y
        x,
        y,
        coins: 0,
      });

      // Remove player from Firebase when they disconnect
      playerRef.onDisconnect().remove();

      // Begin the game once signed in
      initGame();
    } else {
      // You're logged out!
    }
  });

  firebase
    .auth()
    .signInAnonymously()
    .catch((error) => {
      var errorCode = error.code;
      var errorMessage = error.message;
      console.log(errorCode, errorMessage);
    });
})();
