/**
 * @vitest-environment jsdom
 */
import * as THREE from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SplatWidget } from '../src/SplatWidget';

const { createSparkInstanceMock } = vi.hoisted(() => ({
  createSparkInstanceMock: vi.fn(),
}));

vi.mock('@sparkjsdev/spark', () => ({
  SplatEdit: class {
    constructor(options: unknown) {
      Object.assign(this, options);
    }
  },
  SplatEditSdf: class {
    opacity = 1;
    position = { set() {} };

    constructor(options: unknown) {
      Object.assign(this, options);
    }
  },
  SplatEditSdfType: { SPHERE: 'sphere' },
}));

vi.mock('../src/renderer/SparkSetup', () => ({
  createSparkInstance: createSparkInstanceMock,
}));

describe('SplatWidget', () => {
  const tagName = 'splattie-widget-test';
  let render: ReturnType<typeof vi.fn>;
  let setAnimationLoop: ReturnType<typeof vi.fn>;
  let rafCallbacks: FrameRequestCallback[];

  beforeEach(() => {
    render = vi.fn();
    setAnimationLoop = vi.fn();
    rafCallbacks = [];

    if (!customElements.get(tagName)) {
      customElements.define(tagName, SplatWidget);
    }

    vi.stubGlobal('matchMedia', vi.fn((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })));
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
      rafCallbacks.push(callback);
      return rafCallbacks.length;
    }));

    createSparkInstanceMock.mockResolvedValue({
      renderer: {
        render,
        setAnimationLoop,
        dispose: vi.fn(),
        setClearColor: vi.fn(),
      },
      scene: new THREE.Scene(),
      camera: new THREE.PerspectiveCamera(60, 1, 0.001, 100),
      splatMesh: new THREE.Object3D(),
      skinning: null,
      bones: [],
      canvas: document.createElement('canvas'),
      baselinePositions: null,
      packedArray: null,
      packedSplatsRef: null,
    });
  });

  afterEach(() => {
    document.body.innerHTML = '';
    createSparkInstanceMock.mockReset();
    vi.unstubAllGlobals();
  });

  it('renders a finite static burst instead of starting the animation loop for reduced-motion users', async () => {
    const widget = document.createElement(tagName) as SplatWidget;
    widget.setAttribute('src', 'avatar.ply');

    await widget.connectedCallback();
    while (rafCallbacks.length > 0) {
      rafCallbacks.shift()!(performance.now());
    }

    expect(render).toHaveBeenCalledTimes(30);
    expect(setAnimationLoop).not.toHaveBeenCalled();
    expect(createSparkInstanceMock).toHaveBeenCalledWith(
      widget,
      'avatar.ply',
      0x0e0e14,
      undefined,
      undefined,
      'head',
    );
  });
});
