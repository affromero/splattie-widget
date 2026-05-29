import * as THREE from 'three';
import { SplatEdit, SplatEditSdf, SplatEditSdfType } from '@sparkjsdev/spark';
import { BodyLookAt } from './dimensions/BodyLookAt';
import { CameraSphere } from './dimensions/CameraSphere';
import { CursorTracking } from './dimensions/CursorTracking';
import { GhostEffect } from './dimensions/GhostEffect';
import { ObjectRotation } from './dimensions/ObjectRotation';
import { AutoBlink } from './features/AutoBlink';
import { CursorTracker } from './interaction/CursorTracker';
import { SplatEvents } from './interaction/Events';
import { HitDetector } from './interaction/HitDetector';
import { createSparkInstance } from './renderer/SparkSetup';
import type { BoneInfo, SparkInstance } from './renderer/SparkSetup';
import { ExpressionBasisApplier, loadExpressionBasis } from './features/ExpressionBasis';
import { createDefaultConfig, loadConfig, type AssetType } from './state/StateConfig';
import { StateMachine } from './state/StateMachine';
import type { SplattieManifest, WidgetConfig } from './types';

export class SplatWidget extends HTMLElement {
  private spark: SparkInstance | null = null;
  _stateMachine: StateMachine | null = null;
  private get stateMachine() { return this._stateMachine; }
  private ghost = new GhostEffect();
  private cameraSphere = new CameraSphere();
  private objectRotation = new ObjectRotation();
  private cursorTracking = new CursorTracking();
  private bodyLookAt = new BodyLookAt();
  private autoBlink = new AutoBlink();
  private cursor = new CursorTracker();
  private hitDetector = new HitDetector();
  private events: SplatEvents | null = null;
  private isOnSplat = false;
  private config: WidgetConfig | null = null;
  private frameCount = 0;
  private clickHoldTimer = 0;
  private blinkEdit: { left: SplatEditSdf; right: SplatEditSdf; edit: SplatEdit } | null = null;
  private exprBasis: ExpressionBasisApplier | null = null;
  private _assetType: AssetType = 'head';

  /** Asset type of the loaded bundle ('head' until a manifest says otherwise). */
  get assetType(): AssetType {
    return this._assetType;
  }

  static get observedAttributes(): string[] {
    return ['src', 'background', 'width', 'height'];
  }

  async connectedCallback(): Promise<void> {
    try {
      this.style.display = 'block';
      this.style.position = 'relative';
      this.style.overflow = 'hidden';
      if (!this.style.width) this.style.width = this.getAttribute('width') ?? '100%';
      if (!this.style.height) this.style.height = this.getAttribute('height') ?? '400px';

      const bgAttr = this.getAttribute('background');
      const bgColor = bgAttr ? parseInt(bgAttr.replace('#', ''), 16) : 0x0e0e14;

      this.hitDetector.setBackgroundColor(bgColor);
      this.events = new SplatEvents(this);
      this.cursor.attach(this);

      const src = this.getAttribute('src');
      if (!src) return;

      let splatUrl = src;
      let bonesUrl: string | undefined;
      let weightsUrl: string | undefined;
      let basisBlobUrl: string | undefined;
      let statesConfig: Partial<WidgetConfig> | undefined;

      if (src.includes('.splattie')) {
        const { default: JSZip } = await import('jszip');
        const res = await fetch(src);
        const zip = await JSZip.loadAsync(await res.arrayBuffer());

        const manifestFile = zip.file('manifest.json');
        if (!manifestFile) {
          throw new Error(
            '[splattie] manifest.json is missing from the .splattie bundle. ' +
            `Required for format v${__WIDGET_VERSION__}. ` +
            'Regenerate the .splattie with the current widget version.',
          );
        }

        const manifest = JSON.parse(await manifestFile.async('text')) as SplattieManifest;

        if (manifest.format !== 'splattie') {
          throw new Error(`[splattie] not a splattie file: format="${manifest.format}"`);
        }

        this._assetType = manifest.assetType ?? 'head';

        if (manifest.formatVersion !== __WIDGET_VERSION__) {
          throw new Error(
            `[splattie] format version mismatch: file=${manifest.formatVersion}, widget=${__WIDGET_VERSION__}. ` +
            'Rebuild the widget (npm run build -w packages/splattie-widget) and re-bundle the .splattie file.',
          );
        }

        const blobUrl = async (name: string | undefined, ext?: string): Promise<string | undefined> => {
          if (!name) return undefined;
          const entry = zip.file(name);
          if (!entry) throw new Error(`[splattie] manifest references "${name}" but it's not in the ZIP`);
          const blob = await entry.async('blob');
          return URL.createObjectURL(blob) + (ext ? `#${ext}` : '');
        };

        const splatExt = manifest.avatar.splat.format === 'spz' ? '.spz' : '.ply';
        splatUrl = (await blobUrl(manifest.avatar.splat.file, splatExt)) ?? src;
        bonesUrl = await blobUrl(manifest.animation.skeleton?.file);
        weightsUrl = await blobUrl(manifest.animation.weights?.file);
        basisBlobUrl = await blobUrl(manifest.animation.expression?.basis ?? undefined);

        const configFile = zip.file(manifest.widget.config);
        if (configFile) statesConfig = JSON.parse(await configFile.async('text')) as Partial<WidgetConfig>;
      } else {
        bonesUrl = this.getAttribute('bones') ?? undefined;
        weightsUrl = this.getAttribute('weights') ?? undefined;
        basisBlobUrl = this.getAttribute('expression-basis') ?? undefined;
        const configUrl = this.getAttribute('config');
        if (configUrl) statesConfig = await fetch(configUrl).then(r => r.json());
      }

      // FLAME per-splat expression basis is head-only. Gate the attribute fallback
      // on assetType so a body bundle (manifest basis: null) never picks up a
      // hardcoded `expression-basis` attribute (e.g. editor.html sets one for all).
      if (!basisBlobUrl && this._assetType === 'head') {
        basisBlobUrl = this.getAttribute('expression-basis') ?? undefined;
      }

      this.config = statesConfig
        ? (await import('./state/StateConfig')).mergeWithDefaults(statesConfig, this._assetType)
        : createDefaultConfig(this._assetType);
      this._stateMachine = new StateMachine(this.config);
      if (this.config.defaults.autoBlink) {
        this.autoBlink = new AutoBlink(this.config.defaults.autoBlink);
      }

      this.spark = await createSparkInstance(this, splatUrl, bgColor, bonesUrl, weightsUrl, this._assetType);
      this.events.attachClick(this);
      this.addEventListener('splatclick', () => {
        if (!this.hasAttribute('editor-mode') && this._stateMachine) {
          this._stateMachine.transitionTo('click');
          this.clickHoldTimer = 1;
        }
      });
      this.setupBlinkEdits();

      if (basisBlobUrl && this.spark.baselinePositions && this.spark.packedArray) {
        const basisData = await loadExpressionBasis(basisBlobUrl);
        const jawBone = this.spark.bones.find(b => b.name === 'jaw');
        const jawY = jawBone?.pos[1];
        this.exprBasis = new ExpressionBasisApplier(basisData, this.spark.baselinePositions, jawY);
      }

      this.dispatchEvent(new CustomEvent('splatload', { bubbles: true }));

      this.startRenderLoop();
    } catch (err) {
      console.error('splat-widget init failed:', err);
    }
  }

  attributeChangedCallback(name: string, _old: string | null, value: string | null): void {
    if (name === 'background' && value && this.spark) {
      const color = parseInt(value.replace('#', ''), 16);
      this.spark.renderer.setClearColor(color);
      this.hitDetector.setBackgroundColor(color);
    }
  }

  disconnectedCallback(): void {
    this.spark?.renderer.dispose();
    this.spark = null;
    this.cursor.detach();
  }

  setState(name: string): void {
    this.stateMachine?.transitionTo(name);
  }

  private setupBlinkEdits(): void {
    if (!this.spark) return;
    const byName = new Map(this.spark.bones.map(b => [b.name, b]));
    const leftEye = byName.get('leftEye');
    const rightEye = byName.get('rightEye');
    if (!leftEye || !rightEye) return;

    const mesh = this.spark.splatMesh as unknown as THREE.Object3D & { edits: SplatEdit[] | null };

    const leftEyePos = leftEye.pos;
    const rightEyePos = rightEye.pos;

    const leftSdf = new SplatEditSdf({
      type: SplatEditSdfType.SPHERE,
      radius: 0.02,
    });
    leftSdf.position.set(leftEyePos[0], leftEyePos[1], leftEyePos[2]);

    const rightSdf = new SplatEditSdf({
      type: SplatEditSdfType.SPHERE,
      radius: 0.02,
    });
    rightSdf.position.set(rightEyePos[0], rightEyePos[1], rightEyePos[2]);

    const edit = new SplatEdit({
      sdfs: [leftSdf, rightSdf],
      softEdge: 0.005,
    });
    mesh.add(edit);
    if (!mesh.edits) mesh.edits = [];
    mesh.edits.push(edit);
    this.blinkEdit = { left: leftSdf, right: rightSdf, edit };
  }

  private startRenderLoop(): void {
    const { renderer, scene, camera } = this.spark!;

    renderer.setAnimationLoop(() => {
      this.frameCount++;
      if (!this.stateMachine || !this.spark) return;

      const deltaTime = 1 / 60;
      const now = performance.now() / 1000;
      this.stateMachine.update(deltaTime);
      const frame = this.stateMachine.currentFrame;

      const mesh = this.spark.splatMesh as unknown as THREE.Object3D;

      // Dimension 1: Ghost
      mesh.position.set(0, 0, 0);
      mesh.rotation.set(0, 0, 0);
      this.ghost.apply(mesh, frame.ghost, now);

      // Dimension 4: Object rotation
      this.objectRotation.apply(mesh, frame.rotation);

      // Dimension 3: Camera sphere
      this.cameraSphere.apply(camera, frame.camera);

      // Dimension 2 + 5: Expressions + cursor tracking via SplatSkinning
      if (this.spark.skinning && this.spark.bones.length > 0) {
        if (this._assetType === 'body') {
          this.applyBodySkinning(this.spark.skinning, this.spark.bones, frame);
        } else {
          this.applyHeadSkinning(this.spark.skinning, this.spark.bones, frame);
        }
      }

      // Expression basis - per-splat position offsets from FLAME blendshapes
      if (this.exprBasis && this.spark.packedArray && this.spark.packedSplatsRef) {
        const updated = this.exprBasis.apply(this.spark.packedArray, frame.expression);
        if (updated) this.spark.packedSplatsRef.needsUpdate = true;
      }

      // Blink + squint via SplatEdit
      if (this.blinkEdit) {
        const blink = this.autoBlink.getWeights();
        const blinkVal = blink.eyeBlinkLeft ?? 0;
        const squint = frame.expression.eyeSquint ?? 0;
        const combined = Math.min(1, blinkVal + squint);
        this.blinkEdit.left.opacity = 1 - combined;
        this.blinkEdit.right.opacity = 1 - combined;
      }

      // Render
      renderer.render(scene, camera);

      // Hit detection AFTER render
      const editorMode = this.hasAttribute('editor-mode');
      if (this.frameCount % 3 === 0) {
        if (this.cursor.isOnPage) {
          const rect = this.spark.canvas.getBoundingClientRect();
          this.isOnSplat = this.hitDetector.check(renderer, this.cursor.clientX, this.cursor.clientY, rect.width, rect.height);
        } else {
          this.isOnSplat = false;
        }
        this.events?.update(this.isOnSplat);

        if (!editorMode) {
          const active = this.stateMachine.activeStateName;
          if (this.clickHoldTimer > 0) {
            this.clickHoldTimer -= deltaTime * 3;
            if (this.clickHoldTimer <= 0) {
              this.stateMachine.transitionTo(this.isOnSplat ? 'hover' : 'idle');
            }
          } else if (active !== 'click') {
            if (this.isOnSplat && active !== 'hover') {
              this.stateMachine.transitionTo('hover');
            } else if (!this.isOnSplat && active === 'hover') {
              this.stateMachine.transitionTo('idle');
            }
          }
        }
      }
    });
  }

  // Body skinning (SMPL-X): head + torso look-at toward the cursor. Rotates the
  // spine→neck→head chain (FK-composed) via Spark's SplatSkinning; the rest of the
  // 55 joints stay at their rest pose (set once at init). Pose-driven states (the
  // editor's "machine states") layer on frame.expression in a later pass.
  private applyBodySkinning(skinning: unknown, bones: BoneInfo[], frame: typeof StateMachine.prototype.currentFrame): void {
    const sk = skinning as {
      setBoneQuatPos: (idx: number, q: THREE.Quaternion, p: THREE.Vector3) => void;
      updateBones: () => void;
    };
    const tracking = frame.tracking;
    const pose = this.bodyLookAt.compute(this.cursor.ndcX, this.cursor.ndcY, tracking.head ?? 0, tracking.torso ?? 0);

    const lookAt = new Map<string, THREE.Quaternion>([
      ['Spine_3', pose.spine3],
      ['Neck', pose.neck],
      ['Head', pose.head],
    ]);
    const identity = new THREE.Quaternion();
    // Spark needs EVERY bone's current transform set each frame; the look-at joints
    // get their world rotation, the rest stay at identity (their rest pose). Leaving
    // the other joints unset blanks the whole render the moment any joint rotates.
    for (const bone of bones) {
      sk.setBoneQuatPos(bone.idx, lookAt.get(bone.name) ?? identity, new THREE.Vector3(...bone.pos));
    }
    sk.updateBones();
  }

  private applyHeadSkinning(skinning: unknown, bones: BoneInfo[], frame: typeof StateMachine.prototype.currentFrame): void {
    const sk = skinning as {
      setBoneQuatPos: (idx: number, q: THREE.Quaternion, p: THREE.Vector3) => void;
      updateBones: () => void;
    };

    const byName = new Map(bones.map(b => [b.name, b]));
    const neck = byName.get('neck');
    const jaw = byName.get('jaw');
    const leftEye = byName.get('leftEye');
    const rightEye = byName.get('rightEye');

    const tracking = frame.tracking;

    // Neck - computed first so children inherit its rotation
    const exprNeckPitch = frame.expression.neckTilt ?? 0;
    const exprNeckYaw = frame.expression.neckYaw ?? 0;
    const exprNeckRoll = frame.expression.neckRoll ?? 0;
    const neckYaw = this.cursor.ndcX * 0.08 * tracking.head + exprNeckYaw;
    const neckPitch = this.cursor.ndcY * 0.05 * tracking.head + exprNeckPitch;
    const neckQ = new THREE.Quaternion();
    if (neck) {
      neckQ.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), exprNeckRoll));
      neckQ.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), neckYaw));
      neckQ.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -neckPitch));
      sk.setBoneQuatPos(neck.idx, neckQ, new THREE.Vector3(...neck.pos));
    }

    // Eyes - cursor tracking + gaze offset, inherits neck rotation
    const gazeX = frame.expression.gazeX ?? 0;
    const gazeY = frame.expression.gazeY ?? 0;
    const clampedX = Math.max(-1, Math.min(1, this.cursor.ndcX));
    const clampedY = Math.max(-1, Math.min(1, this.cursor.ndcY));
    const eyeYaw = clampedX * 0.09 * (tracking.eyes ?? 0) + gazeX;
    const eyePitch = clampedY * 0.04 * (tracking.eyes ?? 0) + gazeY;
    for (const eye of [leftEye, rightEye]) {
      if (!eye) continue;
      const localQ = new THREE.Quaternion();
      localQ.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), eyeYaw));
      localQ.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -eyePitch));
      const q = neckQ.clone().multiply(localQ);
      sk.setBoneQuatPos(eye.idx, q, new THREE.Vector3(...eye.pos));
    }

    // Jaw - expression jawOpen only, inherits neck rotation
    if (jaw) {
      const jawAngle = frame.expression.jawOpen ?? 0;
      const localJaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), jawAngle);
      const jq = neckQ.clone().multiply(localJaw);
      sk.setBoneQuatPos(jaw.idx, jq, new THREE.Vector3(...jaw.pos));
    }

    // Virtual bones - translate from rest position to simulate expressions
    for (const bone of bones) {
      if (!bone.virtual) continue;
      const rest = new THREE.Vector3(...bone.pos);
      const off = new THREE.Vector3(0, 0, 0);
      const expr = frame.expression;

      if (bone.name === 'browL' || bone.name === 'browR') {
        const side = bone.name === 'browL' ? 'L' : 'R';
        const raise = expr[`browRaise${side}`] ?? expr.browRaise ?? 0;
        const frown = expr[`browFrown${side}`] ?? expr.browFrown ?? 0;
        off.y += raise * 0.08 - frown * 0.05;
        const inward = bone.name === 'browL' ? -1 : 1;
        off.x += frown * 0.015 * inward;
      } else if (bone.name === 'mouthCornerL' || bone.name === 'mouthCornerR') {
        const sign = bone.name === 'mouthCornerL' ? 1 : -1;
        off.y += (expr.smile ?? 0) * 0.06 - (expr.mouthFrown ?? 0) * 0.05;
        off.x += (expr.smile ?? 0) * 0.015 * sign;
        off.x -= (expr.lipPucker ?? 0) * 0.025 * sign;
      } else if (bone.name === 'cheekL' || bone.name === 'cheekR') {
        const sign = bone.name === 'cheekL' ? 1 : -1;
        off.x += (expr.cheekPuff ?? 0) * 0.04 * sign;
        off.z += (expr.cheekPuff ?? 0) * 0.02;
      } else if (bone.name === 'noseBridge') {
        off.y += (expr.noseSneer ?? 0) * 0.025;
        off.z += (expr.noseSneer ?? 0) * 0.01;
      }

      rest.add(off);
      sk.setBoneQuatPos(bone.idx, neckQ, rest);
    }

    sk.updateBones();
  }
}
