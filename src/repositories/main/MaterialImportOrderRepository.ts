import { getRepository } from "typeorm";

import { MaterialImportOrder } from "../../entities/main/MaterialImportOrder";

export class MaterialImportOrderRepository {
    static search(keyword) {
        return getRepository(MaterialImportOrder)
        .createQueryBuilder("mio")
        .leftJoinAndSelect("mio.orderStatus", "os")
        .leftJoinAndSelect("mio.unitType", "ut")
        .where("mio.code LIKE :keyword", { keyword: `%${keyword}%` })
        .where("ut.name LIKE :keyword", { keyword: `%${keyword}%` })
        .getMany();
    }
}