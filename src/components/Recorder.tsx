"use client";

import { useEffect, useRef, useState } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

export default function Recorder() {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // FFmpeg (only init in browser)
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const ffmpegLoadedRef = useRef(false);

  // Recorder refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);

  // Upload states
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Trim states
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(5);
  const [trimmedUrl, setTrimmedUrl] = useState<string | null>(null);
  const [isTrimming, setIsTrimming] = useState(false);

  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (totalSeconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const startTimer = () => {
    setSeconds(0);
    timerRef.current = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        alert("Screen recording not supported. Use Chrome/Edge.");
        return;
      }

      // Reset previous outputs
      setRecordedUrl(null);
      setTrimmedUrl(null);
      setShareLink(null);

      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30 },
        audio: false,
      });

      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      const combinedStream = new MediaStream([
        ...screenStream.getVideoTracks(),
        ...micStream.getAudioTracks(),
      ]);

      streamRef.current = combinedStream;
      chunksRef.current = [];

      const recorder = new MediaRecorder(combinedStream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        const url = URL.createObjectURL(blob);

        setRecordedUrl(url);

        if (videoRef.current) {
          videoRef.current.src = url;
        }
      };

      recorder.start();
      setIsRecording(true);
      startTimer();
    } catch (err) {
      console.error(err);
      alert(
        "Recording failed: " +
          (err instanceof Error ? err.message : JSON.stringify(err))
      );
    }
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;

    recorder.stop();
    setIsRecording(false);
    stopTimer();

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const loadFFmpeg = async () => {
    // Safety: run only in browser
    if (typeof window === "undefined") return;

    // Initialize only in browser
    if (!ffmpegRef.current) {
      ffmpegRef.current = new FFmpeg();
    }

    if (ffmpegLoadedRef.current) return;

    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";

    await ffmpegRef.current.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
    });

    ffmpegLoadedRef.current = true;
  };

  const handleTrim = async () => {
    if (!recordedUrl) {
      alert("Please record a video first!");
      return;
    }

    if (endTime <= startTime) {
      alert("End time must be greater than start time.");
      return;
    }

    try {
      setIsTrimming(true);
      setTrimmedUrl(null);
      setShareLink(null);

      await loadFFmpeg();

      const ffmpeg = ffmpegRef.current;
      if (!ffmpeg) throw new Error("FFmpeg not initialized");

      // input and output file names in ffmpeg FS
      const inputName = "input.webm";
      const outputName = "output.webm";

      // load the recorded file into ffmpeg FS
      await ffmpeg.writeFile(inputName, await fetchFile(recordedUrl));

      // Trim (re-encode to avoid black screen issues)
      await ffmpeg.exec([
        "-i",
        inputName,
        "-ss",
        String(startTime),
        "-to",
        String(endTime),
        "-c:v",
        "libvpx",
        "-c:a",
        "libopus",
        outputName,
      ]);

      // read output file
      const data = await ffmpeg.readFile(outputName);

      const trimmedBlob = new Blob([new Uint8Array(data as Uint8Array)], {
        type: "video/webm",
      });

      const url = URL.createObjectURL(trimmedBlob);
      setTrimmedUrl(url);
    } catch (err) {
      console.error(err);
      alert("Trimming failed. Check console.");
    } finally {
      setIsTrimming(false);
    }
  };

  const uploadTrimmedVideo = async () => {
    if (!trimmedUrl) {
      alert("Trim the video first!");
      return;
    }

    try {
      setIsUploading(true);
      setShareLink(null);

      const blob = await fetch(trimmedUrl).then((r) => r.blob());

      const form = new FormData();
      form.append("file", blob, "final.webm");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: form,
      });

      if (!res.ok) throw new Error("Upload failed");

      const data = await res.json();

      // full share url
      setShareLink(window.location.origin + data.shareUrl);
    } catch (err) {
      console.error(err);
      alert("Upload failed. Check console.");
    } finally {
      setIsUploading(false);
    }
  };

  // cleanup if user refreshes while recording
  useEffect(() => {
    return () => {
      stopTimer();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return (
    <div className="w-full flex flex-col items-center justify-center gap-6">
      <div className="text-lg">
        ⏱️ Timer: <span className="font-mono">{formatTime(seconds)}</span>
      </div>

      <div className="flex gap-4">
        <button
          onClick={startRecording}
          disabled={isRecording}
          className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
        >
          Start Recording
        </button>

        <button
          onClick={stopRecording}
          disabled={!isRecording}
          className="px-4 py-2 bg-red-600 text-white rounded disabled:opacity-50"
        >
          Stop Recording
        </button>
      </div>

      {recordedUrl && (
        <a
          href={recordedUrl}
          download="recording.webm"
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Download .webm
        </a>
      )}

      {recordedUrl && (
        <div className="w-full max-w-2xl border rounded p-4 flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Trim Video</h2>

          <div className="flex gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm">Start (sec)</label>
              <input
                type="number"
                min={0}
                value={startTime}
                onChange={(e) => setStartTime(Number(e.target.value))}
                className="border rounded px-2 py-1"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm">End (sec)</label>
              <input
                type="number"
                min={0}
                value={endTime}
                onChange={(e) => setEndTime(Number(e.target.value))}
                className="border rounded px-2 py-1"
              />
            </div>
          </div>

          <button
            onClick={handleTrim}
            disabled={isTrimming}
            className="px-4 py-2 bg-purple-600 text-white rounded disabled:opacity-50"
          >
            {isTrimming ? "Trimming..." : "Trim & Export"}
          </button>

          {trimmedUrl && (
            <div className="flex flex-col gap-3">
              <video controls className="w-full border rounded" src={trimmedUrl} />

              <a
                href={trimmedUrl}
                download="trimmed.webm"
                className="px-4 py-2 bg-blue-600 text-white rounded text-center"
              >
                Download Trimmed Video
              </a>

              <button
                onClick={uploadTrimmedVideo}
                disabled={isUploading}
                className="px-4 py-2 bg-black text-white rounded disabled:opacity-50"
              >
                {isUploading ? "Uploading..." : "Upload & Generate Share Link"}
              </button>

              {shareLink && (
                <p className="text-sm break-all">
                  ✅ Share link:{" "}
                  <a
                    href={shareLink}
                    target="_blank"
                    className="underline text-blue-400"
                  >
                    {shareLink}
                  </a>
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <video
        ref={videoRef}
        controls
        className="w-full max-w-2xl border rounded"
      />
    </div>
  );
}
