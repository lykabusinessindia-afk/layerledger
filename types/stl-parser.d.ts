declare module 'stl-parser' {
  interface Triangle {
    vertices: [[number, number, number], [number, number, number], [number, number, number]];
  }

  interface STLData {
    triangles: Triangle[];
  }

  export default function parse(buffer: Uint8Array): STLData;
}