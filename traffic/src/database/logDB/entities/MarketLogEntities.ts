import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from "typeorm";

export enum ApiMethod {
  GET = "GET",
  POST = "POST",
  DELETE = "DELETE",
}
@Entity()
export class MarketLog extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "timestamp", precision: 3 })
  timestamp: Date;

  @Column({
    type: "enum",
    enum: ApiMethod,
  })
  apiMethod: ApiMethod;

  @Column()
  applicationTime: number;

  @Column()
  databaseTime: number;

  @Column()
  endpointUrl: string;

  @Column()
  requestId: string;
}
