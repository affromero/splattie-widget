import * as THREE from 'three';

export interface BoneInfo {
  name: string;
  pos: [number, number, number];
  idx: number;
  parentIdx: number;
}

async function parseSplatPositions(url: string): Promise<Float32Array> {
  if (url.endsWith('.spz') || url.startsWith('blob:')) {
    return parsePlyPositions(url).catch(() => new Float32Array(0));
  }
  return parsePlyPositions(url);
}

async function parsePlyPositions(url: string): Promise<Float32Array> {
  const res = await fetch(url);
  const buffer = await res.arrayBuffer();
  const headerBytes = new Uint8Array(buffer, 0, Math.min(4096, buffer.byteLength));
  const header = new TextDecoder().decode(headerBytes);
  const endIdx = header.indexOf('end_header');
  const headerEnd = buffer.byteLength > endIdx ? header.indexOf('\n', endIdx) + 1 : 0;

  const vertexMatch = header.match(/element vertex (\d+)/);
  const numVerts = vertexMatch ? parseInt(vertexMatch[1]) : 0;

  const props: string[] = [];
  for (const line of header.split('\n')) {
    if (line.startsWith('property ')) props.push(line.trim());
    if (line === 'end_header') break;
  }

  let bytesPerVertex = 0;
  for (const p of props) {
    if (p.includes('float')) bytesPerVertex += 4;
    else if (p.includes('double')) bytesPerVertex += 8;
    else if (p.includes('uchar') || p.includes('uint8')) bytesPerVertex += 1;
    else if (p.includes('short') || p.includes('int16')) bytesPerVertex += 2;
    else if (p.includes('int') || p.includes('uint')) bytesPerVertex += 4;
  }

  const data = new DataView(buffer, headerEnd);
  const positions = new Float32Array(numVerts * 3);
  for (let i = 0; i < numVerts; i++) {
    const offset = i * bytesPerVertex;
    positions[i * 3] = data.getFloat32(offset, true);
    positions[i * 3 + 1] = data.getFloat32(offset + 4, true);
    positions[i * 3 + 2] = data.getFloat32(offset + 8, true);
  }
  return positions;
}

export interface SparkInstance {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  splatMesh: unknown;
  skinning: unknown;
  bones: BoneInfo[];
  canvas: HTMLCanvasElement;
  baselinePositions: Float32Array | null;
  packedArray: Uint32Array | null;
  packedSplatsRef: { needsUpdate: boolean } | null;
}

export async function createSparkInstance(
  container: HTMLElement,
  splatUrl: string,
  backgroundColor: number,
  boneTreeUrl?: string,
  lbsWeightsUrl?: string,
  assetType: 'head' | 'body' | 'object' = 'head',
): Promise<SparkInstance> {
  const { SparkRenderer, SplatMesh, SplatSkinning, SplatSkinningMode } = await import('@sparkjsdev/spark');

  const canvas = document.createElement('canvas');
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
  container.appendChild(canvas);

  const width = container.clientWidth || 600;
  const height = container.clientHeight || 500;

  const renderer = new THREE.WebGLRenderer({ canvas });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(backgroundColor);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, width / height, 0.001, 100);
  camera.position.set(0, 0, 0.5);
  camera.lookAt(0, 0, 0);

  const spark = new SparkRenderer({ renderer });
  scene.add(spark);

  const splatMesh = await new Promise<InstanceType<typeof SplatMesh>>((resolve) => {
    const mesh = new SplatMesh({
      url: splatUrl,
      sphericalHarmonicsDegree: 0,
      onLoad: () => {
        // Auto-center camera on the loaded splat
        const box = new THREE.Box3().setFromObject(mesh as unknown as THREE.Object3D);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        if (maxDim > 0) {
          camera.position.set(center.x, center.y, center.z + maxDim * 2);
          camera.lookAt(center);
        }
        resolve(mesh);
      },
    } as Record<string, unknown>);
    scene.add(mesh);
  });

  let skinning: InstanceType<typeof SplatSkinning> | null = null;
  const bones: BoneInfo[] = [];
  let baselinePositions: Float32Array | null = null;

  if (boneTreeUrl && lbsWeightsUrl && assetType === 'body') {
    // SMPL-X body rig: flat 55-joint skeleton + sparse top-K per-gaussian weights
    // (produced by methods/lhm/bundle.py). No virtual bones — the look-at rotates
    // the spine/neck/head chain directly.
    const [skeleton, weights] = (await Promise.all([
      fetch(boneTreeUrl).then((r) => r.json()),
      fetch(lbsWeightsUrl).then((r) => r.json()),
    ])) as [
      { names: string[]; parents: number[]; restPositions: number[][] },
      { numGaussians: number; k: number; indices: number[]; weights: number[] },
    ];

    skeleton.names.forEach((name, idx) => {
      bones.push({ name, pos: skeleton.restPositions[idx] as [number, number, number], idx, parentIdx: skeleton.parents[idx] });
    });

    skinning = new SplatSkinning({
      mesh: splatMesh,
      numBones: bones.length,
      mode: SplatSkinningMode.DUAL_QUATERNION,
    });
    const identityQuat = new THREE.Quaternion();
    for (const bone of bones) {
      skinning.setRestQuatPos(bone.idx, identityQuat, new THREE.Vector3(...bone.pos));
    }

    const k = weights.k;
    const numSplats = Math.min(weights.numGaussians, skinning.numSplats);
    for (let i = 0; i < numSplats; i++) {
      const o = i * k;
      skinning.setSplatBones(
        i,
        new THREE.Vector4(weights.indices[o] ?? 0, weights.indices[o + 1] ?? 0, weights.indices[o + 2] ?? 0, weights.indices[o + 3] ?? 0),
        new THREE.Vector4(weights.weights[o] ?? 0, weights.weights[o + 1] ?? 0, weights.weights[o + 2] ?? 0, weights.weights[o + 3] ?? 0),
      );
    }

    (splatMesh as unknown as { skinning: unknown }).skinning = skinning;
    skinning.updateBones();
  } else if (boneTreeUrl && lbsWeightsUrl) {
    const [boneTree, lbsWeights, splatPositions] = await Promise.all([
      fetch(boneTreeUrl).then((r) => r.json()),
      fetch(lbsWeightsUrl).then((r) => r.json()),
      parseSplatPositions(splatUrl),
    ]) as [{ bones: Array<{ name: string; position: number[]; children?: unknown[] }> }, number[][], Float32Array];

    function flattenBones(
      node: { name: string; position: number[]; children?: unknown[] },
      parentIdx: number,
    ): void {
      const idx = bones.length;
      bones.push({ name: node.name, pos: node.position as [number, number, number], idx, parentIdx });
      const children = node.children as Array<{ name: string; position: number[]; children?: unknown[] }> | undefined;
      if (children) children.forEach((c) => flattenBones(c, idx));
    }
    flattenBones(boneTree.bones[0], -1);

    skinning = new SplatSkinning({
      mesh: splatMesh,
      numBones: bones.length,
      mode: SplatSkinningMode.DUAL_QUATERNION,
    });

    const identityQuat = new THREE.Quaternion();
    for (const bone of bones) {
      skinning.setRestQuatPos(bone.idx, identityQuat, new THREE.Vector3(...bone.pos));
    }

    const numSplats = Math.min(lbsWeights.length, skinning.numSplats);

    for (let i = 0; i < numSplats; i++) {
      const origWeights = lbsWeights[i];
      const allWeights: [number, number][] = origWeights.map((val, idx) => [idx, val]);
      allWeights.sort((a, b) => b[1] - a[1]);
      const top4 = allWeights.slice(0, 4);
      const sum = top4.reduce((s, p) => s + p[1], 0) || 1;
      skinning.setSplatBones(
        i,
        new THREE.Vector4(top4[0]?.[0] ?? 0, top4[1]?.[0] ?? 0, top4[2]?.[0] ?? 0, top4[3]?.[0] ?? 0),
        new THREE.Vector4((top4[0]?.[1] ?? 0) / sum, (top4[1]?.[1] ?? 0) / sum, (top4[2]?.[1] ?? 0) / sum, (top4[3]?.[1] ?? 0) / sum),
      );
    }

    (splatMesh as unknown as { skinning: unknown }).skinning = skinning;
    skinning.updateBones();
    baselinePositions = splatPositions;
  }

  // Expose packed splat buffer for expression basis per-splat position updates
  let packedArray: Uint32Array | null = null;
  let packedSplatsRef: { needsUpdate: boolean } | null = null;

  const meshAny = splatMesh as unknown as Record<string, unknown>;
  const ps = meshAny.packedSplats as { packedArray?: Uint32Array; needsUpdate?: boolean } | undefined;
  if (ps?.packedArray) {
    packedArray = ps.packedArray;
    packedSplatsRef = ps as { needsUpdate: boolean };
  }

  return { renderer, scene, camera, splatMesh, skinning, bones, canvas, baselinePositions, packedArray, packedSplatsRef };
}
