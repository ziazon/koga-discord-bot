import { Transform } from 'class-transformer';
import { Moment } from 'moment';
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

import { DateTransformer } from '../date-transformer';

@Entity()
@Index(['userId', 'serverId'], { unique: true })
export class Admin {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('bigint')
  userId: string;

  @Column('bigint')
  serverId: string;

  @Transform(({ value }) => value?.format() || null)
  @CreateDateColumn({ transformer: new DateTransformer() })
  createdAt: Moment;
}
