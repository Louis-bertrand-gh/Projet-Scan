/* ═══════════════════════════════════════════════════════════════════════
 * CameraScanner.tsx — Module Smart Scan v4
 *
 * Capture photo professionnelle optimisée OCR, mobile-first.
 *
 * Améliorations v4 :
 * - Zoom natif (videoTrack.applyConstraints) + fallback CSS transform
 * - Pinch-to-zoom via listeners natifs (passive: false) + throttle rAF
 * - Indicateur de zoom proéminent lors du balayage (ex: "×2.5")
 * - Barre de paliers 1× / 2× / 4×
 * - Navigation par « step » (idle → live → review → gallery → done)
 *   avec bouton retour protégeant les données déjà scannées
 * - Restauration de la galerie au retour depuis la validation OCR
 * - Zone "Ouvrir la caméra" avec bordure thématique et effet pulse
 * - Centrage vertical/horizontal responsive, pas de scroll parasite
 * - Bouton déclencheur séparé visuellement des contrôles de zoom
 * - will-change: transform pour fluidité GPU du zoom CSS
 * ═══════════════════════════════════════════════════════════════════════ */

"use client";

import React, {
  useRef,
  useState,
  useCallback,
  useEffect,
} from "react";
import {
  Camera,
  CameraOff,
  SwitchCamera,
  RotateCcw,
  Check,
  ImagePlus,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  ZoomIn,
  ZoomOut,
  ArrowLeft,
} from "lucide-react";
import { DonneesOCR } from "@/types";
import { simulerAnalyseOCR } from "@/lib/ocrSimulation";

/* ─── Types ──────────────────────────────────────────────────────────── */

/** Étapes du workflow — navigation linéaire avec retour possible */
export type Step =
  | "idle" // 1. Écran d'accueil
  | "live" // 2. Flux caméra actif
  | "review" // 3. Aperçu d'une capture
  | "gallery" // 4. Galerie (ajouter / analyser)
  | "analysing" // 5. OCR en cours
  | "done"; // 6. Résultat prêt

interface CameraScannerProps {
  onResultatOCR: (donnees: DonneesOCR) => void;
  onPhotoCapturee?: (photoBase64: string) => void;
  /** Photos initiales (restauration galerie après retour de validation) */
  initialPhotos?: string[];
  /** Callback de synchronisation des photos avec le composant parent */
  onPhotosChange?: (photos: string[]) => void;
}

/* Paliers de zoom proposés */
const ZOOM_STEPS = [1, 2, 4] as const;

/* ─── Utilitaire : distance entre deux doigts (TouchList natif) ────── */
function distanceEntreDoigts(touches: TouchList): number {
  const [a, b] = [touches[0], touches[1]];
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

/** Durée d'affichage de l'indicateur de zoom après fin du pinch (ms) */
const ZOOM_INDICATOR_DELAY = 900;

/* ═══════════════════════════════════════════════════════════════════════ */
export default function CameraScanner({
  onResultatOCR,
  onPhotoCapturee,
  initialPhotos,
  onPhotosChange,
}: CameraScannerProps) {
  /* ─── Refs ─────────────────────────────────────────────────── */
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);

  /* ─── State : navigation ───────────────────────────────────── */
  const [step, setStep] = useState<Step>(
    initialPhotos && initialPhotos.length > 0 ? "gallery" : "idle",
  );
  const [erreur, setErreur] = useState<string | null>(null);

  /* ─── State : appareils ────────────────────────────────────── */
  const [appareils, setAppareils] = useState<MediaDeviceInfo[]>([]);
  const [appareilIndex, setAppareilIndex] = useState(0);
  const [useFacingBack, setUseFacingBack] = useState(true);

  /* ─── State : photos ───────────────────────────────────────── */
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [photos, setPhotos] = useState<string[]>(initialPhotos ?? []);
  const [flash, setFlash] = useState(false);

  /* ─── State : zoom ─────────────────────────────────────────── */
  const [zoom, setZoom] = useState(1);
  const [zoomMin, setZoomMin] = useState(1);
  const [zoomMax, setZoomMax] = useState(1);
  const [supportsNativeZoom, setSupportsNativeZoom] = useState(false);
  /* Indicateur de zoom (affiché lors du pinch) */
  const [showZoomIndicator, setShowZoomIndicator] = useState(false);
  const zoomIndicatorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Pinch tracking refs (non-réactif, évite les re-renders inutiles) */
  const pinchStartDist = useRef(0);
  const pinchStartZoom = useRef(1);

  /** Ref miroir du zoom pour lecture dans les listeners natifs sans re-render */
  const zoomRef = useRef(1);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);

  /* ─── Synchronisation des photos avec le parent ────────────── */
  useEffect(() => {
    onPhotosChange?.(photos);
  }, [photos, onPhotosChange]);

  /* ─── Détection des caméras ────────────────────────────────── */
  const detecterAppareils = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter((d) => d.kind === "videoinput");
      setAppareils(cameras);
      return cameras;
    } catch {
      return [];
    }
  }, []);

  /* ─── Appliquer le zoom (natif ou CSS) ─────────────────────── */
  const appliquerZoom = useCallback(
    async (niveau: number) => {
      const clamped = Math.min(Math.max(niveau, zoomMin), zoomMax);
      setZoom(clamped);

      if (supportsNativeZoom && streamRef.current) {
        const track = streamRef.current.getVideoTracks()[0];
        try {
          await track.applyConstraints({
            advanced: [{ zoom: clamped } as MediaTrackConstraintSet],
          });
        } catch {
          /* Fallback CSS si applyConstraints échoue */
        }
      }
      /* Le zoom CSS est toujours appliqué dans le style inline du <video> */
    },
    [zoomMin, zoomMax, supportsNativeZoom],
  );

  /* ─── Démarrer le flux vidéo ───────────────────────────────── */
  const demarrerCamera = useCallback(
    async (deviceId?: string) => {
      try {
        setErreur(null);

        /* Couper le flux précédent */
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }

        const contraintes: MediaStreamConstraints = {
          video: deviceId
            ? {
                deviceId: { exact: deviceId },
                width: { ideal: 1920, min: 1280 },
                height: { ideal: 1080, min: 720 },
              }
            : {
                facingMode: useFacingBack ? "environment" : "user",
                width: { ideal: 1920, min: 1280 },
                height: { ideal: 1080, min: 720 },
              },
        };

        const stream = await navigator.mediaDevices.getUserMedia(contraintes);

        streamRef.current = stream;
        setStep("live");

        /* Attacher au <video> au prochain frame (ref toujours dans le DOM) */
        requestAnimationFrame(() => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(() => {});
          }
        });

        /* Détecter les capabilities de zoom */
        const track = stream.getVideoTracks()[0];
        const caps = track.getCapabilities() as MediaTrackCapabilities & {
          zoom?: { min: number; max: number; step: number };
        };
        if (caps.zoom) {
          setSupportsNativeZoom(true);
          setZoomMin(caps.zoom.min);
          setZoomMax(caps.zoom.max);
        } else {
          /* Pas de zoom natif → on offre quand même un zoom CSS jusqu'à 4× */
          setSupportsNativeZoom(false);
          setZoomMin(1);
          setZoomMax(4);
        }
        setZoom(1);

        /* Indexer l'appareil actif */
        const cameras = await detecterAppareils();
        const settings = track.getSettings();
        if (settings.deviceId && cameras.length > 0) {
          const idx = cameras.findIndex(
            (c) => c.deviceId === settings.deviceId,
          );
          if (idx !== -1) setAppareilIndex(idx);
        }
      } catch (err) {
        if (err instanceof DOMException) {
          if (err.name === "NotAllowedError") {
            setErreur(
              "Permission caméra refusée. Autorisez l\u2019accès dans les paramètres de votre navigateur.",
            );
          } else if (err.name === "NotFoundError") {
            setErreur("Aucune caméra détectée sur cet appareil.");
          } else if (err.name === "OverconstrainedError") {
            /* Fallback sans contraintes */
            try {
              const fb = await navigator.mediaDevices.getUserMedia({
                video: true,
              });
              streamRef.current = fb;
              setStep("live");
              requestAnimationFrame(() => {
                if (videoRef.current) {
                  videoRef.current.srcObject = fb;
                  videoRef.current.play().catch(() => {});
                }
              });
              setSupportsNativeZoom(false);
              setZoomMin(1);
              setZoomMax(4);
              setZoom(1);
            } catch {
              setErreur("Impossible d\u2019accéder à la caméra.");
            }
          } else {
            setErreur("Erreur d\u2019accès à la caméra. Veuillez réessayer.");
          }
        } else {
          setErreur("Erreur inattendue lors de l\u2019accès à la caméra.");
        }
      }
    },
    [useFacingBack, detecterAppareils],
  );

  /* ─── Arrêter le flux ──────────────────────────────────────── */
  const arreterCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  /* ─── Basculer entre caméras ───────────────────────────────── */
  const basculerCamera = useCallback(() => {
    if (appareils.length > 1) {
      const next = (appareilIndex + 1) % appareils.length;
      setAppareilIndex(next);
      setUseFacingBack((p) => !p);
      demarrerCamera(appareils[next].deviceId);
    } else {
      setUseFacingBack((p) => !p);
      demarrerCamera();
    }
  }, [appareils, appareilIndex, demarrerCamera]);

  /* ─── Pinch-to-zoom natif (passive: false pour preventDefault) ── */
  useEffect(() => {
    const container = videoContainerRef.current;
    if (!container || step !== "live") return;

    let rafId: number | null = null;

    /** Début du pinch : mémorise la distance et le zoom courant */
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        pinchStartDist.current = distanceEntreDoigts(e.touches);
        pinchStartZoom.current = zoomRef.current;
        setShowZoomIndicator(true);
        if (zoomIndicatorTimer.current) {
          clearTimeout(zoomIndicatorTimer.current);
          zoomIndicatorTimer.current = null;
        }
      }
    };

    /** Mouvement du pinch : calcule le ratio et applique le zoom (throttlé rAF) */
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        /* Capturer la distance immédiatement avant recyclage de l'événement */
        const dist = distanceEntreDoigts(e.touches);
        if (rafId !== null) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          const ratio = dist / pinchStartDist.current;
          appliquerZoom(pinchStartZoom.current * ratio);
          rafId = null;
        });
      }
    };

    /** Fin du pinch : masque l'indicateur après un délai */
    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        zoomIndicatorTimer.current = setTimeout(() => {
          setShowZoomIndicator(false);
          zoomIndicatorTimer.current = null;
        }, ZOOM_INDICATOR_DELAY);
      }
    };

    container.addEventListener("touchstart", onTouchStart, { passive: false });
    container.addEventListener("touchmove", onTouchMove, { passive: false });
    container.addEventListener("touchend", onTouchEnd);

    return () => {
      container.removeEventListener("touchstart", onTouchStart);
      container.removeEventListener("touchmove", onTouchMove);
      container.removeEventListener("touchend", onTouchEnd);
      if (rafId !== null) cancelAnimationFrame(rafId);
      if (zoomIndicatorTimer.current) clearTimeout(zoomIndicatorTimer.current);
    };
  }, [step, appliquerZoom]);

  /* ─── Capturer une photo ───────────────────────────────────── */
  const capturerPhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    /* Si zoom CSS (pas natif), on crop le centre */
    if (!supportsNativeZoom && zoom > 1) {
      const sw = video.videoWidth / zoom;
      const sh = video.videoHeight / zoom;
      const sx = (video.videoWidth - sw) / 2;
      const sy = (video.videoHeight - sh) / 2;
      ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    } else {
      ctx.drawImage(video, 0, 0);
    }

    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);

    setFlash(true);
    setTimeout(() => setFlash(false), 200);

    setPreviewUrl(dataUrl);
    onPhotoCapturee?.(dataUrl);
    arreterCamera();
    setStep("review");
  }, [arreterCamera, onPhotoCapturee, supportsNativeZoom, zoom]);

  /* ─── Confirmer la photo → galerie ─────────────────────────── */
  const confirmerPhoto = useCallback(() => {
    if (!previewUrl) return;
    setPhotos((prev) => [...prev, previewUrl]);
    setPreviewUrl(null);
    setStep("gallery");
  }, [previewUrl]);

  /* ─── Refaire la photo ─────────────────────────────────────── */
  const refairePhoto = useCallback(() => {
    setPreviewUrl(null);
    demarrerCamera();
  }, [demarrerCamera]);

  /* ─── Ajouter une photo ────────────────────────────────────── */
  const ajouterPhoto = useCallback(() => {
    setPreviewUrl(null);
    demarrerCamera();
  }, [demarrerCamera]);

  /* ─── Supprimer une photo ──────────────────────────────────── */
  const supprimerPhoto = useCallback((i: number) => {
    setPhotos((prev) => {
      const next = prev.filter((_, idx) => idx !== i);
      if (next.length === 0) setStep("idle");
      return next;
    });
  }, []);

  /* ─── Lancer l'OCR ─────────────────────────────────────────── */
  const lancerAnalyse = useCallback(async () => {
    setStep("analysing");
    const resultat = await simulerAnalyseOCR();
    setStep("done");
    onResultatOCR(resultat);
  }, [onResultatOCR]);

  /* ─── Bouton retour intelligent ────────────────────────────── */
  const retour = useCallback(() => {
    switch (step) {
      case "live":
        arreterCamera();
        /* Retour vers la galerie si des photos existent, sinon idle */
        setStep(photos.length > 0 ? "gallery" : "idle");
        break;
      case "review":
        /* Jette l'aperçu, retour en live */
        setPreviewUrl(null);
        demarrerCamera();
        break;
      case "gallery":
        /* Ne pas perdre les photos — rester en galerie ou idle si vide */
        if (photos.length === 0) setStep("idle");
        break;
      case "done":
        /* Retour à la galerie pour ajouter / re-analyser */
        setStep("gallery");
        break;
      default:
        break;
    }
  }, [step, photos.length, arreterCamera, demarrerCamera]);

  /* ─── Tout réinitialiser ───────────────────────────────────── */
  const reinitialiser = useCallback(() => {
    arreterCamera();
    setPhotos([]);
    setPreviewUrl(null);
    setStep("idle");
    setErreur(null);
    setZoom(1);
  }, [arreterCamera]);

  /* ─── Cleanup au démontage ─────────────────────────────────── */
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  /* ─── Helper : label zoom ──────────────────────────────────── */
  const zoomLabel = (v: number) => {
    if (v >= zoomMax) return `${Math.round(zoomMax)}×`;
    return `${Math.round(v * 10) / 10}×`;
  };

  /* ═══════════════════════════════════════════ RENDU ══════════ */
  return (
    <div className="flex flex-col items-center justify-center w-full max-w-lg mx-auto">
      {/* Canvas caché */}
      <canvas ref={canvasRef} className="hidden" />

      {/* ─── Zone visuelle principale ─────────────────────────── */}
      <div
        ref={videoContainerRef}
        className={`relative w-full rounded-2xl overflow-hidden transition-all duration-500 ease-out ${
          step === "idle"
            ? "aspect-square border-2 border-primary/30 hover:border-primary/50 bg-surface-alt"
            : "aspect-[3/4] min-h-[55vh] sm:min-h-0 bg-black"
        }`}
      >
        {/* ── <video> toujours dans le DOM ─────────────────────── */}
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

        {/* Flash capture */}
        {flash && (
          <div className="absolute inset-0 z-50 bg-white animate-camera-flash pointer-events-none" />
        )}

        {/* ═══ STEP : IDLE ════════════════════════════════════════ */}
        {step === "idle" && (
          <button
            onClick={() => demarrerCamera()}
            className="absolute inset-0 w-full h-full flex flex-col items-center justify-center gap-5 group cursor-pointer transition-colors hover:bg-surface/50"
          >
            {/* Grande icône invitant à l'action — pulsation subtile */}
            <div className="w-24 h-24 rounded-3xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 group-hover:scale-105 transition-all duration-300 animate-idle-pulse">
              <Camera className="w-12 h-12 text-primary" />
            </div>
            <div className="text-center px-8">
              <p className="text-on-surface font-semibold text-lg mb-1">
                Ouvrir la caméra
              </p>
              <p className="text-muted text-sm leading-relaxed">
                Prenez en photo l&apos;étiquette du produit pour extraire
                automatiquement le lot, la DLC et le nom.
              </p>
            </div>
            {erreur && (
              <div className="mx-6 p-3 bg-danger/10 border border-danger/20 rounded-lg flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
                <p className="text-danger text-sm text-left">{erreur}</p>
              </div>
            )}
          </button>
        )}

        {/* ═══ STEP : LIVE — overlays caméra ═════════════════════ */}
        {step === "live" && (
          <>
            {/* Badge LIVE */}
            <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-danger/80 backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span className="text-white text-xs font-semibold tracking-wide">
                LIVE
              </span>
            </div>

            {/* Bascule caméra */}
            <button
              onClick={basculerCamera}
              className="absolute top-3 right-3 z-10 p-2.5 bg-black/50 backdrop-blur-sm rounded-full text-white hover:bg-black/70 transition-colors active:scale-90"
              title="Changer de caméra"
            >
              <SwitchCamera className="w-5 h-5" />
            </button>

            {/* Indicateur de zoom central (visible pendant le pinch) */}
            {showZoomIndicator && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none">
                <span className="px-4 py-2 rounded-full bg-black/60 backdrop-blur-sm text-white text-lg font-bold tabular-nums">
                  ×{Math.round(zoom * 10) / 10}
                </span>
              </div>
            )}

            {/* Cadre de guidage */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-[75%] h-[55%]">
                <span className="absolute top-0 left-0 w-7 h-7 border-t-[3px] border-l-[3px] border-white rounded-tl-lg" />
                <span className="absolute top-0 right-0 w-7 h-7 border-t-[3px] border-r-[3px] border-white rounded-tr-lg" />
                <span className="absolute bottom-0 left-0 w-7 h-7 border-b-[3px] border-l-[3px] border-white rounded-bl-lg" />
                <span className="absolute bottom-0 right-0 w-7 h-7 border-b-[3px] border-r-[3px] border-white rounded-br-lg" />
                <div className="absolute inset-[6px] border border-white/30 rounded-lg" />
              </div>
            </div>

            {/* Barre zoom intégrée (bas du cadre vidéo) */}
            <div className="absolute bottom-3 left-0 right-0 z-10 flex items-center justify-center gap-1">
              <button
                onClick={() => appliquerZoom(zoom - 0.5)}
                className="p-1.5 rounded-full bg-black/40 backdrop-blur-sm text-white active:scale-90"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              {ZOOM_STEPS.map((palier) => (
                <button
                  key={palier}
                  onClick={() => appliquerZoom(palier)}
                  className={`min-w-[40px] py-1 rounded-full text-xs font-bold transition-colors ${
                    Math.abs(zoom - palier) < 0.3
                      ? "bg-white text-black"
                      : "bg-black/40 backdrop-blur-sm text-white"
                  }`}
                >
                  {palier}×
                </button>
              ))}
              <button
                onClick={() => appliquerZoom(zoom + 0.5)}
                className="p-1.5 rounded-full bg-black/40 backdrop-blur-sm text-white active:scale-90"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              {/* Indicateur zoom courant */}
              <span className="ml-1 text-[10px] text-white/70 font-medium">
                {zoomLabel(zoom)}
              </span>
            </div>
          </>
        )}

        {/* ═══ STEP : REVIEW ═════════════════════════════════════ */}
        {step === "review" && previewUrl && (
          <div className="relative w-full h-full animate-fade-in">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Photo capturée"
              className="w-full h-full object-cover"
            />
            <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-black/60 backdrop-blur-sm text-white text-xs font-medium">
              Aperçu
            </div>
          </div>
        )}

        {/* ═══ STEP : GALLERY ════════════════════════════════════ */}
        {step === "gallery" && (
          <div className="w-full h-full bg-surface-alt p-3 flex flex-col animate-fade-in">
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
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => supprimerPhoto(i)}
                      className="absolute top-1 right-1 p-1 bg-danger/80 rounded-full text-white opacity-0 group-hover:opacity-100 sm:opacity-100 transition-opacity"
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

        {/* ═══ STEP : ANALYSING ══════════════════════════════════ */}
        {step === "analysing" && (
          <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-surface-alt animate-fade-in">
            <div className="flex gap-2 mb-2">
              {photos.map((p, i) => (
                <div
                  key={i}
                  className="w-14 h-14 rounded-lg overflow-hidden border-2 border-primary/40"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <div className="text-center">
              <p className="text-on-surface text-sm font-medium">
                Analyse OCR en cours…
              </p>
              <p className="text-muted text-xs mt-1">
                Extraction du lot, DLC et nom du produit
              </p>
            </div>
          </div>
        )}

        {/* ═══ STEP : DONE ═══════════════════════════════════════ */}
        {step === "done" && (
          <div className="w-full h-full flex items-center justify-center bg-surface-alt animate-fade-in">
            <div className="bg-success/90 rounded-full p-4 animate-bounce">
              <CheckCircle2 className="w-10 h-10 text-white" />
            </div>
          </div>
        )}
      </div>

      {/* ─── Contrôles bas (séparés du zoom) ──────────────────── */}
      <div className="w-full mt-5 space-y-3">
        {/* ── LIVE : Déclencheur + contrôles ───────────────────── */}
        {step === "live" && (
          <div className="flex items-center justify-center gap-8">
            {/* Retour */}
            <button
              onClick={retour}
              className="p-3 bg-surface border border-border text-on-surface rounded-full hover:bg-surface-alt transition-colors"
              title="Retour"
            >
              {photos.length > 0 ? (
                <ArrowLeft className="w-5 h-5" />
              ) : (
                <CameraOff className="w-5 h-5" />
              )}
            </button>

            {/* Déclencheur principal — bien séparé visuellement */}
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

            {/* Bascule caméra */}
            <button
              onClick={basculerCamera}
              className="p-3 bg-surface border border-border text-on-surface rounded-full hover:bg-surface-alt transition-colors"
              title="Changer de caméra"
            >
              <SwitchCamera className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* ── REVIEW : Utiliser / Refaire ──────────────────────── */}
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
              onClick={refairePhoto}
              className="flex items-center justify-center gap-2 px-4 py-3.5 bg-surface border border-border text-on-surface rounded-xl font-medium hover:bg-surface-alt transition-colors"
              title="Reprendre"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* ── GALLERY : Analyser / Ajouter ─────────────────────── */}
        {step === "gallery" && (
          <div className="flex gap-3">
            <button
              onClick={lancerAnalyse}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 bg-primary text-on-primary rounded-xl font-medium shadow-lg hover:bg-primary-dark transition-colors active:scale-[0.97]"
            >
              <CheckCircle2 className="w-5 h-5" />
              Analyser ({photos.length} photo
              {photos.length > 1 ? "s" : ""})
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

        {/* ── DONE : Retour galerie / Nouveau scan ─────────────── */}
        {step === "done" && (
          <div className="flex gap-3">
            <button
              onClick={retour}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 bg-surface border border-border text-on-surface rounded-xl font-medium hover:bg-surface-alt transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Retour aux photos
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
