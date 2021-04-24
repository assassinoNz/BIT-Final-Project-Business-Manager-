import { getRepository } from "typeorm";

import { MaterialImportOrder } from "../../entities/main/MaterialImportOrder";

export class MaterialImportOrderRepository {
    static search(keyword, offset) {
        return getRepository(MaterialImportOrder)
        .createQueryBuilder("mio")
        .leftJoinAndSelect("mio.orderStatus", "os")
        .orderBy("mio.code", "DESC")
        .leftJoinAndSelect("mio.quotationCode2", "q")
        .leftJoinAndSelect("mio.unitType", "ut")
        .where("mio.code LIKE :keyword", { keyword: `%${keyword}%` })
        .where("ut.name LIKE :keyword", { keyword: `%${keyword}%` })
        .limit(10)
        .offset(offset)
        .getMany();
    }
}