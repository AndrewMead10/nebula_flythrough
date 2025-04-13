# Nebula Flythrough

A Next.js application that creates a 3D flythrough effect for nebula images using Three.js. The application uses a depth map to create a parallax effect, making the nebula appear three-dimensional as the camera moves through the scene.

## Features

- 3D visualization of nebula images using Three.js
- Depth map-based displacement for realistic 3D effect
- Smooth camera animation
- Responsive design
- TypeScript support
- Ready for Vercel deployment

## Prerequisites

- Node.js 18.17 or later
- npm or yarn

## Setup

1. Clone the repository:
```bash
git clone <your-repo-url>
cd nebula_flythrough
```

2. Install dependencies:
```bash
npm install
```

3. Add your images:
- Place your nebula image as `nebula.jpg` in the `public` directory
- Place your depth map as `depth.jpg` in the `public` directory

## Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Deployment

The easiest way to deploy this application is using Vercel:

1. Push your code to a Git repository
2. Visit [Vercel](https://vercel.com)
3. Import your repository
4. Deploy

## Configuration

You can adjust various parameters in the `src/components/NebulaFlythrough.tsx` file:

- `initialCameraZ`: Starting position of the camera (default: 5)
- `targetCameraZ`: End position of the camera (default: -5)
- `animationDuration`: Length of the animation in milliseconds (default: 10000)
- `displacementScale`: Strength of the 3D effect (default: 2.0)

## License

MIT
