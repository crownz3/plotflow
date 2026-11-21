import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'areaFormat',
  standalone: true
})
export class AreaFormatPipe implements PipeTransform {
  transform(area: number | undefined | null, unit: string = 'sqft'): string {
    if (area === undefined || area === null) return '—';

    const unitLabels: Record<string, string> = {
      sqft: 'Sq.ft',
      cent: 'Cent',
      acre: 'Acre',
      ground: 'Ground',
      guntha: 'Guntha'
    };

    const label = unitLabels[unit.toLowerCase()] || unit;
    return `${area.toLocaleString()} ${label}`;
  }
}

