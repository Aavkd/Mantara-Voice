import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

/**
 * Interface de transcription (STT) - SPEC_DESIGN.md section 9.4.
 *
 * L'implementation par defaut du MVP est Whisper local (taille pilotee par
 * WHISPER_MODEL, defaut `medium`). L'audio est ecrit dans un dossier temporaire
 * le temps de l'appel CLI, puis supprime dans tous les cas.
 */
export interface Transcriber {
  transcribe(audio: Blob): Promise<string>;
}

export class TranscriptionError extends Error {
  constructor(message = "Transcription audio impossible.") {
    super(message);
    this.name = "TranscriptionError";
  }
}

type WhisperBackend = "faster-whisper" | "openai-whisper" | "whisper-cpp";

const DEFAULT_WHISPER_MODEL = "medium";
const DEFAULT_LANGUAGE = "fr";
const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;

function audioExtension(audio: Blob): string {
  const type = audio.type.toLowerCase();
  if (type.includes("webm")) return ".webm";
  if (type.includes("wav")) return ".wav";
  if (type.includes("mpeg") || type.includes("mp3")) return ".mp3";
  if (type.includes("mp4") || type.includes("m4a")) return ".m4a";
  if (type.includes("ogg")) return ".ogg";
  return ".audio";
}

function parseTimeout(): number {
  const raw = process.env.WHISPER_TIMEOUT_MS;
  if (!raw) {
    return DEFAULT_TIMEOUT_MS;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS;
}

function selectedBackend(): WhisperBackend {
  const configured = process.env.WHISPER_BACKEND?.trim().toLowerCase();
  if (
    configured === "faster-whisper" ||
    configured === "openai-whisper" ||
    configured === "whisper-cpp"
  ) {
    return configured;
  }

  return process.env.WHISPER_CPP_MODEL_PATH?.trim() ? "whisper-cpp" : "faster-whisper";
}

async function runCommand(
  command: string,
  args: string[],
  timeoutMs: number,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const chunks: Buffer[] = [];
    const errorChunks: Buffer[] = [];
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(
        new TranscriptionError("Whisper a depasse le temps maximal de transcription."),
      );
    }, timeoutMs);

    child.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => errorChunks.push(chunk));
    child.on("error", (error: NodeJS.ErrnoException) => {
      clearTimeout(timer);
      if (error.code === "ENOENT") {
        reject(
          new TranscriptionError(
            `Executable Whisper introuvable (${command}). Configurez WHISPER_EXECUTABLE ou installez Whisper localement.`,
          ),
        );
        return;
      }
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve();
        return;
      }

      const output = Buffer.concat([...chunks, ...errorChunks])
        .toString("utf8")
        .replace(/\s+/g, " ")
        .trim();
      reject(
        new TranscriptionError(
          output
            ? `Whisper a echoue (code ${code}) : ${output.slice(0, 500)}`
            : `Whisper a echoue (code ${code}).`,
        ),
      );
    });
  });
}

async function readTranscript(tempDir: string): Promise<string> {
  const entries = await readdir(tempDir);
  const txtFile = entries.find((entry) => entry.toLowerCase().endsWith(".txt"));
  if (!txtFile) {
    throw new TranscriptionError(
      "Whisper n'a pas produit de fichier de transcription.",
    );
  }

  const transcript = (await readFile(path.join(tempDir, txtFile), "utf8")).trim();
  if (!transcript) {
    throw new TranscriptionError("La transcription audio est vide.");
  }
  return transcript;
}

function whisperCppArgs(inputPath: string, tempDir: string): string[] {
  const modelPath = process.env.WHISPER_CPP_MODEL_PATH?.trim();
  if (!modelPath) {
    throw new TranscriptionError(
      "WHISPER_CPP_MODEL_PATH est requis avec WHISPER_BACKEND=whisper-cpp.",
    );
  }

  return [
    "-m",
    modelPath,
    "-f",
    inputPath,
    "-l",
    process.env.WHISPER_LANGUAGE?.trim() || DEFAULT_LANGUAGE,
    "-otxt",
    "-of",
    path.join(tempDir, "transcript"),
  ];
}

function fasterWhisperArgs(
  inputPath: string,
  tempDir: string,
): { command: string; args: string[] } {
  const outputPath = path.join(tempDir, "transcript.txt");
  const script = [
    "import os, sys",
    "from pathlib import Path",
    "try:",
    "    from faster_whisper import WhisperModel",
    "except Exception as exc:",
    "    print(f'Import faster_whisper impossible: {exc}', file=sys.stderr)",
    "    sys.exit(2)",
    "audio_path, output_path, model_size, language = sys.argv[1:5]",
    "device = os.environ.get('WHISPER_DEVICE', 'auto')",
    "compute_type = os.environ.get('WHISPER_COMPUTE_TYPE', 'default')",
    "model = WhisperModel(model_size, device=device, compute_type=compute_type)",
    "segments, _info = model.transcribe(audio_path, language=language or None, vad_filter=True)",
    "text = ''.join(segment.text for segment in segments).strip()",
    "Path(output_path).write_text(text, encoding='utf-8')",
  ].join("\n");

  return {
    command: process.env.WHISPER_PYTHON_EXECUTABLE?.trim() || "python",
    args: [
      "-c",
      script,
      inputPath,
      outputPath,
      process.env.WHISPER_MODEL?.trim() || DEFAULT_WHISPER_MODEL,
      process.env.WHISPER_LANGUAGE?.trim() || DEFAULT_LANGUAGE,
    ],
  };
}

function openAiWhisperArgs(inputPath: string, tempDir: string): string[] {
  return [
    inputPath,
    "--model",
    process.env.WHISPER_MODEL?.trim() || DEFAULT_WHISPER_MODEL,
    "--language",
    process.env.WHISPER_LANGUAGE?.trim() || DEFAULT_LANGUAGE,
    "--output_format",
    "txt",
    "--output_dir",
    tempDir,
  ];
}

export async function transcribe(audio: Blob): Promise<string> {
  if (audio.size === 0) {
    throw new TranscriptionError("Le fichier audio est vide.");
  }

  const tempDir = await mkdtemp(path.join(tmpdir(), `mantara-voice-${randomUUID()}-`));
  try {
    const inputPath = path.join(tempDir, `input${audioExtension(audio)}`);
    await writeFile(inputPath, Buffer.from(await audio.arrayBuffer()));

    const backend = selectedBackend();
    const command =
      backend === "faster-whisper"
        ? fasterWhisperArgs(inputPath, tempDir)
        : {
            command:
              process.env.WHISPER_EXECUTABLE?.trim() ||
              (backend === "whisper-cpp" ? "whisper-cli" : "whisper"),
            args:
              backend === "whisper-cpp"
                ? whisperCppArgs(inputPath, tempDir)
                : openAiWhisperArgs(inputPath, tempDir),
          };

    await runCommand(command.command, command.args, parseTimeout());
    return readTranscript(tempDir);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}
