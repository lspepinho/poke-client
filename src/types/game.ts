export type PokemonTypeId =
  | 'normal'
  | 'fire'
  | 'water'
  | 'grass'
  | 'electric'
  | 'ice'
  | 'fighting'
  | 'poison'
  | 'ground'
  | 'flying'
  | 'psychic'
  | 'bug'
  | 'rock'
  | 'ghost'
  | 'dragon'
  | 'steel'
  | 'dark'
  | 'fairy';

export interface PokemonTypeInfo {
  id: PokemonTypeId;
  namePt: string;
  nameEn: string;
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  gradient: string;
  emoji: string;
  description: string;
}

export interface CompactPokemon {
  id: number;
  name: string;
  types: PokemonTypeId[];
}

export interface DetailedPokemon {
  id: number;
  name: string;
  types: PokemonTypeId[];
  sprite: string;
  artwork: string;
  height?: number;
  weight?: number;
  cryUrl?: string;
}

export interface RoundRecord {
  round: number;
  playerId?: string | number;
  playerName?: string;
  typeId: PokemonTypeId | PokemonTypeId[];
  pokemon: CompactPokemon;
  pokemonName?: string;
  pokemonId?: number;
  reactionTimeMs: number;
  timestamp: number;
}

export interface PlayerState {
  id: string | number;
  name: string;
  score: number;
  color: string;
  isHost?: boolean;
  records: RoundRecord[];
}

export interface RoundGuess {
  playerId: string;
  playerName: string;
  pokemon: CompactPokemon;
  isValid: boolean;
  reactionTimeMs: number;
  timestamp: number;
}

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface OnlineRoom {
  code: string;
  status: 'lobby' | 'selecting_type' | 'shuffling' | 'playing' | 'round_won' | 'game_won';
  activePlayerIndex: number;
  selectorPlayerId?: string | null;
  selectorPlayerIds?: string[];
  numTypeSelectors?: number;
  submittedSelectorIds?: string[];
  playerSelectsType?: boolean;
  currentType: PokemonTypeId | PokemonTypeId[] | null;
  roundStartTime: number;
  roundNumber: number;
  difficulty: Difficulty;
  usedPokemonIds: number[];
  winnerId: string | null;
  lastScoredPlayerId: string | null;
  lastRoundWinnerId?: string | null;
  currentGuesses?: Record<string, RoundGuess>;
  lastRoundGuesses?: Record<string, RoundGuess> | null;
  players: PlayerState[];
}

export type GameMode = 'solo' | 'online';

export type GameStatus =
  | 'idle'
  | 'lobby'
  | 'selecting_type'
  | 'shuffling'
  | 'playing'
  | 'round_won'
  | 'game_won';

export const DIFFICULTY_SETTINGS: Record<
  Difficulty,
  {
    namePt: string;
    roundTimeSeconds: number;
    shuffleDelaySeconds: number;
    maxPokemonDex: number;
    description: string;
    poolDescription: string;
  }
> = {
  easy: {
    namePt: 'Fácil',
    roundTimeSeconds: 20,
    shuffleDelaySeconds: 5,
    maxPokemonDex: 1025,
    description: '20s por rodada • Roleta de 5s • Todos os 1025 Pokémon liberados',
    poolDescription: 'Sem restrições (Gerações 1 a 9)',
  },
  medium: {
    namePt: 'Médio',
    roundTimeSeconds: 15,
    shuffleDelaySeconds: 3,
    maxPokemonDex: 493,
    description: '15s por rodada • Roleta de 3s • Apenas Gerações 1 a 4',
    poolDescription: 'Gerações 1 a 4 (até Sinnoh - 493 Pokémon)',
  },
  hard: {
    namePt: 'Difícil',
    roundTimeSeconds: 10,
    shuffleDelaySeconds: 1,
    maxPokemonDex: 151,
    description: '10s por rodada • Roleta rápida de 1s • Apenas os 151 originais de Kanto',
    poolDescription: 'Apenas Kanto Gen 1 (os 151 originais)',
  },
};
