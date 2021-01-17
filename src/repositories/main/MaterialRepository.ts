import { getRepository } from "typeorm";

import { Material } from "../../entities/main/Material";

export class MaterialRepository {
    static search(keyword) {
        return getRepository(Material)
            .createQueryBuilder("m")
            .leftJoinAndSelect("m.materialStatus", "ms")
            .leftJoinAndSelect("m.unitType", "ut")
            .where("m.code LIKE :keyword", { keyword: `%${keyword}%` })
            .orWhere("m.name LIKE :keyword", { keyword: `%${keyword}%` })
            .orWhere("ms.name LIKE :keyword", { keyword: `%${keyword}%` })
            .orWhere("ut.name LIKE :keyword", { keyword: `%${keyword}%` })
            .getMany();
    }

    static generateNextCode() {
        return getRepository(Material)
            .createQueryBuilder("m")
            .select("CONCAT('MAT', LPAD(SUBSTRING(MAX(m.code),4)+1, 7, '0'))", "value")
            .getRawOne();
    }

    static updateTable() {
        return getRepository(Material).query(`
            UPDATE material m
            LEFT JOIN
                (SELECT mb.material_id, SUM(mb.imported_amount) viable_amount
                FROM material_batch mb
                WHERE mb.batch_status_id = 1
                GROUP BY mb.material_id) viable
            ON m.id = viable.material_id
            SET m.material_status_id =
            CASE
                WHEN m.reorder_amount < viable.viable_amount THEN 1
                ELSE 2
            END
        `);
    }
}