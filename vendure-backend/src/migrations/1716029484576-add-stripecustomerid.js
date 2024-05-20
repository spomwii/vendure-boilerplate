"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddStripecustomerid1716029484576 = void 0;
class AddStripecustomerid1716029484576 {
    async up(queryRunner) {
        await queryRunner.query(`ALTER TABLE "customer" ADD "customFieldsStripecustomerid" character varying(255)`, undefined);
    }
    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "customer" DROP COLUMN "customFieldsStripecustomerid"`, undefined);
    }
}
exports.AddStripecustomerid1716029484576 = AddStripecustomerid1716029484576;
