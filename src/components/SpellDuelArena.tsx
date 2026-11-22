import React, { useEffect, useRef, useState } from 'react';
import { RotateCcw, Send, Shield, Swords, Volume2, VolumeX, Wand2 } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ChampionId, HouseName, OpponentId, WizardProfile } from '../types/wizard';
import {
  SPELL_BOOK,
  SpellEffectStyle,
  matchSpellFromChat,
  playSpellSound,
} from '../lib/spellEngine';
import { BrassFiligreeCorner, HouseCrestGraphic } from './WizardingArtwork';

interface SpellDuelArenaProps {
  profile: WizardProfile | null;
  isMuted: boolean;
  onToggleMute: () => void;
  onRecordDuelOutcome: (result: 'win' | 'loss', opponent: OpponentId) => Promise<void>;
}

interface ChatLogItem {
  id: string;
  speaker: 'player' | 'opponent' | 'system';
  senderName: string;
  text: string;
  spellTag?: string;
}

interface FloatingCallout {
  id: string;
  side: 'player' | 'opponent';
  label: string;
  color: string;
}

interface SpellBanner {
  id: string;
  title: string;
  color: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  decay: number;
  gravity?: number;
}

interface ActiveBeam {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  color: string;
  secondary: string;
  progress: number;
  style: SpellEffectStyle | 'enemy' | 'clash';
  clashOpponentColor?: string;
}

interface ShockwaveRing {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  alpha: number;
}

interface LightningBolt {
  points: Array<{ x: number; y: number }>;
  color: string;
  alpha: number;
}

interface ChampionMeta {
  id: ChampionId;
  shortName: string;
  name: string;
  title: string;
  house: HouseName;
  wand: string;
  maxHp: number;
  maxMana: number;
  bonusLabel: string;
  imageUrl?: string;
  damageMultiplier: number;
  focusRegenBonus: number;
  shieldBonus: number;
}

interface OpponentMeta {
  id: OpponentId;
  shortName: string;
  name: string;
  title: string;
  house: HouseName;
  maxHp: number;
  imageUrl: string;
  beamColor: string;
  beamSecondary: string;
  chargeSpellName: string;
  regularSpellName: string;
  baseDamage: number;
  heavyDamage: number;
  intro: string;
}

const CHAMPION_ROSTER: Record<ChampionId, ChampionMeta> = {
  custom: {
    id: 'custom',
    shortName: 'Your Wizard',
    name: 'Your Wizard',
    title: 'Sanctum Duelist',
    house: 'Gryffindor',
    wand: 'Phoenix feather',
    maxHp: 100,
    maxMana: 100,
    bonusLabel: 'Balanced Sanctum Profile',
    damageMultiplier: 1,
    focusRegenBonus: 0,
    shieldBonus: 0,
  },
  harry: {
    id: 'harry',
    shortName: 'Harry Potter',
    name: 'Harry Potter',
    title: 'The Boy Who Lived',
    house: 'Gryffindor',
    wand: 'Holly & Phoenix feather',
    maxHp: 110,
    maxMana: 105,
    bonusLabel: '+15% Counter & Patronus Power',
    imageUrl: '/src/assets/images/harry_potter_portrait_1795356708735.jpg',
    damageMultiplier: 1.12,
    focusRegenBonus: 2,
    shieldBonus: 0,
  },
  ron: {
    id: 'ron',
    shortName: 'Ron Weasley',
    name: 'Ron Weasley',
    title: 'Gryffindor Tactician',
    house: 'Gryffindor',
    wand: 'Willow & Unicorn tail hair',
    maxHp: 120,
    maxMana: 100,
    bonusLabel: '120 Max HP · Sturdy Guard',
    imageUrl: '/src/assets/images/ron_weasley_portrait_1795356708840.jpg',
    damageMultiplier: 1.05,
    focusRegenBonus: 1,
    shieldBonus: 0.1,
  },
  hermione: {
    id: 'hermione',
    shortName: 'Hermione Granger',
    name: 'Hermione Granger',
    title: 'Brightest Witch of Her Age',
    house: 'Gryffindor',
    wand: 'Vine & Dragon heartstring',
    maxHp: 105,
    maxMana: 120,
    bonusLabel: '120 Max Focus · +5 Focus/Turn',
    imageUrl: '/src/assets/images/hermione_granger_portrait_1795356708635.jpg',
    damageMultiplier: 1.1,
    focusRegenBonus: 5,
    shieldBonus: 0.05,
  },
  dumbledore: {
    id: 'dumbledore',
    shortName: 'Albus Dumbledore',
    name: 'Albus Dumbledore',
    title: 'Grand Sorcerer of Hogwarts',
    house: 'Gryffindor',
    wand: 'Elder & Thestral tail hair',
    maxHp: 125,
    maxMana: 120,
    bonusLabel: '+18% Spell Potency',
    damageMultiplier: 1.18,
    focusRegenBonus: 4,
    shieldBonus: 0.05,
  },
};

const OPPONENT_CONFIG: Record<OpponentId, OpponentMeta> = {
  umbridge: {
    id: 'umbridge',
    shortName: 'Mrs. Umbridge',
    name: 'Professor Dolores Umbridge',
    title: 'High Inquisitor of Hogwarts',
    house: 'Slytherin',
    maxHp: 160,
    imageUrl: '/src/assets/images/umbridge_duel_portrait_1795313544825.jpg',
    beamColor: '#ec4899',
    beamSecondary: '#fde047',
    chargeSpellName: 'Blood Quill Curse',
    regularSpellName: 'Ministry Stinging Hex',
    baseDamage: 14,
    heavyDamage: 25,
    intro: 'Hem, hem! Put that wand away immediately, or I shall have to enforce Educational Decree No. 24!',
  },
  voldemort: {
    id: 'voldemort',
    shortName: 'Lord Voldemort',
    name: 'Lord Voldemort',
    title: 'The Dark Lord · Heir of Slytherin',
    house: 'Slytherin',
    maxHp: 190,
    imageUrl: '/src/assets/images/voldemort_portrait_1795356713951.jpg',
    beamColor: '#10b981',
    beamSecondary: '#a7f3d0',
    chargeSpellName: 'Avada Kedavra Surge',
    regularSpellName: 'Crucio Serpent Strike',
    baseDamage: 16,
    heavyDamage: 30,
    intro: 'Raise your wand, then. Let us see how long your sparks endure against the Dark Lord.',
  },
  bellatrix: {
    id: 'bellatrix',
    shortName: 'Bellatrix Lestrange',
    name: 'Bellatrix Lestrange',
    title: 'Dark Witch · Inner Circle',
    house: 'Slytherin',
    maxHp: 155,
    imageUrl: '/src/assets/images/bellatrix_portrait_1795356709433.jpg',
    beamColor: '#a855f7',
    beamSecondary: '#f43f5e',
    chargeSpellName: 'Cruciatus Tempest',
    regularSpellName: 'Blackthorn Fury Hex',
    baseDamage: 15,
    heavyDamage: 26,
    intro: 'Oh, how delightful! A little duelist dares cross wands with Bellatrix Lestrange!',
  },
  draco: {
    id: 'draco',
    shortName: 'Draco Malfoy',
    name: 'Draco Malfoy',
    title: 'Slytherin Dueling Champion',
    house: 'Slytherin',
    maxHp: 135,
    imageUrl: '/src/assets/images/draco_malfoy_portrait_1795356709204.jpg',
    beamColor: '#22c55e',
    beamSecondary: '#e2e8f0',
    chargeSpellName: 'Serpensortia Strike',
    regularSpellName: 'Slytherin Jinx',
    baseDamage: 13,
    heavyDamage: 22,
    intro: 'Scared? You will soon learn what happens when you duel a Malfoy.',
  },
  dummy: {
    id: 'dummy',
    shortName: 'Practice Dummy',
    name: 'Enchanted Dueling Dummy',
    title: 'Hogwarts Combat Practice Construct',
    house: 'Hufflepuff',
    maxHp: 120,
    imageUrl: '/src/assets/images/practice_dummy_duel_1795313546079.jpg',
    beamColor: '#f59e0b',
    beamSecondary: '#fed7aa',
    chargeSpellName: 'Spring-Loaded Rebound',
    regularSpellName: 'Practice Spark Pulse',
    baseDamage: 11,
    heavyDamage: 16,
    intro: 'The oak mannequin clicks its brass joints into guard stance, ready to absorb and rebound your spells.',
  },
};

const CHAMPION_ORDER: ChampionId[] = ['custom', 'harry', 'ron', 'hermione', 'dumbledore'];
const OPPONENT_ORDER: OpponentId[] = ['voldemort', 'umbridge', 'bellatrix', 'draco', 'dummy'];

function buildLightningPoints(fromX: number, fromY: number, toX: number, toY: number, segments = 10) {
  const pts: Array<{ x: number; y: number }> = [{ x: fromX, y: fromY }];
  for (let i = 1; i < segments; i++) {
    const t = i / segments;
    const jitter = (Math.random() - 0.5) * 26;
    pts.push({
      x: fromX + (toX - fromX) * t + (Math.random() - 0.5) * 10,
      y: fromY + (toY - fromY) * t + jitter,
    });
  }
  pts.push({ x: toX, y: toY });
  return pts;
}

export const SpellDuelArena: React.FC<SpellDuelArenaProps> = ({
  profile,
  isMuted,
  onToggleMute,
  onRecordDuelOutcome,
}) => {
  const prefersReducedMotion = useReducedMotion();

  const [champion, setChampion] = useState<ChampionId>('harry');
  const [opponent, setOpponent] = useState<OpponentId>('voldemort');
  const [playerHp, setPlayerHp] = useState(CHAMPION_ROSTER.harry.maxHp);
  const [playerMana, setPlayerMana] = useState(CHAMPION_ROSTER.harry.maxMana);
  const [opponentHp, setOpponentHp] = useState(OPPONENT_CONFIG.voldemort.maxHp);
  const [playerShieldTurns, setPlayerShieldTurns] = useState(0);
  const [playerEmpowered, setPlayerEmpowered] = useState(false);
  const [bloodQuillCurseTurns, setBloodQuillCurseTurns] = useState(0);
  const [opponentStunnedTurns, setOpponentStunnedTurns] = useState(0);
  const [opponentDisarmedTurns, setOpponentDisarmedTurns] = useState(0);
  const [enemyChargingHeavy, setEnemyChargingHeavy] = useState(false);
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({});
  const [turnNumber, setTurnNumber] = useState(1);
  const [duelStatus, setDuelStatus] = useState<'ACTIVE' | 'VICTORY' | 'DEFEAT'>('ACTIVE');
  const [isResolvingTurn, setIsResolvingTurn] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatLog, setChatLog] = useState<ChatLogItem[]>([
    {
      id: 'intro-1',
      speaker: 'opponent',
      senderName: OPPONENT_CONFIG.voldemort.name,
      text: OPPONENT_CONFIG.voldemort.intro,
    },
  ]);

  const [playerPortraitFailed, setPlayerPortraitFailed] = useState(false);
  const [oppPortraitFailed, setOppPortraitFailed] = useState(false);
  const [playerShakeKey, setPlayerShakeKey] = useState(0);
  const [opponentShakeKey, setOpponentShakeKey] = useState(0);
  const [playerLungeKey, setPlayerLungeKey] = useState(0);
  const [opponentLungeKey, setOpponentLungeKey] = useState(0);
  const [stageShakeKey, setStageShakeKey] = useState(0);
  const [spellBanner, setSpellBanner] = useState<SpellBanner | null>(null);
  const [callouts, setCallouts] = useState<FloatingCallout[]>([]);

  const fxCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const beamsRef = useRef<ActiveBeam[]>([]);
  const ringsRef = useRef<ShockwaveRing[]>([]);
  const boltsRef = useRef<LightningBolt[]>([]);
  const enemyTurnTimeoutRef = useRef<number | null>(null);
  const bannerTimeoutRef = useRef<number | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const champMeta = CHAMPION_ROSTER[champion];
  const oppMeta = OPPONENT_CONFIG[opponent];

  const playerName = champion === 'custom' ? profile?.name || 'Young Wizard' : champMeta.name;
  const playerHouse: HouseName =
    champion === 'custom' ? profile?.house || 'Gryffindor' : champMeta.house;
  const wandCore =
    champion === 'custom' ? profile?.wandCore || 'Phoenix feather' : champMeta.wand;
  const playerMaxHp = champMeta.maxHp;
  const playerMaxMana = champMeta.maxMana;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatLog]);

  useEffect(() => {
    return () => {
      if (enemyTurnTimeoutRef.current !== null) {
        window.clearTimeout(enemyTurnTimeoutRef.current);
      }
      if (bannerTimeoutRef.current !== null) {
        window.clearTimeout(bannerTimeoutRef.current);
      }
    };
  }, []);

  const showBanner = (title: string, color: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setSpellBanner({ id, title: title.toUpperCase(), color });
    if (bannerTimeoutRef.current !== null) {
      window.clearTimeout(bannerTimeoutRef.current);
    }
    bannerTimeoutRef.current = window.setTimeout(() => {
      setSpellBanner(null);
    }, 1050);
  };

  const pushCallout = (side: 'player' | 'opponent', label: string, color: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setCallouts((prev) => [...prev.slice(-4), { id, side, label, color }]);
    window.setTimeout(() => {
      setCallouts((prev) => prev.filter((c) => c.id !== id));
    }, 1150);
  };

  // Real-time HTML5 Canvas spell particle, helical beam, lightning bolt & clash loop
  useEffect(() => {
    const canvas = fxCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;

    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const time = performance.now() * 0.015;

      // 1. Shockwave rings
      const nextRings: ShockwaveRing[] = [];
      for (const ring of ringsRef.current) {
        ring.radius += (ring.maxRadius - ring.radius) * 0.13 + 1.5;
        ring.alpha -= 0.024;
        if (ring.alpha > 0.02) {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = ring.alpha;
          ctx.strokeStyle = ring.color;
          ctx.lineWidth = 3.2;
          ctx.shadowColor = ring.color;
          ctx.shadowBlur = 16;
          ctx.beginPath();
          ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
          nextRings.push(ring);
        }
      }
      ringsRef.current = nextRings;

      // 2. Jagged lightning bolts
      const nextBolts: LightningBolt[] = [];
      for (const bolt of boltsRef.current) {
        bolt.alpha -= 0.075;
        if (bolt.alpha > 0.03 && bolt.points.length > 1) {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = bolt.alpha;
          ctx.strokeStyle = bolt.color;
          ctx.lineWidth = 2.6;
          ctx.shadowColor = bolt.color;
          ctx.shadowBlur = 14;
          ctx.beginPath();
          ctx.moveTo(bolt.points[0].x, bolt.points[0].y);
          for (let i = 1; i < bolt.points.length; i++) {
            ctx.lineTo(bolt.points[i].x, bolt.points[i].y);
          }
          ctx.stroke();
          ctx.restore();
          nextBolts.push(bolt);
        }
      }
      boltsRef.current = nextBolts;

      // 3. Helical Beams & Priori Incantatem Clashes
      const nextBeams: ActiveBeam[] = [];
      for (const beam of beamsRef.current) {
        beam.progress += beam.style === 'clash' ? 0.032 : 0.06;
        if (beam.progress <= 1.3) {
          const clamped = Math.min(1, beam.progress);

          if (beam.style === 'clash') {
            const midX = (beam.fromX + beam.toX) / 2 + Math.sin(time * 0.8) * 14;
            const midY = (beam.fromY + beam.toY) / 2 + Math.cos(time * 0.9) * 6;
            const oppColor = beam.clashOpponentColor || '#10b981';

            // Left gold-crimson beam to center clash orb
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.strokeStyle = beam.color;
            ctx.lineWidth = 8;
            ctx.shadowColor = beam.color;
            ctx.shadowBlur = 22;
            ctx.beginPath();
            ctx.moveTo(beam.fromX, beam.fromY);
            ctx.quadraticCurveTo(
              (beam.fromX + midX) / 2,
              beam.fromY - 24 * Math.sin(time * 0.5),
              midX,
              midY
            );
            ctx.stroke();

            // Right emerald/dark beam to center clash orb
            ctx.strokeStyle = oppColor;
            ctx.lineWidth = 8;
            ctx.shadowColor = oppColor;
            ctx.beginPath();
            ctx.moveTo(beam.toX, beam.toY);
            ctx.quadraticCurveTo(
              (beam.toX + midX) / 2,
              beam.toY + 24 * Math.sin(time * 0.5),
              midX,
              midY
            );
            ctx.stroke();

            // Blazing Priori Incantatem Clash Core
            const orbRadius = 16 + Math.sin(time * 1.4) * 5;
            const grad = ctx.createRadialGradient(midX, midY, 2, midX, midY, orbRadius * 2.1);
            grad.addColorStop(0, '#ffffff');
            grad.addColorStop(0.45, '#fde047');
            grad.addColorStop(1, 'rgba(251, 191, 36, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(midX, midY, orbRadius * 2.1, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            for (let i = 0; i < 4; i++) {
              const ang = Math.random() * Math.PI * 2;
              const spd = 2 + Math.random() * 4.5;
              particlesRef.current.push({
                x: midX,
                y: midY,
                vx: Math.cos(ang) * spd,
                vy: Math.sin(ang) * spd,
                radius: 2 + Math.random() * 3.5,
                color: i % 2 === 0 ? '#fde047' : oppColor,
                alpha: 1,
                decay: 0.032,
              });
            }

            if (Math.random() < 0.28) {
              boltsRef.current.push({
                points: buildLightningPoints(midX, midY, beam.toX, beam.toY, 7),
                color: '#fde047',
                alpha: 0.85,
              });
            }
          } else {
            const curX = beam.fromX + (beam.toX - beam.fromX) * clamped;
            const curY = beam.fromY + (beam.toY - beam.fromY) * clamped;

            // Braided sinusoidal spell stream
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.strokeStyle = beam.color;
            ctx.lineWidth = beam.style === 'blast' || beam.style === 'patronus' ? 10 : 6.5;
            ctx.shadowColor = beam.color;
            ctx.shadowBlur = 22;
            ctx.beginPath();
            const steps = 18;
            for (let s = 0; s <= steps; s++) {
              const t = (s / steps) * clamped;
              const px = beam.fromX + (beam.toX - beam.fromX) * t;
              const waveAmp = beam.style === 'fire' || beam.style === 'patronus' ? 16 : 9;
              const py =
                beam.fromY +
                (beam.toY - beam.fromY) * t +
                Math.sin(t * 14 - time) * waveAmp * Math.sin(t * Math.PI);
              if (s === 0) ctx.moveTo(px, py);
              else ctx.lineTo(px, py);
            }
            ctx.stroke();

            // Inner white-hot core ribbon
            ctx.strokeStyle = beam.secondary;
            ctx.lineWidth = 2.6;
            ctx.beginPath();
            for (let s = 0; s <= steps; s++) {
              const t = (s / steps) * clamped;
              const px = beam.fromX + (beam.toX - beam.fromX) * t;
              const py =
                beam.fromY +
                (beam.toY - beam.fromY) * t -
                Math.sin(t * 14 - time) * 6 * Math.sin(t * Math.PI);
              if (s === 0) ctx.moveTo(px, py);
              else ctx.lineTo(px, py);
            }
            ctx.stroke();

            // Glowing wand-head comet tip
            ctx.fillStyle = beam.secondary;
            ctx.beginPath();
            ctx.arc(curX, curY, beam.style === 'patronus' ? 10 : 6.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            for (let i = 0; i < 4; i++) {
              particlesRef.current.push({
                x: curX + (Math.random() - 0.5) * 16,
                y: curY + (Math.random() - 0.5) * 16,
                vx: (Math.random() - 0.5) * 3.8,
                vy: (Math.random() - 0.5) * 3.8,
                radius: 2 + Math.random() * 3.8,
                color: Math.random() > 0.4 ? beam.color : beam.secondary,
                alpha: 1,
                decay: 0.028 + Math.random() * 0.025,
              });
            }

            if (
              (beam.style === 'stun' || beam.style === 'blast' || beam.style === 'enemy') &&
              Math.random() < 0.25
            ) {
              boltsRef.current.push({
                points: buildLightningPoints(beam.fromX, beam.fromY, curX, curY, 8),
                color: beam.color,
                alpha: 0.78,
              });
            }

            if (beam.progress >= 0.94 && beam.progress < 1.01) {
              ringsRef.current.push({
                x: beam.toX,
                y: beam.toY,
                radius: 10,
                maxRadius: beam.style === 'blast' || beam.style === 'patronus' ? 128 : 88,
                color: beam.color,
                alpha: 0.95,
              });

              for (let i = 0; i < 36; i++) {
                const angle = (Math.PI * 2 * i) / 36 + Math.random() * 0.2;
                const speed = 1.8 + Math.random() * 5.8;
                particlesRef.current.push({
                  x: beam.toX,
                  y: beam.toY,
                  vx: Math.cos(angle) * speed,
                  vy: Math.sin(angle) * speed,
                  radius: 2.5 + Math.random() * 4.5,
                  color: i % 2 === 0 ? beam.color : beam.secondary,
                  alpha: 1,
                  decay: 0.02 + Math.random() * 0.02,
                });
              }
            }
          }

          nextBeams.push(beam);
        }
      }
      beamsRef.current = nextBeams;

      // 4. Particles
      const nextParticles: Particle[] = [];
      for (const p of particlesRef.current) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.gravity) p.vy += p.gravity;
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
      particlesRef.current = nextParticles;

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, []);

  const triggerCanvasEffect = (
    direction: 'toOpponent' | 'toPlayer' | 'selfPlayer' | 'clash' | 'victory',
    color: string,
    secondary: string,
    style: SpellEffectStyle | 'enemy' | 'clash',
    clashOpponentColor?: string
  ) => {
    const canvas = fxCanvasRef.current;
    if (!canvas) return;
    const w = canvas.width;
    const h = canvas.height;
    const leftX = w * 0.22;
    const leftY = h * 0.54;
    const rightX = w * 0.78;
    const rightY = h * 0.54;

    if (direction === 'victory') {
      for (let burst = 0; burst < 3; burst++) {
        const bx = w * (0.25 + burst * 0.25);
        const by = h * (0.28 + (burst % 2) * 0.14);
        ringsRef.current.push({
          x: bx,
          y: by,
          radius: 8,
          maxRadius: 110,
          color: burst % 2 === 0 ? '#fbbf24' : '#ef4444',
          alpha: 0.95,
        });
        for (let i = 0; i < 34; i++) {
          const ang = (Math.PI * 2 * i) / 34;
          const spd = 2 + Math.random() * 5;
          particlesRef.current.push({
            x: bx,
            y: by,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd - 1,
            radius: 2.5 + Math.random() * 3.5,
            color: i % 2 === 0 ? '#fde047' : '#ef4444',
            alpha: 1,
            decay: 0.015,
            gravity: 0.06,
          });
        }
      }
      return;
    }

    if (direction === 'selfPlayer') {
      ringsRef.current.push({
        x: leftX,
        y: leftY,
        radius: 16,
        maxRadius: 108,
        color,
        alpha: 0.95,
      });
      for (let i = 0; i < 42; i++) {
        const angle = (Math.PI * 2 * i) / 42;
        const speed = 1.2 + Math.random() * 3.6;
        particlesRef.current.push({
          x: leftX,
          y: leftY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1.1,
          radius: 3 + Math.random() * 4.2,
          color: i % 2 === 0 ? color : secondary,
          alpha: 1,
          decay: 0.018,
        });
      }
      return;
    }

    if (direction === 'clash') {
      beamsRef.current.push({
        fromX: leftX,
        fromY: leftY,
        toX: rightX,
        toY: rightY,
        color,
        secondary,
        progress: 0,
        style: 'clash',
        clashOpponentColor,
      });
      return;
    }

    // Wand-tip muzzle flare
    const startX = direction === 'toOpponent' ? leftX : rightX;
    const startY = direction === 'toOpponent' ? leftY : rightY;
    ringsRef.current.push({
      x: startX,
      y: startY,
      radius: 6,
      maxRadius: 42,
      color: secondary,
      alpha: 0.85,
    });

    beamsRef.current.push({
      fromX: startX,
      fromY: startY,
      toX: direction === 'toOpponent' ? rightX : leftX,
      toY: direction === 'toOpponent' ? rightY : leftY,
      color,
      secondary,
      progress: 0,
      style,
    });
  };

  const resetDuel = (targetChampion: ChampionId, targetOpponent: OpponentId) => {
    if (enemyTurnTimeoutRef.current !== null) {
      window.clearTimeout(enemyTurnTimeoutRef.current);
      enemyTurnTimeoutRef.current = null;
    }
    const nextChamp = CHAMPION_ROSTER[targetChampion];
    const nextOpp = OPPONENT_CONFIG[targetOpponent];

    setChampion(targetChampion);
    setOpponent(targetOpponent);
    setPlayerPortraitFailed(false);
    setOppPortraitFailed(false);
    setPlayerHp(nextChamp.maxHp);
    setPlayerMana(nextChamp.maxMana);
    setOpponentHp(nextOpp.maxHp);
    setPlayerShieldTurns(0);
    setPlayerEmpowered(false);
    setBloodQuillCurseTurns(0);
    setOpponentStunnedTurns(0);
    setOpponentDisarmedTurns(0);
    setEnemyChargingHeavy(false);
    setCooldowns({});
    setTurnNumber(1);
    setDuelStatus('ACTIVE');
    setIsResolvingTurn(false);
    setCallouts([]);
    setSpellBanner(null);
    setChatLog([
      {
        id: `intro-${Date.now()}`,
        speaker: 'opponent',
        senderName: nextOpp.name,
        text: nextOpp.intro,
      },
    ]);
  };

  const appendLog = (item: Omit<ChatLogItem, 'id'>) => {
    setChatLog((prev) => [...prev, { ...item, id: `${Date.now()}-${Math.random()}` }]);
  };

  const fetchOpponentReaction = async (
    rawSpellText: string,
    isKnownSpell: boolean,
    turnEffectSummary: string,
    nextPlayerHp: number,
    nextOpponentHp: number
  ) => {
    try {
      const response = await fetch('/api/spell-duel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spellText: rawSpellText,
          opponent,
          playerName,
          playerHouse,
          wandCore,
          playerHp: nextPlayerHp,
          opponentHp: nextOpponentHp,
          isKnownSpell,
          turnEffectSummary,
        }),
      });
      if (!response.ok) return null;
      return (await response.json()) as {
        reaction: string;
        customDamage: number;
        customHeal: number;
        effectColor: string;
      };
    } catch {
      return null;
    }
  };

  const castChatSpell = async (rawText: string) => {
    const trimmed = rawText.trim();
    if (!trimmed || duelStatus !== 'ACTIVE' || isResolvingTurn) return;

    const matched = matchSpellFromChat(trimmed);

    if (matched) {
      const remainingCd = cooldowns[matched.id] || 0;
      if (remainingCd > 0) {
        appendLog({
          speaker: 'system',
          senderName: 'Duel Arbiter',
          text: `${matched.incantation} is recovering (${remainingCd} more ${remainingCd === 1 ? 'turn' : 'turns'}). Choose another spell.`,
        });
        return;
      }
      if (playerMana < matched.manaCost) {
        appendLog({
          speaker: 'system',
          senderName: 'Duel Arbiter',
          text: `Not enough Focus (${playerMana}/${matched.manaCost}) for ${matched.incantation}. Cast Lumos or Rictusempra to replenish Focus.`,
        });
        return;
      }
    }

    setChatInput('');
    setIsResolvingTurn(true);
    setPlayerLungeKey((k) => k + 1);

    const nextCooldowns: Record<string, number> = {};
    for (const [key, val] of Object.entries(cooldowns)) {
      if (val > 1) nextCooldowns[key] = val - 1;
    }

    let dmg = 0;
    let heal = 0;
    let manaCost = 10;
    let manaGain = 10 + champMeta.focusRegenBonus;
    let nextShield = Math.max(0, playerShieldTurns - 1);
    let nextEmpower = playerEmpowered;
    let nextCurse = bloodQuillCurseTurns;
    let nextOppStun = opponentStunnedTurns;
    let nextOppDisarm = opponentDisarmedTurns;
    let effectSummary = '';

    if (matched) {
      manaCost = matched.manaCost;
      manaGain = 10 + champMeta.focusRegenBonus + matched.manaRestore;
      if (matched.cooldownTurns > 0) {
        nextCooldowns[matched.id] = matched.cooldownTurns;
      }

      dmg = matched.damage > 0 ? Math.round(matched.damage * champMeta.damageMultiplier) : 0;
      if (
        champion === 'harry' &&
        (matched.id === 'expelliarmus' || matched.id === 'expecto-patronum')
      ) {
        dmg = Math.round(dmg * 1.15);
      }
      if (dmg > 0 && playerEmpowered) {
        dmg = Math.round(dmg * 1.35);
        nextEmpower = false;
      }
      heal = matched.heal;
      if (matched.shieldTurns > 0) nextShield = matched.shieldTurns;
      if (matched.empowerNext) nextEmpower = true;
      if (matched.purifyDebuff) nextCurse = 0;
      if (matched.stunOpponent) nextOppStun = 1;
      if (matched.disarmOpponent) nextOppDisarm = 1;

      const isSelfSpell =
        matched.effectStyle === 'shield' ||
        matched.effectStyle === 'heal' ||
        matched.effectStyle === 'light';

      const isPrioriClash =
        !isSelfSpell &&
        ((opponent === 'voldemort' && matched.id === 'expelliarmus') ||
          (enemyChargingHeavy && (matched.id === 'expelliarmus' || matched.id === 'expecto-patronum')));

      playSpellSound(matched.effectStyle, isMuted);
      showBanner(
        isPrioriClash ? `${matched.incantation} · Beam Clash!` : `${matched.incantation}!`,
        matched.colorHex
      );

      triggerCanvasEffect(
        isSelfSpell ? 'selfPlayer' : isPrioriClash ? 'clash' : 'toOpponent',
        matched.colorHex,
        matched.secondaryHex,
        isPrioriClash ? 'clash' : matched.effectStyle,
        oppMeta.beamColor
      );

      if (matched.effectStyle === 'blast' || matched.effectStyle === 'fire' || isPrioriClash) {
        setStageShakeKey((k) => k + 1);
      }

      if (dmg > 0) {
        setOpponentShakeKey((k) => k + 1);
        pushCallout('opponent', `-${dmg} HP`, matched.colorHex);
      }
      if (heal > 0) {
        pushCallout('player', `+${heal} HP`, '#4ade80');
      }
      if (matched.shieldTurns > 0) {
        pushCallout('player', 'PROTEGO!', '#fde047');
      }

      effectSummary = `${matched.incantation} dealt ${dmg} damage${heal > 0 ? `, healed ${heal} HP` : ''}${matched.shieldTurns > 0 ? ', raised Protego barrier' : ''}${matched.disarmOpponent ? ', disarmed foe' : ''}${matched.stunOpponent ? ', stunned foe' : ''}${matched.purifyDebuff ? ', cleansed curse' : ''}.`;

      appendLog({
        speaker: 'player',
        senderName: playerName,
        text: trimmed,
        spellTag: `${matched.incantation}${dmg > 0 ? ` · ${dmg} DMG` : ''}${heal > 0 ? ` · +${heal} HP` : ''}`,
      });
    } else {
      playSpellSound('custom', isMuted);
      showBanner(trimmed.slice(0, 28), '#eab308');
      triggerCanvasEffect('toOpponent', '#eab308', '#fef08a', 'custom');

      const aiCustom = await fetchOpponentReaction(
        trimmed,
        false,
        'Custom player incantation',
        playerHp,
        opponentHp
      );

      dmg = Math.round((aiCustom?.customDamage ?? 12) * champMeta.damageMultiplier);
      heal = aiCustom?.customHeal ?? 0;
      if (dmg > 0) {
        setOpponentShakeKey((k) => k + 1);
        pushCallout('opponent', `-${dmg} HP`, '#eab308');
      }
      if (heal > 0) {
        pushCallout('player', `+${heal} HP`, '#4ade80');
      }
      effectSummary = `Custom spell "${trimmed}" dealt ${dmg} damage${heal > 0 ? ` and restored ${heal} HP` : ''}.`;

      appendLog({
        speaker: 'player',
        senderName: playerName,
        text: trimmed,
        spellTag: `Custom Charm · ${dmg} DMG`,
      });

      if (aiCustom?.reaction) {
        appendLog({
          speaker: 'opponent',
          senderName: oppMeta.name,
          text: aiCustom.reaction,
        });
      }
    }

    const updatedOppHp = Math.max(0, opponentHp - dmg);
    const updatedPlayerMana = Math.min(
      playerMaxMana,
      Math.max(0, playerMana - manaCost + manaGain)
    );
    let updatedPlayerHp = Math.min(playerMaxHp, playerHp + heal);

    setOpponentHp(updatedOppHp);
    setPlayerMana(updatedPlayerMana);
    setPlayerHp(updatedPlayerHp);
    setPlayerShieldTurns(nextShield);
    setPlayerEmpowered(nextEmpower);
    setBloodQuillCurseTurns(nextCurse);
    setOpponentStunnedTurns(nextOppStun);
    setOpponentDisarmedTurns(nextOppDisarm);
    setCooldowns(nextCooldowns);

    if (updatedOppHp <= 0) {
      setDuelStatus('VICTORY');
      setIsResolvingTurn(false);
      playSpellSound('victory', isMuted);
      triggerCanvasEffect('victory', '#fbbf24', '#ef4444', 'custom');
      appendLog({
        speaker: 'system',
        senderName: 'Duel Arbiter',
        text: `${oppMeta.name} has been defeated! Victory belongs to ${playerName} of ${playerHouse}.`,
      });
      await onRecordDuelOutcome('win', opponent);
      return;
    }

    if (matched) {
      void fetchOpponentReaction(trimmed, true, effectSummary, updatedPlayerHp, updatedOppHp).then(
        (res) => {
          if (res?.reaction) {
            appendLog({
              speaker: 'opponent',
              senderName: oppMeta.name,
              text: res.reaction,
            });
          }
        }
      );
    }

    enemyTurnTimeoutRef.current = window.setTimeout(async () => {
      let enemyDmg = 0;
      let nextCharging = enemyChargingHeavy;
      let curseDamage = 0;

      if (nextCurse > 0) {
        curseDamage = 6;
        nextCurse -= 1;
      }

      if (nextOppStun > 0) {
        appendLog({
          speaker: 'system',
          senderName: 'Duel Arbiter',
          text: `${oppMeta.name} is bound by Petrificus Totalus and misses their turn!`,
        });
        setOpponentStunnedTurns(0);
      } else {
        setOpponentLungeKey((k) => k + 1);
        playSpellSound('enemyHit', isMuted);

        if (opponent === 'dummy') {
          enemyDmg = oppMeta.baseDamage + (turnNumber % 2) * 3;
          triggerCanvasEffect('toPlayer', oppMeta.beamColor, oppMeta.beamSecondary, 'enemy');
          appendLog({
            speaker: 'opponent',
            senderName: oppMeta.name,
            text: 'The Enchanted Dummy rebounds a spark pulse back across the mat.',
            spellTag: oppMeta.regularSpellName,
          });
        } else if (enemyChargingHeavy) {
          enemyDmg = oppMeta.heavyDamage;
          nextCharging = false;
          if (opponent === 'umbridge' || opponent === 'voldemort') {
            nextCurse = 2;
          }
          setStageShakeKey((k) => k + 1);
          showBanner(oppMeta.chargeSpellName, oppMeta.beamColor);
          triggerCanvasEffect('toPlayer', oppMeta.beamColor, oppMeta.beamSecondary, 'enemy');
          appendLog({
            speaker: 'opponent',
            senderName: oppMeta.name,
            text:
              opponent === 'voldemort'
                ? 'Unleashes a blinding emerald Avada Kedavra Surge across the hall!'
                : opponent === 'umbridge'
                  ? 'Unleashes "I Must Not Tell Lies" Blood Quill Curse!'
                  : `Unleashes ${oppMeta.chargeSpellName}!`,
            spellTag: oppMeta.chargeSpellName,
          });
        } else if (turnNumber % 3 === 0) {
          enemyDmg = Math.max(8, oppMeta.baseDamage - 3);
          nextCharging = true;
          triggerCanvasEffect('toPlayer', oppMeta.beamColor, '#ffffff', 'enemy');
          appendLog({
            speaker: 'opponent',
            senderName: oppMeta.name,
            text:
              opponent === 'voldemort'
                ? 'Draws dark emerald mist around his yew wand—brace with Protego or Expelliarmus!'
                : opponent === 'umbridge'
                  ? 'Raises her black quill and drafts Educational Decree No. 24—brace with Protego or Expelliarmus!'
                  : `Gathers arcane power for ${oppMeta.chargeSpellName}—brace with Protego or Expelliarmus!`,
            spellTag: `Charging ${oppMeta.chargeSpellName}`,
          });
        } else {
          enemyDmg = oppMeta.baseDamage;
          triggerCanvasEffect('toPlayer', oppMeta.beamColor, oppMeta.beamSecondary, 'enemy');
          appendLog({
            speaker: 'opponent',
            senderName: oppMeta.name,
            text: `Fires ${oppMeta.regularSpellName} from across the dueling platform!`,
            spellTag: oppMeta.regularSpellName,
          });
        }

        if (nextOppDisarm > 0) {
          enemyDmg = Math.round(enemyDmg * 0.5);
          setOpponentDisarmedTurns(0);
        }

        if (nextShield > 0) {
          const blockPct = Math.min(0.92, 0.8 + champMeta.shieldBonus);
          const blocked = Math.round(enemyDmg * blockPct);
          enemyDmg = Math.max(1, enemyDmg - blocked);
          setPlayerShieldTurns(0);
          pushCallout('player', `BLOCKED ${blocked}`, '#fde047');
          appendLog({
            speaker: 'system',
            senderName: 'Protego Ward',
            text: `Your golden Protego barrier absorbed ${blocked} damage!`,
          });
        }
      }

      const totalIncoming = enemyDmg + curseDamage;
      if (totalIncoming > 0) {
        setPlayerShakeKey((k) => k + 1);
        pushCallout('player', `-${totalIncoming} HP`, '#f87171');
      }

      updatedPlayerHp = Math.max(0, updatedPlayerHp - totalIncoming);

      setPlayerHp(updatedPlayerHp);
      setBloodQuillCurseTurns(nextCurse);
      setEnemyChargingHeavy(nextCharging);
      setTurnNumber((t) => t + 1);
      setIsResolvingTurn(false);

      if (updatedPlayerHp <= 0) {
        setDuelStatus('DEFEAT');
        appendLog({
          speaker: 'system',
          senderName: 'Duel Arbiter',
          text: `${playerName} collapses from exhaustion. Catch your breath and start a fresh duel!`,
        });
        await onRecordDuelOutcome('loss', opponent);
      }
    }, 680);
  };

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void castChatSpell(chatInput);
  };

  const playerHpPct = Math.round((playerHp / playerMaxHp) * 100);
  const playerManaPct = Math.round((playerMana / playerMaxMana) * 100);
  const oppHpPct = Math.round((opponentHp / oppMeta.maxHp) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-6"
    >
      {/* Top Character Selector & Arena Controls */}
      <div className="rounded-xl bg-[#1c1410] border border-[#3b2b20] p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => resetDuel('harry', 'voldemort')}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap ${
                champion === 'harry' && opponent === 'voldemort'
                  ? 'bg-[#8c1d24] border-[#c99a3b] text-[#f9f3e6]'
                  : 'bg-[#120d0a] border-[#3b2b20] text-[#e6d8be] hover:border-[#c99a3b]'
              }`}
            >
              Harry Potter vs. Voldemort
            </button>
            <button
              type="button"
              onClick={() => resetDuel('ron', 'umbridge')}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap ${
                champion === 'ron' && opponent === 'umbridge'
                  ? 'bg-[#8c1d24] border-[#c99a3b] text-[#f9f3e6]'
                  : 'bg-[#120d0a] border-[#3b2b20] text-[#e6d8be] hover:border-[#c99a3b]'
              }`}
            >
              Ron Weasley vs. Mrs. Umbridge
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onToggleMute}
              className="px-3.5 py-2 rounded-lg border border-[#4a3628] text-xs font-medium text-[#e6d8be] hover:border-[#c99a3b] flex items-center gap-1.5 whitespace-nowrap"
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              {isMuted ? 'Unmute FX' : 'Sound On'}
            </button>
            <button
              type="button"
              onClick={() => resetDuel(champion, opponent)}
              className="px-4 py-2 rounded-lg border border-[#c99a3b]/60 text-xs font-semibold text-[#e6bd62] hover:bg-[#c99a3b]/15 flex items-center gap-1.5 whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              New Duel
            </button>
          </div>
        </div>

        {/* Dual Fighter Pickers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-3 border-t border-[#2d2017]">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-[#e6bd62]">Your Duelist</p>
            <div className="flex flex-wrap gap-1.5">
              {CHAMPION_ORDER.map((id) => {
                const c = CHAMPION_ROSTER[id];
                const label = id === 'custom' ? (profile?.name || 'Your Wizard') : c.shortName;
                const active = champion === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => resetDuel(id, opponent)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all whitespace-nowrap ${
                      active
                        ? 'bg-[#c99a3b] border-[#fde047] text-[#1a110b]'
                        : 'bg-[#120d0a] border-[#3b2b20] text-[#d3c4aa] hover:border-[#c99a3b]/70 hover:text-[#f6eedc]'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-[#fca5a5]">Opponent</p>
            <div className="flex flex-wrap gap-1.5">
              {OPPONENT_ORDER.map((id) => {
                const o = OPPONENT_CONFIG[id];
                const active = opponent === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => resetDuel(champion, id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all whitespace-nowrap ${
                      active
                        ? 'bg-[#8c1d24] border-[#f87171] text-[#f9f3e6]'
                        : 'bg-[#120d0a] border-[#3b2b20] text-[#d3c4aa] hover:border-[#8c1d24] hover:text-[#f6eedc]'
                    }`}
                  >
                    {o.shortName}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Main Duel Stage + Live Spell Chat */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left: Animated Hogwarts Combat Stage + Spellbook */}
        <motion.div
          key={`stage-shake-${stageShakeKey}`}
          animate={
            stageShakeKey > 0 && !prefersReducedMotion
              ? { x: [0, -6, 6, -4, 4, 0], y: [0, 3, -3, 2, 0] }
              : undefined
          }
          transition={{ duration: 0.3 }}
          className="lg:col-span-7 rounded-xl bg-[#18110c] border border-[#3b2b20] p-5 sm:p-6 relative overflow-hidden flex flex-col justify-between min-h-[540px]"
        >
          {/* Atmospheric Hogwarts Stone Arch Chamber Backdrop */}
          <svg
            viewBox="0 0 800 500"
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover opacity-30 pointer-events-none"
          >
            <defs>
              <radialGradient id="chamberGlow" cx="50%" cy="42%" r="60%">
                <stop offset="0%" stopColor="#c99a3b" stopOpacity="0.38" />
                <stop offset="100%" stopColor="#120d0a" stopOpacity="0" />
              </radialGradient>
            </defs>
            <rect width="800" height="500" fill="url(#chamberGlow)" />
            <path d="M90 500V165C90 70 250 30 400 30C550 30 710 70 710 165V500" stroke="#c99a3b" strokeOpacity="0.32" strokeWidth="2" fill="none" />
            <path d="M200 500V205C200 125 295 90 400 90C505 90 600 125 600 205V500" stroke="#c99a3b" strokeOpacity="0.22" strokeWidth="1.5" fill="none" />
            <line x1="60" y1="365" x2="740" y2="365" stroke="#c99a3b" strokeOpacity="0.28" strokeWidth="1.5" strokeDasharray="8 6" />
          </svg>

          {/* Real-Time Canvas Spell Beams, Clash Orbs, Lightning & Particles */}
          <canvas
            ref={fxCanvasRef}
            width={760}
            height={460}
            className="absolute inset-0 w-full h-full pointer-events-none z-20"
          />

          {/* Dramatic Floating Spell Incantation Callout */}
          <AnimatePresence>
            {spellBanner && (
              <motion.div
                key={spellBanner.id}
                initial={{ opacity: 0, y: -10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="pointer-events-none absolute top-4 left-1/2 -translate-x-1/2 z-30 text-center"
              >
                <span
                  className="font-display text-sm sm:text-base font-bold tracking-wider drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]"
                  style={{ color: spellBanner.color }}
                >
                  {spellBanner.title}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Combatants HUD Bars */}
          <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-4 items-start pt-4">
            {/* Player Stats */}
            <motion.div
              key={`player-hud-${playerShakeKey}`}
              animate={
                playerShakeKey > 0 && !prefersReducedMotion
                  ? { x: [0, -7, 7, -4, 4, 0] }
                  : undefined
              }
              transition={{ duration: 0.28 }}
              className={`rounded-xl bg-[#120d0a]/90 border p-3.5 space-y-2.5 transition-shadow ${
                playerShieldTurns > 0
                  ? 'border-[#fde047] shadow-[0_0_24px_rgba(250,204,21,0.28)]'
                  : playerEmpowered
                    ? 'border-[#e6bd62] shadow-[0_0_22px_rgba(230,189,98,0.25)]'
                    : 'border-[#3b2b20]'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <HouseCrestGraphic house={playerHouse} className="w-8 h-9 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[11px] text-[#c9b99c] truncate">{playerHouse} · {wandCore}</p>
                    <h3 className="font-display text-base font-bold text-[#f6eedc] truncate">{playerName}</h3>
                  </div>
                </div>
                <Wand2 className="w-4 h-4 text-[#e6bd62] shrink-0" />
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-[#d3c4aa]">Health</span>
                  <span className="font-mono tabular-nums font-semibold text-[#f6eedc]">
                    HP: {playerHp}/{playerMaxHp} · {playerHpPct > 35 ? 'STEADY' : 'CRITICAL'}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-[#2a1f17] overflow-hidden">
                  <div
                    className="h-full bg-[#22c55e] transition-all duration-300"
                    style={{ width: `${playerHpPct}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-[#d3c4aa]">Wand Focus</span>
                  <span className="font-mono tabular-nums font-semibold text-[#e6bd62]">
                    {playerMana}/{playerMaxMana}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-[#2a1f17] overflow-hidden">
                  <div
                    className="h-full bg-[#c99a3b] transition-all duration-300"
                    style={{ width: `${playerManaPct}%` }}
                  />
                </div>
              </div>

              <div className="text-[11px] text-[#d3c4aa] flex flex-wrap gap-x-2.5 gap-y-0.5">
                <span className="text-[#c9b99c]">{champMeta.bonusLabel}</span>
                {playerShieldTurns > 0 && <span className="text-[#fde047] font-semibold">Protego Active</span>}
                {playerEmpowered && <span className="text-[#fef08a] font-semibold">Lumos +35%</span>}
                {bloodQuillCurseTurns > 0 && (
                  <span className="text-[#f87171] font-semibold">Cursed ({bloodQuillCurseTurns}t)</span>
                )}
              </div>
            </motion.div>

            {/* Opponent Stats */}
            <motion.div
              key={`opp-hud-${opponentShakeKey}`}
              animate={
                opponentShakeKey > 0 && !prefersReducedMotion
                  ? { x: [0, 8, -8, 5, -5, 0] }
                  : undefined
              }
              transition={{ duration: 0.28 }}
              className={`rounded-xl bg-[#120d0a]/90 border p-3.5 space-y-2.5 transition-shadow ${
                enemyChargingHeavy
                  ? 'border-[#f472b6] shadow-[0_0_24px_rgba(244,114,182,0.3)]'
                  : 'border-[#3b2b20]'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] text-[#c9b99c] truncate">{oppMeta.title}</p>
                  <h3 className="font-display text-base font-bold text-[#f6eedc] truncate">
                    {oppMeta.name}
                  </h3>
                </div>
                <Swords className="w-4 h-4 text-[#fca5a5] shrink-0" />
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-[#d3c4aa]">Opponent Health</span>
                  <span className="font-mono tabular-nums font-semibold text-[#fca5a5]">
                    HP: {opponentHp}/{oppMeta.maxHp} · {oppHpPct > 30 ? 'GUARDED' : 'SHAKEN'}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-[#2a1f17] overflow-hidden">
                  <div
                    className="h-full bg-[#b91c1c] transition-all duration-300"
                    style={{ width: `${oppHpPct}%` }}
                  />
                </div>
              </div>

              <div className="text-[11px] text-[#d3c4aa] flex flex-wrap gap-x-3 gap-y-1 pt-1">
                {enemyChargingHeavy && (
                  <span className="text-[#f472b6] font-semibold">
                    Warning: Charging {oppMeta.chargeSpellName}
                  </span>
                )}
                {opponentStunnedTurns > 0 && <span className="text-[#c4b5fd]">Stunned (1 turn)</span>}
                {opponentDisarmedTurns > 0 && <span className="text-[#fbbf24]">Disarmed (-50% attack)</span>}
                {!enemyChargingHeavy && opponentStunnedTurns === 0 && opponentDisarmedTurns === 0 && (
                  <span className="text-[#c9b99c]">Signature: {oppMeta.chargeSpellName}</span>
                )}
              </div>
            </motion.div>
          </div>

          {/* Center Animated Dueling Portraits Stage */}
          <div className="relative z-10 my-5 flex items-center justify-between gap-4 px-2 sm:px-6 min-h-[175px]">
            {/* Left Duelist Portrait + Lunge / Shake / Shield Halo */}
            <div className="relative flex flex-col items-center">
              <div className="pointer-events-none absolute -top-9 inset-x-0 flex flex-col items-center z-30">
                <AnimatePresence>
                  {callouts
                    .filter((c) => c.side === 'player')
                    .map((c) => (
                      <motion.span
                        key={c.id}
                        initial={{ opacity: 0, y: 10, scale: 0.85 }}
                        animate={{ opacity: 1, y: -16, scale: 1.08 }}
                        exit={{ opacity: 0, y: -32 }}
                        transition={{ duration: 0.7 }}
                        className="font-display text-lg font-bold drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)] whitespace-nowrap"
                        style={{ color: c.color }}
                      >
                        {c.label}
                      </motion.span>
                    ))}
                </AnimatePresence>
              </div>

              <motion.div
                key={`player-sprite-${champion}-${playerLungeKey}-${playerShakeKey}`}
                animate={
                  prefersReducedMotion
                    ? undefined
                    : playerShakeKey > 0 && playerShakeKey >= playerLungeKey
                      ? { x: [0, -10, 8, -6, 0], rotate: [0, -3, 2, 0] }
                      : playerLungeKey > 0
                        ? { x: [0, 26, 0], scale: [1, 1.06, 1] }
                        : { y: [0, -4, 0] }
                }
                transition={
                  playerLungeKey === 0 && playerShakeKey === 0
                    ? { duration: 3.2, repeat: Infinity, ease: 'easeInOut' }
                    : { duration: 0.34, ease: [0.16, 1, 0.3, 1] }
                }
                className="relative"
              >
                {/* Protego Runic Dome */}
                {playerShieldTurns > 0 && (
                  <div
                    aria-hidden="true"
                    className="absolute -inset-3 rounded-2xl border-2 border-[#fde047]/80 shadow-[0_0_26px_rgba(253,224,71,0.45)] animate-rune-spin pointer-events-none"
                  />
                )}
                {/* Lumos Empowerment Halo */}
                {playerEmpowered && (
                  <div
                    aria-hidden="true"
                    className="absolute -inset-2 rounded-2xl border border-[#fef08a]/70 shadow-[0_0_22px_rgba(254,240,138,0.4)] pointer-events-none"
                  />
                )}

                {champMeta.imageUrl && !playerPortraitFailed ? (
                  <img
                    src={champMeta.imageUrl}
                    alt={playerName}
                    referrerPolicy="no-referrer"
                    onError={() => setPlayerPortraitFailed(true)}
                    className="w-28 h-28 sm:w-36 sm:h-36 rounded-xl object-cover border-2 border-[#c99a3b] shadow-[0_12px_28px_rgba(0,0,0,0.65)]"
                  />
                ) : (
                  <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-xl bg-gradient-to-br from-[#2b1a12] to-[#120d0a] border-2 border-[#c99a3b] flex flex-col items-center justify-center p-2 shadow-[0_12px_28px_rgba(0,0,0,0.65)]">
                    <HouseCrestGraphic house={playerHouse} className="w-16 h-18" />
                  </div>
                )}
              </motion.div>
              <span className="mt-2 text-xs font-display font-semibold text-[#f6eedc]">
                {playerName}
              </span>
            </div>

            {/* Center VS Emblem */}
            <div className="flex flex-col items-center justify-center shrink-0 px-2">
              <span className="font-display text-xl sm:text-2xl font-bold text-[#e6bd62] tracking-widest">
                VS
              </span>
              <span className="text-[11px] font-mono tabular-nums text-[#c9b99c] mt-1">
                Turn {turnNumber}
              </span>
            </div>

            {/* Right Opponent Portrait + Lunge / Shake / Stun / Charge Halos */}
            <div className="relative flex flex-col items-center">
              <div className="pointer-events-none absolute -top-9 inset-x-0 flex flex-col items-center z-30">
                <AnimatePresence>
                  {callouts
                    .filter((c) => c.side === 'opponent')
                    .map((c) => (
                      <motion.span
                        key={c.id}
                        initial={{ opacity: 0, y: 10, scale: 0.85 }}
                        animate={{ opacity: 1, y: -16, scale: 1.08 }}
                        exit={{ opacity: 0, y: -32 }}
                        transition={{ duration: 0.7 }}
                        className="font-display text-lg font-bold drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)] whitespace-nowrap"
                        style={{ color: c.color }}
                      >
                        {c.label}
                      </motion.span>
                    ))}
                </AnimatePresence>
              </div>

              <motion.div
                key={`opp-sprite-${opponent}-${opponentLungeKey}-${opponentShakeKey}`}
                animate={
                  prefersReducedMotion
                    ? undefined
                    : opponentShakeKey > 0 && opponentShakeKey >= opponentLungeKey
                      ? { x: [0, 11, -9, 6, 0], rotate: [0, 3, -2, 0] }
                      : opponentLungeKey > 0
                        ? { x: [0, -26, 0], scale: [1, 1.06, 1] }
                        : { y: [0, -4, 0] }
                }
                transition={
                  opponentLungeKey === 0 && opponentShakeKey === 0
                    ? { duration: 3.4, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }
                    : { duration: 0.34, ease: [0.16, 1, 0.3, 1] }
                }
                className="relative"
              >
                {opponentStunnedTurns > 0 && (
                  <div
                    aria-hidden="true"
                    className="absolute -inset-3 rounded-2xl border-2 border-dashed border-[#a78bfa] shadow-[0_0_24px_rgba(167,139,250,0.45)] animate-rune-spin pointer-events-none"
                  />
                )}
                {enemyChargingHeavy && (
                  <div
                    aria-hidden="true"
                    className="absolute -inset-3 rounded-2xl border-2 pointer-events-none"
                    style={{
                      borderColor: oppMeta.beamColor,
                      boxShadow: `0 0 28px ${oppMeta.beamColor}66`,
                    }}
                  />
                )}

                {!oppPortraitFailed ? (
                  <img
                    src={oppMeta.imageUrl}
                    alt={oppMeta.name}
                    referrerPolicy="no-referrer"
                    onError={() => setOppPortraitFailed(true)}
                    className="w-28 h-28 sm:w-36 sm:h-36 rounded-xl object-cover border-2 border-[#8c1d24] shadow-[0_12px_28px_rgba(0,0,0,0.65)]"
                  />
                ) : (
                  <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-xl bg-[#2b1514] border-2 border-[#8c1d24] flex items-center justify-center shadow-[0_12px_28px_rgba(0,0,0,0.65)]">
                    <Shield className="w-10 h-10 text-[#e6bd62]" />
                  </div>
                )}
              </motion.div>
              <span className="mt-2 text-xs font-display font-semibold text-[#fca5a5]">
                {oppMeta.shortName}
              </span>
            </div>
          </div>

          {/* Victory / Defeat Overlay Banner */}
          <AnimatePresence>
            {duelStatus !== 'ACTIVE' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="relative z-30 my-3 parchment-sheet rounded-xl p-5 border border-[#c99a3b] flex flex-wrap items-center justify-between gap-4"
              >
                <div>
                  <h4 className="font-display text-xl font-bold text-[#23170f]">
                    {duelStatus === 'VICTORY'
                      ? `${oppMeta.name} Defeated!`
                      : 'Duel Interrupted'}
                  </h4>
                  <p className="text-sm text-[#473324] mt-0.5">
                    {duelStatus === 'VICTORY'
                      ? `${playerName} claimed victory! Recorded in your Wizard Dossier.`
                      : 'Restore your wand focus and challenge the chamber again.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => resetDuel(champion, opponent)}
                  className="px-5 py-2.5 rounded-lg bg-[#8c1d24] text-[#f9f3e6] text-sm font-semibold hover:bg-[#70141a] whitespace-nowrap"
                >
                  Play Again
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Quick-Cast Spell Book Grid */}
          <div className="relative z-10 pt-4 border-t border-[#3b2b20] space-y-2.5">
            <div className="flex items-center justify-between text-xs text-[#c9b99c]">
              <span>Quick-Cast Spellbook (or type any spell in the Duel Chat)</span>
              <span className="font-mono tabular-nums">{playerName} vs {oppMeta.shortName}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {SPELL_BOOK.map((spell) => {
                const cd = cooldowns[spell.id] || 0;
                const noMana = playerMana < spell.manaCost;
                const disabled = duelStatus !== 'ACTIVE' || isResolvingTurn || cd > 0 || noMana;
                return (
                  <button
                    key={spell.id}
                    type="button"
                    disabled={disabled}
                    title={spell.description}
                    onClick={() => void castChatSpell(spell.incantation)}
                    className="px-2.5 py-2 rounded-lg bg-[#120d0a] border border-[#3b2b20] hover:border-[#c99a3b] disabled:opacity-45 text-left transition-transform active:scale-95"
                  >
                    <p className="font-display text-xs font-semibold text-[#f6eedc] truncate">
                      {spell.incantation}
                    </p>
                    <p className="text-[11px] font-mono tabular-nums text-[#c9b99c] mt-0.5">
                      {cd > 0
                        ? `Wait ${cd}t`
                        : `${spell.manaCost} Focus · ${spell.damage > 0 ? `${spell.damage} DMG` : spell.heal > 0 ? `+${spell.heal} HP` : spell.category}`}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* Right: Real-Time Spell Chat Log + Incantation Input */}
        <div className="lg:col-span-5 parchment-sheet rounded-xl border border-[#cbb792] flex flex-col h-[580px]">
          <BrassFiligreeCorner className="absolute top-1.5 right-1.5 rotate-90" />
          <div className="px-5 py-4 border-b border-[#cbb792] flex items-center justify-between">
            <div>
              <h3 className="font-display text-lg font-bold text-[#23170f]">
                Spell Duel Chat
              </h3>
              <p className="text-xs text-[#5e4736]">
                Type any Harry Potter spell to trigger live magic &amp; sound.
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {chatLog.map((entry) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`rounded-lg p-3 text-sm ${
                  entry.speaker === 'player'
                    ? 'bg-[#e7d8ba] text-[#23170f] ml-6'
                    : entry.speaker === 'opponent'
                      ? 'bg-[#fbf6ea] border border-[#cbb792] text-[#23170f] mr-6'
                      : 'bg-[#23170f] text-[#f6eedc] text-xs'
                }`}
              >
                <div className="flex items-baseline justify-between gap-2 mb-1">
                  <span className="font-semibold text-xs">
                    {entry.senderName}
                  </span>
                  {entry.spellTag && (
                    <span className="text-[11px] font-mono tabular-nums text-[#8c1d24] font-semibold">
                      {entry.spellTag}
                    </span>
                  )}
                </div>
                <p className="leading-relaxed">{entry.text}</p>
              </motion.div>
            ))}
            <div ref={chatEndRef} />
          </div>

          <form
            onSubmit={handleChatSubmit}
            className="p-4 border-t border-[#cbb792] flex items-center gap-2.5"
          >
            <input
              type="text"
              disabled={duelStatus !== 'ACTIVE' || isResolvingTurn}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Type a spell (e.g. Expelliarmus, Expecto Patronum)..."
              className="flex-1 px-3.5 py-2.5 rounded-lg bg-[#fbf6ea] border border-[#bfa882] text-[#23170f] text-sm focus:outline-none focus:border-[#8c1d24]"
            />
            <button
              type="submit"
              disabled={duelStatus !== 'ACTIVE' || isResolvingTurn || !chatInput.trim()}
              className="px-4 py-2.5 rounded-lg bg-[#8c1d24] text-[#f9f3e6] text-xs font-semibold hover:bg-[#70141a] disabled:opacity-50 transition-transform active:scale-95 flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              Cast Spell
            </button>
          </form>
        </div>
      </div>
    </motion.div>
  );
};
