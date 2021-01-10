import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { MaterialImportInvoice } from "./MaterialImportInvoice";

@Entity("invoice_status", { schema: "business_manager" })
export class InvoiceStatus {
  @PrimaryGeneratedColumn({ type: "int", name: "id" })
  id: number;

  @Column("varchar", { name: "name", length: 45 })
  name: string;

  @OneToMany(
    () => MaterialImportInvoice,
    (materialImportInvoice) => materialImportInvoice.invoiceStatus
  )
  materialImportInvoices: MaterialImportInvoice[];
}