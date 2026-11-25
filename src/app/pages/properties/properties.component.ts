import { Component, inject, signal, computed, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PropertyService } from '../../core/services/property.service';
import { PropertyAnalyticsService } from '../../core/services/property-analytics.service';
import { BrochureService } from '../../core/services/brochure.service';
import { PropertyCardComponent } from '../../shared/components/property-card/property-card.component';
import { StatusPillComponent } from '../../shared/components/status-pill/status-pill.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { PropertyStatsDrawerComponent } from '../../shared/components/property-stats-drawer/property-stats-drawer.component';
import { DealModalComponent } from '../../shared/components/deal-modal/deal-modal.component';
import { PlotMapViewerComponent } from '../../shared/components/plot-map-viewer/plot-map-viewer.component';
import { CurrencyFormatPipe } from '../../shared/pipes/currency-format.pipe';
import { AreaFormatPipe } from '../../shared/pipes/area-format.pipe';
import { Property, PlotCoordinate, PlotBoundaryPoint, Plot3DConfig, VillaFloorPlan } from '../../core/models/models';
import { AuthService } from '../../core/services/auth.service';
import { LoadingService } from '../../core/services/loading.service';
import { SnackbarService } from '../../core/services/snackbar.service';
import { SecureShareService } from '../../core/services/secure-share.service';
import imageCompression from 'browser-image-compression';
import { register as registerSwiper } from 'swiper/element/bundle';

// Initialize Swiper Web Components (Zoom, Navigation, Pagination)
registerSwiper();

@Component({
  selector: 'app-properties',
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [
    CommonModule,
    FormsModule,
    PropertyCardComponent,
    StatusPillComponent,
    EmptyStateComponent,
    PropertyStatsDrawerComponent,
    DealModalComponent,
    PlotMapViewerComponent,
    CurrencyFormatPipe,
    AreaFormatPipe
  ],
  templateUrl: './properties.component.html',
  styleUrl: './properties.component.scss'
})
export class PropertiesComponent {
  propertyService = inject(PropertyService);
  analyticsService = inject(PropertyAnalyticsService);
  brochureService = inject(BrochureService);
  secureShareService = inject(SecureShareService);
  auth = inject(AuthService);
  loadingService = inject(LoadingService);
  snackbarService = inject(SnackbarService);

  searchQuery = '';
  selectedType = signal<string>('all');
  selectedPropertyForStats = signal<Property | null>(null);
  detailedProperty = signal<Property | null>(null);
  shareModalProperty = signal<Property | null>(null);
  dealModalOpen = signal(false);
  dealModalProp?: Property;

  openAddModal = signal(false);
  editingProperty = signal<Property | null>(null);
  lastMarkedArea = signal<{ sqFt: number; cents: number; acres: number } | null>(null);

  copiedNotice = signal(false);
  isGeneratingBrochure = signal(false);
  isCompressingImage = signal(false);

  // Swiper Lightbox & Pinch/Zoom State
  lightboxOpen = signal(false);
  lightboxActiveIndex = signal(0);
  lightboxZoomLevel = signal(1);

  openLightbox(index: number = 0) {
    this.lightboxActiveIndex.set(index);
    this.lightboxZoomLevel.set(1);
    this.lightboxOpen.set(true);
  }

  closeLightbox() {
    this.lightboxOpen.set(false);
    this.lightboxZoomLevel.set(1);
  }

  zoomInLightbox() {
    this.lightboxZoomLevel.update(z => Math.min(Number((z + 0.5).toFixed(1)), 4));
  }

  zoomOutLightbox() {
    this.lightboxZoomLevel.update(z => Math.max(Number((z - 0.5).toFixed(1)), 1));
  }

  resetZoomLightbox() {
    this.lightboxZoomLevel.set(1);
  }

  // View Mode Toggle (Cards vs Table)
  readonly viewMode = signal<'cards' | 'table'>('cards');

  availableInfrastructure: string[] = [
    '100% Gated Community',
    '24/7 Security',
    '24/7 CCTV Surveillance',
    'Municipal / Corporation Water Connection',
    'Panchayat Water Connection',
    'Metro Water Connection',
    'Copious Borewell Water',
    'EB Connection',
    'Drainage Connection (Corporation)',
    'Rainwater Drainage & Harvesting',
    '30/40 Ft Wide Road',
    '50/60 Ft Wide Road',
    '70/80 Ft Wide Road',
    '100% DG Power Backup',
    'Solar Street Lighting',
    'Grand Arch Entrance',
    'Badminton Court',
    'Basketball Court',
    'Open Air Amphitheatre',
    'Celebration Lounge',
    'Jogging & Walking Track',
    'Tree-Lined Avenue Trees',
    'Acupressure Walking Path',
    'Elevated Overhead Water Tank (OHT)',
    'Dedicated Cycling Track',
    'Yoga Pavilion',
    'Clubhouse with Gym & Pool',
    'Children Play Area & Park'
  ];

  readonly availableAmenities = [
    'Grand Arch Entrance',
    'Badminton Court',
    'Basketball Court',
    'Open Air Amphitheatre',
    'Celebration Lounge',
    'Jogging & Walking Track',
    'Tree-Lined Avenue Trees',
    'Acupressure Walking Path',
    'Elevated Overhead Water Tank (OHT)',
    'Dedicated Cycling Track',
    'Yoga Pavilion',
    'Clubhouse with Gym & Pool',
    'Children Play Area & Park'
  ];

  readonly availableApprovals = [
    'DTCP Approved',
    'RERA Registered',
    'Corporation Approved',
    'Panchayat Approved',
    'CMDA Approved',
    'Patta / Clean Title',
    'BMRDA Approved',
    'BDA Approved',
    'HMDA Approved'
  ];

  readonly infraDropdownOpen = signal(false);
  readonly approvalDropdownOpen = signal(false);
  readonly editInfraDropdownOpen = signal(false);
  readonly editApprovalDropdownOpen = signal(false);

  newProp = this.getInitialNewProp();
  editForm = this.getInitialNewProp();

  getInitialNewProp() {
    return {
      title: '',
      description: '',
      propertyType: 'plot' as 'apartment' | 'villa' | 'plot' | 'commercial',
      listingType: 'sale' as 'sale' | 'rent',
      status: 'available' as 'available' | 'under_offer' | 'sold',
      price: null as any,
      negotiable: true,
      area: null as any,
      areaUnit: 'sqft' as 'sqft' | 'cent' | 'acre' | 'ground' | 'guntha',
      locality: '',
      city: 'Chennai',
      address: '',
      pincode: '',
      mapsUrl: '',
      coordinates: undefined as PlotCoordinate | undefined,
      plotBoundary: [] as PlotBoundaryPoint[],
      view3D: undefined as Plot3DConfig | undefined,
      // Plot specific
      plotDimensions: '',
      plotRoadWidth: null as any,
      plotApprovals: ['DTCP Approved'] as string[],
      plotApproval: 'DTCP Approved' as string,
      isCornerPlot: false,
      hasBoundaryWall: false,
      isGatedLayout: true,
      soilType: '',
      // Villa specific & Dynamic Multi-Floor Architecture
      villaPlotArea: 2400,
      villaBuiltUpArea: 2600,
      villaFloors: 'G+1 Duplex',
      villaBuildingStructure: 'framed' as 'framed' | 'load_bearing',
      villaBedrooms: 4,
      villaBathrooms: 4,
      villaCoveredParking: true,
      villaCarParking: 2,
      villaHasGarden: true,
      villaFacing: 'East',
      villaRoadFacing: 'East',
      villaMainEntranceFacing: 'East',
      villaFurnishing: 'semi-furnished' as 'unfurnished' | 'semi-furnished' | 'fully-furnished',
      villaFloorsList: [
        {
          floorLevel: 'Ground Floor',
          builtUpAreaSqFt: 1400,
          bhk: '2 BHK',
          bedroomsCount: 2,
          bathroomsCount: 2,
          hasAttachedBath: true,
          hasBalcony: false
        },
        {
          floorLevel: '1st Floor',
          builtUpAreaSqFt: 1200,
          bhk: '2 BHK',
          bedroomsCount: 2,
          bathroomsCount: 2,
          hasAttachedBath: true,
          hasBalcony: true
        }
      ] as VillaFloorPlan[],
      // Apartment specific
      aptFloorNumber: 5,
      aptTotalFloors: 12,
      aptBhk: '3BHK',
      aptBathrooms: 3,
      aptBalconies: 2,
      aptMonthlyMaintenance: 5500,
      aptUdsSqFt: 620,
      aptFacing: 'East',
      // On-Site Services & Infrastructure
      infrastructure: [
        '100% Gated Community',
        '24/7 Security',
        'EB Connection',
        'Drainage Connection (Corporation)'
      ] as string[],
      // Vicinity distances
      vicinityMetro: '',
      vicinityHighway: '',
      vicinitySchool: '',
      vicinityHospital: '',
      vicinityAirport: '',
      vicinityBusStop: '',
      vicinityMarket: '',
      vicinityLocationMap: '',
      vicinityCustomPoints: [] as { landmark: string; distance: string }[],
      // Media
      images: [
        'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&auto=format&fit=crop&q=80'
      ] as string[],
      videoTourUrl: '',
      customPhotoUrl: '',
      // Owner
      ownerName: '',
      ownerPhone: '',
      ownerExpectedPrice: 0,
      ownerPrivateNotes: ''
    };
  }

  addVillaFloor(mode: 'new' | 'edit') {
    const target = mode === 'new' ? this.newProp : this.editForm;
    const list = target.villaFloorsList;
    const count = list.length;
    let label = `${count}th Floor`;
    if (count === 1) label = '1st Floor';
    else if (count === 2) label = '2nd Floor';
    else if (count === 3) label = '3rd Floor';
    else if (count === 4) label = '4th Floor';

    const prev = list[count - 1];
    list.push({
      floorLevel: label,
      builtUpAreaSqFt: prev ? prev.builtUpAreaSqFt : 1000,
      bhk: prev ? prev.bhk : '2 BHK',
      bedroomsCount: prev ? prev.bedroomsCount : 2,
      bathroomsCount: prev ? prev.bathroomsCount : 2,
      hasAttachedBath: prev ? prev.hasAttachedBath : true,
      hasBalcony: true
    });
    this.recalcVillaTotals(mode);
  }

  removeVillaFloor(index: number, mode: 'new' | 'edit') {
    const target = mode === 'new' ? this.newProp : this.editForm;
    const list = target.villaFloorsList;
    if (list.length <= 1) return;
    list.splice(index, 1);
    this.recalcVillaTotals(mode);
  }

  copyPreviousFloor(index: number, mode: 'new' | 'edit') {
    const target = mode === 'new' ? this.newProp : this.editForm;
    const list = target.villaFloorsList;
    if (index <= 0 || !list[index]) return;
    const source = list[0]; // Ground floor is always at index 0
    list[index].builtUpAreaSqFt = source.builtUpAreaSqFt;
    list[index].bhk = source.bhk;
    list[index].bedroomsCount = source.bedroomsCount;
    list[index].bathroomsCount = source.bathroomsCount;
    list[index].hasAttachedBath = source.hasAttachedBath;
    list[index].hasBalcony = source.hasBalcony;
    this.recalcVillaTotals(mode);
  }

  recalcVillaTotals(mode: 'new' | 'edit') {
    const target = mode === 'new' ? this.newProp : this.editForm;
    const list = target.villaFloorsList;
    if (!list || list.length === 0) return;

    let totalArea = 0;
    let totalBhk = 0;
    let totalBaths = 0;

    for (const f of list) {
      totalArea += Number(f.builtUpAreaSqFt) || 0;
      totalBhk += Number(f.bedroomsCount) || 0;
      totalBaths += Number(f.bathroomsCount) || 0;
    }

    target.villaBuiltUpArea = totalArea;
    target.villaBedrooms = totalBhk;
    target.villaBathrooms = totalBaths;

    if (list.length === 1) {
      target.villaFloors = 'Ground Floor Only (Independent House)';
    } else if (list.length === 2) {
      target.villaFloors = 'G+1 Duplex';
    } else if (list.length === 3) {
      target.villaFloors = 'G+2 Triplex';
    } else {
      target.villaFloors = `G+${list.length - 1} Multi-Level Villa`;
    }
  }

  toggleView(mode: 'cards' | 'table') {
    this.viewMode.set(mode);
  }

  resetFilters() {
    this.selectedType.set('all');
    this.searchQuery = '';
  }

  filteredProperties = computed(() => {
    let list = this.propertyService.tenantProperties();
    const type = this.selectedType();
    if (type !== 'all') {
      list = list.filter(p => p.propertyType === type);
    }
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.location.locality.toLowerCase().includes(q) ||
        p.location.city.toLowerCase().includes(q) ||
        (p.plotDetails?.approvalStatus && p.plotDetails.approvalStatus.toLowerCase().includes(q)) ||
        (p.bhk && p.bhk.toLowerCase().includes(q))
      );
    }
    return list;
  });

  // Google Maps Location Setters
  setMapFromAddress(target: 'new' | 'edit') {
    const form = target === 'new' ? this.newProp : this.editForm;
    const parts = [form.address, form.locality, form.city].filter(p => p && p.trim());
    const query = parts.length > 0 ? parts.join(', ') : 'Chennai, India';
    form.mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  }

  useCurrentGpsLocation(target: 'new' | 'edit') {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          const lat = pos.coords.latitude.toFixed(6);
          const lng = pos.coords.longitude.toFixed(6);
          const form = target === 'new' ? this.newProp : this.editForm;
          form.mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
        },
        err => {
          console.warn('Geolocation failed or permission denied:', err);
          this.setMapFromAddress(target);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      this.setMapFromAddress(target);
    }
  }

  getMapsUrlForProp(prop: Property): string {
    if (prop.mapsUrl && prop.mapsUrl.trim()) return prop.mapsUrl.trim();
    if (prop.location.coordinates?.lat && prop.location.coordinates?.lng) {
      return `https://www.google.com/maps?q=${prop.location.coordinates.lat},${prop.location.coordinates.lng}`;
    }
    const query = `${prop.location.address || ''} ${prop.location.locality || ''}, ${prop.location.city || ''}`.trim();
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query || 'Chennai')}`;
  }

  onCoordinatesChange(coords: PlotCoordinate, target: 'new' | 'edit') {
    const form = target === 'new' ? this.newProp : this.editForm;
    form.coordinates = coords;
    form.mapsUrl = `https://www.google.com/maps?q=${coords.lat},${coords.lng}`;
  }

  onBoundaryChange(boundary: PlotBoundaryPoint[], target: 'new' | 'edit') {
    const form = target === 'new' ? this.newProp : this.editForm;
    form.plotBoundary = boundary;
    if (boundary && boundary.length >= 3) {
      const lat = Number((boundary.reduce((sum, p) => sum + p.lat, 0) / boundary.length).toFixed(6));
      const lng = Number((boundary.reduce((sum, p) => sum + p.lng, 0) / boundary.length).toFixed(6));
      form.coordinates = { lat, lng };
      form.mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
    }
  }

  onView3DChange(v3d: Plot3DConfig, target: 'new' | 'edit') {
    const form = target === 'new' ? this.newProp : this.editForm;
    form.view3D = v3d;
  }

  onMarkedAreaChange(area: { sqFt: number; cents: number; acres: number } | null, target: 'new' | 'edit') {
    const form = target === 'new' ? this.newProp : this.editForm;
    if (target === 'new') {
      this.lastMarkedArea.set(area);
    }
    if (!area) return;

    // Automatically synchronize the form area field based on current unit
    if (form.areaUnit === 'cent') {
      form.area = area.cents;
    } else if (form.areaUnit === 'acre') {
      form.area = area.acres;
    } else if (form.areaUnit === 'ground') {
      form.area = Number((area.sqFt / 2400).toFixed(2));
    } else if (form.areaUnit === 'guntha') {
      form.area = Number((area.sqFt / 1089).toFixed(2));
    } else {
      // Default sqft
      form.area = area.sqFt;
    }

    // Clear stale dimensions or indicate custom polygon
    if (!form.plotDimensions || form.plotDimensions === '40 x 60') {
      if (form.plotBoundary && form.plotBoundary.length > 4) {
        form.plotDimensions = `Irregular (${form.plotBoundary.length}-Corner)`;
      } else {
        form.plotDimensions = '';
      }
    }
  }

  onAreaUnitChange(newUnit: string, target: 'new' | 'edit') {
    const form = target === 'new' ? this.newProp : this.editForm;
    form.areaUnit = newUnit as any;
    const area = this.lastMarkedArea();
    if (area) {
      if (newUnit === 'cent') {
        form.area = area.cents;
      } else if (newUnit === 'acre') {
        form.area = area.acres;
      } else if (newUnit === 'ground') {
        form.area = Number((area.sqFt / 2400).toFixed(2));
      } else if (newUnit === 'guntha') {
        form.area = Number((area.sqFt / 1089).toFixed(2));
      } else {
        form.area = area.sqFt;
      }
    }
  }

  getConvertedAreaHint(area: number | null | undefined, unit: string): { primary: string; secondary: string } | null {
    if (!area || area <= 0) return null;
    let sqFt = 0;
    switch (unit) {
      case 'cent':
        sqFt = area * 435.6;
        break;
      case 'ground':
        sqFt = area * 2400;
        break;
      case 'acre':
        sqFt = area * 43560;
        break;
      case 'guntha':
        sqFt = area * 1089;
        break;
      case 'sqft':
      default:
        sqFt = area;
        break;
    }

    const cents = Number((sqFt / 435.6).toFixed(2));
    const grounds = Number((sqFt / 2400).toFixed(2));
    const acres = Number((sqFt / 43560).toFixed(3));
    const formattedSqft = Math.round(sqFt).toLocaleString('en-IN');

    if (unit === 'sqft') {
      return {
        primary: `≈ ${cents} Cents`,
        secondary: `approx. ${grounds} Ground • ${acres} Acres`
      };
    } else if (unit === 'cent') {
      return {
        primary: `≈ ${formattedSqft} Sq.ft`,
        secondary: `approx. ${grounds} Ground • ${acres} Acres`
      };
    } else if (unit === 'ground') {
      return {
        primary: `≈ ${cents} Cents`,
        secondary: `approx. ${formattedSqft} Sq.ft • ${acres} Acres`
      };
    } else if (unit === 'acre') {
      return {
        primary: `≈ ${cents} Cents (100 Cents / Acre)`,
        secondary: `approx. ${formattedSqft} Sq.ft • ${grounds} Ground`
      };
    } else {
      return {
        primary: `≈ ${cents} Cents`,
        secondary: `approx. ${formattedSqft} Sq.ft`
      };
    }
  }

  customInfraInput = '';
  customInfraEditInput = '';

  addCustomInfra(target: 'new' | 'edit') {
    const raw = (target === 'new' ? this.customInfraInput : this.customInfraEditInput).trim();
    if (!raw) return;

    const list = target === 'new' ? this.newProp.infrastructure : this.editForm.infrastructure;
    if (!list.includes(raw)) {
      list.push(raw);
    }
    if (!this.availableInfrastructure.includes(raw)) {
      this.availableInfrastructure.push(raw);
    }

    if (target === 'new') {
      this.customInfraInput = '';
    } else {
      this.customInfraEditInput = '';
    }
  }

  // Custom vicinity landmark points
  addCustomVicinityPoint(mode: 'new' | 'edit') {
    const target = mode === 'new' ? this.newProp : this.editForm;
    if (!target.vicinityCustomPoints) target.vicinityCustomPoints = [];
    target.vicinityCustomPoints.push({ landmark: '', distance: '' });
  }

  removeCustomVicinityPoint(index: number, mode: 'new' | 'edit') {
    const target = mode === 'new' ? this.newProp : this.editForm;
    if (target.vicinityCustomPoints) {
      target.vicinityCustomPoints.splice(index, 1);
    }
  }

  async onLocationMapSelected(event: Event, target: 'new' | 'edit') {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    this.isCompressingImage.set(true);
    try {
      const file = input.files[0];
      const compressedBlob = await imageCompression(file, {
        maxSizeMB: 0.3,
        maxWidthOrHeight: 1600,
        useWebWorker: true
      });

      const reader = new FileReader();
      reader.onload = () => {
        if (target === 'new') {
          this.newProp.vicinityLocationMap = reader.result as string;
        } else {
          this.editForm.vicinityLocationMap = reader.result as string;
        }
        this.isCompressingImage.set(false);
      };
      reader.readAsDataURL(compressedBlob);
    } catch (err) {
      console.error('Failed to compress location map:', err);
      this.isCompressingImage.set(false);
    }
  }

  removeLocationMap(target: 'new' | 'edit') {
    if (target === 'new') {
      this.newProp.vicinityLocationMap = '';
    } else {
      this.editForm.vicinityLocationMap = '';
    }
  }

  // Toggle on-site infrastructure item
  toggleInfra(item: string, target: 'new' | 'edit') {
    const list = target === 'new' ? this.newProp.infrastructure : this.editForm.infrastructure;
    const index = list.indexOf(item);
    if (index >= 0) {
      list.splice(index, 1);
    } else {
      list.push(item);
    }
  }

  isInfraSelected(item: string, target: 'new' | 'edit'): boolean {
    const list = target === 'new' ? this.newProp.infrastructure : this.editForm.infrastructure;
    return list.includes(item);
  }

  // Toggle approval authority item
  toggleApproval(item: string, target: 'new' | 'edit') {
    const form = target === 'new' ? this.newProp : this.editForm;
    if (!form.plotApprovals) {
      form.plotApprovals = [];
    }
    const index = form.plotApprovals.indexOf(item);
    if (index >= 0) {
      if (form.plotApprovals.length > 1) {
        form.plotApprovals.splice(index, 1);
      }
    } else {
      form.plotApprovals.push(item);
    }
    form.plotApproval = form.plotApprovals.join(' & ');
  }

  isApprovalSelected(item: string, target: 'new' | 'edit'): boolean {
    const form = target === 'new' ? this.newProp : this.editForm;
    return form.plotApprovals ? form.plotApprovals.includes(item) : false;
  }

  // Quick photo upload with client-side compression
  async onFileSelected(event: Event, target: 'new' | 'edit') {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    this.isCompressingImage.set(true);
    try {
      for (let i = 0; i < input.files.length; i++) {
        const file = input.files[i];
        const compressedBlob = await imageCompression(file, {
          maxSizeMB: 0.3,
          maxWidthOrHeight: 1600,
          useWebWorker: true
        });

        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result as string;
          if (target === 'new') {
            this.newProp.images.push(base64);
          } else {
            this.editForm.images.push(base64);
          }
        };
        reader.readAsDataURL(compressedBlob);
      }
    } catch (err) {
      console.warn('Image compression fallback:', err);
    } finally {
      this.isCompressingImage.set(false);
      input.value = '';
    }
  }

  addPhotoByUrl(target: 'new' | 'edit') {
    const form = target === 'new' ? this.newProp : this.editForm;
    if (!form.customPhotoUrl || !form.customPhotoUrl.trim()) return;
    form.images.push(form.customPhotoUrl.trim());
    form.customPhotoUrl = '';
  }

  removePhoto(index: number, target: 'new' | 'edit') {
    const form = target === 'new' ? this.newProp : this.editForm;
    form.images.splice(index, 1);
  }

  saveProperty() {
    if (!this.newProp.title.trim()) return;

    const notes = this.newProp.ownerPrivateNotes.trim();
    const description = this.newProp.description.trim() ||
      (notes ? `${notes}` : `${this.newProp.title} in prime ${this.newProp.locality || this.newProp.city}.`);

    const propData: Omit<Property, 'id' | 'createdAt' | 'updatedAt'> = {
      tenantId: this.auth.activeTenantId(),
      title: this.newProp.title.trim(),
      description,
      propertyType: this.newProp.propertyType,
      listingType: this.newProp.listingType,
      status: this.newProp.status,
      price: this.newProp.price,
      negotiable: this.newProp.negotiable,
      area: this.newProp.area,
      areaUnit: this.newProp.areaUnit,
      facing: this.newProp.propertyType === 'villa' ? this.newProp.villaFacing : (this.newProp.propertyType === 'apartment' ? this.newProp.aptFacing : 'East'),
      location: {
        address: this.newProp.address.trim() || `${this.newProp.locality}, ${this.newProp.city}`,
        city: this.newProp.city.trim(),
        locality: this.newProp.locality.trim() || this.newProp.city.trim(),
        pincode: this.newProp.pincode.trim(),
        coordinates: this.newProp.coordinates,
        plotBoundary: this.newProp.plotBoundary,
        view3D: this.newProp.view3D
      },
      mapsUrl: this.newProp.mapsUrl.trim() || undefined,
      infrastructure: [...this.newProp.infrastructure],
      amenities: [...this.newProp.infrastructure.slice(0, 5)],
      images: this.newProp.images.length > 0
        ? [...this.newProp.images]
        : ['https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=80'],
      media: {
        photos: [...this.newProp.images],
        videoTourUrl: this.newProp.videoTourUrl.trim() || undefined
      },
      ownerDetails: {
        name: this.newProp.ownerName.trim() || 'Verified Property Owner',
        phone: this.newProp.ownerPhone.trim() || '+91 98000 00000',
        expectedPrice: this.newProp.ownerExpectedPrice || this.newProp.price,
        privateNotes: this.newProp.ownerPrivateNotes.trim() || undefined
      },
      assignedAgentId: this.auth.currentUser()?.uid || 'user_agent_01',
      assignedAgentName: this.auth.currentUser()?.displayName || 'Senior Advisor',
      createdBy: this.auth.currentUser()?.uid || 'user_admin_01'
    };

    // Attach specialized details
    if (this.newProp.propertyType === 'plot') {
      propData.plotDetails = {
        dimensions: this.newProp.plotDimensions.trim(),
        roadWidthFt: this.newProp.plotRoadWidth,
        approvalStatus: this.newProp.plotApprovals && this.newProp.plotApprovals.length > 0
          ? (this.newProp.plotApprovals.join(' & ') as any)
          : (this.newProp.plotApproval as any),
        isCornerPlot: this.newProp.isCornerPlot,
        hasBoundaryWall: this.newProp.hasBoundaryWall,
        isGatedLayout: this.newProp.isGatedLayout,
        soilType: this.newProp.soilType.trim()
      };
    } else if (this.newProp.propertyType === 'villa') {
      propData.bhk = `${this.newProp.villaBedrooms}BHK`;
      propData.bathrooms = this.newProp.villaBathrooms;
      propData.facing = this.newProp.villaFacing;
      propData.villaDetails = {
        plotArea: this.newProp.villaPlotArea,
        builtUpArea: this.newProp.villaBuiltUpArea,
        groundFloorBuiltUpArea: this.newProp.villaFloorsList[0]?.builtUpAreaSqFt || undefined,
        firstFloorBuiltUpArea: this.newProp.villaFloorsList[1]?.builtUpAreaSqFt || undefined,
        floors: this.newProp.villaFloors,
        buildingStructure: this.newProp.villaBuildingStructure,
        floorBreakdown: this.newProp.villaFloorsList.map(f => ({ ...f })),
        bedrooms: this.newProp.villaBedrooms,
        bathrooms: this.newProp.villaBathrooms,
        coveredParking: this.newProp.villaCoveredParking,
        carParking: this.newProp.villaCoveredParking ? (this.newProp.villaCarParking || 1) : 0,
        hasGarden: this.newProp.villaHasGarden,
        facing: this.newProp.villaFacing,
        roadFacing: this.newProp.villaRoadFacing,
        mainEntranceFacing: this.newProp.villaMainEntranceFacing,
        furnishing: this.newProp.villaFurnishing
      };
    } else if (this.newProp.propertyType === 'apartment') {
      propData.bhk = this.newProp.aptBhk;
      propData.bathrooms = this.newProp.aptBathrooms;
      propData.apartmentDetails = {
        floorNumber: this.newProp.aptFloorNumber,
        totalFloors: this.newProp.aptTotalFloors,
        bhk: this.newProp.aptBhk,
        bathrooms: this.newProp.aptBathrooms,
        balconies: this.newProp.aptBalconies,
        monthlyMaintenance: this.newProp.aptMonthlyMaintenance,
        udsSqFt: this.newProp.aptUdsSqFt,
        facing: this.newProp.aptFacing
      };
    }

    // Vicinity
    propData.vicinity = {
      metroDistance: this.newProp.vicinityMetro.trim() || undefined,
      highwayDistance: this.newProp.vicinityHighway.trim() || undefined,
      schoolDistance: this.newProp.vicinitySchool.trim() || undefined,
      hospitalDistance: this.newProp.vicinityHospital.trim() || undefined,
      airportDistance: this.newProp.vicinityAirport.trim() || undefined,
      busStopDistance: this.newProp.vicinityBusStop.trim() || undefined,
      marketDistance: this.newProp.vicinityMarket.trim() || undefined,
      locationMapUrl: this.newProp.vicinityLocationMap || undefined,
      customPoints: (this.newProp.vicinityCustomPoints || [])
        .filter(p => p.landmark && p.landmark.trim())
        .map(p => ({ landmark: p.landmark.trim(), distance: p.distance.trim() }))
    };

    this.propertyService.addProperty(propData);
    this.snackbarService.success(`Property "${propData.title}" created successfully!`);
    this.openAddModal.set(false);
    this.newProp = this.getInitialNewProp();
  }

  startEditProperty(prop: Property) {
    this.editingProperty.set(prop);
    this.editForm = {
      ...this.getInitialNewProp(),
      title: prop.title,
      description: prop.description,
      propertyType: prop.propertyType as any,
      listingType: prop.listingType as any,
      status: prop.status as any,
      price: prop.price,
      negotiable: prop.negotiable,
      area: prop.area,
      areaUnit: prop.areaUnit,
      locality: prop.location.locality,
      city: prop.location.city,
      address: prop.location.address,
      pincode: prop.location.pincode || '',
      mapsUrl: prop.mapsUrl || '',
      coordinates: prop.location.coordinates,
      plotBoundary: prop.location.plotBoundary ? [...prop.location.plotBoundary] : [],
      view3D: prop.location.view3D ? { ...prop.location.view3D } : undefined,
      infrastructure: prop.infrastructure ? [...prop.infrastructure] : [...prop.amenities],
      images: prop.images ? [...prop.images] : [],
      videoTourUrl: prop.media?.videoTourUrl || '',
      ownerName: prop.ownerDetails?.name || '',
      ownerPhone: prop.ownerDetails?.phone || '',
      ownerExpectedPrice: prop.ownerDetails?.expectedPrice || 0,
      ownerPrivateNotes: prop.ownerDetails?.privateNotes || '',
      // Plot
      plotDimensions: prop.plotDetails?.dimensions || '40 x 60',
      plotRoadWidth: prop.plotDetails?.roadWidthFt || 30,
      plotApprovals: prop.plotDetails?.approvalStatus
        ? prop.plotDetails.approvalStatus.split(/\s*&\s*|\s*,\s*/)
        : ['DTCP Approved'],
      plotApproval: (prop.plotDetails?.approvalStatus as any) || 'DTCP Approved',
      isCornerPlot: !!prop.plotDetails?.isCornerPlot,
      hasBoundaryWall: !!prop.plotDetails?.hasBoundaryWall,
      isGatedLayout: !!prop.plotDetails?.isGatedLayout,
      soilType: prop.plotDetails?.soilType || '',
      // Villa
      villaPlotArea: prop.villaDetails?.plotArea || 2000,
      villaBuiltUpArea: prop.villaDetails?.builtUpArea || 2600,
      villaFloors: prop.villaDetails?.floors || 'G+1 Duplex',
      villaBuildingStructure: prop.villaDetails?.buildingStructure || 'framed',
      villaBedrooms: prop.villaDetails?.bedrooms || 4,
      villaBathrooms: prop.villaDetails?.bathrooms || 4,
      villaCoveredParking: prop.villaDetails?.coveredParking !== undefined ? prop.villaDetails.coveredParking : true,
      villaCarParking: prop.villaDetails?.carParking || 2,
      villaHasGarden: !!prop.villaDetails?.hasGarden,
      villaFacing: prop.villaDetails?.facing || 'East',
      villaRoadFacing: prop.villaDetails?.roadFacing || prop.villaDetails?.facing || 'East',
      villaMainEntranceFacing: prop.villaDetails?.mainEntranceFacing || 'East',
      villaFurnishing: prop.villaDetails?.furnishing || 'semi-furnished',
      villaFloorsList: prop.villaDetails?.floorBreakdown && prop.villaDetails.floorBreakdown.length > 0
        ? prop.villaDetails.floorBreakdown.map(f => ({ ...f }))
        : [
            {
              floorLevel: 'Ground Floor',
              builtUpAreaSqFt: prop.villaDetails?.groundFloorBuiltUpArea || Math.round((prop.villaDetails?.builtUpArea || 2600) * 0.55),
              bhk: '2 BHK',
              bedroomsCount: 2,
              bathroomsCount: 2,
              hasAttachedBath: true,
              hasBalcony: false
            },
            {
              floorLevel: '1st Floor',
              builtUpAreaSqFt: prop.villaDetails?.firstFloorBuiltUpArea || Math.round((prop.villaDetails?.builtUpArea || 2600) * 0.45),
              bhk: '2 BHK',
              bedroomsCount: 2,
              bathroomsCount: 2,
              hasAttachedBath: true,
              hasBalcony: true
            }
          ],
      // Apartment
      aptFloorNumber: prop.apartmentDetails?.floorNumber || 3,
      aptTotalFloors: prop.apartmentDetails?.totalFloors || 10,
      aptBhk: prop.apartmentDetails?.bhk || prop.bhk || '3BHK',
      aptBathrooms: prop.apartmentDetails?.bathrooms || prop.bathrooms || 2,
      aptBalconies: prop.apartmentDetails?.balconies || 1,
      aptMonthlyMaintenance: prop.apartmentDetails?.monthlyMaintenance || 4000,
      aptUdsSqFt: prop.apartmentDetails?.udsSqFt || 550,
      aptFacing: prop.apartmentDetails?.facing || 'East',
      // Vicinity
      vicinityMetro: prop.vicinity?.metroDistance || '',
      vicinityHighway: prop.vicinity?.highwayDistance || '',
      vicinitySchool: prop.vicinity?.schoolDistance || '',
      vicinityHospital: prop.vicinity?.hospitalDistance || '',
      vicinityAirport: prop.vicinity?.airportDistance || '',
      vicinityBusStop: prop.vicinity?.busStopDistance || '',
      vicinityMarket: prop.vicinity?.marketDistance || '',
      vicinityLocationMap: prop.vicinity?.locationMapUrl || '',
      vicinityCustomPoints: prop.vicinity?.customPoints ? prop.vicinity.customPoints.map(p => ({ ...p })) : []
    };
  }

  saveEditProperty() {
    const cur = this.editingProperty();
    if (!cur || !this.editForm.title.trim()) return;

    const updates: Partial<Property> = {
      title: this.editForm.title.trim(),
      description: this.editForm.description.trim(),
      propertyType: this.editForm.propertyType,
      listingType: this.editForm.listingType,
      status: this.editForm.status,
      price: this.editForm.price,
      negotiable: this.editForm.negotiable,
      area: this.editForm.area,
      areaUnit: this.editForm.areaUnit,
      location: {
        address: this.editForm.address.trim() || `${this.editForm.locality}, ${this.editForm.city}`,
        city: this.editForm.city.trim(),
        locality: this.editForm.locality.trim() || this.editForm.city.trim(),
        pincode: this.editForm.pincode.trim(),
        coordinates: this.editForm.coordinates,
        plotBoundary: this.editForm.plotBoundary,
        view3D: this.editForm.view3D
      },
      mapsUrl: this.editForm.mapsUrl.trim() || undefined,
      infrastructure: [...this.editForm.infrastructure],
      images: [...this.editForm.images],
      media: {
        photos: [...this.editForm.images],
        videoTourUrl: this.editForm.videoTourUrl.trim() || undefined
      },
      ownerDetails: {
        name: this.editForm.ownerName.trim() || cur.ownerDetails.name,
        phone: this.editForm.ownerPhone.trim() || cur.ownerDetails.phone,
        expectedPrice: this.editForm.ownerExpectedPrice,
        privateNotes: this.editForm.ownerPrivateNotes.trim()
      }
    };

    if (this.editForm.propertyType === 'plot') {
      updates.plotDetails = {
        dimensions: this.editForm.plotDimensions.trim(),
        roadWidthFt: this.editForm.plotRoadWidth,
        approvalStatus: this.editForm.plotApprovals && this.editForm.plotApprovals.length > 0
          ? (this.editForm.plotApprovals.join(' & ') as any)
          : (this.editForm.plotApproval as any),
        isCornerPlot: this.editForm.isCornerPlot,
        hasBoundaryWall: this.editForm.hasBoundaryWall,
        isGatedLayout: this.editForm.isGatedLayout,
        soilType: this.editForm.soilType.trim()
      };
    } else if (this.editForm.propertyType === 'villa') {
      updates.bhk = `${this.editForm.villaBedrooms}BHK`;
      updates.bathrooms = this.editForm.villaBathrooms;
      updates.facing = this.editForm.villaFacing;
      updates.villaDetails = {
        plotArea: this.editForm.villaPlotArea,
        builtUpArea: this.editForm.villaBuiltUpArea,
        groundFloorBuiltUpArea: this.editForm.villaFloorsList[0]?.builtUpAreaSqFt || undefined,
        firstFloorBuiltUpArea: this.editForm.villaFloorsList[1]?.builtUpAreaSqFt || undefined,
        floors: this.editForm.villaFloors,
        buildingStructure: this.editForm.villaBuildingStructure,
        floorBreakdown: this.editForm.villaFloorsList.map(f => ({ ...f })),
        bedrooms: this.editForm.villaBedrooms,
        bathrooms: this.editForm.villaBathrooms,
        coveredParking: this.editForm.villaCoveredParking,
        carParking: this.editForm.villaCoveredParking ? (this.editForm.villaCarParking || 1) : 0,
        hasGarden: this.editForm.villaHasGarden,
        facing: this.editForm.villaFacing,
        roadFacing: this.editForm.villaRoadFacing,
        mainEntranceFacing: this.editForm.villaMainEntranceFacing,
        furnishing: this.editForm.villaFurnishing
      };
    } else if (this.editForm.propertyType === 'apartment') {
      updates.bhk = this.editForm.aptBhk;
      updates.bathrooms = this.editForm.aptBathrooms;
      updates.apartmentDetails = {
        floorNumber: this.editForm.aptFloorNumber,
        totalFloors: this.editForm.aptTotalFloors,
        bhk: this.editForm.aptBhk,
        bathrooms: this.editForm.aptBathrooms,
        balconies: this.editForm.aptBalconies,
        monthlyMaintenance: this.editForm.aptMonthlyMaintenance,
        udsSqFt: this.editForm.aptUdsSqFt,
        facing: this.editForm.aptFacing
      };
    }

    updates.vicinity = {
      metroDistance: this.editForm.vicinityMetro.trim() || undefined,
      highwayDistance: this.editForm.vicinityHighway.trim() || undefined,
      schoolDistance: this.editForm.vicinitySchool.trim() || undefined,
      hospitalDistance: this.editForm.vicinityHospital.trim() || undefined,
      airportDistance: this.editForm.vicinityAirport.trim() || undefined,
      busStopDistance: this.editForm.vicinityBusStop.trim() || undefined,
      marketDistance: this.editForm.vicinityMarket.trim() || undefined,
      locationMapUrl: this.editForm.vicinityLocationMap || undefined,
      customPoints: (this.editForm.vicinityCustomPoints || [])
        .filter(p => p.landmark && p.landmark.trim())
        .map(p => ({ landmark: p.landmark.trim(), distance: p.distance.trim() }))
    };

    this.propertyService.updateProperty(cur.id, updates);
    this.snackbarService.success(`Property "${updates.title || cur.title}" updated successfully!`);
    this.editingProperty.set(null);
  }

  deleteProperty(prop: Property) {
    if (confirm(`Are you sure you want to delete "${prop.title}"?`)) {
      this.propertyService.deleteProperty(prop.id);
      this.snackbarService.info(`Property "${prop.title}" removed from inventory.`);
    }
  }

  // --- Sharing Operations ---
  shareDurationHours = 24;
  shareIncludePrice = true;
  shareIncludeLocation = true;
  shareAntiScreenshot = true;
  showSecureLinkConfig = signal<boolean>(false);
  isCustomDuration = signal<boolean>(false);
  customDurationValue = 12;
  customDurationUnit: 'hours' | 'days' = 'hours';
  generatedSecureUrl = signal<string | null>(null);
  isGeneratingSecureLink = signal<boolean>(false);
  secureLinkCopiedNotice = signal<boolean>(false);

  toggleSecureLinkConfig() {
    this.showSecureLinkConfig.update(v => !v);
  }

  selectPresetDuration(hours: number) {
    this.isCustomDuration.set(false);
    this.shareDurationHours = hours;
  }

  selectCustomDuration() {
    this.isCustomDuration.set(true);
    this.updateCustomDuration();
  }

  updateCustomDuration() {
    const val = Number(this.customDurationValue) || 1;
    if (this.customDurationUnit === 'days') {
      this.shareDurationHours = Math.max(1, val) * 24;
    } else {
      this.shareDurationHours = Math.max(1, val);
    }
  }

  openShareModal(prop: Property) {
    this.shareModalProperty.set(prop);
    this.generatedSecureUrl.set(null);
    this.showSecureLinkConfig.set(false);
    this.isCustomDuration.set(false);
    this.customDurationValue = 12;
    this.customDurationUnit = 'hours';
    this.shareIncludePrice = true;
    this.shareIncludeLocation = true;
    this.shareDurationHours = 24;
  }

  closeShareModal() {
    this.shareModalProperty.set(null);
    this.generatedSecureUrl.set(null);
    this.showSecureLinkConfig.set(false);
  }

  async generateSecureShareLink(prop: Property) {
    this.isGeneratingSecureLink.set(true);
    try {
      const link = await this.secureShareService.createSecureLink(prop, {
        durationHours: this.shareDurationHours,
        includePrice: this.shareIncludePrice,
        includeLocation: this.shareIncludeLocation,
        allowScreenshots: !this.shareAntiScreenshot,
        enableWatermark: this.shareAntiScreenshot
      });
      const url = this.secureShareService.getPublicShareUrl(link.id);
      this.generatedSecureUrl.set(url);
      this.snackbarService.success(`Secure expiring link created! (Valid for ${this.shareDurationHours} hours)`);
    } catch (err) {
      console.error('Error generating secure link:', err);
      this.snackbarService.error('Failed to generate secure link. Please try again.');
    } finally {
      this.isGeneratingSecureLink.set(false);
    }
  }

  async copySecureUrl() {
    const url = this.generatedSecureUrl();
    if (!url) return;
    await navigator.clipboard.writeText(url);
    this.secureLinkCopiedNotice.set(true);
    this.snackbarService.success('Secure link copied to clipboard!');
    setTimeout(() => this.secureLinkCopiedNotice.set(false), 2500);
  }

  shareSecureUrlViaWhatsApp(prop: Property) {
    const url = this.generatedSecureUrl();
    if (!url) return;
    const priceText = this.shareIncludePrice
      ? `Price: Rs. ${prop.price?.toLocaleString('en-IN')}`
      : `Price: Available on Request`;
    const locationText = this.shareIncludeLocation
      ? `Location: ${prop.location.locality}, ${prop.location.city}`
      : `Territory: ${prop.location.locality}, ${prop.location.city} (Exact location confidential)`;
    const text = encodeURIComponent(
      `*Exclusive Property Opportunity: ${prop.title}*\n` +
      `${locationText}\n` +
      `Area: ${prop.area} ${prop.areaUnit}\n` +
      `${priceText}\n\n` +
      `*Confidential Property Link (Expires in ${this.shareDurationHours}h):*\n` +
      `${url}\n\n` +
      `Note: Protected link. If you need extended viewing access, tap 'Request More Time' on the page.`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  }

  async downloadBrochure(prop: Property) {
    this.isGeneratingBrochure.set(true);
    this.loadingService.show('Generating Client Brochure...', 'Compiling specifications, images, and maps pin');
    try {
      await this.brochureService.generateAndShareBrochure(prop, {
        includePrice: this.shareIncludePrice,
        includeLocation: this.shareIncludeLocation
      });
      this.snackbarService.success('Client brochure generated successfully!');
    } catch (err) {
      console.error('Error generating brochure:', err);
      this.snackbarService.error('Failed to generate brochure. Please try again.');
    } finally {
      this.isGeneratingBrochure.set(false);
      this.loadingService.hide();
    }
  }

  shareViaWhatsApp(prop: Property) {
    this.brochureService.shareToWhatsApp(prop, {
      includePrice: this.shareIncludePrice,
      includeLocation: this.shareIncludeLocation
    });
  }

  async copyPitch(prop: Property) {
    const success = await this.brochureService.copyPitch(prop, {
      includePrice: this.shareIncludePrice,
      includeLocation: this.shareIncludeLocation
    });
    if (success) {
      this.copiedNotice.set(true);
      this.snackbarService.success('Pitch message copied to clipboard!');
      setTimeout(() => this.copiedNotice.set(false), 2500);
    }
  }

  async shareDeviceNative(prop: Property) {
    await this.brochureService.shareNative(prop, {
      includePrice: this.shareIncludePrice,
      includeLocation: this.shareIncludeLocation
    });
  }

  // Stats & Deal Triggers
  openStatsDrawer(prop: Property) {
    this.selectedPropertyForStats.set(prop);
  }

  handleCloseDeal(prop: Property) {
    this.selectedPropertyForStats.set(null);
    this.detailedProperty.set(null);
    this.dealModalProp = prop;
    this.dealModalOpen.set(true);
  }

  openDetails(prop: Property) {
    this.detailedProperty.set(prop);
  }

  getIntel(prop: Property) {
    return this.analyticsService.getPropertyIntelligence(prop);
  }
}
