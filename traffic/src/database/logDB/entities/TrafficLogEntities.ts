import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class TrafficLog extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;
  @Column({ type: "timestamp", precision: 3 })
  timestamp: Date;

  @Column()
  requestId: string;

  @Column()
  apiTime: number;
}
