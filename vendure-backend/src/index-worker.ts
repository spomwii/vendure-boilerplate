import path from 'path';
import { bootstrap, bootstrapWorker, VendureConfig } from '@vendure/core';
import { populate } from '@vendure/core/cli';
import { config } from './vendure-config';
import { dbSeeded, DbConnectionOptions } from './db-setup';
import { INestApplicationContext } from '@nestjs/common/interfaces/nest-application-context.interface';

const initialDataPath = path.join(require.resolve('@vendure/create'), '../assets/initial-data.json');

async function bootstrapServer(config: VendureConfig): Promise<INestApplicationContext> {
    const app = await bootstrap(config);
    return app;
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
            await populate(
                () => bootstrapServer(updatedConfig),
                require(initialDataPath),
            );
            console.log('Database populated with initial data');
        } catch (error) {
            console.error('Error populating database:', error);
        }
    }

    try {
        const worker = await bootstrapWorker(updatedConfig);
        worker.startJobQueue();
    } catch (error) {
        console.error('Error bootstrapping worker:', error);
    }
})();