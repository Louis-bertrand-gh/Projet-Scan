/* ═══════════════════════════════════════════════════════════════════════
 * CameraScanner.tsx — Module Smart Scan : capture photo professionnelle
 *
 * Expérience caméra fluide et mobile-first pour CC, CCA, RP et
 * équipiers. Optimise la qualité d'image pour la reconnaissance OCR.
 *
 * Fonctionnalités :
 * - Détection dynamique de toutes les caméras disponibles
 * - Préférence caméra arrière (facingMode: environment)
 * - Bascule manuelle avant/arrière
 * - Résolution HD (1280×720+) avec compression JPEG 85 %
 * - Flash visuel à la capture + aperçu / refaire / confirmer
 * - Gestion multi-photo (ajouter d'autres photos)
 * - Intégration workflow OCR (base64 → simulation)
 * ═══════════════════════════════════════════════════════════════════════ */

"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
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
} from "lucide-react";
import { DonneesOCR } from "@/types";
import { simulerAnalyseOCR } from "@/lib/ocrSimulation";

/* ─── Types internes ─────────────────────────────────────────────────── */
type Phase =
  | "idle" // Caméra éteinte
  | "live" // Flux vidéo actif
  | "review" // Aperçu de la dernière capture
  | "gallery" // Galerie de photos confirmées
  | "analysing" // Analyse OCR en cours
  | "done"; // Analyse terminée

interface CameraScannerProps {
  /** Callback quand l'OCR a extrait les données */
  onResultatOCR: (donnees: DonneesOCR) => void;
  /** Callback avec la photo capturée (base64) */
  onPhotoCapturee?: (photoBase64: string) => void;
}

/* ═══════════════════════════════════════════════════════════════════════ */
export default function CameraScanner({
  onResultatOCR,
  onPhotoCapturee,
}: CameraScannerProps) {
  /* ─── Refs ─────────────────────────────────────────────────── */
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  /* ─── State ────────────────────────────────────────────────── */
  const [phase, setPhase] = useState<Phase>("idle");
  const [erreur, setErreur] = useState<string | null>(null);

  // Appareils détectés
  const [appareils, setAppareils] = useState<MediaDeviceInfo[]>([]);
  const [appareilIndex, setAppareilIndex] = useState(0);
  const [useFacingBack, setUseFacingBack] = useState(true);

  // Photos
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);

  // Flash visuel
  const [flash, setFlash] = useState(false);

  /* ─── Détection des caméras disponibles ────────────────────── */
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

  /* ─── Démarrer le flux vidéo ───────────────────────────────── */
  const demarrerCamera = useCallback(
    async (deviceId?: string) => {
      try {
        setErreur(null);

        // Arrêter le flux existant
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
        setPhase("live");

        // Attacher le flux au <video> au prochain tick
        // (le <video> est toujours dans le DOM, mais on attend
        //  que React ait traité le changement de phase)
        requestAnimationFrame(() => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(() => {});
          }
        });

        // Détecter les appareils après obtention de la permission
        const cameras = await detecterAppareils();
        const activeTrack = stream.getVideoTracks()[0];
        const activeSettings = activeTrack.getSettings();
        if (activeSettings.deviceId && cameras.length > 0) {
          const idx = cameras.findIndex(
            (c) => c.deviceId === activeSettings.deviceId,
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
            try {
              const fallback = await navigator.mediaDevices.getUserMedia({
                video: true,
              });
              streamRef.current = fallback;
              setPhase("live");
              requestAnimationFrame(() => {
                if (videoRef.current) {
                  videoRef.current.srcObject = fallback;
                  videoRef.current.play().catch(() => {});
                }
              });
            } catch {
              setErreur(
                "Impossible d\u2019accéder à la caméra avec les paramètres demandés.",
              );
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
      const nextIndex = (appareilIndex + 1) % appareils.length;
      setAppareilIndex(nextIndex);
      setUseFacingBack((prev) => !prev);
      demarrerCamera(appareils[nextIndex].deviceId);
    } else {
      setUseFacingBack((prev) => !prev);
      demarrerCamera();
    }
  }, [appareils, appareilIndex, demarrerCamera]);

  /* ─── Capturer une photo ───────────────────────────────────── */
  const capturerPhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);

    // Flash visuel
    setFlash(true);
    setTimeout(() => setFlash(false), 200);

    setPreviewUrl(dataUrl);
    onPhotoCapturee?.(dataUrl);
    arreterCamera();
    setPhase("review");
  }, [arreterCamera, onPhotoCapturee]);

  /* ─── Confirmer la photo → galerie ─────────────────────────── */
  const confirmerPhoto = useCallback(() => {
    if (!previewUrl) return;
    setPhotos((prev) => [...prev, previewUrl]);
    setPreviewUrl(null);
    setPhase("gallery");
  }, [previewUrl]);

  /* ─── Refaire la photo ─────────────────────────────────────── */
  const refairePhoto = useCallback(() => {
    setPreviewUrl(null);
    demarrerCamera();
  }, [demarrerCamera]);

  /* ─── Ajouter une photo supplémentaire ─────────────────────── */
  const ajouterAutrePhoto = useCallback(() => {
    setPreviewUrl(null);
    demarrerCamera();
  }, [demarrerCamera]);

  /* ─── Supprimer une photo de la galerie ────────────────────── */
  const supprimerPhoto = useCallback((index: number) => {
    setPhotos((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length === 0) setPhase("idle");
      return next;
    });
  }, []);

  /* ─── Lancer l'analyse OCR ─────────────────────────────────── */
  const lancerAnalyse = useCallback(async () => {
    setPhase("analysing");
    const resultat = await simulerAnalyseOCR();
    setPhase("done");
    onResultatOCR(resultat);
  }, [onResultatOCR]);

  /* ─── Tout réinitialiser ───────────────────────────────────── */
  const reinitialiser = useCallback(() => {
    arreterCamera();
    setPhotos([]);
    setPreviewUrl(null);
    setPhase("idle");
    setErreur(null);
  }, [arreterCamera]);

  /* ─── Cleanup au démontage ─────────────────────────────────── */
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  /* ═══════════════════════════════════════════ RENDU ══════════ */
  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Canvas caché pour la capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* ─── Zone visuelle principale ─────────────────────────── */}
      <div className="relative rounded-2xl overflow-hidden bg-black aspect-[4/3] min-h-[50vh] sm:min-h-0">
        {/* Élément <video> TOUJOURS dans le DOM pour que la ref soit
            disponible quand getUserMedia retourne le stream. */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          onLoadedMetadata={(e) => {
            // Safety-net : force play si autoPlay échoue (ex. iOS)
            (e.target as HTMLVideoElement).play().catch(() => {});
          }}
          className={`absolute inset-0 w-full h-full object-cover ${
            phase === "live" ? "block" : "hidden"
          }`}
        />

        {/* Flash blanc de capture */}
        {flash && (
          <div className="absolute inset-0 z-50 bg-white animate-camera-flash pointer-events-none" />
        )}

        {/* ── Phase IDLE ────────────────────────────────────────── */}
        {phase === "idle" && (
          <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-surface-alt">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Camera className="w-8 h-8 text-primary" />
            </div>
            <div className="text-center px-6">
              <p className="text-on-surface font-medium mb-1">
                Scanner une étiquette
              </p>
              <p className="text-muted text-sm">
                Prenez en photo l&apos;étiquette du produit pour extraire
                automatiquement le lot, la DLC et le nom.
              </p>
            </div>
            {erreur && (
              <div className="mx-6 p-3 bg-danger/10 border border-danger/20 rounded-lg flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
                <p className="text-danger text-sm">{erreur}</p>
              </div>
            )}
          </div>
        )}

        {/* ── Phase LIVE : overlays sur le flux vidéo ──────────── */}
        {phase === "live" && (
          <>
            {/* Indicateur LIVE (haut-gauche) */}
            <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-danger/80 backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span className="text-white text-xs font-semibold tracking-wide">
                LIVE
              </span>
            </div>

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

            {/* Bouton bascule caméra (overlay haut-droite) */}
            <button
              onClick={basculerCamera}
              className="absolute top-3 right-3 z-10 p-2.5 bg-black/50 backdrop-blur-sm rounded-full text-white hover:bg-black/70 transition-colors active:scale-90"
              title="Changer de caméra"
            >
              <SwitchCamera className="w-5 h-5" />
            </button>

            {/* Instruction */}
            <p className="absolute bottom-3 left-0 right-0 text-center text-white/90 text-sm font-medium drop-shadow-lg">
              Cadrez l&apos;étiquette du produit
            </p>
          </>
        )}

        {/* ── Phase REVIEW : aperçu après capture ───────────────── */}
        {phase === "review" && previewUrl && (
          <div className="relative w-full h-full">
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

        {/* ── Phase GALLERY : photos confirmées ─────────────────── */}
        {phase === "gallery" && (
          <div className="w-full h-full bg-surface-alt p-3 flex flex-col">
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

        {/* ── Phase ANALYSING : OCR en cours ────────────────────── */}
        {phase === "analysing" && (
          <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-surface-alt">
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

        {/* ── Phase DONE : terminé ──────────────────────────────── */}
        {phase === "done" && (
          <div className="w-full h-full flex items-center justify-center bg-surface-alt">
            <div className="bg-success/90 rounded-full p-4 animate-bounce">
              <CheckCircle2 className="w-10 h-10 text-white" />
            </div>
          </div>
        )}
      </div>

      {/* ─── Boutons d'action (zone basse, usage une main) ────── */}
      <div className="mt-4 space-y-3">
        {/* ── IDLE → Ouvrir la caméra ───────────────────────────── */}
        {phase === "idle" && (
          <button
            onClick={() => demarrerCamera()}
            className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-primary text-on-primary rounded-xl font-medium shadow-lg hover:bg-primary-dark transition-colors active:scale-[0.97]"
          >
            <Camera className="w-5 h-5" />
            Ouvrir la caméra
          </button>
        )}

        {/* ── LIVE → Déclencheur central + contrôles latéraux ──── */}
        {phase === "live" && (
          <div className="flex items-center justify-center gap-6">
            {/* Annuler / retour */}
            <button
              onClick={() => {
                arreterCamera();
                setPhase(photos.length > 0 ? "gallery" : "idle");
              }}
              className="p-3 bg-surface border border-border text-on-surface rounded-full hover:bg-surface-alt transition-colors"
              title="Fermer la caméra"
            >
              <CameraOff className="w-5 h-5" />
            </button>

            {/* Déclencheur principal */}
            <button
              onClick={capturerPhoto}
              className="relative w-[72px] h-[72px] rounded-full bg-white shadow-xl active:scale-90 transition-transform flex items-center justify-center"
              title="Prendre la photo"
            >
              <span className="absolute inset-0 rounded-full border-[4px] border-primary" />
              <span className="w-[56px] h-[56px] rounded-full bg-primary flex items-center justify-center">
                <Camera className="w-6 h-6 text-on-primary" />
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

        {/* ── REVIEW → Utiliser / Refaire ───────────────────────── */}
        {phase === "review" && (
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
              title="Reprendre la photo"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* ── GALLERY → Analyser / Ajouter ──────────────────────── */}
        {phase === "gallery" && (
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
              onClick={ajouterAutrePhoto}
              className="flex items-center justify-center gap-2 px-4 py-3.5 bg-surface border border-border text-on-surface rounded-xl font-medium hover:bg-surface-alt transition-colors"
              title="Ajouter une photo"
            >
              <ImagePlus className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* ── DONE → Nouveau scan ───────────────────────────────── */}
        {phase === "done" && (
          <button
            onClick={reinitialiser}
            className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-surface border border-border text-on-surface rounded-xl font-medium hover:bg-surface-alt transition-colors"
          >
            <RotateCcw className="w-5 h-5" />
            Nouveau scan
          </button>
        )}
      </div>
    </div>
  );
}
