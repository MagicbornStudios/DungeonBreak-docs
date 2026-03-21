import * as migration_20260226_021813 from './20260226_021813';
import * as migration_20260319_024855 from './20260319_024855';
import * as migration_20260319_034610 from './20260319_034610';
import * as migration_20260319_050606 from './20260319_050606';

export const migrations = [
  {
    up: migration_20260226_021813.up,
    down: migration_20260226_021813.down,
    name: '20260226_021813',
  },
  {
    up: migration_20260319_024855.up,
    down: migration_20260319_024855.down,
    name: '20260319_024855',
  },
  {
    up: migration_20260319_034610.up,
    down: migration_20260319_034610.down,
    name: '20260319_034610',
  },
  {
    up: migration_20260319_050606.up,
    down: migration_20260319_050606.down,
    name: '20260319_050606'
  },
];
