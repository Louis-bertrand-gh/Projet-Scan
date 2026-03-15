/* ═══════════════════════════════════════════════════════════════════════
 * CameraScanner.tsx — Smart Scan avec OCR réel
 *
 * Fonctionnalités:
 * - Caméra mobile (zoom, switch, capture)
 * - Overlay live canvas: détection visuelle légère + scanner laser
 * - OCR lourd uniquement sur image fixe confirmée
 * - Parsing Lot / DLC / Produit via ocrEngine
 * ═══════════════════════════════════════════════════════════════════════ */

"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  CameraOff,
  Check,
  CheckCircle2,
  ImagePlus,
  Loader2,
  RotateCcw,
  Settings2,
  SwitchCamera,
  Trash2,
  Zap,
  ZapOff,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { DonneesOCR } from "@/types";
import { analyserImageOCR } from "@/lib/ocrEngine";

export type Step =
  | "idle"
  | "live"
  | "review"
  | "gallery"
  | "analysing"
  | "done";

interface CameraScannerProps {
  onResultatOCR: (donnees: DonneesOCR) => void;
  onPhotoCapturee?: (photoBase64: string) => void;
  initialPhotos?: string[];
  onPhotosChange?: (photos: string[]) => void;
}

type PhotoQualityId = "fast" | "balanced" | "max";

const ZOOM_STEPS = [1, 2, 4] as const;
const PHOTO_QUALITY_OPTIONS: {
  id: PhotoQualityId;
  label: string;
  description: string;
  textEnhance: "none" | "light" | "strong";
  preferStillCapture: boolean;
}[] = [
  {
    id: "fast",
    label: "Brut",
    description: "Qualite native sans retouche",
    textEnhance: "none",
    preferStillCapture: true,
  },
  {
    id: "balanced",
    label: "Equilibree",
    description: "Qualite native + nettete legere",
    textEnhance: "light",
    preferStillCapture: true,
  },
  {
    id: "max",
    label: "Haute",
    description: "Qualite native + nettete forte",
    textEnhance: "strong",
    preferStillCapture: true,
  },
];

function distanceEntreDoigts(touches: TouchList): number {
  const [a, b] = [touches[0], touches[1]];
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Impossible de lire la photo."));
    reader.readAsDataURL(blob);
  });
}

function appliquerAmeliorationTexte(
  ctx: CanvasRenderingContext2D,
  niveau: "none" | "light" | "strong",
) {
  if (niveau === "none") return;

  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  if (w <= 0 || h <= 0) return;

  const src = ctx.getImageData(0, 0, w, h);
  const srcData = src.data;

  const contrastBoost = niveau === "strong" ? 1.2 : 1.1;
  for (let i = 0; i < srcData.length; i += 4) {
    srcData[i] = clamp((srcData[i] - 128) * contrastBoost + 128, 0, 255);
    srcData[i + 1] = clamp(
      (srcData[i + 1] - 128) * contrastBoost + 128,
      0,
      255,
    );
    srcData[i + 2] = clamp(
      (srcData[i + 2] - 128) * contrastBoost + 128,
      0,
      255,
    );
  }

  const sharpenAmount = niveau === "strong" ? 1.15 : 0.65;
  const out = new Uint8ClampedArray(srcData);

  const index = (x: number, y: number) => (y * w + x) * 4;
  for (let y = 1; y < h - 1; y += 1) {
    for (let x = 1; x < w - 1; x += 1) {
      const c = index(x, y);
      const t = index(x, y - 1);
      const b = index(x, y + 1);
      const l = index(x - 1, y);
      const r = index(x + 1, y);

      for (let ch = 0; ch < 3; ch += 1) {
        const center = srcData[c + ch];
        const lap =
          5 * center -
          srcData[t + ch] -
          srcData[b + ch] -
          srcData[l + ch] -
          srcData[r + ch];
        out[c + ch] = clamp(center + lap * sharpenAmount * 0.25, 0, 255);
      }
    }
  }

  src.data.set(out);
  ctx.putImageData(src, 0, 0);
}

async function capturerBlobDepuisTrack(
  track: MediaStreamTrack,
): Promise<Blob | null> {
  try {
    const MaybeImageCapture = (
      window as Window & {
        ImageCapture?: new (track: MediaStreamTrack) => {
          takePhoto: (settings?: Record<string, unknown>) => Promise<Blob>;
        };
      }
    ).ImageCapture;

    if (!MaybeImageCapture) return null;

    const imageCapture = new MaybeImageCapture(track);
    return await imageCapture.takePhoto();
  } catch {
    return null;
  }
}

export default function CameraScanner({
  onResultatOCR,
  onPhotoCapturee,
  initialPhotos,
  onPhotosChange,
}: CameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasCaptureRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [step, setStep] = useState<Step>(
    initialPhotos && initialPhotos.length > 0 ? "gallery" : "idle",
  );
  const [erreur, setErreur] = useState<string | null>(null);

  const [appareils, setAppareils] = useState<MediaDeviceInfo[]>([]);
  const [appareilIndex, setAppareilIndex] = useState(0);
  const [useFacingBack, setUseFacingBack] = useState(true);

  const [photos, setPhotos] = useState<string[]>(initialPhotos ?? []);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [captureFlashAnim, setCaptureFlashAnim] = useState(false);
  const [captureBusy, setCaptureBusy] = useState(false);

  const [qualitePhoto, setQualitePhoto] = useState<PhotoQualityId>("max");
  const [showQualityPanel, setShowQualityPanel] = useState(false);

  const [torchSupported, setTorchSupported] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [torchBusy, setTorchBusy] = useState(false);

  const [zoom, setZoom] = useState(1);
  const [zoomMin, setZoomMin] = useState(1);
  const [zoomMax, setZoomMax] = useState(4);
  const [supportsNativeZoom, setSupportsNativeZoom] = useState(false);
  const zoomRef = useRef(1);

  const selectedQuality = useMemo(
    () =>
      PHOTO_QUALITY_OPTIONS.find((option) => option.id === qualitePhoto) ??
      PHOTO_QUALITY_OPTIONS[1],
    [qualitePhoto],
  );

  const pinchStartDist = useRef(0);
  const pinchStartZoom = useRef(1);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    onPhotosChange?.(photos);
  }, [photos, onPhotosChange]);

  const detecterAppareils = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cams = devices.filter((d) => d.kind === "videoinput");
      setAppareils(cams);
      return cams;
    } catch {
      return [];
    }
  }, []);

  const appliquerZoom = useCallback(
    async (niveau: number) => {
      const next = clamp(niveau, zoomMin, zoomMax);
      setZoom(next);

      if (supportsNativeZoom && streamRef.current) {
        try {
          const track = streamRef.current.getVideoTracks()[0];
          await track.applyConstraints({
            advanced: [{ zoom: next } as MediaTrackConstraintSet],
          });
        } catch {
          // Fallback CSS géré par style video
        }
      }
    },
    [zoomMin, zoomMax, supportsNativeZoom],
  );

  const arreterCamera = useCallback(() => {
    setTorchEnabled(false);
    setTorchSupported(false);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const appliquerQualiteAuFlux = useCallback(
    async (track: MediaStreamTrack) => {
      const caps = track.getCapabilities() as MediaTrackCapabilities & {
        focusMode?: string[];
        sharpness?: { min: number; max: number };
        contrast?: { min: number; max: number };
      };

      const advanced: MediaTrackConstraintSet[] = [];

      if (
        Array.isArray(caps.focusMode) &&
        caps.focusMode.includes("continuous")
      ) {
        advanced.push({ focusMode: "continuous" } as MediaTrackConstraintSet);
      }

      if (caps.sharpness) {
        const target =
          selectedQuality.id === "max"
            ? caps.sharpness.max
            : (caps.sharpness.min + caps.sharpness.max) / 2;
        advanced.push({ sharpness: target } as MediaTrackConstraintSet);
      }

      if (caps.contrast) {
        const target =
          selectedQuality.id === "max"
            ? caps.contrast.max
            : (caps.contrast.min + caps.contrast.max) / 2;
        advanced.push({ contrast: target } as MediaTrackConstraintSet);
      }

      try {
        const widthCaps = caps.width as
          | { min: number; max: number }
          | undefined;
        const heightCaps = caps.height as
          | { min: number; max: number }
          | undefined;

        const widthConstraint = widthCaps
          ? { ideal: widthCaps.max }
          : undefined;
        const heightConstraint = heightCaps
          ? { ideal: heightCaps.max }
          : undefined;

        await track.applyConstraints({
          width: widthConstraint,
          height: heightConstraint,
          advanced,
        });
      } catch {
        // Certains navigateurs refusent une contrainte "ideal" tardive.
      }
    },
    [selectedQuality.id],
  );

  const detecterSupportTorch = useCallback((track: MediaStreamTrack) => {
    const caps = track.getCapabilities() as MediaTrackCapabilities & {
      torch?: boolean;
    };

    const supportsTorch = Boolean(caps.torch);
    setTorchSupported(supportsTorch);
    if (!supportsTorch) setTorchEnabled(false);
  }, []);

  const demarrerCamera = useCallback(
    async (deviceId?: string) => {
      try {
        setErreur(null);
        arreterCamera();

        const contraintes: MediaStreamConstraints = {
          video: deviceId
            ? {
                deviceId: { exact: deviceId },
              }
            : {
                facingMode: useFacingBack ? "environment" : "user",
              },
        };

        const stream = await navigator.mediaDevices.getUserMedia(contraintes);
        streamRef.current = stream;
        setStep("live");
        setZoom(1);

        requestAnimationFrame(() => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(() => {});
          }
        });

        const track = stream.getVideoTracks()[0];
        detecterSupportTorch(track);
        await appliquerQualiteAuFlux(track);

        const caps = track.getCapabilities() as MediaTrackCapabilities & {
          zoom?: { min: number; max: number; step: number };
        };

        if (caps.zoom) {
          setSupportsNativeZoom(true);
          setZoomMin(caps.zoom.min);
          setZoomMax(caps.zoom.max);
        } else {
          setSupportsNativeZoom(false);
          setZoomMin(1);
          setZoomMax(4);
        }

        const cams = await detecterAppareils();
        const settings = track.getSettings();
        if (settings.deviceId) {
          const idx = cams.findIndex((c) => c.deviceId === settings.deviceId);
          if (idx >= 0) setAppareilIndex(idx);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "NotAllowedError") {
          setErreur(
            "Permission caméra refusée. Autorisez l'accès dans les paramètres du navigateur.",
          );
        } else if (
          err instanceof DOMException &&
          err.name === "NotFoundError"
        ) {
          setErreur("Aucune caméra détectée sur cet appareil.");
        } else {
          setErreur("Impossible d'ouvrir la caméra. Veuillez réessayer.");
        }
      }
    },
    [
      arreterCamera,
      detecterAppareils,
      useFacingBack,
      appliquerQualiteAuFlux,
      detecterSupportTorch,
    ],
  );

  const basculerTorch = useCallback(async () => {
    if (!streamRef.current || !torchSupported || torchBusy) return;

    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;

    const prochainEtat = !torchEnabled;
    setTorchBusy(true);
    try {
      await track.applyConstraints({
        advanced: [{ torch: prochainEtat } as MediaTrackConstraintSet],
      });
      setTorchEnabled(prochainEtat);
    } catch {
      setErreur("Flash indisponible sur cette camera.");
      setTorchEnabled(false);
    } finally {
      setTorchBusy(false);
    }
  }, [torchSupported, torchBusy, torchEnabled]);

  const basculerCamera = useCallback(() => {
    if (appareils.length > 1) {
      const next = (appareilIndex + 1) % appareils.length;
      setAppareilIndex(next);
      setUseFacingBack((v) => !v);
      demarrerCamera(appareils[next].deviceId);
      return;
    }

    setUseFacingBack((v) => !v);
    demarrerCamera();
  }, [appareils, appareilIndex, demarrerCamera]);

  // Pinch-to-zoom
  useEffect(() => {
    const node = containerRef.current;
    if (!node || step !== "live") return;

    let rafId: number | null = null;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        pinchStartDist.current = distanceEntreDoigts(e.touches);
        pinchStartZoom.current = zoomRef.current;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const dist = distanceEntreDoigts(e.touches);
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          const ratio = dist / pinchStartDist.current;
          appliquerZoom(pinchStartZoom.current * ratio);
          rafId = null;
        });
      }
    };

    node.addEventListener("touchstart", onTouchStart, { passive: false });
    node.addEventListener("touchmove", onTouchMove, { passive: false });

    return () => {
      node.removeEventListener("touchstart", onTouchStart);
      node.removeEventListener("touchmove", onTouchMove);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [step, appliquerZoom]);

  const capturerPhoto = useCallback(async () => {
    // Empêche les appels concurrents (multi-tap mobile)
    if (captureBusy) return;
    if (!videoRef.current || !canvasCaptureRef.current) return;

    setCaptureBusy(true);
    try {
      const video = videoRef.current;
      const canvas = canvasCaptureRef.current;

      // ── Stratégie principale : Canvas (fiable sur tous les mobiles) ──
      const vw = video.videoWidth;
      const vh = video.videoHeight;

      if (vw > 0 && vh > 0) {
        canvas.width = vw;
        canvas.height = vh;

        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";

          if (!supportsNativeZoom && zoom > 1) {
            const sw = vw / zoom;
            const sh = vh / zoom;
            const sx = (vw - sw) / 2;
            const sy = (vh - sh) / 2;
            ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
          } else {
            ctx.drawImage(video, 0, 0);
          }

          appliquerAmeliorationTexte(ctx, selectedQuality.textEnhance);

          const dataUrl = canvas.toDataURL("image/png");
          setCaptureFlashAnim(true);
          setTimeout(() => setCaptureFlashAnim(false), 180);

          setPreviewUrl(dataUrl);
          onPhotoCapturee?.(dataUrl);
          arreterCamera();
          setStep("review");
          return;
        }
      }

      // ── Fallback : ImageCapture API (si canvas échoue) ──
      const track = streamRef.current?.getVideoTracks()?.[0] ?? null;
      if (track) {
        const stillBlob = await capturerBlobDepuisTrack(track);
        if (stillBlob) {
          const nativeDataUrl = await blobToDataUrl(stillBlob);
          setCaptureFlashAnim(true);
          setTimeout(() => setCaptureFlashAnim(false), 180);

          setPreviewUrl(nativeDataUrl);
          onPhotoCapturee?.(nativeDataUrl);
          arreterCamera();
          setStep("review");
          return;
        }
      }
    } finally {
      setCaptureBusy(false);
    }
  }, [
    captureBusy,
    arreterCamera,
    onPhotoCapturee,
    selectedQuality.textEnhance,
    supportsNativeZoom,
    zoom,
  ]);

  const confirmerPhoto = useCallback(() => {
    if (!previewUrl) return;
    setPhotos((prev) => [...prev, previewUrl]);
    setPreviewUrl(null);
    setStep("gallery");
  }, [previewUrl]);

  const ajouterPhoto = useCallback(() => {
    setPreviewUrl(null);
    demarrerCamera();
  }, [demarrerCamera]);

  const supprimerPhoto = useCallback((index: number) => {
    setPhotos((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length === 0) setStep("idle");
      return next;
    });
  }, []);

  const fusionnerResultats = useCallback(
    (resultats: DonneesOCR[]): DonneesOCR => {
      const first = resultats[0];
      if (!first) {
        return {
          numeroLot: "LOT-0000-XXXX",
          dlc: "2026-12-31",
          nomProduit: "Produit inconnu",
          confiance: 0.2,
        };
      }

      const bestLot = resultats.reduce((best, r) => {
        const c = r.confianceChamps?.numeroLot ?? r.confiance;
        const b = best.confianceChamps?.numeroLot ?? best.confiance;
        return c > b ? r : best;
      }, first);

      const bestDlc = resultats.reduce((best, r) => {
        const c = r.confianceChamps?.dlc ?? r.confiance;
        const b = best.confianceChamps?.dlc ?? best.confiance;
        return c > b ? r : best;
      }, first);

      const bestProduit = resultats.reduce((best, r) => {
        const c = r.confianceChamps?.nomProduit ?? r.confiance;
        const b = best.confianceChamps?.nomProduit ?? best.confiance;
        return c > b ? r : best;
      }, first);

      const confianceChamps = {
        numeroLot: bestLot.confianceChamps?.numeroLot ?? bestLot.confiance,
        dlc: bestDlc.confianceChamps?.dlc ?? bestDlc.confiance,
        nomProduit:
          bestProduit.confianceChamps?.nomProduit ?? bestProduit.confiance,
      };

      const confiance =
        (confianceChamps.numeroLot +
          confianceChamps.dlc +
          confianceChamps.nomProduit) /
        3;

      return {
        numeroLot: bestLot.numeroLot,
        dlc: bestDlc.dlc,
        nomProduit: bestProduit.nomProduit,
        confiance,
        confianceChamps,
        texteBrut: resultats
          .map((r) => r.texteBrut)
          .filter(Boolean)
          .join("\n\n---\n\n"),
      };
    },
    [],
  );

  const lancerAnalyse = useCallback(async () => {
    if (photos.length === 0 && !previewUrl) return;

    setStep("analysing");
    const imagesAAnalyser =
      photos.length > 0 ? photos.slice(-2) : [previewUrl!];
    const resultats: DonneesOCR[] = [];
    for (const image of imagesAAnalyser) {
      // Séquentiel: plus stable sur mobiles modestes que Promise.all
      const resultat = await analyserImageOCR(image);
      resultats.push(resultat);
    }
    const resultat = fusionnerResultats(resultats);
    setStep("done");
    onResultatOCR(resultat);
  }, [photos, previewUrl, onResultatOCR, fusionnerResultats]);

  const retour = useCallback(() => {
    switch (step) {
      case "live":
        arreterCamera();
        setStep(photos.length > 0 ? "gallery" : "idle");
        break;
      case "review":
        setPreviewUrl(null);
        demarrerCamera();
        break;
      case "done":
        // Protection des données: on revient à l'état résultats/galerie
        setStep("gallery");
        break;
      default:
        break;
    }
  }, [step, photos.length, arreterCamera, demarrerCamera]);

  const reinitialiser = useCallback(() => {
    arreterCamera();
    setPreviewUrl(null);
    setPhotos([]);
    setZoom(1);
    setStep("idle");
    setErreur(null);
  }, [arreterCamera]);

  useEffect(() => {
    return () => {
      arreterCamera();
    };
  }, [arreterCamera]);

  useEffect(() => {
    if (step !== "live" || !streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;
    appliquerQualiteAuFlux(track);
  }, [step, selectedQuality.id, appliquerQualiteAuFlux]);

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-lg mx-auto">
      <canvas ref={canvasCaptureRef} className="hidden" />

      <div
        ref={containerRef}
        className={`relative w-full rounded-2xl overflow-hidden transition-all duration-500 ease-out ${
          step === "idle"
            ? "aspect-square border-2 border-primary/30 hover:border-primary/50 bg-surface-alt"
            : "aspect-[3/4] min-h-[55vh] sm:min-h-0 bg-black"
        }`}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          onLoadedMetadata={(e) => {
            (e.target as HTMLVideoElement).play().catch(() => {});
          }}
          style={
            !supportsNativeZoom && zoom > 1
              ? {
                  transform: `scale(${zoom})`,
                  transformOrigin: "center",
                  willChange: "transform",
                }
              : undefined
          }
          className={`absolute inset-0 w-full h-full object-cover transition-transform duration-150 ${
            step === "live" ? "block" : "hidden"
          }`}
        />

        {captureFlashAnim && (
          <div className="absolute inset-0 z-50 bg-white pointer-events-none animate-camera-flash" />
        )}

        {step === "idle" && (
          <button
            onClick={() => demarrerCamera()}
            className="absolute inset-0 flex flex-col items-center justify-center w-full h-full gap-5 transition-colors cursor-pointer group hover:bg-surface/50"
          >
            <div className="flex items-center justify-center w-24 h-24 transition-all duration-300 rounded-3xl bg-primary/10 group-hover:bg-primary/20 group-hover:scale-105 animate-idle-pulse">
              <Camera className="w-12 h-12 text-primary" />
            </div>
            <div className="px-8 text-center">
              <p className="mb-1 text-lg font-semibold text-on-surface">
                Ouvrir la caméra
              </p>
              <p className="text-sm leading-relaxed text-muted">
                Cadrez votre étiquette puis prenez la photo.
              </p>
            </div>
            {erreur && (
              <div className="flex items-start gap-2 p-3 mx-6 border rounded-lg bg-danger/10 border-danger/20">
                <AlertTriangle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
                <p className="text-sm text-left text-danger">{erreur}</p>
              </div>
            )}
          </button>
        )}

        {step === "live" && (
          <>
            <button
              onClick={basculerCamera}
              className="absolute top-3 right-3 z-20 p-2.5 bg-black/50 backdrop-blur-sm rounded-full text-white hover:bg-black/70 transition-colors active:scale-90"
              title="Changer de caméra"
            >
              <SwitchCamera className="w-5 h-5" />
            </button>

            <div className="absolute z-20 flex items-center gap-2 top-3 right-16">
              <button
                onClick={() => setShowQualityPanel((v) => !v)}
                className="p-2.5 bg-black/50 backdrop-blur-sm rounded-full text-white hover:bg-black/70 transition-colors active:scale-90"
                title="Qualité photo"
              >
                <Settings2 className="w-5 h-5" />
              </button>

              {torchSupported && (
                <button
                  onClick={basculerTorch}
                  disabled={torchBusy}
                  className={`p-2.5 backdrop-blur-sm rounded-full text-white transition-colors active:scale-90 disabled:opacity-60 ${
                    torchEnabled
                      ? "bg-amber-500/90 hover:bg-amber-500"
                      : "bg-black/50 hover:bg-black/70"
                  }`}
                  title={
                    torchEnabled ? "Desactiver le flash" : "Activer le flash"
                  }
                >
                  {torchEnabled ? (
                    <Zap className="w-5 h-5" />
                  ) : (
                    <ZapOff className="w-5 h-5" />
                  )}
                </button>
              )}
            </div>

            {showQualityPanel && (
              <div className="absolute z-30 w-56 p-2 border rounded-xl top-14 right-3 bg-black/75 border-white/15 backdrop-blur-md">
                <p className="px-2 pb-1 text-[11px] font-semibold tracking-wide text-white/80 uppercase">
                  Qualite photo
                </p>
                <div className="space-y-1">
                  {PHOTO_QUALITY_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => {
                        setQualitePhoto(option.id);
                        setShowQualityPanel(false);
                      }}
                      className={`w-full text-left px-2.5 py-2 rounded-lg transition-colors ${
                        qualitePhoto === option.id
                          ? "bg-white text-black"
                          : "bg-white/5 text-white hover:bg-white/10"
                      }`}
                    >
                      <div className="text-sm font-semibold">
                        {option.label}
                      </div>
                      <div className="text-[11px] opacity-80">
                        {option.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="absolute left-0 right-0 z-20 flex items-center justify-center gap-1 bottom-3">
              <button
                onClick={() => appliquerZoom(zoom - 0.5)}
                className="p-1.5 rounded-full bg-black/40 backdrop-blur-sm text-white active:scale-90"
                title="Dézoomer"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              {ZOOM_STEPS.map((palier) => (
                <button
                  key={palier}
                  onClick={() => appliquerZoom(palier)}
                  className={`min-w-[42px] py-1 rounded-full text-xs font-bold transition-colors ${
                    Math.abs(zoom - palier) < 0.3
                      ? "bg-white text-black"
                      : "bg-black/40 backdrop-blur-sm text-white"
                  }`}
                >
                  {palier}x
                </button>
              ))}
              <button
                onClick={() => appliquerZoom(zoom + 0.5)}
                className="p-1.5 rounded-full bg-black/40 backdrop-blur-sm text-white active:scale-90"
                title="Zoomer"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
          </>
        )}

        {step === "review" && previewUrl && (
          <div className="absolute inset-0 animate-fade-in">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Photo capturée"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute px-3 py-1 text-xs font-medium text-white rounded-full top-3 left-3 bg-black/60 backdrop-blur-sm z-10">
              Aperçu
            </div>
          </div>
        )}

        {step === "gallery" && (
          <div className="flex flex-col w-full h-full p-3 bg-surface-alt animate-fade-in">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-on-surface">
                {photos.length} photo{photos.length > 1 ? "s" : ""} capturée
                {photos.length > 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-2 gap-2">
                {photos.map((photo, i) => (
                  <div
                    key={i}
                    className="relative rounded-lg overflow-hidden aspect-[4/3] group"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo}
                      alt={`Photo ${i + 1}`}
                      className="object-cover w-full h-full"
                    />
                    <button
                      onClick={() => supprimerPhoto(i)}
                      className="absolute p-1 text-white transition-opacity rounded-full opacity-0 top-1 right-1 bg-danger/80 group-hover:opacity-100 sm:opacity-100"
                      title="Supprimer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <span className="absolute bottom-1 left-1 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded">
                      #{i + 1}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === "analysing" && (
          <div className="flex flex-col items-center justify-center w-full h-full gap-4 bg-surface-alt animate-fade-in">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <div className="text-center">
              <p className="text-sm font-medium text-on-surface">
                Analyse OCR en cours...
              </p>
              <p className="mt-1 text-xs text-muted">
                Extraction intelligente du lot, DLC et type produit
              </p>
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="flex items-center justify-center w-full h-full bg-surface-alt animate-fade-in">
            <div className="p-4 rounded-full bg-success/90 animate-bounce">
              <CheckCircle2 className="w-10 h-10 text-white" />
            </div>
          </div>
        )}
      </div>

      <div className="w-full mt-5 space-y-3">
        {step === "live" && (
          <div className="flex items-center justify-center gap-8">
            <button
              onClick={retour}
              className="p-3 transition-colors border rounded-full bg-surface border-border text-on-surface hover:bg-surface-alt"
              title="Retour"
            >
              {photos.length > 0 ? (
                <ArrowLeft className="w-5 h-5" />
              ) : (
                <CameraOff className="w-5 h-5" />
              )}
            </button>

            <button
              onClick={capturerPhoto}
              className="relative w-[76px] h-[76px] rounded-full bg-white shadow-2xl active:scale-90 transition-transform flex items-center justify-center"
              title="Prendre la photo"
            >
              <span className="absolute inset-0 rounded-full border-[4px] border-primary" />
              <span className="w-[58px] h-[58px] rounded-full bg-primary flex items-center justify-center">
                <Camera className="w-7 h-7 text-on-primary" />
              </span>
            </button>

            <button
              onClick={basculerCamera}
              className="p-3 transition-colors border rounded-full bg-surface border-border text-on-surface hover:bg-surface-alt"
              title="Changer de caméra"
            >
              <SwitchCamera className="w-5 h-5" />
            </button>
          </div>
        )}

        {step === "review" && (
          <div className="flex gap-3">
            <button
              onClick={confirmerPhoto}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 bg-primary text-on-primary rounded-xl font-medium shadow-lg hover:bg-primary-dark transition-colors active:scale-[0.97]"
            >
              <Check className="w-5 h-5" />
              Utiliser cette photo
            </button>
            <button
              onClick={() => {
                setPreviewUrl(null);
                demarrerCamera();
              }}
              className="flex items-center justify-center gap-2 px-4 py-3.5 bg-surface border border-border text-on-surface rounded-xl font-medium hover:bg-surface-alt transition-colors"
              title="Reprendre"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>
        )}

        {step === "gallery" && (
          <div className="flex gap-3">
            <button
              onClick={lancerAnalyse}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 bg-primary text-on-primary rounded-xl font-medium shadow-lg hover:bg-primary-dark transition-colors active:scale-[0.97]"
            >
              <CheckCircle2 className="w-5 h-5" />
              Confirmer et analyser
            </button>
            <button
              onClick={ajouterPhoto}
              className="flex items-center justify-center gap-2 px-4 py-3.5 bg-surface border border-border text-on-surface rounded-xl font-medium hover:bg-surface-alt transition-colors"
              title="Ajouter une photo"
            >
              <ImagePlus className="w-5 h-5" />
            </button>
          </div>
        )}

        {step === "done" && (
          <div className="flex gap-3">
            <button
              onClick={retour}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 bg-surface border border-border text-on-surface rounded-xl font-medium hover:bg-surface-alt transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Retour aux résultats
            </button>
            <button
              onClick={reinitialiser}
              className="flex items-center justify-center gap-2 px-4 py-3.5 bg-surface border border-border text-muted rounded-xl font-medium hover:bg-surface-alt transition-colors"
              title="Tout recommencer"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
