# Implementation Plan: Interactive 2D & 3D Plot Mapping & Boundary Marking

This plan outlines the architecture, data models, and UI components to allow brokers to **mark, boundary-draw, and visualize their real estate plots and properties on an interactive 2D Map (Satellite & Street) and an interactive 3D Perspective View (Extruded Boundary, Road Frontage, Setbacks & Sun Orientation)** when creating, editing, and inspecting properties in PlotFlow.

---

## 1. Goal Description

Brokers and land promoters frequently sell plots, agricultural land, and villas where exact physical boundaries, road access, and layout shape are critical closing factors. Currently, PlotFlow only saves a text address and Google Maps URL. 

This enhancement enables brokers to:
1. **Pinpoint Plot Coordinates**: Place an exact GPS pin on an interactive map (with locality auto-centering & device GPS).
2. **Mark & Draw Plot Boundaries (2D)**: Draw a 4-point (or multi-vertex) polygon boundary, or click **"Auto-Generate Boundary from Dimensions"** (e.g. 40ft × 60ft) around the pin.
3. **Toggle Interactive 2D & 3D Views**:
   - **2D Map View**: OpenStreetMap & High-Resolution Satellite imagery showing plot footprint, boundary vertex markers, edge dimension labels, and access road.
   - **3D Perspective View**: Hardware-accelerated canvas/WebGL 3D engine showing the plot elevated in 3D space with boundary compound walls, road frontage, setbacks, facing compass (Vastu/Solar orientation), and smooth 360° orbit / pitch tilt controls.
4. **Persist to Firestore & Offline Storage**: Save `coordinates`, `boundary`, and `view3D` configurations to the property record in `/tenants/{tenantId}/properties/{propertyId}` and local IndexedDB.
5. **Inspect in Property Dossier & Brochure**: Display the interactive 2D/3D toggle widget in the Property Details Dossier modal and include coordinate/boundary badges in property cards.

---

## 2. Architecture & Tech Stack

```
+---------------------------------------------------------------------------------+
|                       PlotFlow Property Ingestion & Dossier                     |
+---------------------------------------------------------------------------------+
                                      |
         +----------------------------+----------------------------+
         |                                                         |
         v                                                         v
+-----------------------------+                           +-----------------------------+
|   2D Interactive Map Engine  |                           |   3D Interactive Plot Canvas |
| (Leaflet + OpenStreetMap &  |                           | (WebGL / Canvas Isometric 3D|
|    Esri Satellite Tiles)    |                           |  with Orbit/Tilt Controls)  |
+-----------------------------+                           +-----------------------------+
| - Pin drop & drag           |                           | - 3D Compound Wall extrusion|
| - Polygon boundary marking  |                           | - Road frontage & curbs     |
| - Auto-box from 40x60 specs |                           | - Setback & buildable zone  |
| - Satellite / Road toggle   |                           | - Compass & Sun orientation |
+-----------------------------+                           +-----------------------------+
                                      |
                                      v
+---------------------------------------------------------------------------------+
|                          Data Model & Firestore Sync                            |
|             Property.location.coordinates & Property.location.plotBoundary      |
|             Scoped under: /tenants/{tenantId}/properties/{propertyId}           |
+---------------------------------------------------------------------------------+
```

### Key Technical Decisions
1. **Mapping Engine**: `leaflet` with OpenStreetMap & Esri World Imagery (Satellite).
   - **Zero API Keys & Zero Cost**: 100% free tiles with global coverage; no Google Maps billing limits or credit card requirements.
   - **Offline-Resilient**: Graceful fallback to schematic grid when offline or on unstable cellular connections.
2. **3D Perspective Engine**: Dedicated Angular Standalone Component (`PlotVisualizer3dComponent`) utilizing an HTML5 Canvas WebGL/Isometric 3D renderer.
   - Zero heavy external 3D engine overhead (~0 MB extra bundle).
   - Real-time interactive controls: Mouse/touch drag to rotate (0°–360°), tilt pitch (15°–75°), zoom (0.6x–2.0x), reset perspective.
   - Visualizes realistic boundary walls (with brick/concrete texture), green lawn/soil surface, frontage road with lane divider, corner plot markers, and 3D North Compass.

---

## 3. Data Model Updates

In `src/app/core/models/models.ts`:

```typescript
export interface PlotCoordinate {
  lat: number;
  lng: number;
}

export interface PlotBoundaryPoint extends PlotCoordinate {
  label?: string; // e.g. "Front-Left", "Rear-Right"
  dimensionFt?: number; // edge length in feet to next point
}

export interface Plot3DConfig {
  wallHeightFt?: number; // e.g. 5ft compound wall
  buildingSetbackFt?: { front: number; rear: number; left: number; right: number };
  facingDirection?: 'North' | 'South' | 'East' | 'West' | 'North-East' | 'North-West' | 'South-East' | 'South-West';
  roadWidthFt?: number;
  cornerPlot?: boolean;
}

export interface Property {
  // ... existing fields
  location: {
    address: string;
    city: string;
    locality: string;
    pincode?: string;
    coordinates?: PlotCoordinate;
    plotBoundary?: PlotBoundaryPoint[];
    view3D?: Plot3DConfig;
  };
  // ...
}
```

---

## 4. User Review Required

> [!IMPORTANT]
> **No Paid API Keys Needed**: We use Leaflet with OpenStreetMap and Esri World Satellite tiles. This ensures instant setup, zero monthly cloud bills, and compatibility on both web browsers and native Android APK (Capacitor).

> [!TIP]
> **Auto-Generate Boundary Feature**: Most brokers do not want to click 4 points manually on satellite maps. When a broker enters `Plot Dimensions: 40 x 60 ft` or `Area: 2400 sq.ft`, clicking **"Auto-Generate 2D/3D Boundary"** will automatically construct a mathematically accurate oriented rectangular plot boundary around their pin in 1 second!

---

## 5. Proposed Changes

### Component 1: Data Models & Dependencies
#### [MODIFY] `package.json`
- Add `leaflet` and `@types/leaflet`.

#### [MODIFY] `src/app/core/models/models.ts`
- Add `PlotCoordinate`, `PlotBoundaryPoint`, and `Plot3DConfig` interfaces to `Property.location`.

---

### Component 2: 2D & 3D Plot Map Shared Component
#### [NEW] `src/app/shared/components/plot-map-viewer/plot-map-viewer.component.ts`
#### [NEW] `src/app/shared/components/plot-map-viewer/plot-map-viewer.component.html`
#### [NEW] `src/app/shared/components/plot-map-viewer/plot-map-viewer.component.scss`
- **Features**:
  - Mode toggle: **[ 2D Satellite / Map ]** • **[ 3D Layout Perspective ]**.
  - **Editable Mode** (for Property Add/Edit form):
    - Pin drop on click with drag support.
    - Polygon boundary point click-to-add & clear.
    - Quick action buttons: `"Current GPS"`, `"Auto-Boundary from Dimensions"`, `"Center on City"`, `"Reset"`.
    - Layer switcher: Satellite Aerial vs OpenStreetMap Streets.
  - **Readonly Mode** (for Property Details Dossier & Quick Preview):
    - Interactive pan & zoom with plot boundary highlighted in Google Blue (`#1A73E8`) or Emerald Green (`#1E8E3E`).
    - Dimension overlay tags on edges (e.g. `40.0 ft`, `60.0 ft`).
    - One-click `"Open in Google Maps / Navigation"`.
  - **Interactive 3D Engine**:
    - Renders an isometric 3D canvas with ground plane, 3D extruded boundary walls (5ft high), road asphalt with striping, setback dashed lines, and Vastu compass arrow.
    - Smooth touch & mouse drag rotation (360° azimuth, 15°–75° elevation), zoom slider / pinch, and reset button.

---

### Component 3: Integration into Property Add & Edit Modals
#### [MODIFY] `src/app/pages/properties/properties.component.html`
- In Section 4 (**Location & Vicinity Connectivity**):
  - Replace static URL input with the live `<app-plot-map-viewer [editable]="true" ...>` component.
  - Show coordinates (`Lat: 12.9234, Lng: 80.2451`) and boundary vertices summary.
- In Section 2 (**Plot Details**):
  - Add **"Generate 2D/3D Boundary from Dimensions"** button that computes vertices based on `plotDimensions` (e.g. 40x60) or total `area`.
- In **Property Dossier Modal** (`dossier-modal`):
  - Embed the `<app-plot-map-viewer [editable]="false" ...>` under a prominent **"Site Boundary & 3D Spatial Layout"** card with the 2D/3D toggle.

#### [MODIFY] `src/app/pages/properties/properties.component.ts`
- Import `PlotMapViewerComponent`.
- Wire `newProp.location.coordinates`, `newProp.location.plotBoundary`, and `newProp.location.view3D` into save & edit pipelines.
- Add helper method `autoGenerateBoundaryFromDimensions(form: any)`.

---

### Component 4: Integration into Property Cards
#### [MODIFY] `src/app/shared/components/property-card/property-card.component.html`
#### [MODIFY] `src/app/shared/components/property-card/property-card.component.ts`
- Add a 2D/3D map badge:
  `<span class="map-badge" *ngIf="property.location.plotBoundary?.length" title="2D/3D Plot Boundary Mapped">📍 3D Mapped</span>`
- Clicking the badge opens the 3D Plot Map modal directly without opening the full edit form.

---

## 6. Verification Plan

### Automated Tests
1. **Build Verification**:
   ```bash
   npm run build
   ```
2. **Playwright E2E Tests**:
   - Update `e2e/flow-real-estate-e2e.spec.ts` to test Step 4 (Add Property):
     - Open "Add Property" modal.
     - Select Plot Type with dimensions `40 x 60 ft`.
     - Click "Auto-Generate 2D/3D Boundary".
     - Toggle between 2D Map View and 3D View.
     - Verify coordinates and plot boundary are saved.
     - Open Property Details Dossier and verify the 2D/3D visualizer renders.
   ```bash
   npx playwright test e2e/flow-real-estate-e2e.spec.ts
   ```

### Manual Verification
1. Open http://localhost:4200/properties.
2. Click **"+ Add New Property"**.
3. Select **"Residential Plot / Land"**, enter Locality `"ECR Panaiyur, Chennai"`.
4. Check the 2D Map: see pin placed on the map.
5. Click **"Auto-Generate 2D/3D Boundary"**: see the 40x60ft boundary polygon appear on the satellite map.
6. Switch to **"3D Layout Perspective"**: drag with mouse to orbit 360°, inspect the 3D compound wall, road frontage, and orientation compass.
7. Click **"Publish Property Listing"**: verify property card shows `📍 3D Mapped`.
8. Click the property to open the Dossier modal and inspect the interactive 3D viewer.

