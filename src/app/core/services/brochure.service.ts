import { Injectable, inject } from '@angular/core';
import { Property } from '../models/models';
import { TenantService } from './tenant.service';
import { AuthService } from './auth.service';
import { PlatformConfigService } from './platform-config.service';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Injectable({
  providedIn: 'root'
})
export class BrochureService {
  private tenantService = inject(TenantService);
  private auth = inject(AuthService);
  private platformConfig = inject(PlatformConfigService);

  /**
   * Generates a branded, privacy-masked property PDF brochure client-side
   * and routes to the universal export handler (Android native share sheet vs Desktop browser download).
   */
  async generateAndShareBrochure(property: Property, options?: { includePrice?: boolean; includeLocation?: boolean }): Promise<void> {
    const tenant = this.tenantService.activeTenant();
    const agent = this.auth.currentUser();

    const showPrice = options?.includePrice !== false;
    const showLocation = options?.includeLocation !== false;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // 1. Header Banner - Google Material Blue
    doc.setFillColor(26, 115, 232); // #1A73E8
    doc.rect(0, 0, 210, 36, 'F');

    // Agency Brand Header
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(tenant.agencyName || `${this.platformConfig.platformName()} Verified Realty`, 14, 15);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    const reraText = tenant.reraNumber ? `RERA: ${tenant.reraNumber}` : 'Government Registered Brokerage';
    const officePhone = tenant.phone ? `Office: ${tenant.phone}` : '';
    doc.text([reraText, officePhone].filter(Boolean).join(' | '), 14, 22);

    const emailText = tenant.email ? `Email: ${tenant.email}` : '';
    const addressText = tenant.address ? `Address: ${tenant.address}` : (tenant.operatingCity ? `Territory: ${tenant.operatingCity}` : '');
    doc.text([emailText, addressText].filter(Boolean).join(' | '), 14, 28);

    // 2. Property Title
    doc.setTextColor(32, 33, 36);
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.text(property.title, 14, 46);

    // Subtitle Locality
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(95, 99, 104);
    const localitySubtitle = showLocation
      ? `${property.location.locality}, ${property.location.city}`
      : `${property.location.locality}, ${property.location.city} (Exact location on scheduled site visit)`;
    doc.text(localitySubtitle, 14, 52);

    // 3. Highlighted Price & Rate Pill Card
    doc.setFillColor(230, 244, 234); // #E6F4EA Material Light Green
    doc.setDrawColor(206, 234, 214); // #CEEAD6
    doc.roundedRect(14, 56, 182, 12, 2, 2, 'FD');

    doc.setTextColor(19, 115, 51); // #137333 Material Green
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');

    const formattedPrice = this.formatCurrencyPdf(property.price);
    if (showPrice) {
      const priceText = `Price: ${formattedPrice} ${property.negotiable ? '(Negotiable)' : ''}`;
      let rateText = '';
      if (property.price && property.area && property.area > 0) {
        const rate = Math.round(property.price / property.area);
        rateText = `Rate: Rs. ${rate.toLocaleString('en-IN')} / ${property.areaUnit || 'sqft'}`;
      }
      doc.text(priceText, 18, 64);
      if (rateText) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.text(`•   ${rateText}`, 115, 64);
      }
    } else {
      doc.text('Price: Available on Request (Confidential)', 18, 64);
    }

    // 4. Specifications Grid (4 Columns)
    const specsData: string[][] = [];

    // Formatted Area with dual units (sq.ft + cents)
    let areaDisplay = `${property.area ? property.area.toLocaleString('en-IN') : '—'} ${(property.areaUnit || 'sqft').toUpperCase()}`;
    if (property.area && property.area > 0) {
      if (property.areaUnit === 'sqft') {
        const cents = (property.area / 435.6).toFixed(2);
        areaDisplay = `${property.area.toLocaleString('en-IN')} Sq.ft (${cents} Cents)`;
      } else if (property.areaUnit === 'cent') {
        const sqft = Math.round(property.area * 435.6).toLocaleString('en-IN');
        areaDisplay = `${property.area} Cents (${sqft} Sq.ft)`;
      }
    }

    // Formatted Dimensions
    let dimDisplay = property.plotDetails?.dimensions || 'Standard Layout';
    if (dimDisplay && !dimDisplay.includes('ft') && !dimDisplay.includes('Corner') && !dimDisplay.includes('Polygon')) {
      dimDisplay = `${dimDisplay} Ft`;
    }

    // Formatted Approval Status (no duplicate "Approved Approved")
    let approvalDisplay = property.plotDetails?.approvalStatus || 'Verified Clean Title';
    if (!approvalDisplay.includes('Approved') && !approvalDisplay.includes('Registered') && !approvalDisplay.includes('Title')) {
      approvalDisplay = `${approvalDisplay} Approved`;
    }

    if (property.propertyType === 'plot') {
      specsData.push(
        ['Property Type', 'RESIDENTIAL PLOT', 'Listing Type', property.listingType.toUpperCase()],
        ['Plot Area', areaDisplay, 'Dimensions', dimDisplay],
        ['Road Width', property.plotDetails?.roadWidthFt ? `${property.plotDetails.roadWidthFt} Ft Wide` : 'Wide Access Road', 'Approval Authority', approvalDisplay],
        ['Corner Plot', property.plotDetails?.isCornerPlot ? 'Yes (2 Sides Open)' : 'Standard Plot', 'Boundary Wall', property.plotDetails?.hasBoundaryWall ? 'Constructed' : 'Fenced'],
        ['Locality', `${property.location.locality}, ${property.location.city}`, '2D/3D Plot Map', property.location.plotBoundary?.length ? `Verified (${property.location.plotBoundary.length}-Corner Mapped)` : 'GPS Pinpoint Active']
      );
    } else if (property.propertyType === 'villa') {
      const structName = property.villaDetails?.buildingStructure === 'load_bearing'
        ? 'Load Bearing'
        : 'RCC Framed Structure';
      const facingDisplay = property.villaDetails?.roadFacing
        ? `${property.villaDetails.roadFacing} Road | ${property.villaDetails.mainEntranceFacing || property.facing || 'East'} Entrance`
        : (property.facing || property.villaDetails?.facing || 'East Facing');

      const ebDisplay = property.villaDetails?.ebConnection === 'single_phase'
        ? 'Single Phase (1-Phase)'
        : (property.villaDetails?.ebConnection === 'three_phase' ? 'Three Phase (3-Phase)' : 'Available');

      specsData.push(
        ['Property Type', 'INDEPENDENT VILLA', 'Listing Type', property.listingType.toUpperCase()],
        ['Built-up Area', areaDisplay, 'Plot Area', property.villaDetails?.plotArea ? `${property.villaDetails.plotArea} Sq.ft` : 'Independent Land'],
        ['Structure / Floors', property.villaDetails?.floors || 'G+1 Duplex', 'Building Structure', structName],
        ['Facing / Vastu', facingDisplay, 'Car Parking', property.villaDetails?.carParking ? `${property.villaDetails.carParking} ${property.villaDetails?.coveredParking ? 'Covered Spots' : 'Spots'}` : 'Covered Parking'],
        ['Bedrooms / Baths', `${property.bhk || property.villaDetails?.bedrooms || 3} BHK | ${property.bathrooms || property.villaDetails?.bathrooms || 3} Baths`, 'Furnishing', (property.villaDetails?.furnishing || 'Semi-Furnished').toUpperCase()],
        ['EB Connection', ebDisplay, 'Private Garden', property.villaDetails?.hasGarden ? 'Yes (Landscaped)' : 'Standard']
      );
    } else if (property.propertyType === 'apartment' || property.propertyType === 'penthouse') {
      specsData.push(
        ['Property Type', property.propertyType.toUpperCase(), 'Listing Type', property.listingType.toUpperCase()],
        ['Super Built-up', areaDisplay, 'Floor Number', property.apartmentDetails?.floorNumber ? `${property.apartmentDetails.floorNumber} of ${property.apartmentDetails.totalFloors || '—'}` : 'Mid Floor'],
        ['Configuration', `${property.bhk || '3 BHK'} (${property.bathrooms || 2} Bathrooms)`, 'Facing / Vastu', property.facing || 'East Facing'],
        ['Balconies', property.apartmentDetails?.balconies ? `${property.apartmentDetails.balconies} Balconies` : 'Yes', 'UDS (Land Share)', property.apartmentDetails?.udsSqFt ? `${property.apartmentDetails.udsSqFt} Sq.ft` : 'Included'],
        ['Locality', `${property.location.locality}, ${property.location.city}`, 'Maintenance', property.apartmentDetails?.monthlyMaintenance ? `Rs. ${property.apartmentDetails.monthlyMaintenance}/mo` : 'Nominal']
      );
    } else {
      specsData.push(
        ['Property Type', property.propertyType.toUpperCase(), 'Listing Type', property.listingType.toUpperCase()],
        ['Total Area', areaDisplay, 'Facing', property.facing || 'Main Road Facing'],
        ['Configuration', property.bhk || 'Commercial Space', 'Bathrooms', property.bathrooms ? String(property.bathrooms) : 'Common'],
        ['Locality', `${property.location.locality}, ${property.location.city}`, 'Pincode', property.location.pincode || '—']
      );
    }

    autoTable(doc, {
      startY: 72,
      head: [['Specification', 'Details', 'Specification', 'Details']],
      body: specsData,
      theme: 'grid',
      styles: { fontSize: 8.5, cellPadding: 2.2, font: 'helvetica' },
      headStyles: { fillColor: [26, 115, 232], textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: {
        0: { fontStyle: 'bold', fillColor: [248, 249, 250], textColor: [60, 64, 67] },
        1: { textColor: [32, 33, 36] },
        2: { fontStyle: 'bold', fillColor: [248, 249, 250], textColor: [60, 64, 67] },
        3: { textColor: [32, 33, 36] }
      }
    });

    // 5. On-Site Infrastructure & Services Checklist
    let currentY = (doc as any).lastAutoTable.finalY + 8;
    const rawInfra = (property.infrastructure && property.infrastructure.length > 0)
      ? property.infrastructure
      : (property.amenities && property.amenities.length > 0 ? property.amenities : ['24/7 Gated Security & CCTV', 'Metro Water & Borewell', '30ft/40ft Wide Blacktop Road', 'Underground Sewage & Drainage', '100% DG Power Backup', 'Street Lighting & Tree Avenue']);

    doc.setTextColor(32, 33, 36);
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.text('On-Site Infrastructure & Community Services:', 14, currentY);

    const half = Math.ceil(rawInfra.length / 2);
    // Use clean indentation for custom vector checkmark drawn in didDrawCell
    const infraCol1 = rawInfra.slice(0, half).map(item => `   ${item}`);
    const infraCol2 = rawInfra.slice(half).map(item => `   ${item}`);
    const infraTableData: string[][] = [];
    for (let i = 0; i < Math.max(infraCol1.length, infraCol2.length); i++) {
      infraTableData.push([infraCol1[i] || '', infraCol2[i] || '']);
    }

    autoTable(doc, {
      startY: currentY + 3,
      body: infraTableData,
      theme: 'plain',
      styles: { fontSize: 8.5, cellPadding: 1.8, textColor: [32, 33, 36], font: 'helvetica' },
      didDrawCell: (data) => {
        if (data.section === 'body' && data.cell.raw && String(data.cell.raw).trim().length > 0) {
          // Draw crisp Google Material Green checkmark icon (100% vector, zero font-encoding glyph errors)
          const cx = data.cell.x + 3.2;
          const cy = data.cell.y + data.cell.height / 2;
          doc.setFillColor(30, 142, 62); // #1E8E3E Green
          doc.circle(cx, cy, 1.8, 'F');
          doc.setDrawColor(255, 255, 255);
          doc.setLineWidth(0.45);
          doc.line(cx - 0.8, cy, cx - 0.2, cy + 0.7);
          doc.line(cx - 0.2, cy + 0.7, cx + 0.9, cy - 0.7);
        }
      }
    });

    currentY = (doc as any).lastAutoTable.finalY + 6;

    // 6. Location Vicinity & Key Distances (Only render if data exists)
    const vicinityData: string[][] = [];
    if (property.vicinity) {
      if (property.vicinity.metroDistance) vicinityData.push(['Nearest Metro / Rail', property.vicinity.metroDistance]);
      if (property.vicinity.highwayDistance) vicinityData.push(['Highway / Arterial Road', property.vicinity.highwayDistance]);
      if (property.vicinity.busStopDistance) vicinityData.push(['Bus Stop / Bus Stand', property.vicinity.busStopDistance]);
      if (property.vicinity.marketDistance) vicinityData.push(['Grocery / Vegetable Market', property.vicinity.marketDistance]);
      if (property.vicinity.schoolDistance) vicinityData.push(['Schools & Education', property.vicinity.schoolDistance]);
      if (property.vicinity.hospitalDistance) vicinityData.push(['Hospitals & Healthcare', property.vicinity.hospitalDistance]);
      if (property.vicinity.airportDistance) vicinityData.push(['Airport / Transport Hub', property.vicinity.airportDistance]);
      if (property.vicinity.customPoints) {
        for (const cp of property.vicinity.customPoints) {
          if (cp.landmark && cp.distance) vicinityData.push([cp.landmark, cp.distance]);
        }
      }
    }

    if (vicinityData.length > 0) {
      doc.setTextColor(32, 33, 36);
      doc.setFontSize(10.5);
      doc.setFont('helvetica', 'bold');
      doc.text('Location Vicinity & Connectivity Highlights:', 14, currentY);

      autoTable(doc, {
        startY: currentY + 3,
        body: vicinityData,
        theme: 'striped',
        styles: { fontSize: 8.5, cellPadding: 1.8, textColor: [50, 50, 50], font: 'helvetica' },
        columnStyles: {
          0: { fontStyle: 'bold', textColor: [60, 64, 67], cellWidth: 50 }
        }
      });
      currentY = (doc as any).lastAutoTable.finalY + 6;
    }

    // 7. Highlights & Description (Guaranteed non-overlapping)
    doc.setTextColor(32, 33, 36);
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.text('Property Overview & Investment Highlights:', 14, currentY);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(95, 99, 104);
    const notesText = property.ownerDetails?.privateNotes && property.ownerDetails.privateNotes.trim()
      ? `Highlights & Verified Notes: ${property.ownerDetails.privateNotes.trim()}\n`
      : '';
    const defaultDesc = `${property.title} located in prime ${property.location.locality}, ${property.location.city}. Excellent capital appreciation potential and ready for immediate possession/registration.`;
    const fullDesc = `${notesText}${property.description && property.description !== defaultDesc ? property.description : defaultDesc}`;
    const splitDesc = doc.splitTextToSize(fullDesc, 182);
    doc.text(splitDesc, 14, currentY + 5);

    currentY += 5 + (splitDesc.length * 4.2) + 3;

    // 8. Clickable Google Maps Location Link
    if (showLocation) {
      const mapLocationUrl = property.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${property.location.address || ''} ${property.location.locality}, ${property.location.city}`.trim())}`;
      doc.setTextColor(26, 115, 232);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.textWithLink('Open Location on Google Maps (Click to View Pin & Aerial Directions) ->', 14, currentY, { url: mapLocationUrl });
      doc.link(14, currentY - 4, 182, 6, { url: mapLocationUrl });
    } else {
      doc.setTextColor(95, 99, 104);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.text('Exact GPS Location & Street Pin: Confidential (Available upon scheduled site visit)', 14, currentY);
    }

    // 9. 2D Cadastral Plot Boundary Map Snapshot (Placed below the link)
    const has2DMap = showLocation && (
      (property.location.plotBoundary && property.location.plotBoundary.length >= 3) ||
      (property.location.coordinates && property.location.coordinates.lat)
    );

    if (has2DMap) {
      const mapLocationUrl = property.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${property.location.address || ''} ${property.location.locality}, ${property.location.city}`.trim())}`;
      const mapSnapshot = this.generate2DMapSnapshot(property);
      if (mapSnapshot) {
        currentY += 4;
        // Check if map fits on Page 1 before the footer (footer starts at y=264)
        if (currentY + 42 <= 260) {
          doc.addImage(mapSnapshot, 'JPEG', 14, currentY, 182, 40);
          doc.link(14, currentY, 182, 40, { url: mapLocationUrl });
          currentY += 42;
        } else {
          // Dedicated Page 2 for high-resolution 2D Cadastral Map
          doc.addPage();
          doc.setFillColor(26, 115, 232);
          doc.rect(0, 0, 210, 22, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(13);
          doc.setFont('helvetica', 'bold');
          doc.text(`${property.title} — Verified 2D Cadastral Survey Map`, 14, 14);

          doc.setTextColor(32, 33, 36);
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.text('2D Boundary Layout & Spatial Survey Plan:', 14, 32);

          doc.setTextColor(26, 115, 232);
          doc.setFontSize(9);
          doc.textWithLink('View Interactive Satellite Boundary on Google Maps (Clickable) ->', 14, 39, { url: mapLocationUrl });
          doc.link(14, 35, 182, 6, { url: mapLocationUrl });

          doc.addImage(mapSnapshot, 'JPEG', 14, 44, 182, 70);
          doc.link(14, 44, 182, 70, { url: mapLocationUrl });

          this.renderFooterCard(doc, tenant, agent, property);
        }
      }
    }

    // 10. Direct Agent Contact Footer on Page 1 (Clean Elevated Card)
    this.renderFooterCard(doc, tenant, agent, property);

    // Multi-Platform Universal Export
    const filename = `Brochure_${property.title.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30)}_${Date.now()}.pdf`;

    if (Capacitor.isNativePlatform()) {
      try {
        const base64Data = doc.output('datauristring').split(',')[1];
        const savedFile = await Filesystem.writeFile({
          path: filename,
          data: base64Data,
          directory: Directory.Cache
        });

        await Share.share({
          title: property.title,
          text: showPrice ? `Verified Property Brochure: ${property.title} - ${formattedPrice}` : `Verified Property Brochure: ${property.title} - Price on Request`,
          url: savedFile.uri,
          dialogTitle: 'Share Property Brochure via WhatsApp or Email'
        });
      } catch (err) {
        console.warn('Native share failed, falling back to download:', err);
        doc.save(filename);
      }
    } else {
      // Desktop Browser direct download
      doc.save(filename);
    }
  }

  private formatCurrencyPdf(price: number): string {
    if (!price || isNaN(price)) return 'Price on Request';
    if (price >= 10000000) {
      return `Rs. ${(price / 10000000).toFixed(2)} Crores`;
    }
    if (price >= 100000) {
      return `Rs. ${(price / 100000).toFixed(2)} Lakhs`;
    }
    return `Rs. ${price.toLocaleString('en-IN')}`;
  }

  /**
   * Generates a beautifully formatted WhatsApp pitch message
   */
  generateWhatsAppPitch(property: Property, options?: { includePrice?: boolean; includeLocation?: boolean }): string {
    const tenant = this.tenantService.activeTenant();
    const agent = this.auth.currentUser();

    const showPrice = options?.includePrice !== false;
    const showLocation = options?.includeLocation !== false;

    const formattedPrice = property.price >= 10000000
      ? `Rs. ${(property.price / 10000000).toFixed(2)} Crores`
      : `Rs. ${(property.price / 100000).toFixed(2)} Lakhs`;

    const priceLine = showPrice
      ? `*Price:* ${formattedPrice} ${property.negotiable ? '(Negotiable)' : ''}`
      : `*Price:* Available on Request (Confidential)`;

    let typeDetails = '';
    if (property.propertyType === 'plot') {
      typeDetails = `*Dimensions:* ${property.plotDetails?.dimensions || `${property.area} ${property.areaUnit}`}\n` +
        `*Road Width:* ${property.plotDetails?.roadWidthFt ? `${property.plotDetails.roadWidthFt} Ft Road` : 'Wide Access Road'}\n` +
        `*Approval:* ${property.plotDetails?.approvalStatus || 'DTCP / RERA Approved'}\n` +
        `*Corner Plot:* ${property.plotDetails?.isCornerPlot ? 'Yes (2-side road)' : 'Standard Plot'}`;
    } else if (property.propertyType === 'villa') {
      const structLabel = property.villaDetails?.buildingStructure === 'load_bearing' ? 'Load Bearing' : 'RCC Framed Structure';
      const facingStr = property.villaDetails?.roadFacing
        ? `${property.villaDetails.roadFacing} Road, ${property.villaDetails.mainEntranceFacing || 'East'} Entrance`
        : (property.facing || 'East Facing');
      const ebStr = property.villaDetails?.ebConnection === 'single_phase'
        ? 'Single Phase'
        : (property.villaDetails?.ebConnection === 'three_phase' ? 'Three Phase' : '');
      typeDetails = `*Configuration:* ${property.bhk || property.villaDetails?.bedrooms || 3} BHK Luxury Villa\n` +
        `*Structure / Floors:* ${property.villaDetails?.floors || 'G+1 Duplex'} (${structLabel})\n` +
        `*Car Parking:* ${property.villaDetails?.carParking ? `${property.villaDetails.carParking} ${property.villaDetails?.coveredParking ? 'Covered Slots' : 'Slots'}` : 'Available'}\n` +
        `*Facing:* ${facingStr}` +
        (ebStr ? `\n*EB Connection:* ${ebStr}` : '');
    } else if (property.propertyType === 'apartment') {
      typeDetails = `*Configuration:* ${property.bhk || '3 BHK'} Apartment\n` +
        `*Floor:* ${property.apartmentDetails?.floorNumber ? `Floor ${property.apartmentDetails.floorNumber} of ${property.apartmentDetails.totalFloors || '—'}` : 'Mid Floor'}\n` +
        `*Facing:* ${property.facing || 'East'}\n` +
        `*UDS:* ${property.apartmentDetails?.udsSqFt ? `${property.apartmentDetails.udsSqFt} Sq.ft` : 'Substantial'}`;
    }

    const services = (property.infrastructure && property.infrastructure.length > 0)
      ? property.infrastructure.slice(0, 4).join(', ')
      : '24/7 Security, Metro Water, Wide Blacktop Road, Power Backup';

    const locationLine = showLocation
      ? `*Location:* ${property.location.locality}, ${property.location.city}`
      : `*Territory:* ${property.location.locality}, ${property.location.city} (Exact location confidential)`;

    const mapsLine = showLocation
      ? (property.mapsUrl
          ? `\n*Google Maps Location:* ${property.mapsUrl}`
          : `\n*Google Maps Location:* https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${property.location.address || ''} ${property.location.locality}, ${property.location.city}`.trim())}`)
      : `\n*Google Maps Location:* Exact coordinates provided upon scheduled site visit`;

    const agentName = property.assignedAgentName || agent?.displayName || 'Senior Property Consultant';
    const agentPhone = agent?.phoneNumber || tenant.phone;

    const propertyNotes = property.ownerDetails?.privateNotes || property.description;
    const notesBlock = propertyNotes && propertyNotes.trim()
      ? `\n*Property Highlights & Verified Notes:*\n${propertyNotes.trim()}\n`
      : '';

    return `*VERIFIED PROPERTY OPPORTUNITY*\n\n` +
      `*${property.title}*\n` +
      `${locationLine}${mapsLine}\n` +
      `${priceLine}\n` +
      `*Area:* ${property.area} ${property.areaUnit.toUpperCase()}\n` +
      (typeDetails ? `\n${typeDetails}\n` : '') +
      `\n*On-Site Services:* ${services}\n` +
      notesBlock +
      `\n*Book Site Visit / Inquiries:*\n` +
      `*${agentName}* — ${agentPhone}\n` +
      `*${tenant.agencyName}* (RERA: ${tenant.reraNumber || 'Verified'})`;
  }

  /**
   * Opens WhatsApp with pre-filled pitch
   */
  shareToWhatsApp(property: Property, options?: { includePrice?: boolean; includeLocation?: boolean }): void {
    const pitch = this.generateWhatsAppPitch(property, options);
    const url = `https://wa.me/?text=${encodeURIComponent(pitch)}`;
    window.open(url, '_blank');
  }

  /**
   * Copies formatted pitch text to clipboard
   */
  async copyPitch(property: Property, options?: { includePrice?: boolean; includeLocation?: boolean }): Promise<boolean> {
    const pitch = this.generateWhatsAppPitch(property, options);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(pitch);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Native device share sheet fallback
   */
  async shareNative(property: Property, options?: { includePrice?: boolean; includeLocation?: boolean }): Promise<void> {
    const pitch = this.generateWhatsAppPitch(property, options);
    if (Capacitor.isNativePlatform()) {
      try {
        await Share.share({
          title: property.title,
          text: pitch,
          dialogTitle: 'Share Property Details'
        });
      } catch (err) {
        console.warn('Native share failed:', err);
      }
    } else if (navigator.share) {
      try {
        await navigator.share({
          title: property.title,
          text: pitch
        });
      } catch (err) {
        console.warn('Web share failed:', err);
      }
    } else {
      await this.copyPitch(property, options);
    }
  }

  private renderFooterCard(doc: jsPDF, tenant: any, agent: any, property: Property): void {
    const footerY = 264;
    doc.setFillColor(248, 249, 250); // #F8F9FA
    doc.setDrawColor(226, 232, 240); // #E2E8F0
    doc.roundedRect(10, footerY, 190, 26, 2, 2, 'FD');

    doc.setTextColor(26, 115, 232);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('For VIP Site Inspection, Booking & Documentation:', 14, footerY + 7);

    doc.setTextColor(32, 33, 36);
    doc.setFontSize(8.8);
    doc.setFont('helvetica', 'normal');
    const agentName = property.assignedAgentName || agent?.displayName || 'Principal Realty Advisor';
    const agentPhone = agent?.phoneNumber || tenant.phone || '+91 98765 43210';
    doc.text(`Relationship Advisor: ${agentName}  |  Call / WhatsApp: ${agentPhone}`, 14, footerY + 14);

    doc.setTextColor(95, 99, 104);
    doc.setFontSize(8);
    doc.text(`Official Brokerage: ${tenant.agencyName} (RERA: ${tenant.reraNumber || 'Verified Registration'})  •  Strict Data Privacy Guarded`, 14, footerY + 20);
  }

  /**
   * Generates a high-resolution 2D Cadastral Plot Boundary Map Snapshot
   * using an offscreen HTML5 Canvas.
   */
  private generate2DMapSnapshot(property: Property): string | null {
    if (typeof document === 'undefined') return null;

    try {
      const canvas = document.createElement('canvas');
      canvas.width = 900;
      canvas.height = 360;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      // 1. Blueprint Canvas Background & Architectural Grid
      ctx.fillStyle = '#f8fafc'; // Slate 50
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = '#e2e8f0'; // Slate 200
      ctx.lineWidth = 1;
      const gridSize = 25;
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // 2. Outer Border
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2;
      ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);

      // 3. Header Banner
      ctx.fillStyle = '#1a73e8';
      ctx.font = 'bold 15px Plus Jakarta Sans, Arial, sans-serif';
      ctx.fillText('2D CADASTRAL SURVEY BOUNDARY & SPATIAL PLAN', 24, 34);

      ctx.fillStyle = '#64748b';
      ctx.font = '600 12px Plus Jakarta Sans, Arial, sans-serif';
      const localityStr = `${property.location.locality}, ${property.location.city}`;
      const areaStr = property.area ? `${property.area} ${property.areaUnit || 'sqft'}` : '';
      ctx.fillText(`${localityStr} • Total Area: ${areaStr}`, 24, 54);

      // 4. Compass Indicator (Top Right)
      const cx = 830;
      const cy = 40;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.beginPath();
      ctx.arc(0, 0, 22, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // North Needle (Red)
      ctx.beginPath();
      ctx.moveTo(0, -16);
      ctx.lineTo(6, 0);
      ctx.lineTo(-6, 0);
      ctx.closePath();
      ctx.fillStyle = '#dc2626';
      ctx.fill();

      // South Needle (Gray)
      ctx.beginPath();
      ctx.moveTo(0, 16);
      ctx.lineTo(6, 0);
      ctx.lineTo(-6, 0);
      ctx.closePath();
      ctx.fillStyle = '#94a3b8';
      ctx.fill();

      ctx.fillStyle = '#dc2626';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('N', 0, -18);
      ctx.restore();

      // 5. Draw Plot Boundary Polygon
      const boundary = property.location.plotBoundary;
      if (boundary && boundary.length >= 3) {
        let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
        boundary.forEach(p => {
          if (p.lat < minLat) minLat = p.lat;
          if (p.lat > maxLat) maxLat = p.lat;
          if (p.lng < minLng) minLng = p.lng;
          if (p.lng > maxLng) maxLng = p.lng;
        });

        const spanLat = maxLat - minLat || 0.0001;
        const spanLng = maxLng - minLng || 0.0001;

        const padX = 140;
        const padY = 80;
        const drawW = canvas.width - padX * 2;
        const drawH = canvas.height - padY - 60;

        const polyPoints = boundary.map(p => ({
          x: padX + ((p.lng - minLng) / spanLng) * drawW,
          y: padY + drawH - ((p.lat - minLat) / spanLat) * drawH
        }));

        // Fill & Stroke Polygon
        ctx.beginPath();
        ctx.moveTo(polyPoints[0].x, polyPoints[0].y);
        for (let i = 1; i < polyPoints.length; i++) {
          ctx.lineTo(polyPoints[i].x, polyPoints[i].y);
        }
        ctx.closePath();
        ctx.fillStyle = 'rgba(26, 115, 232, 0.12)';
        ctx.fill();
        ctx.strokeStyle = '#1a73e8';
        ctx.lineWidth = 3.5;
        ctx.stroke();

        // Corner Vertices & Edge Lengths
        polyPoints.forEach((pt, idx) => {
          // Draw Vertex Point
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 6, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
          ctx.strokeStyle = '#1a73e8';
          ctx.lineWidth = 2.5;
          ctx.stroke();

          // Corner Letter (A, B, C...)
          const label = String.fromCharCode(65 + (idx % 26));
          ctx.fillStyle = '#1e293b';
          ctx.font = 'bold 12px sans-serif';
          ctx.fillText(label, pt.x + 8, pt.y - 8);
        });

        // Center Area Badge
        const midX = polyPoints.reduce((sum, p) => sum + p.x, 0) / polyPoints.length;
        const midY = polyPoints.reduce((sum, p) => sum + p.y, 0) / polyPoints.length;

        const badgeText = `${areaStr || 'Verified Area'} • ${boundary.length} Corners`;
        ctx.font = 'bold 13px Plus Jakarta Sans, Arial, sans-serif';
        const textW = ctx.measureText(badgeText).width;
        ctx.beginPath();
        ctx.roundRect(midX - textW / 2 - 12, midY - 14, textW + 24, 28, 8);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = '#1a73e8';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#1a73e8';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(badgeText, midX, midY);
      } else {
        // Fallback: Architectural surveyed rectangle with dimensions
        const rectW = 380;
        const rectH = 170;
        const rectX = (canvas.width - rectW) / 2;
        const rectY = 95;

        // Front Road Strip
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(rectX - 40, rectY + rectH + 10, rectW + 80, 36);
        ctx.fillStyle = '#475569';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`▲ ${property.plotDetails?.roadWidthFt ? property.plotDetails.roadWidthFt + 'ft ' : '30ft '} Wide Frontage Approach Road ▲`, canvas.width / 2, rectY + rectH + 32);

        // Plot Box
        ctx.fillStyle = 'rgba(26, 115, 232, 0.12)';
        ctx.fillRect(rectX, rectY, rectW, rectH);
        ctx.strokeStyle = '#1a73e8';
        ctx.lineWidth = 3.5;
        ctx.strokeRect(rectX, rectY, rectW, rectH);

        // Center Area Badge
        const badgeText = `${areaStr || 'Verified Layout'} • ${property.plotDetails?.dimensions || 'Standard Dimensions'}`;
        ctx.font = 'bold 13px Plus Jakarta Sans, Arial, sans-serif';
        const textW = ctx.measureText(badgeText).width;
        ctx.beginPath();
        ctx.roundRect(canvas.width / 2 - textW / 2 - 14, rectY + rectH / 2 - 15, textW + 28, 30, 8);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = '#1a73e8';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#1a73e8';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(badgeText, canvas.width / 2, rectY + rectH / 2);
      }

      // 6. Footer stamp
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px sans-serif';
      const gpsStamp = property.location.coordinates
        ? `GPS Pin: ${property.location.coordinates.lat.toFixed(5)}° N, ${property.location.coordinates.lng.toFixed(5)}° E`
        : 'Spatial Cadastral Engine';
      ctx.fillText(`${gpsStamp} • Verified Scale • Generated by PlotFlow`, 24, canvas.height - 12);

      return canvas.toDataURL('image/jpeg', 0.92);
    } catch (err) {
      console.warn('Could not generate 2D map snapshot for PDF:', err);
      return null;
    }
  }
}
