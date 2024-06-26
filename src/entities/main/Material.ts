import {
  Column,
  Entity,
  Index,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { MaterialBatch } from "./MaterialBatch";
import { ProductMaterial } from "./ProductMaterial";
import { MaterialStatus } from "./MaterialStatus";
import { UnitType } from "./UnitType";
import { User } from "./User";
import { MaterialImportRequest } from "./MaterialImportRequest";
import { Supplier } from "./Supplier";

@Index("code_UNIQUE", ["code"], { unique: true })
@Index("fk_material_material_status1_idx", ["materialStatusId"], {})
@Index("fk_material_quantity_type1_idx", ["unitTypeId"], {})
@Index("fk_material_user1_idx", ["userId"], {})
@Entity("material", { schema: "business_manager" })
export class Material {
  @PrimaryGeneratedColumn({ type: "int", name: "id" })
  id: number;

  @Column("char", { name: "code", unique: true, length: 10 })
  code: string;

  @Column("varchar", { name: "name", length: 45 })
  name: string;

  @Column("decimal", { name: "unit_price", precision: 10, scale: 2 })
  unitPrice: string;

  @Column("decimal", { name: "reorder_amount", precision: 10, scale: 2 })
  reorderAmount: string;

  @Column("int", { name: "unit_type_id" })
  unitTypeId: number;

  @Column("int", { name: "material_status_id" })
  materialStatusId: number;

  @Column("text", { name: "description", nullable: true })
  description: string | null;

  @Column("date", { name: "added_date" })
  addedDate: string;

  @Column("int", { name: "user_id" })
  userId: number;

  @Column("decimal", {
    name: "viable_amount",
    nullable: true,
    precision: 10,
    scale: 2,
    default: () => "'0.00'",
  })
  viableAmount: string | null;

  @OneToMany(() => MaterialBatch, (materialBatch) => materialBatch.material)
  materialBatches: MaterialBatch[];

  @OneToMany(
    () => ProductMaterial,
    (productMaterial) => productMaterial.material
  )
  productMaterials: ProductMaterial[];

  @ManyToOne(
    () => MaterialStatus,
    (materialStatus) => materialStatus.materials,
    { onDelete: "NO ACTION", onUpdate: "NO ACTION" }
  )
  @JoinColumn([{ name: "material_status_id", referencedColumnName: "id" }])
  materialStatus: MaterialStatus;

  @ManyToOne(() => UnitType, (unitType) => unitType.materials, {
    onDelete: "NO ACTION",
    onUpdate: "NO ACTION",
  })
  @JoinColumn([{ name: "unit_type_id", referencedColumnName: "id" }])
  unitType: UnitType;

  @ManyToOne(() => User, (user) => user.materials, {
    onDelete: "NO ACTION",
    onUpdate: "NO ACTION",
  })
  @JoinColumn([{ name: "user_id", referencedColumnName: "id" }])
  user: User;

  @OneToMany(
    () => MaterialImportRequest,
    (materialImportRequest) => materialImportRequest.material
  )
  materialImportRequests: MaterialImportRequest[];

  @ManyToMany(() => Supplier, (supplier) => supplier.materials)
  @JoinTable({
    name: "supplier_material",
    joinColumns: [{ name: "material_id", referencedColumnName: "id" }],
    inverseJoinColumns: [{ name: "supplier_id", referencedColumnName: "id" }],
    schema: "business_manager",
  })
  suppliers: Supplier[];
}
