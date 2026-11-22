import React, { useEffect, useRef } from 'react';
import { ChampionId, HouseName, OpponentId } from '../types/wizard';
import { SpellEffectStyle } from '../lib/spellEngine';

export interface FightAnimCommand {
  seq: number;
  kind: 'playerCast' | 'enemyCast' | 'clash' | 'selfBuff' | 'victory' | 'defeat';
  color: string;
  secondary: string;
  enemyColor: string;
  enemySecondary: string;
  style: SpellEffectStyle | 'enemy' | 'clash';
  damage?: number;
  spellLabel?: string;
}

interface DuelFightCanvasProps {
  champion: ChampionId;
  opponent: OpponentId;
  playerHouse: HouseName;
  playerShieldActive: boolean;
  playerEmpowered: boolean;
  opponentStunned: boolean;
  opponentCharging: boolean;
  duelStatus: 'ACTIVE' | 'VICTORY' | 'DEFEAT';
  command: FightAnimCommand | null;
  reducedMotion: boolean;
}

type PoseMode = 'idle' | 'cast' | 'clash' | 'hit' | 'shield' | 'ko' | 'victory';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  decay: number;
  gravity: number;
}

interface ActiveSpellVisual {
  kind: 'toOpponent' | 'toPlayer' | 'clash' | 'self';
  color: string;
  secondary: string;
  enemyColor: string;
  enemySecondary: string;
  style: SpellEffectStyle | 'enemy' | 'clash';
  progress: number;
  duration: number;
}

interface LightningArc {
  pts: Array<{ x: number; y: number }>;
  color: string;
  alpha: number;
}

interface ShockRing {
  x: number;
  y: number;
  r: number;
  maxR: number;
  color: string;
  alpha: number;
}

interface CharacterStylePalette {
  robeMain: string;
  robeTrim: string;
  shirt: string;
  skin: string;
  hair: string;
  hairStyle: 'messy' | 'ginger' | 'curls' | 'beard' | 'bald' | 'bouffant' | 'wild' | 'sleek' | 'dummy';
  glasses?: boolean;
  scar?: boolean;
  bow?: boolean;
}

const HOUSE_PALETTES: Record<HouseName, { robe: string; trim: string }> = {
  Gryffindor: { robe: '#5c1419', trim: '#d4a64a' },
  Slytherin: { robe: '#143d2b', trim: '#cbd5e1' },
  Ravenclaw: { robe: '#172b52', trim: '#c78c4e' },
  Hufflepuff: { robe: '#332917', trim: '#eab308' },
};

function getChampionPalette(champion: ChampionId, house: HouseName): CharacterStylePalette {
  switch (champion) {
    case 'harry':
      return {
        robeMain: '#3e1a1d',
        robeTrim: '#d4a64a',
        shirt: '#2b2421',
        skin: '#f0c7a6',
        hair: '#171516',
        hairStyle: 'messy',
        glasses: true,
        scar: true,
      };
    case 'ron':
      return {
        robeMain: '#4d191e',
        robeTrim: '#d4a64a',
        shirt: '#6e2329',
        skin: '#f5ccb0',
        hair: '#c85322',
        hairStyle: 'ginger',
      };
    case 'hermione':
      return {
        robeMain: '#3c181d',
        robeTrim: '#e2b24f',
        shirt: '#2d2624',
        skin: '#f0c8ab',
        hair: '#5e3823',
        hairStyle: 'curls',
      };
    case 'dumbledore':
      return {
        robeMain: '#283254',
        robeTrim: '#d8b467',
        shirt: '#3e4a75',
        skin: '#edd0bc',
        hair: '#e5e7eb',
        hairStyle: 'beard',
        glasses: true,
      };
    default: {
      const hp = HOUSE_PALETTES[house];
      return {
        robeMain: hp.robe,
        robeTrim: hp.trim,
        shirt: '#201c1a',
        skin: '#ecc5a7',
        hair: '#2a1d17',
        hairStyle: 'messy',
      };
    }
  }
}

function getOpponentPalette(opponent: OpponentId): CharacterStylePalette {
  switch (opponent) {
    case 'voldemort':
      return {
        robeMain: '#121c1a',
        robeTrim: '#2d5c48',
        shirt: '#0c1211',
        skin: '#cad4cf',
        hair: '#cad4cf',
        hairStyle: 'bald',
      };
    case 'umbridge':
      return {
        robeMain: '#b83d6e',
        robeTrim: '#f9a8d4',
        shirt: '#db6b96',
        skin: '#f3cbb4',
        hair: '#694735',
        hairStyle: 'bouffant',
        bow: true,
      };
    case 'bellatrix':
      return {
        robeMain: '#1b1421',
        robeTrim: '#6d28d9',
        shirt: '#2d1c33',
        skin: '#dfd3d7',
        hair: '#141118',
        hairStyle: 'wild',
      };
    case 'draco':
      return {
        robeMain: '#162821',
        robeTrim: '#94a3b8',
        shirt: '#11181c',
        skin: '#f2d9c9',
        hair: '#ede9d0',
        hairStyle: 'sleek',
      };
    default:
      return {
        robeMain: '#784e2a',
        robeTrim: '#d97706',
        shirt: '#9b6b43',
        skin: '#b88558',
        hair: '#8a5a32',
        hairStyle: 'dummy',
      };
  }
}

function createLightning(x1: number, y1: number, x2: number, y2: number, jitter = 16): Array<{ x: number; y: number }> {
  const segs = 10;
  const pts: Array<{ x: number; y: number }> = [{ x: x1, y: y1 }];
  for (let i = 1; i < segs; i++) {
    const t = i / segs;
    pts.push({
      x: x1 + (x2 - x1) * t + (Math.random() - 0.5) * jitter * 0.45,
      y: y1 + (y2 - y1) * t + (Math.random() - 0.5) * jitter,
    });
  }
  pts.push({ x: x2, y: y2 });
  return pts;
}

export const DuelFightCanvas: React.FC<DuelFightCanvasProps> = ({
  champion,
  opponent,
  playerHouse,
  playerShieldActive,
  playerEmpowered,
  opponentStunned,
  opponentCharging,
  duelStatus,
  command,
  reducedMotion,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const stateRef = useRef({
    champion,
    opponent,
    playerHouse,
    playerShieldActive,
    playerEmpowered,
    opponentStunned,
    opponentCharging,
    duelStatus,
    reducedMotion,
    playerPose: 'idle' as PoseMode,
    playerPoseTimer: 0,
    enemyPose: 'idle' as PoseMode,
    enemyPoseTimer: 0,
    shakeAmount: 0,
    playerWandGlow: '#fbbf24',
    enemyWandGlow: '#10b981',
    groundLeftLight: null as string | null,
    groundRightLight: null as string | null,
    groundLightAlpha: 0,
    activeSpell: null as ActiveSpellVisual | null,
    particles: [] as Particle[],
    rings: [] as ShockRing[],
    bolts: [] as LightningArc[],
  });

  useEffect(() => {
    stateRef.current.champion = champion;
    stateRef.current.opponent = opponent;
    stateRef.current.playerHouse = playerHouse;
    stateRef.current.playerShieldActive = playerShieldActive;
    stateRef.current.playerEmpowered = playerEmpowered;
    stateRef.current.opponentStunned = opponentStunned;
    stateRef.current.opponentCharging = opponentCharging;
    stateRef.current.duelStatus = duelStatus;
    stateRef.current.reducedMotion = reducedMotion;

    if (duelStatus === 'VICTORY') {
      stateRef.current.playerPose = 'victory';
      stateRef.current.enemyPose = 'ko';
      stateRef.current.playerPoseTimer = 999;
      stateRef.current.enemyPoseTimer = 999;
    } else if (duelStatus === 'DEFEAT') {
      stateRef.current.playerPose = 'ko';
      stateRef.current.enemyPose = 'victory';
      stateRef.current.playerPoseTimer = 999;
      stateRef.current.enemyPoseTimer = 999;
    } else if (stateRef.current.playerPose === 'ko' || stateRef.current.playerPose === 'victory') {
      stateRef.current.playerPose = 'idle';
      stateRef.current.enemyPose = 'idle';
      stateRef.current.playerPoseTimer = 0;
      stateRef.current.enemyPoseTimer = 0;
    }
  }, [
    champion,
    opponent,
    playerHouse,
    playerShieldActive,
    playerEmpowered,
    opponentStunned,
    opponentCharging,
    duelStatus,
    reducedMotion,
  ]);

  useEffect(() => {
    if (!command) return;
    const s = stateRef.current;

    if (command.kind === 'playerCast') {
      s.playerPose = 'cast';
      s.playerPoseTimer = 0.72;
      s.enemyPose = 'hit';
      s.enemyPoseTimer = 0.65;
      s.playerWandGlow = command.color;
      s.groundLeftLight = command.color;
      s.groundRightLight = command.color;
      s.groundLightAlpha = 0.9;
      s.shakeAmount = command.style === 'blast' || command.style === 'fire' ? 9 : 4;
      s.activeSpell = {
        kind: 'toOpponent',
        color: command.color,
        secondary: command.secondary,
        enemyColor: command.enemyColor,
        enemySecondary: command.enemySecondary,
        style: command.style,
        progress: 0,
        duration: 0.72,
      };
    } else if (command.kind === 'clash') {
      s.playerPose = 'clash';
      s.playerPoseTimer = 1.25;
      s.enemyPose = 'clash';
      s.enemyPoseTimer = 1.25;
      s.playerWandGlow = command.color;
      s.enemyWandGlow = command.enemyColor;
      s.groundLeftLight = command.color;
      s.groundRightLight = command.enemyColor;
      s.groundLightAlpha = 1;
      s.shakeAmount = 8;
      s.activeSpell = {
        kind: 'clash',
        color: command.color,
        secondary: command.secondary,
        enemyColor: command.enemyColor,
        enemySecondary: command.enemySecondary,
        style: 'clash',
        progress: 0,
        duration: 1.25,
      };
    } else if (command.kind === 'enemyCast') {
      s.enemyPose = 'cast';
      s.enemyPoseTimer = 0.72;
      s.playerPose = 'hit';
      s.playerPoseTimer = 0.65;
      s.enemyWandGlow = command.enemyColor;
      s.groundLeftLight = command.enemyColor;
      s.groundRightLight = command.enemyColor;
      s.groundLightAlpha = 0.9;
      s.shakeAmount = 6;
      s.activeSpell = {
        kind: 'toPlayer',
        color: command.enemyColor,
        secondary: command.enemySecondary,
        enemyColor: command.enemyColor,
        enemySecondary: command.enemySecondary,
        style: 'enemy',
        progress: 0,
        duration: 0.7,
      };
    } else if (command.kind === 'selfBuff') {
      s.playerPose = 'shield';
      s.playerPoseTimer = 0.75;
      s.playerWandGlow = command.color;
      s.groundLeftLight = command.color;
      s.groundLightAlpha = 0.85;
      s.activeSpell = {
        kind: 'self',
        color: command.color,
        secondary: command.secondary,
        enemyColor: command.enemyColor,
        enemySecondary: command.enemySecondary,
        style: command.style,
        progress: 0,
        duration: 0.75,
      };
    }
  }, [command]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 860;
    const H = 390;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr;
    canvas.height = H * dpr;

    let rafId = 0;
    let lastTime = performance.now();

    const drawBackdrop = (t: number) => {
      // Misty dawn Hogwarts courtyard sky
      const sky = ctx.createLinearGradient(0, 0, 0, H * 0.75);
      sky.addColorStop(0, '#101b1e');
      sky.addColorStop(0.5, '#2b3e3d');
      sky.addColorStop(1, '#687d76');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);

      // Soft horizon mist glow
      const horizonGlow = ctx.createRadialGradient(W * 0.56, H * 0.42, 20, W * 0.56, H * 0.42, 340);
      horizonGlow.addColorStop(0, 'rgba(205, 224, 214, 0.28)');
      horizonGlow.addColorStop(1, 'rgba(20, 32, 32, 0)');
      ctx.fillStyle = horizonGlow;
      ctx.fillRect(0, 0, W, H);

      // Distant Hogwarts Ruined Gothic Colonnade & Spires
      ctx.fillStyle = '#1b2627';
      ctx.fillRect(190, 128, 490, 138);

      // Pointed Gothic Windows cut out with mist
      for (let i = 0; i < 6; i++) {
        const wx = 225 + i * 74;
        ctx.fillStyle = '#536863';
        ctx.beginPath();
        ctx.moveTo(wx, 238);
        ctx.lineTo(wx, 178);
        ctx.quadraticCurveTo(wx + 20, 148, wx + 40, 178);
        ctx.lineTo(wx + 40, 238);
        ctx.closePath();
        ctx.fill();

        // Gothic tracery bars
        ctx.strokeStyle = '#1d292a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(wx + 20, 158);
        ctx.lineTo(wx + 20, 238);
        ctx.stroke();
      }

      // Left Stone Tower Silhouette & Battlements
      ctx.fillStyle = '#151e20';
      ctx.fillRect(0, 42, 132, 240);
      ctx.fillStyle = '#233132';
      for (let row = 0; row < 8; row++) {
        ctx.fillRect(12 + (row % 2) * 14, 60 + row * 24, 34, 14);
      }

      // Ruined Spires along skyline
      const spireXs = [235, 360, 470, 610, 745];
      ctx.fillStyle = '#182324';
      for (let i = 0; i < spireXs.length; i++) {
        const sx = spireXs[i];
        const sh = i % 2 === 0 ? 58 : 40;
        ctx.beginPath();
        ctx.moveTo(sx - 9, 130);
        ctx.lineTo(sx, 130 - sh);
        ctx.lineTo(sx + 9, 130);
        ctx.closePath();
        ctx.fill();
      }

      // Right Ruined Wall Mass
      ctx.fillStyle = '#141d1e';
      ctx.beginPath();
      ctx.moveTo(695, 265);
      ctx.lineTo(720, 135);
      ctx.lineTo(790, 150);
      ctx.lineTo(860, 118);
      ctx.lineTo(860, 275);
      ctx.closePath();
      ctx.fill();

      // Cobblestone Courtyard Floor with perspective grid
      const floorTop = 262;
      const floorGrad = ctx.createLinearGradient(0, floorTop, 0, H);
      floorGrad.addColorStop(0, '#222d2c');
      floorGrad.addColorStop(0.45, '#171f1e');
      floorGrad.addColorStop(1, '#0d1212');
      ctx.fillStyle = floorGrad;
      ctx.fillRect(0, floorTop, W, H - floorTop);

      // Perspective stone courses
      ctx.strokeStyle = 'rgba(130, 155, 148, 0.12)';
      ctx.lineWidth = 1.2;
      for (let row = 0; row < 6; row++) {
        const y = floorTop + Math.pow(row / 5, 1.35) * (H - floorTop);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }
      for (let col = -8; col <= 8; col++) {
        ctx.beginPath();
        ctx.moveTo(W * 0.5 + col * 52, floorTop);
        ctx.lineTo(W * 0.5 + col * 118, H);
        ctx.stroke();
      }

      // Ambient drifting courtyard mist
      ctx.fillStyle = 'rgba(180, 205, 198, 0.06)';
      for (let m = 0; m < 4; m++) {
        const mx = ((t * 14 + m * 230) % (W + 220)) - 110;
        ctx.beginPath();
        ctx.ellipse(mx, 255 + (m % 2) * 14, 110, 16, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const drawFighter = (
      side: 'left' | 'right',
      baseX: number,
      groundY: number,
      palette: CharacterStylePalette,
      pose: PoseMode,
      t: number,
      wandGlow: string,
      opts: { shielded?: boolean; empowered?: boolean; stunned?: boolean; charging?: boolean }
    ): { wandX: number; wandY: number } => {
      const s = stateRef.current;
      const dir = side === 'left' ? 1 : -1;
      const anim = s.reducedMotion ? 0 : t;

      const idleBob = pose === 'idle' ? Math.sin(anim * 3.1 + (side === 'right' ? 1.5 : 0)) * 2.5 : 0;
      const lungeX = pose === 'cast' ? dir * 24 : pose === 'clash' ? dir * 14 : pose === 'hit' ? -dir * 18 : 0;
      const tilt =
        pose === 'cast'
          ? dir * 0.16
          : pose === 'clash'
            ? dir * 0.11
            : pose === 'hit'
              ? -dir * 0.2
              : pose === 'ko'
                ? -dir * 0.45
                : 0;
      const crouchY = pose === 'clash' || pose === 'cast' ? 8 : pose === 'ko' ? 28 : 0;

      const x = baseX + lungeX;
      const y = groundY + idleBob + crouchY;

      // Ground contact shadow
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.48)';
      ctx.beginPath();
      ctx.ellipse(x, groundY + 6, pose === 'ko' ? 44 : 32, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(tilt);

      // Hit white flash silhouette effect
      if (pose === 'hit' && Math.floor(anim * 18) % 2 === 0) {
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 18;
      }

      // Billowing Cloak / Coat tail behind
      const capeFlutter = Math.sin(anim * 5.2) * (pose === 'cast' || pose === 'clash' ? 9 : 4);
      ctx.fillStyle = palette.robeMain;
      ctx.beginPath();
      ctx.moveTo(-dir * 8, -76);
      ctx.quadraticCurveTo(-dir * (40 + capeFlutter), -38, -dir * (46 + capeFlutter * 1.3), -2);
      ctx.lineTo(-dir * 10, -4);
      ctx.closePath();
      ctx.fill();

      // Legs / Boots in fighting lunge stance
      ctx.strokeStyle = '#181414';
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      // Back leg
      ctx.beginPath();
      ctx.moveTo(-dir * 6, -34);
      ctx.lineTo(-dir * (pose === 'cast' || pose === 'clash' ? 24 : 14), -2);
      ctx.stroke();
      // Front leg
      ctx.beginPath();
      ctx.moveTo(dir * 6, -34);
      ctx.lineTo(dir * (pose === 'cast' || pose === 'clash' ? 22 : 12), -2);
      ctx.stroke();

      // Torso & Wizarding Robe
      ctx.fillStyle = palette.shirt;
      ctx.beginPath();
      ctx.roundRect(-14, -78, 28, 46, 6);
      ctx.fill();

      // Robe lapels & trim
      ctx.fillStyle = palette.robeMain;
      ctx.beginPath();
      ctx.moveTo(-16, -78);
      ctx.lineTo(16, -78);
      ctx.lineTo(20, -24);
      ctx.lineTo(-20, -24);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = palette.robeTrim;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(0, -76);
      ctx.lineTo(0, -26);
      ctx.stroke();

      // House Scarf / Collar accent
      ctx.fillStyle = palette.robeTrim;
      ctx.fillRect(-12, -80, 24, 6);

      // Practice Dummy target chest bullseye
      if (palette.hairStyle === 'dummy') {
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, -56, 8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.arc(0, -56, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Back balancing arm (extended back during cast/clash, matching Harry in image!)
      ctx.strokeStyle = palette.robeMain;
      ctx.lineWidth = 7.5;
      ctx.beginPath();
      ctx.moveTo(-dir * 10, -70);
      if (pose === 'cast' || pose === 'clash') {
        ctx.lineTo(-dir * 38, -56);
      } else if (pose === 'victory') {
        ctx.lineTo(-dir * 22, -92);
      } else {
        ctx.lineTo(-dir * 22, -48);
      }
      ctx.stroke();

      // Head
      ctx.fillStyle = palette.skin;
      ctx.beginPath();
      ctx.arc(0, -93, 13.5, 0, Math.PI * 2);
      ctx.fill();

      // Hair & Iconic Accessories
      ctx.fillStyle = palette.hair;
      if (palette.hairStyle === 'messy') {
        ctx.beginPath();
        ctx.arc(-dir * 2, -97, 14, Math.PI, Math.PI * 2);
        ctx.lineTo(dir * 14, -90);
        ctx.lineTo(dir * 6, -96);
        ctx.lineTo(-dir * 4, -90);
        ctx.lineTo(-dir * 14, -92);
        ctx.closePath();
        ctx.fill();
      } else if (palette.hairStyle === 'ginger') {
        ctx.beginPath();
        ctx.arc(-dir * 1, -97, 14.5, Math.PI * 0.85, Math.PI * 2.1);
        ctx.fill();
      } else if (palette.hairStyle === 'curls' || palette.hairStyle === 'wild') {
        for (let c = -2; c <= 2; c++) {
          ctx.beginPath();
          ctx.arc(c * 5 - dir * 2, -98 + Math.abs(c) * 3, 7.5, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (palette.hairStyle === 'beard') {
        ctx.beginPath();
        ctx.arc(0, -97, 14, Math.PI, Math.PI * 2);
        ctx.fill();
        // Long silver Dumbledore beard
        ctx.beginPath();
        ctx.moveTo(-7, -86);
        ctx.lineTo(7, -86);
        ctx.lineTo(0, -56);
        ctx.closePath();
        ctx.fill();
      } else if (palette.hairStyle === 'bouffant') {
        ctx.beginPath();
        ctx.arc(-dir * 2, -98, 15, Math.PI * 0.9, Math.PI * 2.1);
        ctx.fill();
        if (palette.bow) {
          ctx.fillStyle = '#f472b6';
          ctx.fillRect(-5, -113, 10, 5);
        }
      } else if (palette.hairStyle === 'sleek') {
        ctx.beginPath();
        ctx.ellipse(-dir * 1, -101, 13, 6.5, -dir * 0.15, 0, Math.PI * 2);
        ctx.fill();
      }

      if (palette.glasses) {
        ctx.strokeStyle = '#1f2937';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(dir * 5, -93, 4, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (palette.scar) {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(dir * 4, -102);
        ctx.lineTo(dir * 6, -99);
        ctx.lineTo(dir * 4, -97);
        ctx.stroke();
      }

      // Eye dot
      ctx.fillStyle = palette.hairStyle === 'bald' ? '#ef4444' : '#111827';
      ctx.beginPath();
      ctx.arc(dir * 6, -93, 1.8, 0, Math.PI * 2);
      ctx.fill();

      // Wand Arm Pose
      let handX = dir * 24;
      let handY = -66;
      let wandTipLocalX = dir * 50;
      let wandTipLocalY = -72;

      if (pose === 'cast' || pose === 'clash') {
        const tremble = pose === 'clash' ? Math.sin(anim * 40) * 1.8 : 0;
        handX = dir * 32;
        handY = -74 + tremble;
        wandTipLocalX = dir * 60;
        wandTipLocalY = -76 + tremble;
      } else if (pose === 'victory') {
        handX = dir * 16;
        handY = -98;
        wandTipLocalX = dir * 28;
        wandTipLocalY = -124;
      } else if (pose === 'shield') {
        handX = dir * 20;
        handY = -84;
        wandTipLocalX = dir * 26;
        wandTipLocalY = -110;
      } else if (pose === 'ko') {
        handX = dir * 18;
        handY = -50;
        wandTipLocalX = dir * 36;
        wandTipLocalY = -36;
      } else {
        const sway = Math.sin(anim * 3.1) * 2.5;
        handX = dir * 22;
        handY = -66 + sway;
        wandTipLocalX = dir * 48;
        wandTipLocalY = -74 + sway;
      }

      ctx.strokeStyle = palette.robeMain;
      ctx.lineWidth = 7.5;
      ctx.beginPath();
      ctx.moveTo(dir * 10, -70);
      ctx.lineTo(handX, handY);
      ctx.stroke();

      // Wand shaft
      ctx.strokeStyle = palette.hairStyle === 'bald' ? '#e5e7eb' : '#5c3a21';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(handX, handY);
      ctx.lineTo(wandTipLocalX, wandTipLocalY);
      ctx.stroke();

      // Transform wandTip back to world coordinates
      const cos = Math.cos(tilt);
      const sin = Math.sin(tilt);
      const wandX = x + wandTipLocalX * cos - wandTipLocalY * sin;
      const wandY = y + wandTipLocalX * sin + wandTipLocalY * cos;

      ctx.restore();

      // Wand Tip Ambient Flare / Empowerment / Charging Glow
      const flareColor = opts.charging ? wandGlow : opts.empowered ? '#fef08a' : wandGlow;
      const flareSize = pose === 'cast' || pose === 'clash' || opts.charging ? 22 : 10;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const tipGrad = ctx.createRadialGradient(wandX, wandY, 1, wandX, wandY, flareSize);
      tipGrad.addColorStop(0, '#ffffff');
      tipGrad.addColorStop(0.35, flareColor);
      tipGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = tipGrad;
      ctx.beginPath();
      ctx.arc(wandX, wandY, flareSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Protego Shield Dome around Player
      if (opts.shielded) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const shieldGrad = ctx.createRadialGradient(x, y - 55, 22, x, y - 55, 66);
        shieldGrad.addColorStop(0, 'rgba(253, 224, 71, 0.04)');
        shieldGrad.addColorStop(0.75, 'rgba(253, 224, 71, 0.22)');
        shieldGrad.addColorStop(1, 'rgba(253, 224, 71, 0)');
        ctx.fillStyle = shieldGrad;
        ctx.beginPath();
        ctx.arc(x, y - 55, 66, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(253, 224, 71, 0.72)';
        ctx.lineWidth = 2.2;
        ctx.setLineDash([10, 6]);
        ctx.beginPath();
        ctx.arc(x, y - 55, 58, anim * 1.4, anim * 1.4 + Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Petrificus Stun Rings around Opponent
      if (opts.stunned) {
        ctx.save();
        ctx.strokeStyle = 'rgba(167, 139, 250, 0.85)';
        ctx.lineWidth = 2.6;
        for (let r = 0; r < 3; r++) {
          ctx.beginPath();
          ctx.ellipse(x, y - 35 - r * 22, 26, 7, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }

      return { wandX, wandY };
    };

    const drawGroundSpill = (cx: number, cy: number, color: string, alpha: number) => {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = alpha * 0.45;
      const g = ctx.createRadialGradient(cx, cy, 5, cx, cy, 145);
      g.addColorStop(0, color);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 145, 42, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const drawJaggedStream = (
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      color: string,
      secondary: string,
      t: number
    ) => {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      // Wide outer glow beam
      ctx.strokeStyle = color;
      ctx.lineWidth = 10;
      ctx.shadowColor = color;
      ctx.shadowBlur = 24;
      ctx.beginPath();
      const steps = 16;
      for (let i = 0; i <= steps; i++) {
        const u = i / steps;
        const px = x1 + (x2 - x1) * u;
        const py = y1 + (y2 - y1) * u + Math.sin(u * 18 - t * 22) * 5.5 * Math.sin(u * Math.PI);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      // White-hot inner core
      ctx.strokeStyle = secondary;
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const u = i / steps;
        const px = x1 + (x2 - x1) * u;
        const py = y1 + (y2 - y1) * u - Math.sin(u * 18 - t * 22) * 2.8 * Math.sin(u * Math.PI);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      ctx.restore();
    };

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      const t = now / 1000;
      const s = stateRef.current;

      // Decay pose timers back to idle
      if (s.duelStatus === 'ACTIVE') {
        if (s.playerPoseTimer > 0) {
          s.playerPoseTimer -= dt;
          if (s.playerPoseTimer <= 0) s.playerPose = 'idle';
        }
        if (s.enemyPoseTimer > 0) {
          s.enemyPoseTimer -= dt;
          if (s.enemyPoseTimer <= 0) s.enemyPose = 'idle';
        }
      }

      if (s.groundLightAlpha > 0) {
        s.groundLightAlpha = Math.max(0, s.groundLightAlpha - dt * 0.9);
      }
      if (s.shakeAmount > 0) {
        s.shakeAmount = Math.max(0, s.shakeAmount - dt * 22);
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      // Subtle camera tremor on impacts
      if (s.shakeAmount > 0.2 && !s.reducedMotion) {
        ctx.translate(
          (Math.random() - 0.5) * s.shakeAmount,
          (Math.random() - 0.5) * s.shakeAmount * 0.7
        );
      }

      drawBackdrop(t);

      const leftBaseX = 165;
      const rightBaseX = 695;
      const floorY = 314;

      // Colored ground illumination pooling under both fighters (just like reference image)
      if (s.groundLightAlpha > 0.02) {
        if (s.groundLeftLight) drawGroundSpill(leftBaseX + 35, floorY + 8, s.groundLeftLight, s.groundLightAlpha);
        if (s.groundRightLight) drawGroundSpill(rightBaseX - 35, floorY + 8, s.groundRightLight, s.groundLightAlpha);
      } else if (s.opponentCharging) {
        drawGroundSpill(rightBaseX - 20, floorY + 8, s.enemyWandGlow, 0.45);
      }

      const leftWand = drawFighter(
        'left',
        leftBaseX,
        floorY,
        getChampionPalette(s.champion, s.playerHouse),
        s.playerPose,
        t,
        s.playerWandGlow,
        { shielded: s.playerShieldActive, empowered: s.playerEmpowered }
      );

      const rightWand = drawFighter(
        'right',
        rightBaseX,
        floorY,
        getOpponentPalette(s.opponent),
        s.enemyPose,
        t,
        s.enemyWandGlow,
        { stunned: s.opponentStunned, charging: s.opponentCharging }
      );

      // Active Spell Blast / Priori Incantatem Clash Animation
      if (s.activeSpell) {
        const sp = s.activeSpell;
        sp.progress += dt / sp.duration;
        const p = Math.min(1, sp.progress);

        if (sp.kind === 'clash') {
          const pushShift = Math.sin(t * 7) * 18 + (p > 0.65 ? (p - 0.65) * 260 : 0);
          const clashX = (leftWand.wandX + rightWand.wandX) / 2 + pushShift;
          const clashY = (leftWand.wandY + rightWand.wandY) / 2 + Math.cos(t * 9) * 5;

          drawJaggedStream(leftWand.wandX, leftWand.wandY, clashX, clashY, sp.color, sp.secondary, t);
          drawJaggedStream(rightWand.wandX, rightWand.wandY, clashX, clashY, sp.enemyColor, sp.enemySecondary, t);

          // Blazing center Clash Core & waterfall of golden sparks hitting the cobblestones!
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          const coreR = 24 + Math.sin(t * 28) * 5;
          const orb = ctx.createRadialGradient(clashX, clashY, 2, clashX, clashY, coreR * 2.1);
          orb.addColorStop(0, '#ffffff');
          orb.addColorStop(0.4, '#fde047');
          orb.addColorStop(0.75, sp.color);
          orb.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = orb;
          ctx.beginPath();
          ctx.arc(clashX, clashY, coreR * 2.1, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          drawGroundSpill(clashX, floorY + 12, '#fde047', 0.9);

          for (let i = 0; i < 6; i++) {
            s.particles.push({
              x: clashX + (Math.random() - 0.5) * 18,
              y: clashY + (Math.random() - 0.5) * 18,
              vx: (Math.random() - 0.5) * 4.5,
              vy: Math.random() * 2.5 - 1.5,
              radius: 1.8 + Math.random() * 3.2,
              color: i % 2 === 0 ? '#fde047' : '#ffffff',
              alpha: 1,
              decay: 0.022,
              gravity: 0.16,
            });
          }

          if (Math.random() < 0.3) {
            s.bolts.push({
              pts: createLightning(clashX, clashY, rightWand.wandX, rightWand.wandY, 22),
              color: '#fde047',
              alpha: 0.9,
            });
          }
        } else if (sp.kind === 'toOpponent' || sp.kind === 'toPlayer') {
          const sx = sp.kind === 'toOpponent' ? leftWand.wandX : rightWand.wandX;
          const sy = sp.kind === 'toOpponent' ? leftWand.wandY : rightWand.wandY;
          const tx = sp.kind === 'toOpponent' ? rightWand.wandX - 24 : leftWand.wandX + 24;
          const ty = sp.kind === 'toOpponent' ? rightWand.wandY - 6 : leftWand.wandY - 6;

          const travel = Math.min(1, p * 2.1);
          const curX = sx + (tx - sx) * travel;
          const curY = sy + (ty - sy) * travel;

          drawJaggedStream(sx, sy, curX, curY, sp.color, sp.secondary, t);

          for (let i = 0; i < 4; i++) {
            s.particles.push({
              x: curX + (Math.random() - 0.5) * 12,
              y: curY + (Math.random() - 0.5) * 12,
              vx: (Math.random() - 0.5) * 3.2,
              vy: (Math.random() - 0.5) * 2.5,
              radius: 2 + Math.random() * 3.2,
              color: i % 2 === 0 ? sp.color : sp.secondary,
              alpha: 1,
              decay: 0.03,
              gravity: 0.08,
            });
          }

          if (Math.random() < 0.25) {
            s.bolts.push({
              pts: createLightning(sx, sy, curX, curY, 18),
              color: sp.color,
              alpha: 0.85,
            });
          }

          if (travel >= 1 && sp.progress - dt / sp.duration < 0.48) {
            s.rings.push({ x: tx, y: ty, r: 8, maxR: 78, color: sp.color, alpha: 0.95 });
            for (let i = 0; i < 34; i++) {
              const ang = (Math.PI * 2 * i) / 34;
              const spd = 1.6 + Math.random() * 5.2;
              s.particles.push({
                x: tx,
                y: ty,
                vx: Math.cos(ang) * spd,
                vy: Math.sin(ang) * spd - 0.8,
                radius: 2.2 + Math.random() * 3.8,
                color: i % 2 === 0 ? sp.color : sp.secondary,
                alpha: 1,
                decay: 0.022,
                gravity: 0.12,
              });
            }
          }
        } else if (sp.kind === 'self') {
          if (sp.progress < 0.1) {
            s.rings.push({
              x: leftBaseX,
              y: floorY - 56,
              r: 14,
              maxR: 92,
              color: sp.color,
              alpha: 0.95,
            });
          }
          for (let i = 0; i < 3; i++) {
            s.particles.push({
              x: leftBaseX + (Math.random() - 0.5) * 50,
              y: floorY - Math.random() * 90,
              vx: (Math.random() - 0.5) * 1.4,
              vy: -1.8 - Math.random() * 2.2,
              radius: 2 + Math.random() * 3,
              color: i % 2 === 0 ? sp.color : sp.secondary,
              alpha: 1,
              decay: 0.028,
              gravity: -0.02,
            });
          }
        }

        if (sp.progress >= 1) {
          s.activeSpell = null;
        }
      }

      // Victory celebratory embers
      if (s.duelStatus === 'VICTORY' && Math.random() < 0.25) {
        s.particles.push({
          x: leftBaseX + (Math.random() - 0.5) * 140,
          y: 120 + Math.random() * 70,
          vx: (Math.random() - 0.5) * 2.6,
          vy: -1 - Math.random() * 2,
          radius: 2 + Math.random() * 2.8,
          color: Math.random() > 0.5 ? '#fde047' : '#ef4444',
          alpha: 1,
          decay: 0.018,
          gravity: 0.08,
        });
      }

      // Draw & update shockwave rings
      const nextRings: ShockRing[] = [];
      for (const r of s.rings) {
        r.r += (r.maxR - r.r) * 0.16 + 1.5;
        r.alpha -= 0.032;
        if (r.alpha > 0.02) {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = r.alpha;
          ctx.strokeStyle = r.color;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
          nextRings.push(r);
        }
      }
      s.rings = nextRings;

      // Draw & update lightning bolts
      const nextBolts: LightningArc[] = [];
      for (const b of s.bolts) {
        b.alpha -= 0.08;
        if (b.alpha > 0.03 && b.pts.length > 1) {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = b.alpha;
          ctx.strokeStyle = b.color;
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.moveTo(b.pts[0].x, b.pts[0].y);
          for (let i = 1; i < b.pts.length; i++) ctx.lineTo(b.pts[i].x, b.pts[i].y);
          ctx.stroke();
          ctx.restore();
          nextBolts.push(b);
        }
      }
      s.bolts = nextBolts;

      // Draw & update cascading particles
      const nextParticles: Particle[] = [];
      for (const p of s.particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        if (p.y > floorY + 8 && p.vy > 0) {
          p.y = floorY + 8;
          p.vy *= -0.35;
          p.vx *= 0.7;
        }
        p.alpha -= p.decay;
        if (p.alpha > 0.02) {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          nextParticles.push(p);
        }
      }
      s.particles = nextParticles;

      ctx.restore();
      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-label="Animated Wizarding Duel Stage"
      className="w-full h-auto block aspect-[860/390] rounded-lg border border-[#3b2b20] bg-[#101819]"
    />
  );
};
