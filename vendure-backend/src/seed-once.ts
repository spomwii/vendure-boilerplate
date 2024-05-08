import path from 'path';
import { bootstrap } from '@vendure/core';
import { config } from './vendure-config';
import { dbSeeded, DbConnectionOptions } from './db-setup';
import { populate } from '@vendure/core/cli';

(async () => {
  const dbAlreadySeeded = await dbSeeded(config.dbConnectionOptions as DbConnectionOptions);
  if (dbAlreadySeeded) {
    console.log('Database already seeded, skipping...');
    process.exit(0);
  }
  const updatedConfig = {
    ...config,
    dbConnectionOptions: {
      ...config.dbConnectionOptions,
      synchronize: !dbAlreadySeeded,
    },
  };
  
  try {
    const initialDataPath = path.join(require.resolve('@vendure/create'), '../assets/initial-data.json');
    const app = await populate(() => bootstrap(updatedConfig), require(initialDataPath));
    await app.close();
  } catch (err) {
    console.log(err);
    process.exit(1);
  }
})();