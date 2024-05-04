import { bootstrapWorker } from '@vendure/core';
import { getConfig } from './vendure-config';

(async () => {
    const vendureConfig = await getConfig();
    bootstrapWorker(vendureConfig)
    .then(worker => worker.startJobQueue())
    .catch(err => {
        console.log(err);
    });
})();