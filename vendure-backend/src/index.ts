import { bootstrap, runMigrations } from '@vendure/core';
import { getConfig } from './vendure-config';

(async () => {
    const vendureConfig = await getConfig();
    runMigrations(vendureConfig)
    .then(() => bootstrap(vendureConfig))
    .catch(err => {
        console.log(err);
    });
})();