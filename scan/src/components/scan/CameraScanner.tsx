/* ═══════════════════════════════════════════════════════════════════════
 * CameraScanner.tsx — Module de capture photo pour le scan HACCP
 *
 * Utilise l'API navigator.mediaDevices.getUserMedia pour accéder
 * à la caméra arrière du téléphone. L'utilisateur peut :
 * 1. Démarrer la caméra
 * 2. Prendre une photo de l'étiquette produit
 * 3. Lancer l'analyse OCR simulée
 *
 * Mobile-First : optimisé pour une utilisation terrain (cuisine,
 * chambre froide, etc.).
 * ═══════════════════════════════════════════════════════════════════════ */

"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
import {
  Camera,
  CameraOff,
  RotateCcw,
  Zap,
  Loader2,
  CheckCircle2,
  X,
} from "lucide-react";
import { DonneesOCR } from "@/types";
import { simulerAnalyseOCR } from "@/lib/ocrSimulation";

/* ─── Props du composant ─────────────────────────────────────────────── */
interface CameraScannerProps {
  /** Callback appelé quand l'OCR a extrait les données */
  onResultatOCR: (donnees: DonneesOCR) => void;
  /** Callback avec la photo capturée (base64) */
  onPhotoCapturee?: (photoBase64: string) => void;
}

export default function CameraScanner({
  onResultatOCR,
  onPhotoCapturee,
}: CameraScannerProps) {
  /* ─── Références DOM ───────────────────────────────────────────── */
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  /* ─── États ────────────────────────────────────────────────────── */
  const [cameraActive, setCameraActive] = useState(false);
  const [photoCapturee, setPhotoCapturee] = useState<string | null>(null);
  const [analyseEnCours, setAnalyseEnCours] = useState(false);
  const [analyseTerminee, setAnalyseTerminee] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  /**
   * Démarre le flux vidéo depuis la caméra arrière.
   * On privilégie "environment" (caméra arrière) car l'utilisateur
   * scanne des étiquettes devant lui.
   */
  const demarrerCamera = useCallback(async () => {
    try {
      setErreur(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment", // Caméra arrière
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setCameraActive(true);
      }
    } catch (err) {
      /*
       * Gestion des erreurs courantes :
       * - NotAllowedError : permission refusée
       * - NotFoundError : pas de caméra détectée
       */
      if (err instanceof DOMException) {
        if (err.name === "NotAllowedError") {
          setErreur(
            "Permission caméra refusée. Autorisez l'accès dans les paramètres de votre navigateur.",
          );
        } else if (err.name === "NotFoundError") {
          setErreur("Aucune caméra détectée sur cet appareil.");
        } else {
          setErreur("Erreur d'accès à la caméra. Veuillez réessayer.");
        }
      } else {
        setErreur("Erreur inattendue lors de l'accès à la caméra.");
      }
    }
  }, []);

  /**
   * Arrête proprement le flux vidéo pour libérer la caméra.
   * Important sur mobile pour ne pas consommer la batterie.
   */
  const arreterCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  /* Nettoyage au démontage du composant */
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  /**
   * Capture une image du flux vidéo via un Canvas.
   * La photo est encodée en base64 (JPEG, qualité 85%).
   */
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

    setPhotoCapturee(dataUrl);
    onPhotoCapturee?.(dataUrl);
    arreterCamera();
  }, [arreterCamera, onPhotoCapturee]);

  /**
   * Lance l'analyse OCR simulée.
   * En production, cette fonction enverrait l'image à un service
   * OCR (Google Vision, Tesseract, etc.).
   */
  const lancerAnalyse = useCallback(async () => {
    setAnalyseEnCours(true);
    setAnalyseTerminee(false);

    /* Simulation : l'OCR prend ~2 secondes */
    const resultat = await simulerAnalyseOCR();

    setAnalyseEnCours(false);
    setAnalyseTerminee(true);
    onResultatOCR(resultat);
  }, [onResultatOCR]);

  /** Réinitialise le scanner pour un nouveau scan */
  const recommencer = useCallback(() => {
    setPhotoCapturee(null);
    setAnalyseTerminee(false);
    setErreur(null);
  }, []);

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* ─── Zone de capture / aperçu ─────────────────────────── */}
      <div className="relative rounded-2xl overflow-hidden bg-black aspect-[4/3]">
        {/* Canvas caché pour la capture d'image */}
        <canvas ref={canvasRef} className="hidden" />

        {/* ─── Affichage selon l'état ──────────────────────────── */}
        {photoCapturee ? (
          /* Photo capturée : affichage de l'aperçu */
          <div className="relative w-full h-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoCapturee}
              alt="Étiquette capturée"
              className="w-full h-full object-cover"
            />

            {/* Overlay d'analyse en cours */}
            {analyseEnCours && (
              <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-10 h-10 text-white animate-spin" />
                <p className="text-white text-sm font-medium">
                  Analyse OCR en cours...
                </p>
                <p className="text-white/70 text-xs">
                  Extraction du lot, DLC et nom du produit
                </p>
              </div>
            )}

            {/* Indicateur d'analyse réussie */}
            {analyseTerminee && (
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <div className="bg-success/90 rounded-full p-3 animate-bounce">
                  <CheckCircle2 className="w-8 h-8 text-white" />
                </div>
              </div>
            )}

            {/* Bouton fermer / recommencer */}
            {!analyseEnCours && (
              <button
                onClick={recommencer}
                className="absolute top-3 right-3 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
                title="Recommencer"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        ) : cameraActive ? (
          /* Flux vidéo actif */
          <div className="relative w-full h-full">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {/* Cadre de guidage pour la prise de photo */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-3/4 h-1/2 border-2 border-white/60 rounded-xl">
                <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-white rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-white rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-white rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-white rounded-br-lg" />
              </div>
            </div>

            {/* Instruction */}
            <p className="absolute bottom-4 left-0 right-0 text-center text-white text-sm bg-black/40 py-1">
              Cadrez l&apos;étiquette du produit
            </p>
          </div>
        ) : (
          /* État initial : caméra éteinte */
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

            {/* Affichage d'erreur si problème caméra */}
            {erreur && (
              <div className="mx-6 p-3 bg-danger/10 border border-danger/20 rounded-lg">
                <p className="text-danger text-sm text-center">{erreur}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Boutons d'action ─────────────────────────────────── */}
      <div className="flex gap-3 mt-4">
        {!photoCapturee && !cameraActive && (
          /* Bouton démarrer la caméra */
          <button
            onClick={demarrerCamera}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary text-on-primary rounded-xl font-medium shadow-lg hover:bg-primary-dark transition-colors active:scale-95"
          >
            <Camera className="w-5 h-5" />
            Ouvrir la caméra
          </button>
        )}

        {cameraActive && !photoCapturee && (
          <>
            {/* Bouton capturer */}
            <button
              onClick={capturerPhoto}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary text-on-primary rounded-xl font-medium shadow-lg hover:bg-primary-dark transition-colors active:scale-95"
            >
              <Zap className="w-5 h-5" />
              Capturer
            </button>
            {/* Bouton annuler */}
            <button
              onClick={arreterCamera}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-surface border border-border text-on-surface rounded-xl font-medium hover:bg-surface-alt transition-colors"
            >
              <CameraOff className="w-5 h-5" />
            </button>
          </>
        )}

        {photoCapturee && !analyseEnCours && !analyseTerminee && (
          <>
            {/* Bouton lancer l'analyse OCR */}
            <button
              onClick={lancerAnalyse}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary text-on-primary rounded-xl font-medium shadow-lg hover:bg-primary-dark transition-colors active:scale-95"
            >
              <Zap className="w-5 h-5" />
              Analyser l&apos;étiquette
            </button>
            {/* Bouton reprendre la photo */}
            <button
              onClick={recommencer}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-surface border border-border text-on-surface rounded-xl font-medium hover:bg-surface-alt transition-colors"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </>
        )}

        {analyseTerminee && (
          /* Bouton nouveau scan */
          <button
            onClick={recommencer}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-surface border border-border text-on-surface rounded-xl font-medium hover:bg-surface-alt transition-colors"
          >
            <RotateCcw className="w-5 h-5" />
            Nouveau scan
          </button>
        )}
      </div>
    </div>
  );
}
