import { getRepository } from "typeorm";

import { ValidationController } from "./ValidationController";
import { RegistryController } from "./RegistryController";
import { MaterialImportOrder as Entity } from "../../entities/main/MaterialImportOrder";
import { MaterialImportOrderRepository as EntityRepository } from "../../repositories/main/MaterialImportOrderRepository";
import { MaterialImportQuotation } from "../../entities/main/MaterialImportQuotation";
import { UnitType } from "../../entities/main/UnitType";
import { MailController } from "./MailController";

export class MaterialImportOrderController {
    private static entityName: string = "material import order";
    private static entityJSONName: string = "materialImportOrder";

    static async createOne(clientBindingObject) {
        //Validate clientBindingObject
        const serverObject = await RegistryController.getParsedRegistry(`${this.entityJSONName}.json`);
        ValidationController.validateBindingObject(serverObject, clientBindingObject);

        //NOTE: Order code must be equal to the referring quotation code except the letter code
        serverObject.code = serverObject.quotationCode.replace("MIQ", "MIO");

        //Change the unit type to the default
        const unitType = await getRepository(UnitType).findOne(serverObject.unitTypeId);
        serverObject.requestedAmount = parseFloat(serverObject.requestedAmount) * parseFloat(unitType.convertToDefaultFactor);
        serverObject.unitTypeId = unitType.defaultUnitId;

        return getRepository(Entity).save(serverObject as Entity).then(async item => {
            //Update the relevant quotation request to "Accepted" state
            const materialImportQuotation = await getRepository(MaterialImportQuotation).findOne({
                where: {
                    code: item.quotationCode
                },
                relations: ["requestCode2", "requestCode2.supplier", "requestCode2.material"]
            });

            materialImportQuotation.quotationStatusId = 4;

            MailController.sendMaterialImportOrder(materialImportQuotation.requestCode2.supplier.email, item, materialImportQuotation.requestCode2.supplier, materialImportQuotation.requestCode2.material).catch((error) => {
                console.log(error);
            });
            
            return getRepository(MaterialImportQuotation).save(materialImportQuotation);
        }).catch((error) => {
            throw { title: error.name, titleDescription: "Ensure you aren't violating any constraints", message: error.sqlMessage, technicalMessage: error.sql }
        });
    }

    static async getOne(id: number) {
        const item = await getRepository(Entity).findOne({
            where: {
                id: id
            },
            relations: ["orderStatus", "quotationCode2"]
        });

        if (item) {
            return item;
        } else {
            throw { title: "Oops!", titleDescription: "Please recheck your arguments", message: `We couldn't find a ${this.entityName} that matches your arguments`, technicalMessage: `No ${this.entityName} for given arguments` };
        }
    }

    static async getQuotation(code: string) {
        const item = await getRepository(Entity).findOne({
            where: {
                code: code
            },
            relations: ["quotationCode2"]
        });

        if (item) {
            return item.quotationCode2;
        } else {
            throw { title: "Oops!", titleDescription: "Please recheck your arguments", message: `We couldn't find a ${this.entityName} that matches your arguments`, technicalMessage: `No ${this.entityName} for given arguments` };
        }
    }

    static async getMany(keyword: string, offset: number) {
        const items = await EntityRepository.search(keyword, offset);

        if (items.length > 0) {
            return items;
        } else {
            throw { title: "Couldn't find anything", titleDescription: "Try single words instead of phrases", message: `There are no ${this.entityName}s matching the keyword you provided`, technicalMessage: `No ${this.entityName}s for given keyword` };
        }
    }

    static async getManyByStatus(statusId: number) {
        const items = await getRepository(Entity).find({
            where: {
                orderStatusId: statusId
            },
            relations: ["orderStatus"]
        });

        if (items.length > 0) {
            return items;
        } else {
            throw { title: `No ${this.entityName}`, titleDescription: "Try another status", message: `There are no ${this.entityName}s for the status you specified`, technicalMessage: `No ${this.entityName}s with given status` };
        }
    }

    static async updateOne(clientBindingObject) {
        const originalObject = await getRepository(Entity).findOne({
            id: clientBindingObject.id.value
        });

        if (originalObject) {
            const serverObject = await RegistryController.getParsedRegistry(`${this.entityJSONName}.json`);
            ValidationController.validateBindingObject(serverObject, clientBindingObject);
            ValidationController.updateOriginalObject(originalObject, serverObject);

            //Change the unit type to the default
            const unitType = await getRepository(UnitType).findOne(originalObject.unitTypeId);
            originalObject.requestedAmount = (parseFloat(originalObject.requestedAmount) * parseFloat(unitType.convertToDefaultFactor)).toString();
            originalObject.unitTypeId = unitType.defaultUnitId;

            return getRepository(Entity).save(originalObject).catch((error) => {
                throw { title: error.name, titleDescription: "Ensure you aren't violating any constraints", message: error.sqlMessage, technicalMessage: error.sql }
            });
        } else {
            throw { title: "Oops!", titleDescription: "Please recheck your arguments", message: `We couldn't find a ${this.entityName} that matches your arguments`, technicalMessage: `No ${this.entityName} for given arguments` };
        }
    }

    static async deleteOne(id: number) {
        return getRepository(Entity).delete(id).catch((error) => {
            //WARNING: This error is thrown based on a possible error and not on the actual error
            throw { title: "First things first", titleDescription: "Remove any dependant records", message: `There are dependant records for this ${this.entityName}. Please remove those before removing this ${this.entityName}`, technicalMessage: error.sqlMessage }
        });
    }
}