import * as migration_20260226_021813 from './20260226_021813';

export const migrations = [
  {
    up: migration_20260226_021813.up,
    down: migration_20260226_021813.down,
    name: '20260226_021813'
  },
];
