import * as moment from 'moment';
import { ValueTransformer } from 'typeorm';

export class DateTransformer implements ValueTransformer {
  to(value: moment.Moment): Date {
    if (value instanceof moment) return value.toDate();
    if (typeof value === 'string') return new Date(value);
  }

  from(value: Date): moment.Moment {
    if (value instanceof Date) return moment(value);
  }
}
