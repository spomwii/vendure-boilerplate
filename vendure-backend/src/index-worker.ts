import path from 'path';
import { bootstrap, bootstrapWorker } from '@vendure/core';
import { config } from './vendure-config';
import { dbSeeded, DbConnectionOptions } from './db-setup';
import { populate } from '@vendure/core/cli';

const initialDataPath = path.join(require.resolve('@vendure/create'), '../assets/initial-data.json');

(async () => {
  const dbAlreadySeeded = await dbSeeded(config.dbConnectionOptions as DbConnectionOptions);
  const updatedConfig = {
    ...config,
    dbConnectionOptions: {
      ...config.dbConnectionOptions,
      synchronize: !dbAlreadySeeded,
    },
  };

  try {
    // console.log('before populate');
    // const app = await populate(() => bootstrap(config), require(initialDataPath));
    // await app.close();
    // console.log('after populate');

    console.log('index-worker.ts', updatedConfig.dbConnectionOptions);
    const worker = await bootstrapWorker(updatedConfig);
    worker.startJobQueue();
  } catch (err) {
    console.log(err);
    process.exit(1);
  }
})();