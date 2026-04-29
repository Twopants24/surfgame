import * as THREE from "three";

const canvas = document.getElementById("scene");
const speedValue = document.getElementById("speed-value");
const stateValue = document.getElementById("state-value");
const wavesToggle = document.getElementById("waves-toggle");
const boardSelect = document.getElementById("board-select");

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
renderer.shadowMap.enabled = true;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8ad8ff);
scene.fog = new THREE.Fog(0x8ad8ff, 90, 260);

const camera = new THREE.PerspectiveCamera(55, canvas.clientWidth / canvas.clientHeight, 0.1, 500);
camera.position.set(0, 7, 16);

const hemi = new THREE.HemisphereLight(0xe8fbff, 0xd6b071, 2.2);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xfff0c2, 2.4);
sun.position.set(-18, 26, 12);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 0.5;
sun.shadow.camera.far = 120;
sun.shadow.camera.left = -40;
sun.shadow.camera.right = 40;
sun.shadow.camera.top = 40;
sun.shadow.camera.bottom = -40;
scene.add(sun);

const world = new THREE.Group();
scene.add(world);

const oceanGeometry = new THREE.PlaneGeometry(280, 280, 120, 120);
const oceanVertexCount = oceanGeometry.attributes.position.count;
const oceanColors = new Float32Array(oceanVertexCount * 3);
oceanGeometry.setAttribute("color", new THREE.BufferAttribute(oceanColors, 3));
const OCEAN_DEEP_COLOR = new THREE.Color(0x1f83d1);
const OCEAN_WHITEWATER_COLOR = new THREE.Color(0xf6fdff);
const oceanColorMix = new THREE.Color();
const oceanMaterial = new THREE.MeshStandardMaterial({
  color: 0x1f83d1,
  emissive: 0x0e3e67,
  emissiveIntensity: 0.24,
  roughness: 0.18,
  metalness: 0.05,
  transparent: true,
  opacity: 0.96,
  vertexColors: true,
});
const ocean = new THREE.Mesh(oceanGeometry, oceanMaterial);
ocean.rotation.x = -Math.PI / 2;
ocean.receiveShadow = true;
world.add(ocean);

const oceanBasePositions = Float32Array.from(oceanGeometry.attributes.position.array);
const SINGLE_WAVE_LENGTH = 140;
const mainWave = {
  start: new THREE.Vector2(-48, 46),
  direction: new THREE.Vector2(1, -0.08).normalize(),
  speed: 5.4,
  width: 15.5,
  amplitude: 4.9,
  crestWidth: 5.1,
  peelRate: 0.8,
  wallHeight: 7.2,
  wallDepth: 5.8,
  faceTightness: 0.82,
  lipOffset: 0.32,
  lipTightness: 0.46,
  bodyOffset: 0.18,
  troughOffset: 0.72,
  troughWidth: 0.88,
  troughStrength: 0.24,
  foamAmount: 1,
};
mainWave.normal = new THREE.Vector2(-mainWave.direction.y, mainWave.direction.x);
const BASE_WAVE_PROFILE = {
  width: 15.5,
  amplitude: 4.9,
  crestWidth: 5.1,
  peelRate: 0.8,
  wallHeight: 7.2,
  wallDepth: 5.8,
  faceTightness: 0.82,
  lipOffset: 0.32,
  lipTightness: 0.46,
  bodyOffset: 0.18,
  troughOffset: 0.72,
  troughWidth: 0.88,
  troughStrength: 0.24,
  foamAmount: 1,
};
const WAVE_RESPAWN_DISTANCE = 156;
const waveState = {
  travel: 0,
};
const sceneState = {
  wavesEnabled: true,
  boardStyle: "shortboard",
};
const BOARD_PROFILES = {
  shortboard: {
    label: "Shortboard",
    specialty: "snappy turns",
    acceleration: 9.2,
    boostAcceleration: 12.6,
    maxSpeed: 11.5,
    boostMaxSpeed: 15.8,
    turnRate: 1.22,
    waveGrip: 1.08,
    boostDuration: 1.15,
  },
  fish: {
    label: "Fish",
    specialty: "fast glide",
    acceleration: 8.4,
    boostAcceleration: 11.4,
    maxSpeed: 12.8,
    boostMaxSpeed: 16.6,
    turnRate: 0.96,
    waveGrip: 0.92,
    boostDuration: 1.35,
  },
  longboard: {
    label: "Longboard",
    specialty: "wave control",
    acceleration: 7.4,
    boostAcceleration: 10.2,
    maxSpeed: 10.6,
    boostMaxSpeed: 14.2,
    turnRate: 0.82,
    waveGrip: 1.28,
    boostDuration: 1.5,
  },
};

const sandMaterial = new THREE.MeshStandardMaterial({ color: 0xe6c98a, roughness: 1 });
const cliffMaterial = new THREE.MeshStandardMaterial({ color: 0x7c6645, roughness: 1 });
const palmTrunkMaterial = new THREE.MeshStandardMaterial({ color: 0x7c5332, roughness: 1 });
const palmLeafMaterial = new THREE.MeshStandardMaterial({ color: 0x2f9c68, roughness: 0.9 });

function createIsland(x, z, scale) {
  const island = new THREE.Group();

  const sand = new THREE.Mesh(new THREE.CylinderGeometry(6 * scale, 8 * scale, 1.8 * scale, 24), sandMaterial);
  sand.castShadow = true;
  sand.receiveShadow = true;
  island.add(sand);

  const cliff = new THREE.Mesh(new THREE.CylinderGeometry(3.5 * scale, 5.5 * scale, 3.2 * scale, 18), cliffMaterial);
  cliff.position.y = 2;
  cliff.castShadow = true;
  cliff.receiveShadow = true;
  island.add(cliff);

  for (let i = 0; i < 3; i += 1) {
    const palm = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 2.8, 8), palmTrunkMaterial);
    trunk.position.y = 3.3;
    trunk.rotation.z = -0.2 + i * 0.16;
    trunk.castShadow = true;
    palm.add(trunk);

    for (let leafIndex = 0; leafIndex < 5; leafIndex += 1) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.18, 2.2, 6), palmLeafMaterial);
      leaf.position.y = 4.8;
      leaf.rotation.z = Math.PI / 2;
      leaf.rotation.y = (leafIndex / 5) * Math.PI * 2;
      leaf.castShadow = true;
      palm.add(leaf);
    }

    palm.position.set((i - 1) * 1.4, 0.7, (i % 2 === 0 ? -1 : 1) * 1.3);
    island.add(palm);
  }

  island.position.set(x, 0.6, z);
  world.add(island);
}

createIsland(-28, -18, 1.1);
createIsland(22, -26, 0.9);
createIsland(34, 18, 1.3);
createIsland(-36, 24, 0.8);

function createBuoy(x, z, color) {
  const buoy = new THREE.Group();
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.28, 1.4, 12),
    new THREE.MeshStandardMaterial({ color, roughness: 0.5 })
  );
  base.castShadow = true;
  buoy.add(base);

  const top = new THREE.Mesh(
    new THREE.SphereGeometry(0.24, 16, 12),
    new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: color, emissiveIntensity: 0.15 })
  );
  top.position.y = 0.8;
  top.castShadow = true;
  buoy.add(top);

  buoy.position.set(x, 0.7, z);
  world.add(buoy);
  return buoy;
}

const buoys = [
  createBuoy(-8, -10, 0xff6b6b),
  createBuoy(10, 8, 0xffd166),
  createBuoy(18, -4, 0x7af0d6),
  createBuoy(-16, 16, 0xff6b6b),
];

const surfer = new THREE.Group();
world.add(surfer);

const boardGroup = new THREE.Group();
surfer.add(boardGroup);

const boardMaterial = new THREE.MeshStandardMaterial({ color: 0xfff7ef, roughness: 0.34, metalness: 0.02 });
const accentMaterial = new THREE.MeshStandardMaterial({ color: 0xff8f5a, roughness: 0.28 });
const finMaterial = new THREE.MeshStandardMaterial({ color: 0x10395c, roughness: 0.55 });

const boardDeck = new THREE.Mesh(new THREE.BoxGeometry(2.55, 0.1, 0.62), boardMaterial);
boardDeck.castShadow = true;
boardDeck.receiveShadow = true;
boardGroup.add(boardDeck);

const boardNose = new THREE.Mesh(new THREE.SphereGeometry(0.31, 20, 14), boardMaterial);
boardNose.scale.set(1.05, 0.24, 1);
boardNose.position.x = 1.24;
boardNose.castShadow = true;
boardGroup.add(boardNose);

const boardTail = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.1, 0.56), boardMaterial);
boardTail.position.x = -1.28;
boardTail.castShadow = true;
boardGroup.add(boardTail);

const leftRail = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 2.38, 10), boardMaterial);
leftRail.rotation.z = Math.PI / 2;
leftRail.position.set(0.03, -0.01, 0.27);
leftRail.castShadow = true;
boardGroup.add(leftRail);

const rightRail = leftRail.clone();
rightRail.position.z = -0.27;
boardGroup.add(rightRail);

const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.03, 0.12), accentMaterial);
stripe.position.set(0.18, 0.065, 0);
stripe.castShadow = true;
boardGroup.add(stripe);

const stripeTail = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.03, 0.22), accentMaterial);
stripeTail.position.set(-0.84, 0.066, 0);
stripeTail.castShadow = true;
boardGroup.add(stripeTail);

const leashPlug = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.03, 10), finMaterial);
leashPlug.rotation.z = Math.PI / 2;
leashPlug.position.set(-1.18, 0.04, 0);
boardGroup.add(leashPlug);

for (const finConfig of [
  { x: -1.03, z: 0.16, rotY: -0.22, scale: 1 },
  { x: -1.03, z: -0.16, rotY: 0.22, scale: 1 },
  { x: -1.17, z: 0, rotY: 0, scale: 0.86 },
]) {
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.22, 0.035), finMaterial);
  fin.position.set(finConfig.x, -0.15, finConfig.z);
  fin.rotation.z = -0.18;
  fin.rotation.y = finConfig.rotY;
  fin.scale.set(finConfig.scale, finConfig.scale, 1);
  fin.castShadow = true;
  boardGroup.add(fin);
}
boardGroup.rotation.y = -Math.PI / 2;

const boardParts = {
  boardDeck,
  boardNose,
  boardTail,
  leftRail,
  rightRail,
  stripe,
  stripeTail,
};

const rider = new THREE.Group();
const torso = new THREE.Mesh(
  new THREE.BoxGeometry(0.5, 0.95, 0.32),
  new THREE.MeshStandardMaterial({ color: 0x101820, roughness: 0.9 })
);
torso.position.y = 1.02;
torso.castShadow = true;
rider.add(torso);

const head = new THREE.Mesh(
  new THREE.SphereGeometry(0.22, 20, 16),
  new THREE.MeshStandardMaterial({ color: 0xf2c6a0, roughness: 0.95 })
);
head.position.y = 1.72;
head.castShadow = true;
rider.add(head);

const legGeometry = new THREE.BoxGeometry(0.16, 0.78, 0.16);
for (const offsetX of [-0.12, 0.12]) {
  const leg = new THREE.Mesh(legGeometry, torso.material);
  leg.position.set(offsetX, 0.4, offsetX > 0 ? 0.08 : -0.08);
  leg.rotation.z = offsetX > 0 ? 0.16 : -0.16;
  leg.castShadow = true;
  rider.add(leg);
}

for (const offsetZ of [-0.22, 0.22]) {
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.7, 0.14), torso.material);
  arm.position.set(0, 1.15, offsetZ);
  arm.rotation.z = offsetZ > 0 ? -0.85 : 0.85;
  arm.castShadow = true;
  rider.add(arm);
}

rider.position.y = 0.1;
surfer.add(rider);

const wake = new THREE.Mesh(
  new THREE.PlaneGeometry(1.8, 5.2, 1, 10),
  new THREE.MeshBasicMaterial({
    color: 0xe7fbff,
    transparent: true,
    opacity: 0.32,
    side: THREE.DoubleSide,
  })
);
wake.rotation.x = -Math.PI / 2;
wake.rotation.z = Math.PI / 2;
wake.position.set(-2.5, -0.08, 0);
surfer.add(wake);

const boostFoam = new THREE.Mesh(
  new THREE.PlaneGeometry(2.8, 3.4, 1, 1),
  new THREE.MeshBasicMaterial({
    color: 0xf4feff,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
);
boostFoam.rotation.x = -Math.PI / 2;
boostFoam.rotation.z = Math.PI / 2;
boostFoam.position.set(-1.6, 0.05, 0);
boostFoam.scale.set(0.7, 0.7, 1);
surfer.add(boostFoam);

const input = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  boost: false,
};

const surfState = {
  heading: 0,
  velocity: 0,
  bob: 0,
  boardPitch: 0,
  boardRoll: 0,
  hopVelocity: 0,
  height: 0,
  waveLift: 0,
  attachedToWave: false,
  boostTimer: 0,
  hopEjectTimer: 0,
  ejectVelocityX: 0,
  ejectVelocityZ: 0,
};

const clock = new THREE.Clock();

function applyBoardStyle(style) {
  sceneState.boardStyle = style;

  if (style === "fish") {
    boardGroup.scale.set(0.92, 1, 1.14);
    boardParts.boardDeck.scale.set(0.88, 1, 1.08);
    boardParts.boardNose.scale.set(0.9, 0.21, 1.08);
    boardParts.boardTail.scale.set(1.1, 1, 1.28);
    boardParts.boardTail.position.x = -1.18;
    boardParts.stripe.scale.set(0.8, 1, 1);
    boardParts.stripeTail.scale.set(0.9, 1, 1.14);
    accentMaterial.color.set(0x4fd8c8);
  } else if (style === "longboard") {
    boardGroup.scale.set(1.22, 1, 1.02);
    boardParts.boardDeck.scale.set(1.16, 1, 0.94);
    boardParts.boardNose.scale.set(1.34, 0.25, 0.96);
    boardParts.boardTail.scale.set(0.9, 1, 0.92);
    boardParts.boardTail.position.x = -1.42;
    boardParts.stripe.scale.set(1.34, 1, 1);
    boardParts.stripeTail.scale.set(1.16, 1, 1);
    accentMaterial.color.set(0xffd166);
  } else {
    boardGroup.scale.set(1, 1, 1);
    boardParts.boardDeck.scale.set(1, 1, 1);
    boardParts.boardNose.scale.set(1.05, 0.24, 1);
    boardParts.boardTail.scale.set(1, 1, 1);
    boardParts.boardTail.position.x = -1.28;
    boardParts.stripe.scale.set(1, 1, 1);
    boardParts.stripeTail.scale.set(1, 1, 1);
    accentMaterial.color.set(0xff8f5a);
  }
}

function getBoardProfile() {
  return BOARD_PROFILES[sceneState.boardStyle] ?? BOARD_PROFILES.shortboard;
}

function getWaveCenter() {
  return mainWave.start.clone().addScaledVector(mainWave.direction, waveState.travel);
}

function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

function randomizeWaveProfile() {
  mainWave.width = BASE_WAVE_PROFILE.width * randomRange(0.88, 1.22);
  mainWave.amplitude = BASE_WAVE_PROFILE.amplitude * randomRange(0.82, 1.24);
  mainWave.crestWidth = BASE_WAVE_PROFILE.crestWidth * randomRange(0.82, 1.18);
  mainWave.peelRate = BASE_WAVE_PROFILE.peelRate * randomRange(0.8, 1.18);
  mainWave.wallHeight = BASE_WAVE_PROFILE.wallHeight * randomRange(0.88, 1.18);
  mainWave.wallDepth = BASE_WAVE_PROFILE.wallDepth * randomRange(0.84, 1.16);
  mainWave.faceTightness = randomRange(0.7, 0.96);
  mainWave.lipOffset = randomRange(0.24, 0.42);
  mainWave.lipTightness = randomRange(0.36, 0.58);
  mainWave.bodyOffset = randomRange(0.08, 0.28);
  mainWave.troughOffset = randomRange(0.6, 0.86);
  mainWave.troughWidth = randomRange(0.78, 1.04);
  mainWave.troughStrength = randomRange(0.18, 0.34);
  mainWave.foamAmount = randomRange(0.85, 1.45);
}

randomizeWaveProfile();

function updateWaveLifecycle(delta) {
  if (!sceneState.wavesEnabled) {
    return;
  }
  waveState.travel += mainWave.speed * delta;
  if (waveState.travel > WAVE_RESPAWN_DISTANCE) {
    waveState.travel = 0;
    surfState.attachedToWave = false;
    randomizeWaveProfile();
  }
}

function setInput(code, isDown) {
  if (code === "KeyW" || code === "ArrowUp") input.forward = isDown;
  if (code === "KeyS" || code === "ArrowDown") input.backward = isDown;
  if (code === "KeyA" || code === "ArrowLeft") input.left = isDown;
  if (code === "KeyD" || code === "ArrowRight") input.right = isDown;
  if (code === "ShiftLeft" || code === "ShiftRight") {
    if (isDown && !input.boost) {
      surfState.boostTimer = getBoardProfile().boostDuration;
    }
    input.boost = isDown;
  }
  if (isDown && code === "Space" && surfState.height <= 0.02) {
    const waveJump = surfState.attachedToWave;
    surfState.hopVelocity = waveJump ? 5.8 : 4.8;
    surfState.attachedToWave = false;
    surfState.waveLift = 0;
    surfState.hopEjectTimer = waveJump ? 0.8 : 0.45;
    if (waveJump) {
      surfState.ejectVelocityX = mainWave.normal.x * 9.2 - mainWave.direction.x * 1.4;
      surfState.ejectVelocityZ = mainWave.normal.y * 9.2 - mainWave.direction.y * 1.4;
    }
  }
}

function resetInputState() {
  input.forward = false;
  input.backward = false;
  input.left = false;
  input.right = false;
  input.boost = false;
}

window.addEventListener("keydown", (event) => {
  if (event.code === "Space") {
    event.preventDefault();
  }
  setInput(event.code, true);
});
window.addEventListener("keyup", (event) => setInput(event.code, false));
window.addEventListener("blur", resetInputState);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    resetInputState();
  }
});
wavesToggle?.addEventListener("change", () => {
  sceneState.wavesEnabled = wavesToggle.checked;
  if (!sceneState.wavesEnabled) {
    surfState.attachedToWave = false;
  }
});
boardSelect?.addEventListener("change", () => {
  applyBoardStyle(boardSelect.value);
});

function sampleWaveHeight(x, z, time) {
  return sampleWaveField(x, z, time).height;
}

function sampleWaveField(x, z, time) {
  let height = Math.sin((x + z) * 0.035 + time * 0.8) * 0.06 + Math.cos(z * 0.04 - time * 0.65) * 0.05;
  let foam = 0;
  let pushX = 0;
  let pushZ = 0;
  let activeWave = null;
  if (!sceneState.wavesEnabled) {
    const sampleOffset = 0.35;
    const heightX1 = sampleWaveFieldRaw(x + sampleOffset, z, time);
    const heightX2 = sampleWaveFieldRaw(x - sampleOffset, z, time);
    const heightZ1 = sampleWaveFieldRaw(x, z + sampleOffset, time);
    const heightZ2 = sampleWaveFieldRaw(x, z - sampleOffset, time);
    const slopeX = (heightX1 - heightX2) / (sampleOffset * 2);
    const slopeZ = (heightZ1 - heightZ2) / (sampleOffset * 2);
    return { height, slopeX, slopeZ, foam, pushX, pushZ, activeWave };
  }
  const center = getWaveCenter();
  const offsetX = x - center.x;
  const offsetZ = z - center.y;
  const across = offsetX * mainWave.normal.x + offsetZ * mainWave.normal.y;
  const along = offsetX * mainWave.direction.x + offsetZ * mainWave.direction.y;

  if (Math.abs(along) < SINGLE_WAVE_LENGTH * 0.5) {
    const shoulder = Math.exp(-((along * along) / ((SINGLE_WAVE_LENGTH * 0.48) ** 2)));
    const peelOffset = along * mainWave.peelRate;
    const faceCenter = peelOffset + mainWave.crestWidth * 0.52;
    const rideCenterAcross = faceCenter - mainWave.crestWidth * 0.78;
    const body = Math.exp(-(((across + mainWave.width * mainWave.bodyOffset + peelOffset * 0.08) ** 2) / ((mainWave.width * 1.08) ** 2)));
    const face = Math.exp(-(((across - faceCenter) ** 2) / ((mainWave.crestWidth * mainWave.faceTightness) ** 2)));
    const lip = Math.exp(-(((across - (faceCenter + mainWave.crestWidth * mainWave.lipOffset)) ** 2) / ((mainWave.crestWidth * mainWave.lipTightness) ** 2)));
    const trough = Math.exp(-(((across + mainWave.width * mainWave.troughOffset) ** 2) / ((mainWave.width * mainWave.troughWidth) ** 2)));
    const waveHeight = (body * 0.92 + face * 1.45 + lip * 0.95 - trough * mainWave.troughStrength) * shoulder * mainWave.amplitude;
    const faceOffset = across - faceCenter;
    const contactBandWidth = mainWave.crestWidth * 0.85;
    const touchBandWidth = mainWave.crestWidth * 1.35;
    const contactFactor = THREE.MathUtils.clamp(1 - Math.abs(faceOffset) / contactBandWidth, 0, 1);
    const touchFactor = THREE.MathUtils.clamp(1 - Math.abs(faceOffset) / touchBandWidth, 0, 1);
    const touch = touchFactor * shoulder * face;
    const centerOffset = rideCenterAcross - across;
    const centered = THREE.MathUtils.clamp(1 - Math.abs(centerOffset) / (mainWave.crestWidth * 1.05), 0, 1);
    const pull = touchFactor * shoulder * (0.7 + body * 0.45);
    const lift = contactFactor * shoulder * face * centered;
    const touching = touch > 0.18 && shoulder > 0.24 && face > 0.2;
    const attachable = lift > 0.28 && centered > 0.62 && waveHeight > mainWave.amplitude * 0.48;

    height += waveHeight;
    foam = THREE.MathUtils.clamp((face * 1.35 + lip * 1.2 + Math.max(0, waveHeight / mainWave.amplitude - 0.58) * 0.55) * shoulder * mainWave.foamAmount, 0, 1);

    if (touching || attachable) {
      activeWave = {
        pushStrength: lift,
        direction: mainWave.direction,
        face,
        touch,
        pull,
        lift,
        centered,
        center,
        along,
        across,
        targetAcross: rideCenterAcross,
        touching,
        attachable,
      };
    }
  }

  const sampleOffset = 0.35;
  const heightX1 = sampleWaveFieldRaw(x + sampleOffset, z, time);
  const heightX2 = sampleWaveFieldRaw(x - sampleOffset, z, time);
  const heightZ1 = sampleWaveFieldRaw(x, z + sampleOffset, time);
  const heightZ2 = sampleWaveFieldRaw(x, z - sampleOffset, time);
  const slopeX = (heightX1 - heightX2) / (sampleOffset * 2);
  const slopeZ = (heightZ1 - heightZ2) / (sampleOffset * 2);

  return { height, slopeX, slopeZ, foam, pushX, pushZ, activeWave };
}

function sampleWaveFieldRaw(x, z, time) {
  let height = Math.sin((x + z) * 0.035 + time * 0.8) * 0.06 + Math.cos(z * 0.04 - time * 0.65) * 0.05;
  if (!sceneState.wavesEnabled) {
    return height;
  }
  const center = getWaveCenter();
  const offsetX = x - center.x;
  const offsetZ = z - center.y;
  const across = offsetX * mainWave.normal.x + offsetZ * mainWave.normal.y;
  const along = offsetX * mainWave.direction.x + offsetZ * mainWave.direction.y;

  if (Math.abs(along) < SINGLE_WAVE_LENGTH * 0.5) {
    const shoulder = Math.exp(-((along * along) / ((SINGLE_WAVE_LENGTH * 0.48) ** 2)));
    const peelOffset = along * mainWave.peelRate;
    const faceCenter = peelOffset + mainWave.crestWidth * 0.52;
    const body = Math.exp(-(((across + mainWave.width * mainWave.bodyOffset + peelOffset * 0.08) ** 2) / ((mainWave.width * 1.08) ** 2)));
    const face = Math.exp(-(((across - faceCenter) ** 2) / ((mainWave.crestWidth * mainWave.faceTightness) ** 2)));
    const lip = Math.exp(-(((across - (faceCenter + mainWave.crestWidth * mainWave.lipOffset)) ** 2) / ((mainWave.crestWidth * mainWave.lipTightness) ** 2)));
    const trough = Math.exp(-(((across + mainWave.width * mainWave.troughOffset) ** 2) / ((mainWave.width * mainWave.troughWidth) ** 2)));
    height += (body * 0.92 + face * 1.45 + lip * 0.95 - trough * mainWave.troughStrength) * shoulder * mainWave.amplitude;
  }

  return height;
}

function sampleWaveMeshDeformation(x, z, time) {
  if (!sceneState.wavesEnabled) {
    return { offsetX: 0, offsetZ: 0 };
  }

  const center = getWaveCenter();
  const offsetX = x - center.x;
  const offsetZ = z - center.y;
  const across = offsetX * mainWave.normal.x + offsetZ * mainWave.normal.y;
  const along = offsetX * mainWave.direction.x + offsetZ * mainWave.direction.y;

  if (Math.abs(along) >= SINGLE_WAVE_LENGTH * 0.5) {
    return { offsetX: 0, offsetZ: 0 };
  }

  const shoulder = Math.exp(-((along * along) / ((SINGLE_WAVE_LENGTH * 0.48) ** 2)));
  const peelOffset = along * mainWave.peelRate;
  const faceCenter = peelOffset + mainWave.crestWidth * 0.52;
  const body = Math.exp(-(((across + mainWave.width * mainWave.bodyOffset + peelOffset * 0.08) ** 2) / ((mainWave.width * 1.08) ** 2)));
  const face = Math.exp(-(((across - faceCenter) ** 2) / ((mainWave.crestWidth * mainWave.faceTightness) ** 2)));
  const lip = Math.exp(-(((across - (faceCenter + mainWave.crestWidth * mainWave.lipOffset)) ** 2) / ((mainWave.crestWidth * mainWave.lipTightness) ** 2)));
  const trough = Math.exp(-(((across + mainWave.width * mainWave.troughOffset) ** 2) / ((mainWave.width * mainWave.troughWidth) ** 2)));

  const crestPull = (face * 2.05 + lip * 1.35 - body * 0.2 - trough * 0.32) * shoulder;
  const peelStretch = (face * 0.72 + lip * 0.4 + body * 0.3) * shoulder;
  const normalOffset = crestPull * 4.7;
  const directionOffset = peelStretch * 1.55;

  return {
    offsetX: mainWave.normal.x * normalOffset + mainWave.direction.x * directionOffset,
    offsetZ: mainWave.normal.y * normalOffset + mainWave.direction.y * directionOffset,
  };
}

function updateOcean(time) {
  const positions = oceanGeometry.attributes.position.array;
  for (let i = 0; i < positions.length; i += 3) {
    const baseX = oceanBasePositions[i];
    const baseY = oceanBasePositions[i + 1];
    const baseZ = oceanBasePositions[i + 2];
    const wave = sampleWaveField(baseX, baseZ, time);
    const meshDeformation = sampleWaveMeshDeformation(baseX, baseZ, time);
    positions[i] = baseX + meshDeformation.offsetX;
    positions[i + 1] = baseY + wave.height;
    positions[i + 2] = baseZ + meshDeformation.offsetZ;

    const foam = THREE.MathUtils.clamp(wave.foam * 2.25 + Math.max(0, wave.height - 1) * 0.24, 0, 1);
    oceanColorMix.copy(OCEAN_DEEP_COLOR).lerp(OCEAN_WHITEWATER_COLOR, foam);
    oceanColors[i] = oceanColorMix.r;
    oceanColors[i + 1] = oceanColorMix.g;
    oceanColors[i + 2] = oceanColorMix.b;
  }
  oceanGeometry.attributes.position.needsUpdate = true;
  oceanGeometry.attributes.color.needsUpdate = true;
  oceanGeometry.computeVertexNormals();
}

function resizeRenderer() {
  const { clientWidth, clientHeight } = canvas;
  if (canvas.width !== clientWidth || canvas.height !== clientHeight) {
    renderer.setSize(clientWidth, clientHeight, false);
    camera.aspect = clientWidth / clientHeight;
    camera.updateProjectionMatrix();
  }
}

function animate() {
  const delta = Math.min(clock.getDelta(), 0.033);
  const time = clock.elapsedTime;
  const boardProfile = getBoardProfile();
  surfState.boostTimer = Math.max(0, surfState.boostTimer - delta);
  surfState.hopEjectTimer = Math.max(0, surfState.hopEjectTimer - delta);
  const boostActive = surfState.boostTimer > 0;

  updateWaveLifecycle(delta);
  resizeRenderer();
  updateOcean(time);

  const acceleration = input.forward ? (boostActive ? boardProfile.boostAcceleration : boardProfile.acceleration) : input.backward ? -5.5 : 0;
  const drag = input.forward || input.backward ? 1.8 : 3.4;
  const turnStrength = input.left ? 1 : input.right ? -1 : 0;
  const maxSpeed = boostActive ? boardProfile.boostMaxSpeed : boardProfile.maxSpeed;

  surfState.velocity += acceleration * delta;
  surfState.velocity *= 1 - Math.min(drag * delta, 0.14);
  surfState.velocity = THREE.MathUtils.clamp(surfState.velocity, -4.5, maxSpeed);
  if (!surfState.attachedToWave) {
    surfState.heading += turnStrength * delta * boardProfile.turnRate * (0.9 + Math.abs(surfState.velocity) * 0.08);
  }

  surfer.position.x += Math.sin(surfState.heading) * surfState.velocity * delta;
  surfer.position.z += Math.cos(surfState.heading) * surfState.velocity * delta;

  surfer.position.x = THREE.MathUtils.clamp(surfer.position.x, -58, 58);
  surfer.position.z = THREE.MathUtils.clamp(surfer.position.z, -58, 58);

  surfState.hopVelocity -= 9.8 * delta;
  surfState.height = Math.max(0, surfState.height + surfState.hopVelocity * delta);
  if (surfState.height === 0) {
    surfState.hopVelocity = 0;
    if (!surfState.attachedToWave) {
      surfState.waveLift = 0;
    }
    surfState.ejectVelocityX = 0;
    surfState.ejectVelocityZ = 0;
  }
  const airborne = surfState.height > 0.02;

  const wave = sampleWaveField(surfer.position.x, surfer.position.z, time);
  surfState.velocity = THREE.MathUtils.clamp(surfState.velocity, -4.5, maxSpeed);
  surfState.bob += delta * (2.4 + Math.abs(surfState.velocity) * 0.08);

  const forwardVector = new THREE.Vector2(Math.sin(surfState.heading), Math.cos(surfState.heading));
  const rightVector = new THREE.Vector2(forwardVector.y, -forwardVector.x);
  const nosePoint = new THREE.Vector2(surfer.position.x, surfer.position.z).addScaledVector(forwardVector, 0.92);
  const tailPoint = new THREE.Vector2(surfer.position.x, surfer.position.z).addScaledVector(forwardVector, -0.92);
  const leftRailPoint = new THREE.Vector2(surfer.position.x, surfer.position.z).addScaledVector(rightVector, -0.34);
  const rightRailPoint = new THREE.Vector2(surfer.position.x, surfer.position.z).addScaledVector(rightVector, 0.34);
  const noseWave = sampleWaveField(nosePoint.x, nosePoint.y, time);
  const tailWave = sampleWaveField(tailPoint.x, tailPoint.y, time);
  const leftRailWave = sampleWaveField(leftRailPoint.x, leftRailPoint.y, time);
  const rightRailWave = sampleWaveField(rightRailPoint.x, rightRailPoint.y, time);
  const targetPitch =
    THREE.MathUtils.clamp((tailWave.height - noseWave.height) / 1.84, -0.42, 0.42) +
    (surfState.attachedToWave ? 0.05 : 0);
  const targetRoll =
    THREE.MathUtils.clamp((leftRailWave.height - rightRailWave.height) / 0.68, -0.48, 0.48) +
    turnStrength * 0.05;
  surfState.boardPitch = THREE.MathUtils.lerp(surfState.boardPitch, targetPitch, surfState.attachedToWave ? 0.16 : 0.1);
  surfState.boardRoll = THREE.MathUtils.lerp(surfState.boardRoll, targetRoll, surfState.attachedToWave ? 0.18 : 0.12);

  const centerPull = wave.activeWave?.pull ?? 0;
  const centerOffset = wave.activeWave ? wave.activeWave.targetAcross - wave.activeWave.across : 0;
  if (!airborne && !surfState.attachedToWave && centerPull > 0.08) {
    const pullStep = THREE.MathUtils.clamp(centerOffset, -0.42, 0.42) * (0.9 + centerPull * 1.35) * delta;
    surfer.position.x += mainWave.normal.x * pullStep;
    surfer.position.z += mainWave.normal.y * pullStep;
  }

  const liftStrength = wave.activeWave?.lift ?? 0;
  if (!airborne && !surfState.attachedToWave && liftStrength > 0.06) {
    surfState.waveLift = THREE.MathUtils.lerp(surfState.waveLift, 0.48 * liftStrength, 0.14);
  } else {
    surfState.waveLift = THREE.MathUtils.lerp(surfState.waveLift, 0, 0.1);
  }

  if (airborne) {
    surfState.attachedToWave = false;
  } else if (surfState.hopEjectTimer <= 0 && wave.activeWave?.attachable) {
    surfState.attachedToWave = true;
    surfState.waveLift = THREE.MathUtils.lerp(surfState.waveLift, 0.03, 0.24);
  } else if (surfState.attachedToWave && (!wave.activeWave || !wave.activeWave.touching)) {
    surfState.attachedToWave = false;
  }

  if (surfState.attachedToWave && wave.activeWave) {
    const towardFace = THREE.MathUtils.clamp(wave.activeWave.targetAcross - wave.activeWave.across, -0.34, 0.34);
    surfer.position.x += mainWave.direction.x * mainWave.speed * delta;
    surfer.position.z += mainWave.direction.y * mainWave.speed * delta;
    surfer.position.x += mainWave.normal.x * towardFace * (boardProfile.waveGrip * 1.45) * delta;
    surfer.position.z += mainWave.normal.y * towardFace * (boardProfile.waveGrip * 1.45) * delta;
    surfState.velocity = THREE.MathUtils.lerp(surfState.velocity, mainWave.speed, 0.08);
    const waveHeading = Math.atan2(wave.activeWave.direction.x, wave.activeWave.direction.y);
    surfState.heading = THREE.MathUtils.lerp(surfState.heading, waveHeading, 0.035 + boardProfile.waveGrip * 0.02);
  }
  if (airborne) {
    surfer.position.x += surfState.ejectVelocityX * delta;
    surfer.position.z += surfState.ejectVelocityZ * delta;
    surfState.ejectVelocityX *= 1 - Math.min(delta * 2.6, 0.16);
    surfState.ejectVelocityZ *= 1 - Math.min(delta * 2.6, 0.16);
  }
  surfer.position.x = THREE.MathUtils.clamp(surfer.position.x, -58, 58);
  surfer.position.z = THREE.MathUtils.clamp(surfer.position.z, -58, 58);
  const rideLift = surfState.attachedToWave ? 0.03 : surfState.waveLift;
  const baseFloat = surfState.attachedToWave ? 0.38 : 0.48;
  surfer.position.y = wave.height + baseFloat + surfState.height + rideLift;
  if (!surfState.attachedToWave && wave.activeWave) {
    const waveHeading = Math.atan2(wave.activeWave.direction.x, wave.activeWave.direction.y);
    surfState.heading = THREE.MathUtils.lerp(surfState.heading, waveHeading, 0.018);
  }
  surfer.rotation.y = surfState.heading;
  surfer.rotation.z = 0;
  surfer.rotation.x = 0;
  boardGroup.position.y = surfState.attachedToWave ? -0.08 : -0.03;
  boardGroup.rotation.x = surfState.boardPitch;
  boardGroup.rotation.y = -Math.PI / 2;
  boardGroup.rotation.z = surfState.boardRoll;

  rider.position.y = surfState.attachedToWave ? 0 : 0.08;
  rider.rotation.x = -surfState.boardPitch * 0.35 + (surfState.attachedToWave ? 0.12 : 0.04);
  rider.rotation.z = -surfState.boardRoll * 0.55 + Math.sin(surfState.bob * 1.2) * 0.04 - turnStrength * 0.05;
  const boostMix = boostActive ? 1 : 0;
  const wakeLengthTarget =
    THREE.MathUtils.clamp(Math.abs(surfState.velocity) / 4, 0.3, 1.8) +
    boostMix * (0.55 + wave.foam * 0.35);
  const wakeWidthTarget = 1 + boostMix * 0.28;
  const wakeOpacityTarget = 0.1 + wave.foam * 0.28 + (Math.abs(surfState.velocity) > 1 ? 0.1 : 0) + boostMix * 0.22;

  wake.scale.y = THREE.MathUtils.lerp(wake.scale.y, wakeLengthTarget, 0.12);
  wake.scale.x = THREE.MathUtils.lerp(wake.scale.x, wakeWidthTarget, 0.1);
  wake.material.opacity = THREE.MathUtils.lerp(wake.material.opacity, wakeOpacityTarget, 0.08);

  const foamPulse = 0.85 + Math.sin(time * 18) * 0.15;
  boostFoam.material.opacity = THREE.MathUtils.lerp(
    boostFoam.material.opacity,
    boostMix * (0.18 + wave.foam * 0.32) * foamPulse,
    0.16
  );
  boostFoam.scale.x = THREE.MathUtils.lerp(boostFoam.scale.x, 0.7 + boostMix * 0.65, 0.12);
  boostFoam.scale.y = THREE.MathUtils.lerp(boostFoam.scale.y, 0.7 + boostMix * 1.1 + wave.foam * 0.2, 0.12);
  boostFoam.position.y = 0.05 + boostMix * 0.08;

  buoys.forEach((buoy, index) => {
    buoy.position.y = 0.9 + sampleWaveHeight(buoy.position.x, buoy.position.z, time) * 0.55;
    buoy.rotation.z = Math.sin(time * 1.2 + index) * 0.08;
  });

  const cameraOffset = new THREE.Vector3(0, 5.6, -13.5).applyAxisAngle(new THREE.Vector3(0, 1, 0), surfState.heading);
  const cameraTarget = surfer.position.clone().add(cameraOffset);
  camera.position.lerp(cameraTarget, 0.08);
  camera.lookAt(surfer.position.x, surfer.position.y + 1.1, surfer.position.z);

  const speedKnots = Math.max(0, surfState.velocity * 2.2);
  speedValue.textContent = `${speedKnots.toFixed(1)} knots`;
  stateValue.textContent =
    surfState.height > 0.1
      ? "Airborne"
      : boostActive
      ? "Boosting"
      : surfState.attachedToWave
      ? wave.activeWave.face > 0.42
        ? "Riding wave"
        : "On wave"
      : wave.activeWave?.touching
      ? "Climbing wave"
      : speedKnots > 1.2
      ? "Carving"
      : "Idle drift";
  if (!boostActive && !surfState.attachedToWave && speedKnots < 1.2) {
    stateValue.textContent = `${boardProfile.label}: ${boardProfile.specialty}`;
  }

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

surfer.position.set(0, 0.8, 0);
applyBoardStyle(sceneState.boardStyle);
animate();
