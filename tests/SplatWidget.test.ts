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
    isObject3D = true;
    parent = null;
    constructor(options: unknown) {
      Object.assign(this, options);
    }

    dispatchEvent() {}
    removeFromParent() {}
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

  beforeEach(() => {
    render = vi.fn();
    setAnimationLoop = vi.fn();

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

  it('keeps cursor tracking live for reduced-motion users', async () => {
    const setBoneQuatPos = vi.fn();
    const updateBones = vi.fn();
    createSparkInstanceMock.mockResolvedValueOnce({
      renderer: {
        render,
        setAnimationLoop,
        dispose: vi.fn(),
        setClearColor: vi.fn(),
      },
      scene: new THREE.Scene(),
      camera: new THREE.PerspectiveCamera(60, 1, 0.001, 100),
      splatMesh: new THREE.Object3D(),
      skinning: { setBoneQuatPos, updateBones },
      bones: [
        { name: 'neck', pos: [0, 0, 0], idx: 0, parentIdx: -1 },
        { name: 'leftEye', pos: [-0.03, 0.04, 0.08], idx: 1, parentIdx: 0 },
        { name: 'rightEye', pos: [0.03, 0.04, 0.08], idx: 2, parentIdx: 0 },
        { name: 'jaw', pos: [0, -0.04, 0.04], idx: 3, parentIdx: 0 },
      ],
      canvas: document.createElement('canvas'),
      baselinePositions: null,
      packedArray: null,
      packedSplatsRef: null,
    });

    const widget = document.createElement(tagName) as SplatWidget;
    vi.spyOn(widget, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 200,
      height: 100,
      right: 200,
      bottom: 100,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    widget.setAttribute('src', 'avatar.ply');

    await widget.connectedCallback();
    document.dispatchEvent(new MouseEvent('pointermove', { clientX: 200, clientY: 50 }));
    const loop = setAnimationLoop.mock.calls[0][0] as (timeMs: number) => void;
    loop(16);

    const leftEyeCall = setBoneQuatPos.mock.calls.find(([idx]) => idx === 1);
    expect(leftEyeCall).toBeTruthy();
    expect((leftEyeCall![1] as THREE.Quaternion).y).toBeGreaterThan(0);
    expect(render).toHaveBeenCalledTimes(1);
    expect(setAnimationLoop).toHaveBeenCalledTimes(1);
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
