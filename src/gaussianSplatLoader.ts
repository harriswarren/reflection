import { Types, createComponent, createSystem, Entity } from "@iwsdk/core";
import { SparkRenderer, SplatMesh } from "@sparkjsdev/spark";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { GaussianSplatAnimator } from "./gaussianSplatAnimator.js";
import { SPLAT_URL_NEUTRAL, SPLAT_URL_BY_STATE } from "./config.js";

// ------------------------------------------------------------
// Constants & Types
// ------------------------------------------------------------
const LOAD_TIMEOUT_MS = 30_000;

interface SplatInstance {
  splat: SplatMesh;
  collider: THREE.Group | null;
  animator: GaussianSplatAnimator | null;
}


// ------------------------------------------------------------
// Component – marks an entity as a Gaussian Splat host
// ------------------------------------------------------------
/**
 * Marks an entity as a Gaussian Splat host. Attach to any entity with an
 * `object3D`; the system will load the splat (and optional collider) as
 * children so they inherit the entity's transform.
 */
export const GaussianSplatLoader = createComponent("GaussianSplatLoader", {
  splatUrl: { type: Types.String, default: "./splats/sensai.spz" },
  meshUrl: { type: Types.String, default: "" },
  autoLoad: { type: Types.Boolean, default: true },
  animate: { type: Types.Boolean, default: false },
  enableLod: { type: Types.Boolean, default: true },
  lodSplatScale: { type: Types.Float32, default: 1.0 },
});


// ------------------------------------------------------------
// System – loads, unloads, and animates Gaussian Splats
// ------------------------------------------------------------
/**
 * Manages loading, unloading, and animation of Gaussian Splats for entities
 * that carry {@link GaussianSplatLoader}. Auto-loads when `autoLoad` is true;
 * call `load()` / `unload()` / `replayAnimation()` for manual control.
 */
export class GaussianSplatLoaderSystem extends createSystem({
  splats: { required: [GaussianSplatLoader] },
}) {

  // ----------------------------------------------------------
  // State
  // ----------------------------------------------------------
  /** Active splat per entity (one shown at a time). */
  private instances = new Map<number, SplatInstance>();
  /** URL of the splat currently shown per entity (for cache key). */
  private entityCurrentUrl = new Map<number, string>();
  /** Preloaded splats by URL — instant switch when user changes state. */
  private cache = new Map<string, SplatInstance>();
  private animating = new Set<number>();
  private gltfLoader = new GLTFLoader();
  private sparkRenderer: SparkRenderer | null = null;


  // ----------------------------------------------------------
  // Initialization
  // ----------------------------------------------------------
  init() {
    const spark = new SparkRenderer({
      renderer: this.world.renderer,
      enableLod: true,
      lodSplatScale: 1.0,
      behindFoveate: 0.1,
    });
    spark.outsideFoveate = 0.3;
    spark.renderOrder = -10;
    this.world.scene.add(spark);
    this.sparkRenderer = spark;

    // SparkJS driveLod() deep-clones the camera every frame. IWSDK's
    // camera has UIKitDocument children that crash during any copy/clone
    // chain (even non-recursive), so we bypass it entirely and construct
    // a plain PerspectiveCamera with only the transform/projection data
    // SparkJS needs for LoD distance calculations.
    const cam = this.world.camera as THREE.PerspectiveCamera;
    cam.clone = function () {
      const c = new THREE.PerspectiveCamera();
      c.projectionMatrix.copy(this.projectionMatrix);
      c.projectionMatrixInverse.copy(this.projectionMatrixInverse);
      c.matrixWorld.copy(this.matrixWorld);
      c.matrixWorldInverse.copy(this.matrixWorldInverse);
      return c;
    };

    this.queries.splats.subscribe("qualify", (entity) => {
      const autoLoad = entity.getValue(
        GaussianSplatLoader,
        "autoLoad",
      ) as boolean;
      if (!autoLoad) return;

      this.load(entity).catch((err) => {
        console.error(
          "[GaussianSplatLoader] Auto-load failed for entity " + entity.index + ":",
          err,
        );
      });
    });

    // Preload all state splats in background so button press can switch instantly
    this.preloadAllStateSplats().catch((err) =>
      console.warn("[GaussianSplatLoader] Preload failed:", err),
    );
  }

  /** Preload every state splat URL so switch is instant. */
  private async preloadAllStateSplats(): Promise<void> {
    const urls = new Set<string>();
    urls.add(SPLAT_URL_NEUTRAL);
    for (const url of Object.values(SPLAT_URL_BY_STATE)) urls.add(url);
    for (const url of urls) {
      if (this.cache.has(url)) continue;
      try {
        await this.preload(url);
      } catch (e) {
        console.warn("[GaussianSplatLoader] Preload failed for " + url, e);
      }
    }
    console.log("[GaussianSplatLoader] Preload complete; " + this.cache.size + " splats cached.");
  }

  /**
   * Load a splat by URL into the cache (not attached to any entity).
   * Enables instant switch when this URL is selected later.
   */
  private async preload(splatUrl: string): Promise<void> {
    if (this.cache.has(splatUrl)) return;
    const splat = new SplatMesh({ url: splatUrl, lod: true });
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error("Preload timed out: " + splatUrl)),
        LOAD_TIMEOUT_MS,
      ),
    );
    await Promise.race([splat.initialized, timeout]);
    const animator = new GaussianSplatAnimator(splat);
    animator.apply();
    animator.setProgress(1);
    splat.renderOrder = -10;
    this.cache.set(splatUrl, { splat, collider: null, animator });
  }


  // ----------------------------------------------------------
  // Frame Loop
  // ----------------------------------------------------------
  update() {
    if (this.animating.size === 0) return;

    for (const entityIndex of this.animating) {
      const instance = this.instances.get(entityIndex);
      if (!instance?.animator?.isAnimating) {
        this.animating.delete(entityIndex);
        continue;
      }
      instance.animator.tick();
      if (!instance.animator.isAnimating) {
        this.animating.delete(entityIndex);
      }
    }
  }


  // ----------------------------------------------------------
  // Load – show splat (from cache if preloaded, else load then cache)
  // ----------------------------------------------------------
  async load(
    entity: Entity,
    options?: { animate?: boolean; splatUrl?: string },
  ): Promise<void> {
    const splatUrl = (options?.splatUrl != null && options.splatUrl !== "")
      ? options.splatUrl
      : (entity.getValue(GaussianSplatLoader, "splatUrl") as string);
    const meshUrl = entity.getValue(GaussianSplatLoader, "meshUrl") as string;
    const animate =
      options?.animate ??
      (entity.getValue(GaussianSplatLoader, "animate") as boolean);

    if (!splatUrl) {
      throw new Error(
        "[GaussianSplatLoader] Entity " + entity.index + " has an empty splatUrl.",
      );
    }

    const parent = entity.object3D;
    if (!parent) {
      throw new Error(
        "[GaussianSplatLoader] Entity " + entity.index + " has no object3D.",
      );
    }

    // If we already show this URL, nothing to do
    if (this.entityCurrentUrl.get(entity.index) === splatUrl) return;

    // Detach current splat into cache (do not dispose) so we can reuse it later
    this.detachToCache(entity);

    // Instant switch: use preloaded splat from cache
    const cached = this.cache.get(splatUrl);
    if (cached) {
      this.attachFromCache(entity, splatUrl, cached);
      return;
    }

    // Not in cache: load async, then cache and attach
    const enableLod = entity.getValue(
      GaussianSplatLoader,
      "enableLod",
    ) as boolean;
    const lodSplatScale = entity.getValue(
      GaussianSplatLoader,
      "lodSplatScale",
    ) as number;

    if (this.sparkRenderer && lodSplatScale !== 1.0) {
      this.sparkRenderer.lodSplatScale = lodSplatScale;
    }

    const splat = new SplatMesh({
      url: splatUrl,
      lod: enableLod || undefined,
    });
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(
        () =>
          reject(
            new Error(
              "[GaussianSplatLoader] Timed out loading " + splatUrl + " after " + (LOAD_TIMEOUT_MS / 1000) + "s",
            ),
          ),
        LOAD_TIMEOUT_MS,
      );
    });
    await Promise.race([splat.initialized, timeout]);

    // Preload may have finished in the meantime — use cache to avoid duplicate
    if (this.cache.has(splatUrl)) {
      splat.dispose();
      const cached = this.cache.get(splatUrl)!;
      this.attachFromCache(entity, splatUrl, cached);
      return;
    }

    let collider: THREE.Group | null = null;
    if (meshUrl) {
      const gltf = await this.gltfLoader.loadAsync(meshUrl);
      collider = gltf.scene;
      collider.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) (child as THREE.Mesh).visible = false;
      });
    }

    const animator = new GaussianSplatAnimator(splat);
    animator.apply();
    if (!animate) animator.setProgress(1);

    splat.renderOrder = -10;
    parent.add(splat);
    if (collider) parent.add(collider);

    const instance: SplatInstance = { splat, collider, animator };
    this.instances.set(entity.index, instance);
    this.entityCurrentUrl.set(entity.index, splatUrl);

    if (animate) {
      this.animating.add(entity.index);
      await animator.animateIn();
    }
  }

  /** Remove current splat from scene and put it in cache (do not dispose). */
  private detachToCache(entity: Entity): void {
    const instance = this.instances.get(entity.index);
    if (!instance) return;
    const url = this.entityCurrentUrl.get(entity.index);
    this.animating.delete(entity.index);
    instance.splat.parent?.remove(instance.splat);
    if (instance.collider) instance.collider.parent?.remove(instance.collider);
    this.instances.delete(entity.index);
    this.entityCurrentUrl.delete(entity.index);
    if (url) this.cache.set(url, instance);
  }

  /** Attach a cached splat to the entity's parent (instant). */
  private attachFromCache(entity: Entity, splatUrl: string, instance: SplatInstance): void {
    this.cache.delete(splatUrl);
    const parent = entity.object3D!;
    instance.animator?.setProgress(1);
    instance.splat.renderOrder = -10;
    parent.add(instance.splat);
    if (instance.collider) parent.add(instance.collider);
    this.instances.set(entity.index, instance);
    this.entityCurrentUrl.set(entity.index, splatUrl);
  }


  // ----------------------------------------------------------
  // Replay – restart the fly-in animation on an existing splat
  // ----------------------------------------------------------
  async replayAnimation(
    entity: Entity,
    options?: { duration?: number },
  ): Promise<void> {
    const instance = this.instances.get(entity.index);
    if (!instance?.animator) return;

    instance.animator.stop();
    instance.animator.setProgress(0);
    this.animating.add(entity.index);
    await instance.animator.animateIn(options?.duration);
  }


  // ----------------------------------------------------------
  // Unload – remove the splat (and collider) from the scene
  // ----------------------------------------------------------
  async unload(
    entity: Entity,
    options?: { animate?: boolean },
  ): Promise<void> {
    const instance = this.instances.get(entity.index);
    if (!instance) return;

    const animate =
      options?.animate ??
      (entity.getValue(GaussianSplatLoader, "animate") as boolean);

    if (animate && instance.animator) {
      this.animating.add(entity.index);
      await instance.animator.animateOut();
    }

    this.removeInstance(entity.index);
  }


  // ----------------------------------------------------------
  // Cleanup – dispose GPU resources and detach from the scene
  // ----------------------------------------------------------
  private removeInstance(entityIndex: number): void {
    const instance = this.instances.get(entityIndex);
    if (!instance) return;

    this.animating.delete(entityIndex);
    instance.animator?.dispose();
    instance.splat.parent?.remove(instance.splat);
    instance.splat.dispose();

    if (instance.collider) {
      instance.collider.parent?.remove(instance.collider);
      instance.collider.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.geometry.dispose();
          const materials = Array.isArray(mesh.material)
            ? mesh.material
            : [mesh.material];
          for (const mat of materials) mat.dispose();
        }
      });
    }

    this.instances.delete(entityIndex);
    console.log(
      `[GaussianSplatLoader] Unloaded splat for entity ${entityIndex}`,
    );
  }
}
