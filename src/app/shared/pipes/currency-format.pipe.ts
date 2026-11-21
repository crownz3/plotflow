import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'currencyFormat',
  standalone: true
})
export class CurrencyFormatPipe implements PipeTransform {
  transform(value: number | undefined | null, currency: string = 'INR'): string {
    if (value === undefined || value === null) return '—';

    if (currency === 'INR') {
      if (value >= 10000000) {
        const cr = value / 10000000;
        return `₹${cr % 1 === 0 ? cr : cr.toFixed(2)} Cr`;
      }
      if (value >= 100000) {
        const lk = value / 100000;
        return `₹${lk % 1 === 0 ? lk : lk.toFixed(2)} L`;
      }
      return `₹${value.toLocaleString('en-IN')}`;
    }

    return `${currency} ${value.toLocaleString()}`;
  }
}

