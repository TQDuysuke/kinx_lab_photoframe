// Yearbook Layout Configs
// Each layout defines how photos are placed in the collage canvas

export const yearbookLayouts = [
  {
    name: 'classic_grid',
    label: 'Classic Grid',
    description: 'Header collage + Hero photo with text overlay',
    minPhotos: 2,
    maxPhotos: 8,
    slots: [
      // Top section
      { id: 'top-left',   zone: 'top',    x: 0,    y: 0,    w: 0.42, h: 0.40, layer: 0 },
      { id: 'top-right-1',zone: 'top',    x: 0.44, y: 0,    w: 0.36, h: 0.19, layer: 0 },
      { id: 'top-right-2',zone: 'top',    x: 0.44, y: 0.20, w: 0.36, h: 0.20, layer: 0 },
      { id: 'card-mid',   zone: 'top',    x: 0.25, y: 0.22, w: 0.18, h: 0.20, layer: 1, tilt: -3, shadow: true }, // overlapping polaroid
      // Bottom hero
      { id: 'hero',       zone: 'bottom', x: 0,    y: 0,    w: 1,    h: 1,    layer: 0 },
    ],
    backgroundStyle: 'blur', // bg from first photo blurred
    accentColor: '#2d5a27',  // dark green like ref
    accentColor2: '#d4a017', // golden yellow
  },
  {
    name: 'scatter',
    label: 'Polaroid Scatter',
    description: 'Overlapping polaroids with dynamic rotation',
    minPhotos: 3,
    maxPhotos: 6,
    // Dynamic positioning handled in canvas renderer
    slots: null, // renderer places photos dynamically
    backgroundStyle: 'solid',
    accentColor: '#1a1a1a',
    accentColor2: '#f5c518',
  },
  {
    name: 'minimal_duo',
    label: 'Minimal Duo',
    description: 'Two main photos with large typography below',
    minPhotos: 1,
    maxPhotos: 4,
    slots: [
      { id: 'left',  zone: 'main', x: 0,    y: 0, w: 0.50, h: 0.75, layer: 0 },
      { id: 'right', zone: 'main', x: 0.505,y: 0, w: 0.495,h: 0.75, layer: 0 },
    ],
    backgroundStyle: 'solid',
    accentColor: '#0a0a0a',
    accentColor2: '#d4a017',
  },
];
