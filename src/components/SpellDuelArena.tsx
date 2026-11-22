import React, { useEffect, useRef, useState } from 'react';
import { RotateCcw, Shield, Volume2, VolumeX } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ChampionId, HouseName, OpponentId, WizardProfile } from '../types/wizard';
import {
  SPELL_BOOK,
  playSpellSound,
} from '../lib/spellEngine';
import { HouseCrestGraphic } from './WizardingArtwork';
import { DuelFightCanvas, FightAnimCommand } from './DuelFightCanvas';

interface SpellDuelArenaProps {
  profile: WizardProfile | null;
  isMuted: boolean;
  onToggleMute: () => void;
  onRecordDuelOutcome: (result: 'win' | 'loss', opponent: OpponentId) => Promise<void>;
}

interface SpeechBubbleState {
  id: string;
  speakerName: string;
  text: string;
  tag?: string;
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
    intro: 'Raise your wand, then. Let us see how long your sparks endure!',
  },
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
    intro: 'Hem, hem! Put that wand away, or I shall enforce Educational Decree No. 24!',
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
    intro: 'Oh, how delightful! A little duelist dares cross wands with me!',
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
    intro: 'Scared? You will soon learn what happens when you duel a Malfoy!',
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
    intro: 'Creak! Practice construct locked into guard stance.',
  },
};

const CHAMPION_ORDER: ChampionId[] = ['custom', 'harry', 'ron', 'hermione', 'dumbledore'];
const OPPONENT_ORDER: OpponentId[] = ['voldemort', 'umbridge', 'bellatrix', 'draco', 'dummy'];

export const SpellDuelArena: React.FC<SpellDuelArenaProps> = ({
  profile,
  isMuted,
  onToggleMute,
  onRecordDuelOutcome,
}) => {
  const prefersReducedMotion = Boolean(useReducedMotion());

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

  const [playerBubble, setPlayerBubble] = useState<SpeechBubbleState | null>({
    id: 'p-intro',
    speakerName: 'Harry Potter',
    text: 'Wand at the ready!',
  });
  const [opponentBubble, setOpponentBubble] = useState<SpeechBubbleState | null>({
    id: 'o-intro',
    speakerName: OPPONENT_CONFIG.voldemort.shortName,
    text: OPPONENT_CONFIG.voldemort.intro,
  });

  const [playerPortraitFailed, setPlayerPortraitFailed] = useState(false);
  const [oppPortraitFailed, setOppPortraitFailed] = useState(false);
  const [fightCommand, setFightCommand] = useState<FightAnimCommand | null>(null);
  const [spellBanner, setSpellBanner] = useState<SpellBanner | null>(null);
  const [callouts, setCallouts] = useState<FloatingCallout[]>([]);

  const seqRef = useRef(0);
  const enemyTurnTimeoutRef = useRef<number | null>(null);
  const bannerTimeoutRef = useRef<number | null>(null);

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
    return () => {
      if (enemyTurnTimeoutRef.current !== null) {
        window.clearTimeout(enemyTurnTimeoutRef.current);
      }
      if (bannerTimeoutRef.current !== null) {
        window.clearTimeout(bannerTimeoutRef.current);
      }
    };
  }, []);

  const issueFightCommand = (cmd: Omit<FightAnimCommand, 'seq'>) => {
    seqRef.current += 1;
    setFightCommand({ ...cmd, seq: seqRef.current });
  };

  const showBanner = (title: string, color: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setSpellBanner({ id, title: title.toUpperCase(), color });
    if (bannerTimeoutRef.current !== null) {
      window.clearTimeout(bannerTimeoutRef.current);
    }
    bannerTimeoutRef.current = window.setTimeout(() => {
      setSpellBanner(null);
    }, 1150);
  };

  const pushCallout = (side: 'player' | 'opponent', label: string, color: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setCallouts((prev) => [...prev.slice(-4), { id, side, label, color }]);
    window.setTimeout(() => {
      setCallouts((prev) => prev.filter((c) => c.id !== id));
    }, 1200);
  };

  const resetDuel = (targetChampion: ChampionId, targetOpponent: OpponentId) => {
    if (enemyTurnTimeoutRef.current !== null) {
      window.clearTimeout(enemyTurnTimeoutRef.current);
      enemyTurnTimeoutRef.current = null;
    }
    const nextChamp = CHAMPION_ROSTER[targetChampion];
    const nextOpp = OPPONENT_CONFIG[targetOpponent];
    const nextPlayerName =
      targetChampion === 'custom' ? profile?.name || 'Young Wizard' : nextChamp.shortName;

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
    setFightCommand(null);
    setPlayerBubble({
      id: `p-intro-${Date.now()}`,
      speakerName: nextPlayerName,
      text: 'Wand at the ready!',
    });
    setOpponentBubble({
      id: `o-intro-${Date.now()}`,
      speakerName: nextOpp.shortName,
      text: nextOpp.intro,
    });
  };

  const fetchOpponentReaction = async (
    rawSpellText: string,
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
          isKnownSpell: true,
          turnEffectSummary,
        }),
      });
      if (!response.ok) return null;
      return (await response.json()) as { reaction: string };
    } catch {
      return null;
    }
  };

  const castSpellMove = async (spellId: string) => {
    const matched = SPELL_BOOK.find((s) => s.id === spellId);
    if (!matched || duelStatus !== 'ACTIVE' || isResolvingTurn) return;

    const remainingCd = cooldowns[matched.id] || 0;
    if (remainingCd > 0 || playerMana < matched.manaCost) {
      return;
    }

    setIsResolvingTurn(true);

    const nextCooldowns: Record<string, number> = {};
    for (const [key, val] of Object.entries(cooldowns)) {
      if (val > 1) nextCooldowns[key] = val - 1;
    }

    const manaCost = matched.manaCost;
    const manaGain = 10 + champMeta.focusRegenBonus + matched.manaRestore;
    if (matched.cooldownTurns > 0) {
      nextCooldowns[matched.id] = matched.cooldownTurns;
    }

    let dmg = matched.damage > 0 ? Math.round(matched.damage * champMeta.damageMultiplier) : 0;
    if (
      champion === 'harry' &&
      (matched.id === 'expelliarmus' || matched.id === 'expecto-patronum')
    ) {
      dmg = Math.round(dmg * 1.15);
    }

    let nextEmpower = playerEmpowered;
    if (dmg > 0 && playerEmpowered) {
      dmg = Math.round(dmg * 1.35);
      nextEmpower = false;
    }

    const heal = matched.heal;
    let nextShield = Math.max(0, playerShieldTurns - 1);
    let nextCurse = bloodQuillCurseTurns;
    let nextOppStun = opponentStunnedTurns;
    let nextOppDisarm = opponentDisarmedTurns;

    if (matched.shieldTurns > 0) nextShield = matched.shieldTurns;
    if (matched.empowerNext) nextEmpower = true;
    if (matched.purifyDebuff) nextCurse = 0;
    if (matched.stunOpponent) nextOppStun = 1;
    if (matched.disarmOpponent) nextOppDisarm = 1;

    const isSelfSpell =
      matched.effectStyle === 'shield' ||
      matched.effectStyle === 'heal' ||
      matched.effectStyle === 'light';

    const clashTriggered =
      !isSelfSpell &&
      ((opponent === 'voldemort' && (matched.id === 'expelliarmus' || matched.id === 'expecto-patronum')) ||
        (enemyChargingHeavy && (matched.id === 'expelliarmus' || matched.id === 'expecto-patronum')));

    playSpellSound(matched.effectStyle, isMuted);
    showBanner(
      clashTriggered ? `${matched.incantation} · Beam Clash!` : `${matched.incantation}!`,
      matched.colorHex
    );

    issueFightCommand({
      kind: isSelfSpell ? 'selfBuff' : clashTriggered ? 'clash' : 'playerCast',
      color: matched.colorHex,
      secondary: matched.secondaryHex,
      enemyColor: oppMeta.beamColor,
      enemySecondary: oppMeta.beamSecondary,
      style: clashTriggered ? 'clash' : matched.effectStyle,
      damage: dmg,
      spellLabel: matched.incantation,
    });

    if (dmg > 0) pushCallout('opponent', `-${dmg}`, matched.colorHex);
    if (heal > 0) pushCallout('player', `+${heal} HP`, '#4ade80');
    if (matched.shieldTurns > 0) pushCallout('player', 'PROTEGO!', '#fde047');

    setPlayerBubble({
      id: `p-${Date.now()}`,
      speakerName: playerName,
      text: `${matched.incantation}!`,
      tag: dmg > 0 ? `${dmg} DMG` : heal > 0 ? `+${heal} HP` : matched.category,
    });

    const effectSummary = `${matched.incantation} dealt ${dmg} damage${heal > 0 ? `, healed ${heal} HP` : ''}${matched.shieldTurns > 0 ? ', raised Protego' : ''}${matched.disarmOpponent ? ', disarmed foe' : ''}${matched.stunOpponent ? ', stunned foe' : ''}.`;

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
      showBanner('VICTORY!', '#fde047');
      setPlayerBubble({
        id: `p-win-${Date.now()}`,
        speakerName: playerName,
        text: `Victory! ${oppMeta.shortName} is defeated!`,
      });
      setOpponentBubble({
        id: `o-ko-${Date.now()}`,
        speakerName: oppMeta.shortName,
        text: 'No... how could this be?!',
      });
      await onRecordDuelOutcome('win', opponent);
      return;
    }

    // Stream AI character reaction directly into opponent's speech bubble
    void fetchOpponentReaction(matched.incantation, effectSummary, updatedPlayerHp, updatedOppHp).then(
      (res) => {
        if (res?.reaction) {
          setOpponentBubble({
            id: `o-ai-${Date.now()}`,
            speakerName: oppMeta.shortName,
            text: res.reaction,
          });
        }
      }
    );

    const enemyDelay = clashTriggered ? 1300 : 820;
    enemyTurnTimeoutRef.current = window.setTimeout(async () => {
      let enemyDmg = 0;
      let nextCharging = enemyChargingHeavy;
      let curseDamage = 0;

      if (nextCurse > 0) {
        curseDamage = 6;
        nextCurse -= 1;
      }

      if (nextOppStun > 0) {
        setOpponentBubble({
          id: `o-stun-${Date.now()}`,
          speakerName: oppMeta.shortName,
          text: 'Ngh...! Bound by Petrificus Totalus!',
          tag: 'Stunned',
        });
        setOpponentStunnedTurns(0);
      } else {
        playSpellSound('enemyHit', isMuted);

        if (opponent === 'dummy') {
          enemyDmg = oppMeta.baseDamage + (turnNumber % 2) * 3;
          issueFightCommand({
            kind: 'enemyCast',
            color: oppMeta.beamColor,
            secondary: oppMeta.beamSecondary,
            enemyColor: oppMeta.beamColor,
            enemySecondary: oppMeta.beamSecondary,
            style: 'enemy',
          });
          setOpponentBubble({
            id: `o-turn-${Date.now()}`,
            speakerName: oppMeta.shortName,
            text: 'Rebounding practice spark pulse!',
            tag: oppMeta.regularSpellName,
          });
        } else if (enemyChargingHeavy) {
          enemyDmg = oppMeta.heavyDamage;
          nextCharging = false;
          if (opponent === 'umbridge' || opponent === 'voldemort') {
            nextCurse = 2;
          }
          showBanner(oppMeta.chargeSpellName, oppMeta.beamColor);
          issueFightCommand({
            kind: 'enemyCast',
            color: oppMeta.beamColor,
            secondary: oppMeta.beamSecondary,
            enemyColor: oppMeta.beamColor,
            enemySecondary: oppMeta.beamSecondary,
            style: 'enemy',
          });
          setOpponentBubble({
            id: `o-heavy-${Date.now()}`,
            speakerName: oppMeta.shortName,
            text:
              opponent === 'voldemort'
                ? 'Avada Kedavra Surge!'
                : opponent === 'umbridge'
                  ? 'I must not tell lies! Feel my Blood Quill Curse!'
                  : `${oppMeta.chargeSpellName}!`,
            tag: oppMeta.chargeSpellName,
          });
        } else if (turnNumber % 3 === 0) {
          enemyDmg = Math.max(8, oppMeta.baseDamage - 3);
          nextCharging = true;
          issueFightCommand({
            kind: 'enemyCast',
            color: oppMeta.beamColor,
            secondary: '#ffffff',
            enemyColor: oppMeta.beamColor,
            enemySecondary: '#ffffff',
            style: 'enemy',
          });
          setOpponentBubble({
            id: `o-charge-${Date.now()}`,
            speakerName: oppMeta.shortName,
            text:
              opponent === 'voldemort'
                ? 'Prepare yourself... dark magic gathers!'
                : opponent === 'umbridge'
                  ? 'Drafting Educational Decree No. 24!'
                  : `Gathering power for ${oppMeta.chargeSpellName}!`,
            tag: 'Charging',
          });
        } else {
          enemyDmg = oppMeta.baseDamage;
          issueFightCommand({
            kind: 'enemyCast',
            color: oppMeta.beamColor,
            secondary: oppMeta.beamSecondary,
            enemyColor: oppMeta.beamColor,
            enemySecondary: oppMeta.beamSecondary,
            style: 'enemy',
          });
          setOpponentBubble({
            id: `o-cast-${Date.now()}`,
            speakerName: oppMeta.shortName,
            text: `${oppMeta.regularSpellName}!`,
            tag: `${enemyDmg} DMG`,
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
          setPlayerBubble({
            id: `p-block-${Date.now()}`,
            speakerName: playerName,
            text: `Protego held! Blocked ${blocked} damage!`,
          });
        }
      }

      const totalIncoming = enemyDmg + curseDamage;
      if (totalIncoming > 0) {
        pushCallout('player', `-${totalIncoming}`, '#f87171');
      }

      updatedPlayerHp = Math.max(0, updatedPlayerHp - totalIncoming);

      setPlayerHp(updatedPlayerHp);
      setBloodQuillCurseTurns(nextCurse);
      setEnemyChargingHeavy(nextCharging);
      setTurnNumber((t) => t + 1);
      setIsResolvingTurn(false);

      if (updatedPlayerHp <= 0) {
        setDuelStatus('DEFEAT');
        showBanner('DEFEATED', '#ef4444');
        setPlayerBubble({
          id: `p-ko-${Date.now()}`,
          speakerName: playerName,
          text: 'Need a moment to catch my breath...',
        });
        await onRecordDuelOutcome('loss', opponent);
      }
    }, enemyDelay);
  };

  const playerHpPct = Math.max(0, Math.min(100, Math.round((playerHp / playerMaxHp) * 100)));
  const playerManaPct = Math.max(0, Math.min(100, Math.round((playerMana / playerMaxMana) * 100)));
  const oppHpPct = Math.max(0, Math.min(100, Math.round((opponentHp / oppMeta.maxHp) * 100)));

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-5 max-w-6xl mx-auto"
    >
      {/* Top Character Selector & Quick Matchups */}
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

      {/* Full-Width Fighting Game Stage with In-Arena Character Speech Bubbles */}
      <div className="rounded-xl bg-[#18110c] border border-[#3b2b20] p-4 sm:p-5 space-y-4">
        {/* Fighting Game Top Health Bar HUD */}
        <div className="grid grid-cols-11 gap-2 items-center bg-[#100b08] border border-[#3b2b20] rounded-lg p-3">
          {/* Player Left Side Health Bar */}
          <div className="col-span-5 flex items-center gap-3 min-w-0">
            {champMeta.imageUrl && !playerPortraitFailed ? (
              <img
                src={champMeta.imageUrl}
                alt={playerName}
                referrerPolicy="no-referrer"
                onError={() => setPlayerPortraitFailed(true)}
                className="w-12 h-12 rounded-md object-cover border border-[#c99a3b] shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-md bg-[#241811] border border-[#c99a3b] flex items-center justify-center shrink-0">
                <HouseCrestGraphic house={playerHouse} className="w-8 h-9" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2 mb-1">
                <span className="font-display text-xs sm:text-sm font-bold text-[#f6eedc] truncate">
                  {playerName}
                </span>
                <span className="font-mono tabular-nums text-[11px] font-semibold text-[#86efac] shrink-0">
                  {playerHp}/{playerMaxHp} · {playerHpPct > 35 ? 'STEADY' : 'CRITICAL'}
                </span>
              </div>
              <div className="relative h-3.5 rounded-sm bg-[#2a1a16] border border-[#52392b] overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-[#f59e0b]/70 transition-all duration-700 ease-out"
                  style={{ width: `${playerHpPct}%` }}
                />
                <div
                  className="relative h-full bg-gradient-to-r from-[#16a34a] to-[#4ade80] transition-all duration-200"
                  style={{ width: `${playerHpPct}%` }}
                />
              </div>
              <div className="flex items-center justify-between gap-2 mt-1">
                <div className="flex-1 h-1.5 rounded-sm bg-[#241a14] overflow-hidden">
                  <div
                    className="h-full bg-[#e6bd62] transition-all duration-200"
                    style={{ width: `${playerManaPct}%` }}
                  />
                </div>
                <span className="font-mono tabular-nums text-[10px] text-[#e6bd62] shrink-0">
                  {playerMana} Focus
                </span>
              </div>
            </div>
          </div>

          {/* Center VS & Turn Counter */}
          <div className="col-span-1 flex flex-col items-center justify-center text-center">
            <span className="font-display text-sm sm:text-lg font-bold text-[#e6bd62]">VS</span>
            <span className="font-mono tabular-nums text-[10px] text-[#c9b99c]">Turn {turnNumber}</span>
          </div>

          {/* Opponent Right Side Health Bar */}
          <div className="col-span-5 flex items-center gap-3 min-w-0 flex-row-reverse text-right">
            {!oppPortraitFailed ? (
              <img
                src={oppMeta.imageUrl}
                alt={oppMeta.name}
                referrerPolicy="no-referrer"
                onError={() => setOppPortraitFailed(true)}
                className="w-12 h-12 rounded-md object-cover border border-[#8c1d24] shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-md bg-[#2b1514] border border-[#8c1d24] flex items-center justify-center shrink-0">
                <Shield className="w-5 h-5 text-[#e6bd62]" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2 mb-1 flex-row-reverse">
                <span className="font-display text-xs sm:text-sm font-bold text-[#f6eedc] truncate">
                  {oppMeta.shortName}
                </span>
                <span className="font-mono tabular-nums text-[11px] font-semibold text-[#fca5a5] shrink-0">
                  {opponentHp}/{oppMeta.maxHp}
                </span>
              </div>
              <div className="relative h-3.5 rounded-sm bg-[#2a1a16] border border-[#52392b] overflow-hidden">
                <div
                  className="absolute inset-y-0 right-0 bg-[#fde047]/70 transition-all duration-700 ease-out"
                  style={{ width: `${oppHpPct}%` }}
                />
                <div
                  className="relative ml-auto h-full bg-gradient-to-l from-[#991b1b] to-[#ef4444] transition-all duration-200"
                  style={{ width: `${oppHpPct}%` }}
                />
              </div>
              <div className="mt-1 text-[10px] truncate">
                {enemyChargingHeavy ? (
                  <span className="text-[#f472b6] font-semibold">
                    Charging {oppMeta.chargeSpellName}!
                  </span>
                ) : opponentStunnedTurns > 0 ? (
                  <span className="text-[#c4b5fd] font-semibold">Stunned</span>
                ) : opponentDisarmedTurns > 0 ? (
                  <span className="text-[#fbbf24] font-semibold">Disarmed (-50%)</span>
                ) : (
                  <span className="text-[#a9987c]">{oppMeta.title}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Active Buff / Debuff Status Line */}
        {(playerShieldTurns > 0 || playerEmpowered || bloodQuillCurseTurns > 0) && (
          <div className="flex flex-wrap items-center gap-4 px-1 text-xs">
            {playerShieldTurns > 0 && (
              <span className="text-[#fde047] font-semibold">Protego Barrier Active</span>
            )}
            {playerEmpowered && (
              <span className="text-[#fef08a] font-semibold">Lumos +35% Next Spell</span>
            )}
            {bloodQuillCurseTurns > 0 && (
              <span className="text-[#f87171] font-semibold">
                Curse Active ({bloodQuillCurseTurns}t)
              </span>
            )}
          </div>
        )}

        {/* Full-Body Animated Fighting Canvas + Speech Bubbles Near Each Fighter */}
        <div className="relative">
          <DuelFightCanvas
            champion={champion}
            opponent={opponent}
            playerHouse={playerHouse}
            playerShieldActive={playerShieldTurns > 0}
            playerEmpowered={playerEmpowered}
            opponentStunned={opponentStunnedTurns > 0}
            opponentCharging={enemyChargingHeavy}
            duelStatus={duelStatus}
            command={fightCommand}
            reducedMotion={prefersReducedMotion}
          />

          {/* Left Character Speech Bubble */}
          <div className="pointer-events-none absolute top-3 sm:top-5 left-3 sm:left-6 z-20 max-w-[38%] sm:max-w-[260px]">
            <AnimatePresence mode="wait">
              {playerBubble && (
                <motion.div
                  key={playerBubble.id}
                  initial={{ opacity: 0, y: 6, scale: 0.94 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.2 }}
                  className="relative rounded-xl bg-[#f7eedb]/95 border border-[#c99a3b] px-3.5 py-2.5 text-[#23170f] shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
                >
                  <div className="flex items-baseline justify-between gap-2 mb-0.5">
                    <span className="text-[11px] font-bold text-[#8c1d24]">
                      {playerBubble.speakerName}
                    </span>
                    {playerBubble.tag && (
                      <span className="text-[10px] font-mono tabular-nums font-semibold text-[#5e4736]">
                        {playerBubble.tag}
                      </span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm font-medium leading-snug">
                    {playerBubble.text}
                  </p>
                  {/* Speech bubble tail pointing down-left toward player fighter */}
                  <span
                    aria-hidden="true"
                    className="absolute -bottom-2 left-8 w-3.5 h-3.5 bg-[#f7eedb] border-r border-b border-[#c99a3b] rotate-45"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right Opponent Speech Bubble */}
          <div className="pointer-events-none absolute top-3 sm:top-5 right-3 sm:right-6 z-20 max-w-[38%] sm:max-w-[280px]">
            <AnimatePresence mode="wait">
              {opponentBubble && (
                <motion.div
                  key={opponentBubble.id}
                  initial={{ opacity: 0, y: 6, scale: 0.94 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.2 }}
                  className="relative rounded-xl bg-[#1a1210]/95 border border-[#8c1d24] px-3.5 py-2.5 text-[#f6eedc] shadow-[0_8px_24px_rgba(0,0,0,0.6)]"
                >
                  <div className="flex items-baseline justify-between gap-2 mb-0.5">
                    <span className="text-[11px] font-bold text-[#fca5a5]">
                      {opponentBubble.speakerName}
                    </span>
                    {opponentBubble.tag && (
                      <span className="text-[10px] font-mono tabular-nums font-semibold text-[#e6bd62]">
                        {opponentBubble.tag}
                      </span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm leading-snug text-[#f3ead8]">
                    {opponentBubble.text}
                  </p>
                  {/* Speech bubble tail pointing down-right toward opponent fighter */}
                  <span
                    aria-hidden="true"
                    className="absolute -bottom-2 right-8 w-3.5 h-3.5 bg-[#1a1210] border-r border-b border-[#8c1d24] rotate-45"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Spell Incantation Center Banner */}
          <AnimatePresence>
            {spellBanner && (
              <motion.div
                key={spellBanner.id}
                initial={{ opacity: 0, y: -8, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="pointer-events-none absolute top-4 inset-x-0 flex justify-center z-10"
              >
                <span
                  className="font-display text-base sm:text-xl font-bold tracking-wider drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]"
                  style={{ color: spellBanner.color }}
                >
                  {spellBanner.title}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Floating Damage / Heal / Block Popups over Left & Right Fighters */}
          <div className="pointer-events-none absolute inset-x-10 top-28 z-20 flex justify-between">
            <div className="w-1/4 flex flex-col items-center">
              <AnimatePresence>
                {callouts
                  .filter((c) => c.side === 'player')
                  .map((c) => (
                    <motion.span
                      key={c.id}
                      initial={{ opacity: 0, y: 12, scale: 0.85 }}
                      animate={{ opacity: 1, y: -16, scale: 1.15 }}
                      exit={{ opacity: 0, y: -32 }}
                      transition={{ duration: 0.7 }}
                      className="font-display text-xl sm:text-2xl font-bold drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)] whitespace-nowrap"
                      style={{ color: c.color }}
                    >
                      {c.label}
                    </motion.span>
                  ))}
              </AnimatePresence>
            </div>
            <div className="w-1/4 flex flex-col items-center">
              <AnimatePresence>
                {callouts
                  .filter((c) => c.side === 'opponent')
                  .map((c) => (
                    <motion.span
                      key={c.id}
                      initial={{ opacity: 0, y: 12, scale: 0.85 }}
                      animate={{ opacity: 1, y: -16, scale: 1.15 }}
                      exit={{ opacity: 0, y: -32 }}
                      transition={{ duration: 0.7 }}
                      className="font-display text-xl sm:text-2xl font-bold drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)] whitespace-nowrap"
                      style={{ color: c.color }}
                    >
                      {c.label}
                    </motion.span>
                  ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Victory / Defeat Overlay Banner */}
          <AnimatePresence>
            {duelStatus !== 'ACTIVE' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-x-4 bottom-4 z-30 parchment-sheet rounded-xl p-4 border border-[#c99a3b] flex flex-wrap items-center justify-between gap-3"
              >
                <div>
                  <h4 className="font-display text-lg font-bold text-[#23170f]">
                    {duelStatus === 'VICTORY'
                      ? `${oppMeta.name} Defeated!`
                      : 'Duel Interrupted'}
                  </h4>
                  <p className="text-xs text-[#473324]">
                    {duelStatus === 'VICTORY'
                      ? `${playerName} claimed victory! Saved to your Wizard Dossier.`
                      : 'Restore your wand focus and challenge the courtyard again.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => resetDuel(champion, opponent)}
                  className="px-4 py-2 rounded-lg bg-[#8c1d24] text-[#f9f3e6] text-xs font-semibold hover:bg-[#70141a] whitespace-nowrap"
                >
                  Play Again
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Spellbook Combat Moves Bar */}
        <div className="pt-2 border-t border-[#3b2b20] space-y-2.5">
          <div className="flex items-center justify-between text-xs text-[#c9b99c]">
            <span>Cast Spell</span>
            <span className="font-mono tabular-nums">{champMeta.bonusLabel}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
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
                  onClick={() => void castSpellMove(spell.id)}
                  className="px-3 py-2.5 rounded-lg bg-[#120d0a] border border-[#3b2b20] hover:border-[#c99a3b] disabled:opacity-45 text-left transition-transform active:scale-95"
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
      </div>
    </motion.div>
  );
};
