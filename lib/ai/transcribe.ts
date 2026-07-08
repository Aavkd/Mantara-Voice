/**
 * Interface de transcription (STT) — SPEC_DESIGN.md section 9.4.
 *
 * L'implementation par defaut du MVP est Whisper local (taille pilotee par
 * WHISPER_MODEL, defaut `medium`), branchee en phase 3. On garde une interface
 * fine pour rester remplacable (autre taille, service distant) sans toucher au
 * reste du code. L'audio n'est jamais conserve (traitement temporaire).
 */
export interface Transcriber {
  transcribe(audio: Blob): Promise<string>;
}
