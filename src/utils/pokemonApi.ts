import rawData from '../data/pokemonData.json';
import { CompactPokemon, DetailedPokemon, PokemonTypeId } from '../types/game';

interface RawDataShape {
  allPokemon: Array<{
    id: number;
    name: string;
    types: string[];
  }>;
  typeMap: Record<string, number[]>;
}

const data = rawData as unknown as RawDataShape;

export const ALL_POKEMON: CompactPokemon[] = data.allPokemon.map((p) => ({
  id: p.id,
  name: p.name,
  types: p.types as PokemonTypeId[],
}));

export const TYPE_MAP: Record<PokemonTypeId, number[]> = data.typeMap as Record<PokemonTypeId, number[]>;

const POKEMON_BY_ID = new Map<number, CompactPokemon>();
const POKEMON_BY_NAME = new Map<string, CompactPokemon>();

ALL_POKEMON.forEach((p) => {
  POKEMON_BY_ID.set(p.id, p);
  POKEMON_BY_NAME.set(p.name.toLowerCase(), p);
});

/**
 * Normalizes text for search (removes accents, spaces, special chars)
 */
export function normalizeSearchTerm(term: string): string {
  return term
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Get sprite URLs for a Pokemon ID
 */
export function getPokemonSprite(id: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
}

export function getPokemonOfficialArtwork(id: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
}

/**
 * Format Dex number as #0001, #0025, #1025
 */
export function formatDexNumber(id: number): string {
  return `#${String(id).padStart(4, '0')}`;
}

/**
 * Clean and format display name for a Pokemon
 */
export function formatPokemonName(name: string): string {
  if (!name) return '';
  const specialNames: Record<string, string> = {
    'nidoran-f': 'Nidoran ♀',
    'nidoran-m': 'Nidoran ♂',
    'mr-mime': 'Mr. Mime',
    'mime-jr': 'Mime Jr.',
    'ho-oh': 'Ho-Oh',
    'porygon-z': 'Porygon-Z',
    'type-null': 'Type: Null',
    'jangmo-o': 'Jangmo-o',
    'hakamo-o': 'Hakamo-o',
    'kommo-o': 'Kommo-o',
    'tapu-koko': 'Tapu Koko',
    'tapu-lele': 'Tapu Lele',
    'tapu-bulu': 'Tapu Bulu',
    'tapu-fini': 'Tapu Fini',
    'great-tusk': 'Great Tusk',
    'scream-tail': 'Scream Tail',
    'brute-bonnet': 'Brute Bonnet',
    'flutter-mane': 'Flutter Mane',
    'slither-wing': 'Slither Wing',
    'sandy-shocks': 'Sandy Shocks',
    'iron-treads': 'Iron Treads',
    'iron-bundle': 'Iron Bundle',
    'iron-hands': 'Iron Hands',
    'iron-jugulis': 'Iron Jugulis',
    'iron-moth': 'Iron Moth',
    'iron-thorns': 'Iron Thorns',
    'roaring-moon': 'Roaring Moon',
    'iron-valiant': 'Iron Valiant',
    'walking-wake': 'Walking Wake',
    'iron-leaves': 'Iron Leaves',
    'gouging-fire': 'Gouging Fire',
    'raging-bolt': 'Raging Bolt',
    'iron-boulder': 'Iron Boulder',
    'iron-crown': 'Iron Crown',
    'wo-chien': 'Wo-Chien',
    'chien-pao': 'Chien-Pao',
    'ting-lu': 'Ting-Lu',
    'chi-yu': 'Chi-Yu',
    'farfetchd': "Farfetch'd",
    'sirfetchd': "Sirfetch'd",
  };

  const lower = name.toLowerCase();
  if (specialNames[lower]) return specialNames[lower];

  // Capitalize words separated by hyphens
  return name
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Real-time fast search over all Pokemon with optional difficulty maxDexId filter
 */
export function searchPokemon(
  query: string,
  limit: number = 24,
  maxDexId: number = 1025
): CompactPokemon[] {
  const rawClean = query.trim();
  if (!rawClean) return [];

  const clean = normalizeSearchTerm(rawClean);

  const pool = maxDexId < 1025 ? ALL_POKEMON.filter((p) => p.id <= maxDexId) : ALL_POKEMON;

  // If query is an ID number like "25" or "#25"
  const numericId = parseInt(clean, 10);
  if (!isNaN(numericId) && numericId > 0 && numericId <= maxDexId) {
    const directMatch = POKEMON_BY_ID.get(numericId);
    if (directMatch && directMatch.id <= maxDexId) {
      const rest = pool
        .filter((p) => p.id !== numericId && String(p.id).startsWith(clean))
        .slice(0, limit - 1);
      return [directMatch, ...rest];
    }
  }

  // Exact name match first
  const exact = pool.find((p) => normalizeSearchTerm(p.name) === clean);

  // Prefix matches (e.g. "pika" -> Pikachu)
  const prefixMatches = pool.filter(
    (p) => normalizeSearchTerm(p.name).startsWith(clean) && (!exact || p.id !== exact.id)
  );

  // Substring matches
  const substringMatches = pool.filter(
    (p) =>
      normalizeSearchTerm(p.name).includes(clean) &&
      !normalizeSearchTerm(p.name).startsWith(clean) &&
      (!exact || p.id !== exact.id)
  );

  const results: CompactPokemon[] = [];
  if (exact) results.push(exact);
  results.push(...prefixMatches);
  results.push(...substringMatches);

  return results.slice(0, limit);
}

/**
 * Check if a Pokemon has the target type (single or dual combination)
 */
export function hasType(
  pokemon: CompactPokemon,
  targetType: PokemonTypeId | PokemonTypeId[] | null
): boolean {
  if (!targetType) return false;
  if (Array.isArray(targetType)) {
    return targetType.every((t) => pokemon.types.includes(t));
  }
  return pokemon.types.includes(targetType);
}

/**
 * Returns the set of PokemonTypeIds that have at least one existing Pokemon
 * combined with selectedType within the maxDexId pool.
 */
export function getValidCombiningTypes(
  selectedType: PokemonTypeId,
  maxDexId: number = 1025
): Set<PokemonTypeId> {
  const validCombining = new Set<PokemonTypeId>();
  for (let i = 0; i < ALL_POKEMON.length; i++) {
    const p = ALL_POKEMON[i];
    if (p.id > maxDexId) continue;
    if (p.types.includes(selectedType) && p.types.length >= 2) {
      for (const t of p.types) {
        if (t !== selectedType) {
          validCombining.add(t);
        }
      }
    }
  }
  return validCombining;
}

/**
 * Fetch detailed live data from PokeAPI
 */
export async function fetchLivePokemon(nameOrId: string | number): Promise<DetailedPokemon | null> {
  try {
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${nameOrId}`);
    if (!res.ok) return null;
    const data = await res.json();

    const types = data.types.map((t: { type: { name: string } }) => t.type.name as PokemonTypeId);
    const id = data.id;
    const name = data.name;
    const sprite = data.sprites?.front_default || getPokemonSprite(id);
    const artwork =
      data.sprites?.other?.['official-artwork']?.front_default || getPokemonOfficialArtwork(id);
    const cryUrl = data.cries?.latest || data.cries?.legacy;

    return {
      id,
      name,
      types,
      sprite,
      artwork,
      height: data.height,
      weight: data.weight,
      cryUrl,
    };
  } catch (err) {
    console.error('Failed to fetch PokeAPI details:', err);
    return null;
  }
}
