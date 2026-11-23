import {
  Component,
  ElementRef,
  ViewChild,
  OnInit,
  AfterViewInit,
  OnDestroy,
  input,
  output,
  signal,
  computed,
  effect,
  inject,
  NgZone,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';
import { PlotCoordinate, PlotBoundaryPoint, Plot3DConfig } from '../../../core/models/models';

@Component({
  selector: 'app-plot-map-viewer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './plot-map-viewer.component.html',
  styleUrls: ['./plot-map-viewer.component.scss']
})
export class PlotMapViewerComponent implements OnInit, AfterViewInit, OnDestroy {
  // Inputs
  coordinates = input<PlotCoordinate | undefined>(undefined);
  plotBoundary = input<PlotBoundaryPoint[]>([]);
  view3D = input<Plot3DConfig | undefined>(undefined);
  editable = input<boolean>(false);
  locality = input<string>('');
  city = input<string>('');
  propertyTitle = input<string>('');
  plotDimensions = input<string>('');
  area = input<number | undefined>(undefined);
  areaUnit = input<string>('sqft');

  // Outputs
  coordinatesChange = output<PlotCoordinate>();
  plotBoundaryChange = output<PlotBoundaryPoint[]>();
  view3DChange = output<Plot3DConfig>();
  markedAreaChange = output<{ sqFt: number; cents: number; acres: number } | null>();

  @ViewChild('mapContainer') mapContainerRef!: ElementRef<HTMLDivElement>;
  @ViewChild('canvas3D') canvas3DRef!: ElementRef<HTMLCanvasElement>;

  private ngZone = inject(NgZone);
  private cdr = inject(ChangeDetectorRef);

  // UI State Signals
  readonly viewMode = signal<'2d' | '3d'>('2d');
  readonly mapLayer = signal<'satellite' | 'streets'>('satellite');
  readonly isDrawingBoundary = signal<boolean>(false);
  readonly showDimensionLabels = signal<boolean>(true);
  readonly show3DWalls = signal<boolean>(true);
  readonly showSetbacks = signal<boolean>(true);
  readonly facingDirection = signal<string>('North');
  readonly roadWidth = signal<number>(30);

  // Active Coordinates & Polygon state
  readonly activeCoords = signal<PlotCoordinate>({ lat: 12.9249, lng: 80.2486 });
  readonly activeBoundary = signal<PlotBoundaryPoint[]>([]);

  // Real-time calculated marked polygon area in sq.ft, cents, and acres
  readonly markedArea = computed(() => {
    const boundary = this.activeBoundary();
    if (boundary.length < 3) return null;

    const R = 6371e3; // Earth radius in meters
    const meanLat = boundary.reduce((sum, p) => sum + p.lat, 0) / boundary.length;
    const meanLng = boundary.reduce((sum, p) => sum + p.lng, 0) / boundary.length;
    const rad = Math.PI / 180;
    const cosLat = Math.cos(meanLat * rad);

    const points = boundary.map(p => ({
      x: (p.lng - meanLng) * rad * R * cosLat,
      y: (p.lat - meanLat) * rad * R
    }));

    let areaSqMeters = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      areaSqMeters += points[i].x * points[j].y - points[j].x * points[i].y;
    }
    areaSqMeters = Math.abs(areaSqMeters) / 2;

    const sqFt = Math.round(areaSqMeters * 10.7639);
    const cents = Number((sqFt / 435.6).toFixed(2));
    const acres = Number((sqFt / 43560).toFixed(3));

    return { sqFt, cents, acres };
  });

  // 3D Camera Controls
  readonly camera3D = signal<{ azimuth: number; pitch: number; zoom: number }>({
    azimuth: 35,
    pitch: 42,
    zoom: 1.0
  });

  // Internal Leaflet instances
  private map: L.Map | null = null;
  private tileLayer: L.TileLayer | null = null;
  private marker: L.Marker | null = null;
  private polygonLayer: L.Polygon | null = null;
  private vertexMarkers: L.CircleMarker[] = [];
  private dimensionTooltips: L.Tooltip[] = [];

  // Drag interaction state for 3D canvas
  private isPointerDown = false;
  private lastPointerX = 0;
  private lastPointerY = 0;
  private animationFrameId: number | null = null;
  private resizeObserver: ResizeObserver | null = null;

  constructor() {
    // Synchronize inputs when changed with guard against cyclical signal writes
    effect(() => {
      const coords = this.coordinates();
      if (coords && coords.lat && coords.lng) {
        const cur = this.activeCoords();
        if (cur.lat !== coords.lat || cur.lng !== coords.lng) {
          this.activeCoords.set({ lat: coords.lat, lng: coords.lng });
        }
      }
    }, { allowSignalWrites: true });

    effect(() => {
      const b = this.plotBoundary();
      if (b && b.length > 0) {
        const cur = this.activeBoundary();
        if (cur.length !== b.length || JSON.stringify(cur) !== JSON.stringify(b)) {
          this.activeBoundary.set([...b]);
          this.renderPolygon();
          setTimeout(() => this.autoFitToBoundary(), 50);
        }
      }
    }, { allowSignalWrites: true });

    effect(() => {
      const v3d = this.view3D();
      if (v3d) {
        if (v3d.facingDirection && this.facingDirection() !== v3d.facingDirection) {
          this.facingDirection.set(v3d.facingDirection);
        }
        if (v3d.roadWidthFt && this.roadWidth() !== v3d.roadWidthFt) {
          this.roadWidth.set(v3d.roadWidthFt);
        }
      }
    }, { allowSignalWrites: true });

    // Reactively emit calculated area to parent forms
    effect(() => {
      const area = this.markedArea();
      this.markedAreaChange.emit(area);
    });
  }

  ngOnInit(): void {
    // Fallback coordinates based on city if no coordinates provided (deferred to avoid NG0100)
    if (!this.coordinates() && (this.city() || this.locality())) {
      queueMicrotask(() => this.centerOnLocality());
    }
  }

  ngAfterViewInit(): void {
    if (this.viewMode() === '2d') {
      setTimeout(() => this.initLeafletMap(), 100);
    } else {
      setTimeout(() => this.init3DCanvas(), 100);
    }
  }

  ngOnDestroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  // =========================================================================
  // VIEW MODE SWITCHING (2D vs 3D)
  // =========================================================================

  setViewMode(mode: '2d' | '3d'): void {
    if (this.viewMode() === mode) return;
    this.viewMode.set(mode);
    this.cdr.markForCheck();

    if (mode === '2d') {
      setTimeout(() => {
        if (!this.map) {
          this.initLeafletMap();
        } else {
          this.map.invalidateSize();
          this.refreshMapLayers();
        }
      }, 100);
    } else {
      setTimeout(() => {
        this.init3DCanvas();
        this.render3DScene();
      }, 100);
    }
  }

  toggleMapLayer(): void {
    const nextLayer = this.mapLayer() === 'satellite' ? 'streets' : 'satellite';
    this.setMapLayer(nextLayer);
  }

  setMapLayer(layer: 'satellite' | 'streets'): void {
    if (this.mapLayer() !== layer) {
      this.mapLayer.set(layer);
      this.applyTileLayer();
      this.cdr.markForCheck();
    }
  }

  // =========================================================================
  // 2D LEAFLET MAP ENGINE
  // =========================================================================

  private initLeafletMap(): void {
    if (!this.mapContainerRef || this.map) return;
    const container = this.mapContainerRef.nativeElement;

    // Center immediately on boundary centroid if available
    const boundary = this.activeBoundary();
    let initialCenter: [number, number];
    if (boundary.length >= 2) {
      const latlngs: [number, number][] = boundary.map(p => [p.lat, p.lng]);
      const bounds = L.latLngBounds(latlngs);
      const center = bounds.getCenter();
      initialCenter = [center.lat, center.lng];
    } else {
      const coords = this.activeCoords();
      initialCenter = [coords.lat, coords.lng];
    }

    this.map = L.map(container, {
      center: initialCenter,
      zoom: 18,
      zoomControl: false,
      attributionControl: false,
      doubleClickZoom: false,
      // @ts-ignore
      tap: false
    });

    // Custom positioned zoom control on top right for mobile ergonomics
    L.control.zoom({ position: 'topright' }).addTo(this.map);

    this.applyTileLayer();
    this.setupMarker();
    this.renderPolygon();
    this.autoFitToBoundary();

    // Re-verify bounds and tile layout after modal/container animation settles
    setTimeout(() => {
      if (this.map) {
        this.map.invalidateSize();
        this.autoFitToBoundary();
      }
    }, 150);

    setTimeout(() => {
      if (this.map) {
        this.map.invalidateSize();
        this.autoFitToBoundary();
      }
    }, 350);

    if (this.editable()) {
      this.map.on('click', (e: L.LeafletMouseEvent) => {
        this.ngZone.run(() => {
          if (this.isDrawingBoundary()) {
            this.addBoundaryPoint(e.latlng.lat, e.latlng.lng);
          } else {
            this.updatePinLocation(e.latlng.lat, e.latlng.lng);
          }
          this.cdr.markForCheck();
        });
      });
    }

    // Auto-invalidate size and re-fit on container resize (e.g. modal opening)
    this.resizeObserver = new ResizeObserver(() => {
      if (this.map) {
        this.map.invalidateSize();
        if (this.activeBoundary().length >= 2) {
          this.autoFitToBoundary();
        }
      }
    });
    this.resizeObserver.observe(container);
  }

  private applyTileLayer(): void {
    if (!this.map) return;
    if (this.tileLayer) {
      this.map.removeLayer(this.tileLayer);
    }

    if (this.mapLayer() === 'satellite') {
      // High-resolution Esri World Imagery (Satellite) - Free, No API Key Required
      this.tileLayer = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 19 }
      ).addTo(this.map);
    } else {
      // OpenStreetMap Streets
      this.tileLayer = L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        { maxZoom: 19 }
      ).addTo(this.map);
    }
  }

  private setupMarker(): void {
    if (!this.map) return;
    const coords = this.activeCoords();

    const customIcon = L.divIcon({
      className: 'plotflow-map-marker-pin',
      html: `
        <div class="marker-pulse-ring"></div>
        <div class="marker-pin-head">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
            <circle cx="12" cy="10" r="3" fill="#ffffff"></circle>
          </svg>
        </div>
      `,
      iconSize: [36, 44],
      iconAnchor: [18, 42]
    });

    this.marker = L.marker([coords.lat, coords.lng], {
      icon: customIcon,
      draggable: this.editable()
    }).addTo(this.map);

    if (this.editable()) {
      this.marker.on('dragend', (e: any) => {
        const pos = e.target.getLatLng();
        this.updatePinLocation(pos.lat, pos.lng);
      });
    }
  }

  private updatePinLocation(lat: number, lng: number): void {
    const updated = { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) };
    this.activeCoords.set(updated);
    this.marker?.setLatLng([updated.lat, updated.lng]);
    queueMicrotask(() => this.coordinatesChange.emit(updated));
  }

  private renderPolygon(): void {
    if (!this.map) return;

    // Clear existing polygon and markers
    if (this.polygonLayer) {
      this.map.removeLayer(this.polygonLayer);
      this.polygonLayer = null;
    }
    this.vertexMarkers.forEach(m => this.map?.removeLayer(m));
    this.vertexMarkers = [];
    this.dimensionTooltips.forEach(t => this.map?.removeLayer(t));
    this.dimensionTooltips = [];

    const boundary = this.activeBoundary();
    if (boundary.length === 0) return;

    // Corner markers for every point marked
    for (let i = 0; i < boundary.length; i++) {
      const p = boundary[i];
      const vertex = L.circleMarker([p.lat, p.lng], {
        radius: 6,
        color: '#ffffff',
        fillColor: '#1a73e8',
        fillOpacity: 1,
        weight: 2,
        interactive: !this.isDrawingBoundary()
      }).addTo(this.map);
      this.vertexMarkers.push(vertex);
    }

    if (boundary.length < 3) {
      if (boundary.length === 2) {
        const latlngs: [number, number][] = boundary.map(p => [p.lat, p.lng]);
        this.polygonLayer = L.polyline(latlngs, {
          color: '#1a73e8',
          weight: 3,
          dashArray: '6, 6',
          interactive: false
        } as any).addTo(this.map) as any;
      }
      return;
    }

    const latlngs: [number, number][] = boundary.map(p => [p.lat, p.lng]);

    // Plot boundary polygon
    this.polygonLayer = L.polygon(latlngs, {
      color: '#1a73e8',
      weight: 3,
      fillColor: '#1a73e8',
      fillOpacity: 0.22,
      dashArray: this.isDrawingBoundary() ? '6, 6' : undefined,
      interactive: !this.isDrawingBoundary()
    }).addTo(this.map);

    // Add interactive vertices and dimension badges on edges (conditionally visible)
    if (this.showDimensionLabels()) {
      for (let i = 0; i < boundary.length; i++) {
        const p = boundary[i];
        const nextP = boundary[(i + 1) % boundary.length];

        // Edge dimension calculation in feet
        const distMeters = this.calculateDistanceMeters(p.lat, p.lng, nextP.lat, nextP.lng);
        const distFeet = Math.round(distMeters * 3.28084);

        // Only display dimension labels on discernible edges (>= 5 ft) to avoid clutter
        if (distFeet >= 5) {
          const midLat = (p.lat + nextP.lat) / 2;
          const midLng = (p.lng + nextP.lng) / 2;
          const tooltip = L.tooltip({
            permanent: true,
            direction: 'center',
            className: 'plot-dimension-tooltip',
            interactive: false
          })
            .setContent(`${distFeet} ft`)
            .setLatLng([midLat, midLng])
            .addTo(this.map);
          this.dimensionTooltips.push(tooltip);
        }
      }
    }
  }

  toggleDimensionLabels(): void {
    this.showDimensionLabels.update(v => !v);
    this.renderPolygon();
    this.cdr.markForCheck();
  }

  private refreshMapLayers(): void {
    const coords = this.activeCoords();
    this.marker?.setLatLng([coords.lat, coords.lng]);
    this.renderPolygon();
    this.autoFitToBoundary();
  }

  /**
   * Auto-fits map bounds to the marked boundary polygon
   * so the entire marked land is immediately centered and visible.
   */
  autoFitToBoundary(): void {
    if (!this.map) return;
    this.map.invalidateSize();
    const boundary = this.activeBoundary();
    if (boundary.length >= 2) {
      try {
        const latlngs: [number, number][] = boundary.map(p => [p.lat, p.lng]);
        const bounds = L.latLngBounds(latlngs);
        if (bounds.isValid()) {
          const center = bounds.getCenter();
          this.activeCoords.set({ lat: Number(center.lat.toFixed(6)), lng: Number(center.lng.toFixed(6)) });
          this.marker?.setLatLng(center);

          const size = this.map.getSize();
          if (size.x > 50 && size.y > 50) {
            this.map.fitBounds(bounds, {
              padding: [35, 35],
              maxZoom: 18,
              animate: false
            });
          } else {
            this.map.setView(center, 18, { animate: false });
          }
          return;
        }
      } catch (e) {
        console.warn('Could not auto-fit map bounds:', e);
      }
    }

    const coords = this.activeCoords();
    this.map.setView([coords.lat, coords.lng], 18, { animate: false });
  }

  // =========================================================================
  // BOUNDARY ACTIONS (DRAW, UNDO & CLEAR)
  // =========================================================================

  setDrawingMode(drawing: boolean): void {
    this.isDrawingBoundary.set(drawing);
    if (this.map) {
      if (drawing) {
        this.map.dragging.disable();
      } else {
        this.map.dragging.enable();
      }
    }
    this.updateMapCursor();
    this.cdr.markForCheck();
  }

  toggleDrawingMode(): void {
    this.setDrawingMode(!this.isDrawingBoundary());
  }

  updateMapCursor(): void {
    if (!this.map) return;
    const container = this.map.getContainer();
    if (this.isDrawingBoundary()) {
      container.classList.add('drawing-mode');
    } else {
      container.classList.remove('drawing-mode');
    }
  }

  addBoundaryPoint(lat: number, lng: number): void {
    const pt: PlotBoundaryPoint = {
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6)),
      label: `Corner ${this.activeBoundary().length + 1}`
    };
    const updated = [...this.activeBoundary(), pt];
    this.activeBoundary.set(updated);
    this.renderPolygon();
    queueMicrotask(() => this.plotBoundaryChange.emit(updated));

    // Keep pencil cursor active while drawing
    this.updateMapCursor();
    this.cdr.markForCheck();
  }

  undoLastPoint(): void {
    const current = this.activeBoundary();
    if (current.length === 0) return;
    const updated = current.slice(0, -1);
    this.activeBoundary.set(updated);
    this.renderPolygon();
    queueMicrotask(() => this.plotBoundaryChange.emit(updated));
    // Keep drawing mode active so user can immediately click the revised corner
    this.isDrawingBoundary.set(true);
    this.updateMapCursor();
    this.cdr.markForCheck();
  }

  clearBoundary(): void {
    this.activeBoundary.set([]);
    this.renderPolygon();
    queueMicrotask(() => this.plotBoundaryChange.emit([]));
    this.updateMapCursor();
    this.cdr.markForCheck();
  }

  /**
   * Auto-generates an oriented rectangle around the current pin
   * using plot dimensions (e.g. "40 x 60 ft") or total area.
   */
  autoGenerateBoundaryFromDimensions(): void {
    const center = this.activeCoords();
    let lengthFt = 60;
    let widthFt = 40;

    const dimStr = this.plotDimensions() || '';
    const match = dimStr.match(/(\d+(?:\.\d+)?)\s*(?:x|X|\*|by)\s*(\d+(?:\.\d+)?)/);
    if (match) {
      widthFt = parseFloat(match[1]);
      lengthFt = parseFloat(match[2]);
    } else if (this.area() && this.area()! > 0) {
      const areaSqft = this.areaUnit() === 'cent' ? this.area()! * 435.6 : this.area()!;
      // Golden ratio layout estimation (1:1.5)
      widthFt = Math.round(Math.sqrt(areaSqft / 1.5));
      lengthFt = Math.round(widthFt * 1.5);
    }

    // Convert feet to degrees latitude & longitude at current equator projection
    const metersPerLatDegree = 111320;
    const metersPerLngDegree = 40075000 * Math.cos((center.lat * Math.PI) / 180) / 360;

    const halfWidthMeters = (widthFt * 0.3048) / 2;
    const halfLengthMeters = (lengthFt * 0.3048) / 2;

    const dLat = halfLengthMeters / metersPerLatDegree;
    const dLng = halfWidthMeters / metersPerLngDegree;

    // 4 Corner Vertices (Front-Left, Front-Right, Rear-Right, Rear-Left)
    const points: PlotBoundaryPoint[] = [
      {
        lat: Number((center.lat - dLat).toFixed(6)),
        lng: Number((center.lng - dLng).toFixed(6)),
        label: 'Front-Left',
        dimensionFt: widthFt
      },
      {
        lat: Number((center.lat - dLat).toFixed(6)),
        lng: Number((center.lng + dLng).toFixed(6)),
        label: 'Front-Right',
        dimensionFt: lengthFt
      },
      {
        lat: Number((center.lat + dLat).toFixed(6)),
        lng: Number((center.lng + dLng).toFixed(6)),
        label: 'Rear-Right',
        dimensionFt: widthFt
      },
      {
        lat: Number((center.lat + dLat).toFixed(6)),
        lng: Number((center.lng - dLng).toFixed(6)),
        label: 'Rear-Left',
        dimensionFt: lengthFt
      }
    ];

    this.activeBoundary.set(points);
    this.renderPolygon();
    this.plotBoundaryChange.emit(points);

    // Also update 3D config
    const v3d: Plot3DConfig = {
      wallHeightFt: 5,
      buildingSetbackFt: { front: 5, rear: 4, left: 3, right: 3 },
      facingDirection: (this.facingDirection() as any) || 'North',
      roadWidthFt: this.roadWidth()
    };
    this.view3DChange.emit(v3d);
  }

  useCurrentGPS(): void {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          this.updatePinLocation(pos.coords.latitude, pos.coords.longitude);
          this.map?.setView([pos.coords.latitude, pos.coords.longitude], 18);
        },
        err => console.warn('Geolocation unavailable:', err),
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  }

  centerOnLocality(): void {
    // Standard coordinates for major Indian real estate hubs fallback
    const loc = `${this.locality()} ${this.city()}`.toLowerCase();
    let lat = 12.9249;
    let lng = 80.2486; // Chennai ECR Default

    if (loc.includes('bangalore') || loc.includes('bengaluru')) {
      lat = 12.9716; lng = 77.5946;
    } else if (loc.includes('hyderabad')) {
      lat = 17.3850; lng = 78.4867;
    } else if (loc.includes('mumbai')) {
      lat = 19.0760; lng = 72.8777;
    } else if (loc.includes('coimbatore')) {
      lat = 11.0168; lng = 76.9558;
    } else if (loc.includes('madurai')) {
      lat = 9.9252; lng = 78.1198;
    }

    this.updatePinLocation(lat, lng);
    this.map?.setView([lat, lng], 16);
  }

  openExternalGoogleMaps(): void {
    const coords = this.activeCoords();
    const url = `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`;
    window.open(url, '_blank');
  }

  // =========================================================================
  // 3D PERSPECTIVE ENGINE (HARDWARE-ACCELERATED ISOMETRIC CANVAS)
  // =========================================================================

  private init3DCanvas(): void {
    if (!this.canvas3DRef) return;
    const canvas = this.canvas3DRef.nativeElement;

    // Support High-DPI screens (Retina)
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    this.render3DScene();
  }

  onPointerDown(event: PointerEvent): void {
    this.isPointerDown = true;
    this.lastPointerX = event.clientX;
    this.lastPointerY = event.clientY;
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
  }

  onPointerMove(event: PointerEvent): void {
    if (!this.isPointerDown) return;
    const dx = event.clientX - this.lastPointerX;
    const dy = event.clientY - this.lastPointerY;
    this.lastPointerX = event.clientX;
    this.lastPointerY = event.clientY;

    const cam = this.camera3D();
    const nextAzimuth = (cam.azimuth + dx * 0.6) % 360;
    const nextPitch = Math.max(15, Math.min(75, cam.pitch - dy * 0.4));

    this.camera3D.set({
      ...cam,
      azimuth: nextAzimuth < 0 ? nextAzimuth + 360 : nextAzimuth,
      pitch: nextPitch
    });

    this.render3DScene();
  }

  onPointerUp(event: PointerEvent): void {
    this.isPointerDown = false;
  }

  zoom3D(delta: number): void {
    const cam = this.camera3D();
    const nextZoom = Math.max(0.6, Math.min(2.4, cam.zoom + delta));
    this.camera3D.set({ ...cam, zoom: nextZoom });
    this.render3DScene();
  }

  reset3DCamera(): void {
    this.camera3D.set({ azimuth: 35, pitch: 42, zoom: 1.0 });
    this.render3DScene();
  }

  toggle3DWalls(): void {
    this.show3DWalls.update(w => !w);
    this.render3DScene();
  }

  setFacing(direction: string): void {
    this.facingDirection.set(direction);
    this.render3DScene();
  }

  render3DScene(): void {
    if (!this.canvas3DRef) return;
    const canvas = this.canvas3DRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    // Background gradient (Warm Architectural Drafting Canvas)
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, '#f1f5f9');
    bgGrad.addColorStop(1, '#e2e8f0');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height / 2 + 30;

    const { azimuth, pitch, zoom } = this.camera3D();
    const radAzimuth = (azimuth * Math.PI) / 180;
    const radPitch = (pitch * Math.PI) / 180;

    // 3D Projection Helper (Isometric projection matrix)
    const project = (x: number, y: number, z: number) => {
      // Rotation around Z axis (azimuth)
      const rx = x * Math.cos(radAzimuth) - y * Math.sin(radAzimuth);
      const ry = x * Math.sin(radAzimuth) + y * Math.cos(radAzimuth);
      // Pitch tilt around X axis
      const px = rx;
      const py = ry * Math.sin(radPitch) - z * Math.cos(radPitch);
      return {
        x: centerX + px * zoom,
        y: centerY + py * zoom
      };
    };

    // Plot Physical Dimensions
    let plotW = 140; // visual width
    let plotL = 200; // visual length
    const dimMatch = (this.plotDimensions() || '').match(/(\d+)\s*(?:x|X|\*)\s*(\d+)/);
    if (dimMatch) {
      const w = parseInt(dimMatch[1], 10);
      const l = parseInt(dimMatch[2], 10);
      plotW = Math.max(90, Math.min(200, w * 3));
      plotL = Math.max(120, Math.min(260, l * 3));
    }

    const halfW = plotW / 2;
    const halfL = plotL / 2;

    // 1. Surrounding Terrain & Road Plane
    const roadWidthPx = 60;
    const roadY = halfL + roadWidthPx / 2;

    // Frontage Asphalt Road
    const r1 = project(-halfW - 80, halfL, 0);
    const r2 = project(halfW + 80, halfL, 0);
    const r3 = project(halfW + 80, halfL + roadWidthPx, 0);
    const r4 = project(-halfW - 80, halfL + roadWidthPx, 0);

    ctx.beginPath();
    ctx.moveTo(r1.x, r1.y);
    ctx.lineTo(r2.x, r2.y);
    ctx.lineTo(r3.x, r3.y);
    ctx.lineTo(r4.x, r4.y);
    ctx.closePath();
    ctx.fillStyle = '#475569';
    ctx.fill();

    // Road Center Line (White dashes)
    const midRoadY = halfL + roadWidthPx / 2;
    ctx.beginPath();
    ctx.setLineDash([12, 10]);
    const rm1 = project(-halfW - 80, midRoadY, 0.5);
    const rm2 = project(halfW + 80, midRoadY, 0.5);
    ctx.moveTo(rm1.x, rm1.y);
    ctx.lineTo(rm2.x, rm2.y);
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]);

    // 2. Base Plot Surface (Lush Green Lawn)
    const p1 = project(-halfW, -halfL, 0);
    const p2 = project(halfW, -halfL, 0);
    const p3 = project(halfW, halfL, 0);
    const p4 = project(-halfW, halfL, 0);

    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.lineTo(p3.x, p3.y);
    ctx.lineTo(p4.x, p4.y);
    ctx.closePath();
    ctx.fillStyle = '#86efac'; // Fresh turf green
    ctx.fill();
    ctx.strokeStyle = '#1e8e3e';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 3. Inner Buildable Setback Zone (Dashed gold box)
    if (this.showSetbacks()) {
      const sbX = 18;
      const sbY = 24;
      const s1 = project(-halfW + sbX, -halfL + sbY, 1);
      const s2 = project(halfW - sbX, -halfL + sbY, 1);
      const s3 = project(halfW - sbX, halfL - sbY, 1);
      const s4 = project(-halfW + sbX, halfL - sbY, 1);

      ctx.beginPath();
      ctx.setLineDash([6, 6]);
      ctx.moveTo(s1.x, s1.y);
      ctx.lineTo(s2.x, s2.y);
      ctx.lineTo(s3.x, s3.y);
      ctx.lineTo(s4.x, s4.y);
      ctx.closePath();
      ctx.fillStyle = 'rgba(250, 204, 21, 0.15)'; // Transparent gold
      ctx.fill();
      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.setLineDash([]);

      // Buildable Footprint Label
      const sMid = project(0, 0, 1);
      ctx.fillStyle = '#854d0e';
      ctx.font = 'bold 11px Plus Jakarta Sans, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Buildable Zone', sMid.x, sMid.y);
    }

    // 4. Extruded 3D Compound Walls (5ft height)
    if (this.show3DWalls()) {
      const wallH = 22; // pixel extrusion height

      // Helper for wall side face
      const drawWallFace = (
        x1: number, y1: number,
        x2: number, y2: number,
        fillColor: string,
        strokeColor: string
      ) => {
        const b1 = project(x1, y1, 0);
        const b2 = project(x2, y2, 0);
        const t2 = project(x2, y2, wallH);
        const t1 = project(x1, y1, wallH);

        ctx.beginPath();
        ctx.moveTo(b1.x, b1.y);
        ctx.lineTo(b2.x, b2.y);
        ctx.lineTo(t2.x, t2.y);
        ctx.lineTo(t1.x, t1.y);
        ctx.closePath();
        ctx.fillStyle = fillColor;
        ctx.fill();
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      };

      // Rear Wall (North)
      drawWallFace(-halfW, -halfL, halfW, -halfL, '#cbd5e1', '#94a3b8');
      // Left Wall (West)
      drawWallFace(-halfW, halfL, -halfW, -halfL, '#94a3b8', '#64748b');
      // Right Wall (East)
      drawWallFace(halfW, -halfL, halfW, halfL, '#e2e8f0', '#cbd5e1');
      // Front Wall with Entrance Gate
      const gateW = 35;
      drawWallFace(-halfW, halfL, -gateW / 2, halfL, '#cbd5e1', '#94a3b8');
      drawWallFace(gateW / 2, halfL, halfW, halfL, '#cbd5e1', '#94a3b8');

      // Gate opening line
      const g1 = project(-gateW / 2, halfL, 0);
      const g2 = project(gateW / 2, halfL, 0);
      ctx.beginPath();
      ctx.moveTo(g1.x, g1.y);
      ctx.lineTo(g2.x, g2.y);
      ctx.strokeStyle = '#f59e0b'; // Amber gate line
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // 5. 3D Floating Dimension Badges
    const frontMid = project(0, halfL + 12, 0);
    const sideMid = project(halfW + 16, 0, 0);

    const fDim = dimMatch ? `${dimMatch[1]} ft Road Frontage` : 'Road Frontage';
    const sDim = dimMatch ? `${dimMatch[2]} ft Depth` : 'Plot Depth';

    this.drawFloatingBadge(ctx, frontMid.x, frontMid.y, fDim, '#1a73e8');
    this.drawFloatingBadge(ctx, sideMid.x, sideMid.y, sDim, '#334155');

    // 6. Interactive 3D Compass (Vastu Orientation)
    this.draw3DCompass(ctx, 45, 45, radAzimuth);

    ctx.restore();
  }

  private drawFloatingBadge(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    text: string,
    bgColor: string
  ): void {
    ctx.font = '600 11px Plus Jakarta Sans, sans-serif';
    const textW = ctx.measureText(text).width;
    const padX = 8;
    const padY = 4;

    ctx.beginPath();
    ctx.roundRect(x - textW / 2 - padX, y - 10 - padY, textW + padX * 2, 20 + padY, 6);
    ctx.fillStyle = bgColor;
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
  }

  private draw3DCompass(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radAzimuth: number
  ): void {
    ctx.save();
    ctx.translate(x, y);

    // Compass circle backing
    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.fill();
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Rotate arrow towards North relative to azimuth
    ctx.rotate(-radAzimuth);

    // North Needle (Red)
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(6, 0);
    ctx.lineTo(-6, 0);
    ctx.closePath();
    ctx.fillStyle = '#dc2626';
    ctx.fill();

    // South Needle (Gray)
    ctx.beginPath();
    ctx.moveTo(0, 18);
    ctx.lineTo(6, 0);
    ctx.lineTo(-6, 0);
    ctx.closePath();
    ctx.fillStyle = '#94a3b8';
    ctx.fill();

    ctx.fillStyle = '#dc2626';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('N', 0, -20);

    ctx.restore();
  }

  private calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth radius in meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }
}

