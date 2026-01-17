/**
 * DistanceAttenuation - Realistic distance-based volume falloff
 *
 * Provides natural sound attenuation based on distance from source,
 * making sounds feel positioned in 3D space.
 */

export interface AttenuationConfig {
  /** Distance at which volume is at 100% (typically 1) */
  refDistance: number;
  /** Distance at which volume reaches minimum */
  maxDistance: number;
  /** How quickly volume falls off (1.0 = natural, 2.0 = faster) */
  rolloffFactor: number;
  /** Attenuation model */
  model: 'linear' | 'inverse' | 'exponential';
}

/** Default configuration for room-scale audio */
export const DEFAULT_ATTENUATION: AttenuationConfig = {
  refDistance: 1,
  maxDistance: 10,
  rolloffFactor: 1.0,
  model: 'inverse',
};

/** Configuration for ambient sounds (slower falloff) */
export const AMBIENT_ATTENUATION: AttenuationConfig = {
  refDistance: 1,
  maxDistance: 15,
  rolloffFactor: 0.5,
  model: 'linear',
};

/** Configuration for item presence sounds */
export const ITEM_ATTENUATION: AttenuationConfig = {
  refDistance: 0,
  maxDistance: 5,
  rolloffFactor: 1.0,
  model: 'inverse',
};

/** Configuration for sonar echoes */
export const SONAR_ATTENUATION: AttenuationConfig = {
  refDistance: 0,
  maxDistance: 8,
  rolloffFactor: 1.2,
  model: 'exponential',
};

/**
 * Calculate gain multiplier based on distance
 *
 * @param distance Distance from listener to source (in room units)
 * @param config Attenuation configuration
 * @returns Gain multiplier (0.0 to 1.0)
 */
export function calculateDistanceGain(
  distance: number,
  config: AttenuationConfig = DEFAULT_ATTENUATION
): number {
  const { refDistance, maxDistance, rolloffFactor, model } = config;

  // At or closer than reference distance: full volume
  if (distance <= refDistance) {
    return 1.0;
  }

  // Beyond max distance: minimum volume
  if (distance >= maxDistance) {
    return 0.0;
  }

  // Normalize distance to 0-1 range
  const normalizedDistance = (distance - refDistance) / (maxDistance - refDistance);

  switch (model) {
    case 'linear':
      // Linear falloff: simple interpolation
      return 1.0 - normalizedDistance * rolloffFactor;

    case 'inverse':
      // Inverse distance: realistic physics-based falloff
      // gain = refDistance / (refDistance + rolloff * (distance - refDistance))
      return refDistance / (refDistance + rolloffFactor * (distance - refDistance));

    case 'exponential':
      // Exponential: faster initial falloff, then gradual
      return Math.pow(1.0 - normalizedDistance, rolloffFactor * 2);

    default:
      return 1.0 - normalizedDistance;
  }
}

/**
 * Calculate distance in room units between two nodes
 * Uses BFS to find shortest path length
 *
 * @param fromNode Starting node ID
 * @param toNode Target node ID
 * @param getConnections Function to get connected nodes
 * @returns Distance in rooms (0 if same room, -1 if unreachable)
 */
export function calculateRoomDistance(
  fromNode: string,
  toNode: string,
  getConnections: (nodeId: string) => string[]
): number {
  if (fromNode === toNode) return 0;

  const visited = new Set<string>();
  const queue: Array<{ node: string; distance: number }> = [
    { node: fromNode, distance: 0 },
  ];

  while (queue.length > 0) {
    const { node, distance } = queue.shift()!;

    if (visited.has(node)) continue;
    visited.add(node);

    const connections = getConnections(node);
    for (const connected of connections) {
      if (connected === toNode) {
        return distance + 1;
      }
      if (!visited.has(connected)) {
        queue.push({ node: connected, distance: distance + 1 });
      }
    }
  }

  return -1; // Unreachable
}

/**
 * Apply distance-based lowpass filter frequency
 * Distant sounds lose high frequencies (air absorption)
 *
 * @param distance Distance in room units
 * @param baseFrequency Starting filter frequency (Hz)
 * @param minFrequency Minimum filter frequency at max distance
 * @param maxDistance Distance at which minimum is reached
 * @returns Filter frequency in Hz
 */
export function calculateDistanceFilter(
  distance: number,
  baseFrequency: number = 20000,
  minFrequency: number = 2000,
  maxDistance: number = 10
): number {
  if (distance <= 0) return baseFrequency;
  if (distance >= maxDistance) return minFrequency;

  // Logarithmic interpolation for more natural filter sweep
  const t = distance / maxDistance;
  const logBase = Math.log(baseFrequency);
  const logMin = Math.log(minFrequency);
  return Math.exp(logBase + (logMin - logBase) * t);
}

/**
 * Combines distance gain with directional attenuation
 * Sounds behind the listener are quieter
 *
 * @param distanceGain Base gain from distance calculation
 * @param isBehind Whether sound source is behind listener
 * @param behindAttenuation How much to reduce sounds from behind (0-1)
 * @returns Final gain multiplier
 */
export function applyDirectionalAttenuation(
  distanceGain: number,
  isBehind: boolean,
  behindAttenuation: number = 0.5
): number {
  if (isBehind) {
    return distanceGain * behindAttenuation;
  }
  return distanceGain;
}
