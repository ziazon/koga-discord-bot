import { Transform } from 'class-transformer';
import { Moment } from 'moment';
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

import { NewWorldDay } from '../../types';
import { DateTransformer } from '../date-transformer';

@Entity()
export class NewWorldCircadianRhythm {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('bigint')
  userId: string;

  @Column('bigint')
  @Index({ unique: true })
  serverId: string;

  @Column({ type: 'varchar', length: 8 })
  stage: NewWorldDay;

  @Column({ type: 'time' })
  time: Date;

  @Transform(({ value }) => value?.format() || null)
  @CreateDateColumn({ transformer: new DateTransformer() })
  createdAt: Moment;

  @Transform(({ value }) => value?.format() || null)
  @UpdateDateColumn({ transformer: new DateTransformer() })
  updatedAt: Moment;
}
