import { bootstrap } from '@vendure/core';
import { config } from '../src/vendure-config';

bootstrap(config)
  .then(async (app) => {
    // Perform any necessary seeding operations here
    // For example, you can use the Vendure API to create initial data

    console.log('Database seeding completed successfully');
    await app.close();
  })
  .catch((err) => {
    console.error('Error occurred during database seeding:', err);
    process.exit(1);
  });