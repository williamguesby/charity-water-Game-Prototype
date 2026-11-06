(() => {
  const ROUND_SECONDS = 30;
  const DROP_INTERVAL = 650;
  const OBSTACLE_INTERVAL = 1900;
  const DROP_SPEED_MIN = 0.24;
  const DROP_SPEED_MAX = 0.38;
  const BUCKET_WIDTH = 65;
  const DROP_WIDTH = 22;
  const WIN_SCORE = 50;
  const playfield = document.querySelector("#playfield");
  const bucket = document.querySelector("#bucket");
  const scoreDisplay = document.querySelector("#score");
  const timerDisplay = document.querySelector("#timer");
  const missedDisplay = document.querySelector("#missed");
  const gameMessage = document.querySelector("#game-message");
  const messageKicker = gameMessage.querySelector(".message-kicker");
  const messageTitle = gameMessage.querySelector(".message-title");
  const startButton = document.querySelector("#start-button");
  const resetButton = document.querySelector("#reset-button");

  let state = "ready";
  let score = 0;
  let missed = 0;
  let remaining = ROUND_SECONDS;
  let bucketX = 0.5;
  let bucketY = 0.86;
  let dragOffsetX = 0;
  let dragOffsetY = 0;
  let drops = [];
  let lastFrame = 0;
  let spawnElapsed = 0;
  let obstacleElapsed = 0;
  let animationId = 0;
  let celebrationTimeout = 0;

  function updateStats() {
    scoreDisplay.textContent = String(score);
    timerDisplay.textContent = String(Math.ceil(remaining));
    missedDisplay.textContent = String(missed);
  }

  function positionBucket() {
    bucket.style.left = `${bucketX * 100}%`;
    bucket.style.top = `${bucketY * 100}%`;
  }

  function moveBucketTo(clientX, clientY) {
    const field = playfield.getBoundingClientRect();
    const halfBucket = BUCKET_WIDTH / 2 / field.width;
    const halfBucketHeight = bucket.offsetHeight / 2 / field.height;
    bucketX = Math.max(halfBucket, Math.min(1 - halfBucket, (clientX - field.left) / field.width));
    bucketY = Math.max(halfBucketHeight, Math.min(1 - halfBucketHeight, (clientY - field.top) / field.height));
    positionBucket();
  }

  function moveBucketBy(horizontal, vertical) {
    const field = playfield.getBoundingClientRect();
    const halfBucket = BUCKET_WIDTH / 2 / field.width;
    const halfBucketHeight = bucket.offsetHeight / 2 / field.height;
    bucketX = Math.max(halfBucket, Math.min(1 - halfBucket, bucketX + horizontal * 42 / field.width));
    bucketY = Math.max(halfBucketHeight, Math.min(1 - halfBucketHeight, bucketY + vertical * 42 / field.height));
    positionBucket();
  }

  function removeDrops() {
    for (const drop of drops) {
      drop.element.remove();
    }
    drops = [];
  }

  function resetGame() {
    cancelAnimationFrame(animationId);
    state = "ready";
    score = 0;
    missed = 0;
    remaining = ROUND_SECONDS;
    bucketX = 0.5;
    bucketY = 0.86;
    lastFrame = 0;
    spawnElapsed = 0;
    obstacleElapsed = 0;
    window.clearTimeout(celebrationTimeout);
    playfield.querySelector(".confetti-layer")?.remove();
    removeDrops();
    positionBucket();
    updateStats();
    messageKicker.textContent = "READY WHEN YOU ARE";
    messageTitle.textContent = "Catch every drop.";
    startButton.innerHTML = 'Start game <span aria-hidden="true">→</span>';
    gameMessage.classList.remove("is-hidden");
  }

  function finishGame() {
    state = "finished";
    remaining = 0;
    updateStats();
    const won = score >= WIN_SCORE;
    messageKicker.textContent = won ? "YOU DID IT!" : "TIME'S UP";
    messageTitle.textContent = won
      ? `Amazing! You reached ${score} points.`
      : `You caught ${score / 10} ${score === 10 ? "drop" : "drops"}. Try for ${WIN_SCORE} points!`;
    startButton.innerHTML = 'Play again <span aria-hidden="true">→</span>';
    gameMessage.classList.remove("is-hidden");
    if (won) celebrateWin();
  }

  function pauseGame() {
    cancelAnimationFrame(animationId);
    state = "paused";
    messageKicker.textContent = "ROUND PAUSED";
    messageTitle.textContent = "Your drops are waiting.";
    startButton.innerHTML = 'Resume game <span aria-hidden="true">→</span>';
    gameMessage.classList.remove("is-hidden");
  }

  function resumeGame() {
    if (state === "finished") resetGame();
    state = "running";
    startButton.innerHTML = "Pause game";
    gameMessage.classList.add("is-hidden");
    lastFrame = 0;
    animationId = requestAnimationFrame(gameLoop);
  }

  function toggleGame() {
    if (state === "running") {
      pauseGame();
    } else {
      resumeGame();
    }
  }

  function createDrop(kind = "clean") {
    const element = document.createElement("span");
    element.className = `drop ${kind === "dirty" ? "drop-obstacle" : ""}`;
    element.setAttribute("aria-hidden", "true");
    const x = 0.06 + Math.random() * 0.88;
    const speed = DROP_SPEED_MIN + Math.random() * (DROP_SPEED_MAX - DROP_SPEED_MIN);
    playfield.append(element);
    drops.push({ element, x, y: -0.05, speed, kind });
  }

  function celebrateWin() {
    const layer = document.createElement("div");
    layer.className = "confetti-layer";
    layer.setAttribute("aria-hidden", "true");

    for (let index = 0; index < 36; index += 1) {
      const piece = document.createElement("span");
      piece.className = "confetti-piece";
      piece.style.setProperty("--confetti-x", `${Math.random() * 100}%`);
      piece.style.setProperty("--confetti-delay", `${Math.random() * 0.55}s`);
      piece.style.setProperty("--confetti-turn", `${Math.random() * 540 - 270}deg`);
      piece.style.setProperty("--confetti-color", ["#ffc907", "#20a8d1", "#244651", "#f28c28"][index % 4]);
      layer.append(piece);
    }

    playfield.append(layer);
    celebrationTimeout = window.setTimeout(() => layer.remove(), 3000);
  }

  function gameLoop(timestamp) {
    if (state !== "running") return;
    const delta = lastFrame === 0 ? 0 : Math.min((timestamp - lastFrame) / 1000, 0.05);
    lastFrame = timestamp;
    remaining = Math.max(0, remaining - delta);
    spawnElapsed += delta * 1000;

    if (spawnElapsed >= DROP_INTERVAL) {
      spawnElapsed -= DROP_INTERVAL;
      createDrop();
    }
    obstacleElapsed += delta * 1000;
    if (obstacleElapsed >= OBSTACLE_INTERVAL) {
      obstacleElapsed -= OBSTACLE_INTERVAL;
      createDrop("dirty");
    }

    const field = playfield.getBoundingClientRect();
    const bucketBounds = bucket.getBoundingClientRect();
    const catchRadius = (bucketBounds.width + DROP_WIDTH) / 2 / field.width;
    const bucketLineY = (bucketBounds.top - field.top) / field.height;
    const bucketBottomY = (bucketBounds.bottom - field.top + DROP_WIDTH / 2) / field.height;

    drops = drops.filter((drop) => {
      drop.y += drop.speed * delta;
      drop.element.style.left = `${drop.x * 100}%`;
      drop.element.style.top = `${drop.y * 100}%`;

      if (drop.y >= bucketLineY && drop.y <= bucketBottomY && Math.abs(drop.x - bucketX) <= catchRadius) {
        score = Math.max(0, score + (drop.kind === "dirty" ? -30 : 10));
        drop.element.remove();
        return false;
      }

      if (drop.y > 1.05) {
        if (drop.kind === "clean") missed += 1;
        drop.element.remove();
        return false;
      }
      return true;
    });

    updateStats();
    if (remaining <= 0) {
      finishGame();
      return;
    }
    animationId = requestAnimationFrame(gameLoop);
  }

  startButton.addEventListener("click", toggleGame);
  resetButton.addEventListener("click", resetGame);

  bucket.addEventListener("pointerdown", (event) => {
    if (state !== "running") return;
    const bounds = bucket.getBoundingClientRect();
    dragOffsetX = event.clientX - (bounds.left + bounds.width / 2);
    dragOffsetY = event.clientY - (bounds.top + bounds.height / 2);
    bucket.classList.add("is-dragging");
    bucket.setPointerCapture(event.pointerId);
    event.preventDefault();
  });

  bucket.addEventListener("pointermove", (event) => {
    if (bucket.hasPointerCapture(event.pointerId) && state === "running") {
      moveBucketTo(event.clientX - dragOffsetX, event.clientY - dragOffsetY);
    }
  });

  function endBucketDrag(event) {
    if (bucket.hasPointerCapture(event.pointerId)) {
      bucket.releasePointerCapture(event.pointerId);
    }
    bucket.classList.remove("is-dragging");
  }

  bucket.addEventListener("pointerup", endBucketDrag);
  bucket.addEventListener("pointercancel", endBucketDrag);

  document.addEventListener("keydown", (event) => {
    if (state !== "running" || event.target.closest("button")) return;
    if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
      event.preventDefault();
      moveBucketBy(-1, 0);
    } else if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
      event.preventDefault();
      moveBucketBy(1, 0);
    } else if (event.key === "ArrowUp" || event.key.toLowerCase() === "w") {
      event.preventDefault();
      moveBucketBy(0, -1);
    } else if (event.key === "ArrowDown" || event.key.toLowerCase() === "s") {
      event.preventDefault();
      moveBucketBy(0, 1);
    }
  });

  resetGame();
})();
