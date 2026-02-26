import * as migration_0000_baseline from './0000_baseline';
import * as migration_0001_env_variables_environment_to_checkboxes from './0001_env_variables_environment_to_checkboxes';
import * as migration_20260225_220257_game_data_ai from './20260225_220257_game_data_ai';

export const migrations = [
  {
    up: migration_0000_baseline.up,
    down: migration_0000_baseline.down,
    name: '0000_baseline',
  },
  {
    up: migration_0001_env_variables_environment_to_checkboxes.up,
    down: migration_0001_env_variables_environment_to_checkboxes.down,
    name: '0001_env_variables_environment_to_checkboxes',
  },
  {
    up: migration_20260225_220257_game_data_ai.up,
    down: migration_20260225_220257_game_data_ai.down,
    name: '20260225_220257_game_data_ai'
  },
];
