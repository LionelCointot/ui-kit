import { Pipe, PipeTransform, inject } from '@angular/core';
import { LcFormatService } from './format.service';

@Pipe({ name: 'lcMoney' })
export class LcMoneyPipe implements PipeTransform {
  private readonly format = inject(LcFormatService);

  transform(value: number | null | undefined, compact = false): string {
    return this.format.money(value, { compact });
  }
}

@Pipe({ name: 'lcPercent' })
export class LcPercentPipe implements PipeTransform {
  private readonly format = inject(LcFormatService);

  transform(value: number | null | undefined, decimals = 2): string {
    return this.format.percent(value, decimals);
  }
}

@Pipe({ name: 'lcNumber' })
export class LcNumberPipe implements PipeTransform {
  private readonly format = inject(LcFormatService);

  transform(value: number | null | undefined, decimals?: number): string {
    return this.format.number(value, decimals);
  }
}

@Pipe({ name: 'lcDate' })
export class LcDatePipe implements PipeTransform {
  private readonly format = inject(LcFormatService);

  transform(value: string | Date | null | undefined, style: 'short' | 'long' | 'month' = 'short'): string {
    return this.format.date(value, style);
  }
}

@Pipe({ name: 'lcMonths' })
export class LcMonthsPipe implements PipeTransform {
  private readonly format = inject(LcFormatService);

  transform(value: number | null | undefined): string {
    return this.format.months(value);
  }
}
