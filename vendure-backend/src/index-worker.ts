import path from 'path';
import { bootstrap, bootstrapWorker, VendureConfig } from '@vendure/core';
import { populate } from '@vendure/core/cli';
import { config } from './vendure-config';
import { dbSeeded, DbConnectionOptions } from './db-setup';

const initialDataPath = path.join(require.resolve('@vendure/create'), '../assets/initial-data.json');

async function populateInitialData(config: VendureConfig): Promise<void> {
    const app = await bootstrap(config);
    await populate(
        () => Promise.resolve(app),
        require(initialDataPath),
    );
    await app.close();
}

(async () => {
    const dbAlreadySeeded = await dbSeeded(config.dbConnectionOptions as DbConnectionOptions);
    const updatedConfig: VendureConfig = {
        ...config,
        dbConnectionOptions: {
            ...config.dbConnectionOptions,
            synchronize: !dbAlreadySeeded,
        },
    };
    console.log('index-worker.ts', updatedConfig.dbConnectionOptions);

    if (!dbAlreadySeeded) {
        console.log('Populating database with initial data...');
        try {
            await populateInitialData(updatedConfig);
            console.log('Database populated with initial data');
        } catch (error) {
            console.error('Error populating database:', error);
        }
    }

    bootstrapWorker(updatedConfig)
        .then(worker => {
            worker.startJobQueue();
        })
        .catch(err => {
            console.log(err);
        });
})();