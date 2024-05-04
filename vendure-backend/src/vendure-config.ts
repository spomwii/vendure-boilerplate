import {
    dummyPaymentHandler,
    DefaultJobQueuePlugin,
    DefaultSearchPlugin,
    VendureConfig,
} from '@vendure/core';
import { defaultEmailHandlers, EmailPlugin } from '@vendure/email-plugin';
import { AssetServerPlugin } from '@vendure/asset-server-plugin';
import { AdminUiPlugin } from '@vendure/admin-ui-plugin';
import { DataSource } from 'typeorm';
import 'dotenv/config';
import path from 'path';

const IS_DEV = process.env.APP_ENV === 'dev';


const dbSeeded = async (): Promise<boolean> => {
    console.log('Checking if database has been seeded...');
    try {
      const dataSource = new DataSource({
        type: 'postgres',
        database: process.env.DB_NAME,
        schema: process.env.DB_SCHEMA,
        host: process.env.DB_HOST,
        port: +process.env.DB_PORT,
        username: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        entities: [], // Add your entity paths here if needed
      });
  
      await dataSource.initialize();
  
      const queryRunner = dataSource.createQueryRunner();
  
      // Check if a specific table exists that is created during seeding
      const tableExists = await queryRunner.hasTable('migrations');
  
      // Alternatively, you can check for the presence of a specific record
      // const recordExists = await queryRunner.manager.findOne(YourEntity, { /* condition */ });
  
      await queryRunner.release();
      await dataSource.destroy();
  
      console.log('Database seeded:', tableExists);
  
      return tableExists;
    } catch (error) {
      console.error('Error checking if database has been seeded:', error);
      return false;
    }
};
  
interface DbConnectionOptions {
    type: "oracle" | "postgres";
    synchronize: boolean;
    migrations: string[];
    logging: boolean;
    database: string | undefined;
    schema: string | undefined;
    host: string | undefined;
    port: number | undefined;
    username: string | undefined;
    password: string | undefined;
}

const getDbConnectionOptions = async (): Promise<DbConnectionOptions> => {
    const dbAlreadySeeded = await dbSeeded();
    console.log(dbAlreadySeeded, 'dbAlreadySeeded');
    const config: DbConnectionOptions = {
        type: 'postgres',
        synchronize: !dbAlreadySeeded,
        migrations: [path.join(__dirname, './migrations/*.+(js|ts)')],
        logging: false,
        database: process.env.DB_NAME,
        schema: process.env.DB_SCHEMA,
        host: process.env.DB_HOST,
        port: +process.env.DB_PORT,
        username: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
    };
    console.log('DB Connection config', config);
    return config;
};

export const getConfig = async (): Promise<VendureConfig> => ({
    apiOptions: {
        // hostname: process.env.PUBLIC_DOMAIN,
        port: +(process.env.PORT || 3000),
        adminApiPath: 'admin-api',
        shopApiPath: 'shop-api',
        // The following options are useful in development mode,
        // but are best turned off for production for security
        // reasons.
        ...(IS_DEV ? {
            adminApiPlayground: {
                settings: { 'request.credentials': 'include' },
            },
            adminApiDebug: true,
            shopApiPlayground: {
                settings: { 'request.credentials': 'include' },
            },
            shopApiDebug: true,
        } : {}),
    },
    authOptions: {
        tokenMethod: ['bearer', 'cookie'],
        superadminCredentials: {
            identifier: process.env.SUPERADMIN_USERNAME,
            password: process.env.SUPERADMIN_PASSWORD,
        },
        cookieOptions: {
          secret: process.env.COOKIE_SECRET,
        },
    },
    dbConnectionOptions: await getDbConnectionOptions(),
    paymentOptions: {
        paymentMethodHandlers: [dummyPaymentHandler],
    },
    // When adding or altering custom field definitions, the database will
    // need to be updated. See the "Migrations" section in README.md.
    customFields: {},
    plugins: [
        AssetServerPlugin.init({
            route: 'assets',
            assetUploadDir: process.env.ASSET_VOLUME_PATH || path.join(__dirname, '../static/assets'),
            // For local dev, the correct value for assetUrlPrefix should
            // be guessed correctly, but for production it will usually need
            // to be set manually to match your production url.
            assetUrlPrefix: IS_DEV ? undefined : `https://${process.env.PUBLIC_DOMAIN}/assets/`,
        }),
        DefaultJobQueuePlugin.init({ useDatabaseForBuffer: true }),
        DefaultSearchPlugin.init({ bufferUpdates: false, indexStockStatus: true }),
        EmailPlugin.init({
            devMode: true,
            outputPath: path.join(__dirname, '../static/email/test-emails'),
            route: 'mailbox',
            handlers: defaultEmailHandlers,
            templatePath: path.join(__dirname, '../static/email/templates'),
            globalTemplateVars: {
                // The following variables will change depending on your storefront implementation.
                // Here we are assuming a storefront running at http://localhost:8080.
                fromAddress: '"example" <noreply@example.com>',
                verifyEmailAddressUrl: `${process.env.STOREFRON_URL}/verify`,
                passwordResetUrl: `${process.env.STOREFRON_URL}/password-reset`,
                changeEmailAddressUrl: `${process.env.STOREFRON_URL}/verify-email-address-change`
            },
        }),
        AdminUiPlugin.init({
            route: 'admin',
            port: 3002,
            adminUiConfig: {
                apiHost: IS_DEV ? `http://${process.env.PUBLIC_DOMAIN}` : `https://${process.env.PUBLIC_DOMAIN}`, 
                // apiPort: +(process.env.PORT || 3000),
            },
        }),
    ],
});
