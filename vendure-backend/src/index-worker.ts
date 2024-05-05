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

    populate(
        () => bootstrap(updatedConfig),
        require(initialDataPath)
            .then((app: any) => app.close())
            .then(
                () => process.exit(0),
                (err: any) => {
                    console.log('Populating db failed...', err);
                    process.exit(1);
                },
            )
    );

    console.log('index-worker.ts', updatedConfig.dbConnectionOptions);
    bootstrapWorker(updatedConfig)
    .then(worker => {
        worker.startJobQueue();
    })
    .catch(err => {
        console.log(err);
    });
})();