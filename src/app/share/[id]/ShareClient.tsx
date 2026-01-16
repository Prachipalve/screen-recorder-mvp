"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export default function ShareClient({ id }: { id: string }) {
    const videoRef = useRef<HTMLVideoElement | null>(null);

    const [views, setViews] = useState<number>(0);
    const [completionAvg, setCompletionAvg] = useState<number>(0);
    const [watchTimeline, setWatchTimeline] = useState<number[]>([]);

    const [allowDownload, setAllowDownload] = useState(true);
    const [copied, setCopied] = useState(false);

    const videoUrl = `/api/video/${id}.webm`;

    useEffect(() => {
        const fetchSettings = async () => {
            const res = await fetch(`/api/share-settings/${id}`);
            const data = await res.json();
            setAllowDownload(data.allowDownload ?? true);
        };

        fetchSettings();
    }, [id]);

    // Fetch analytics
    const refreshAnalytics = async () => {
        const res = await fetch(`/api/analytics/${id}`);
        const data = await res.json();

        setViews(data.views ?? 0);
        setCompletionAvg(data.completionAvg ?? 0);
        setWatchTimeline(data.watchTimeline ?? []);
    };

    // Track view (on page load)
    useEffect(() => {
        const trackView = async () => {
            const res = await fetch(`/api/analytics/${id}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ event: "view" }),
            });

            const data = await res.json();

            setViews(data.views ?? 0);
            setCompletionAvg(data.completionAvg ?? 0);
            setWatchTimeline(data.watchTimeline ?? []);
        };

        trackView();
    }, [id]);

    // Send completion
    const sendCompletion = async (percent: number) => {
        const res = await fetch(`/api/analytics/${id}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ event: "completion", percent }),
        });

        const data = await res.json();
        setViews(data.views ?? 0);
        setCompletionAvg(data.completionAvg ?? 0);
        setWatchTimeline(data.watchTimeline ?? []);
    };

    // Send progress for heatmap
    const sendProgress = async (second: number) => {
        await fetch(`/api/analytics/${id}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ event: "progress", second }),
        });
    };

    const updateAllowDownload = async (value: boolean) => {
        setAllowDownload(value);

        await fetch(`/api/share-settings/${id}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ allowDownload: value }),
        });
    };

    const handleCopyLink = async () => {
        const fullLink = window.location.href;

        await navigator.clipboard.writeText(fullLink);
        setCopied(true);

        setTimeout(() => setCopied(false), 1500);
    };

    // Every 2 sec while playing, send progress updates
    useEffect(() => {
        const interval = setInterval(async () => {
            const video = videoRef.current;
            if (!video) return;

            if (video.paused || video.ended) return;

            await sendProgress(video.currentTime);

            // refresh sometimes so UI updates without spamming
            if (Math.random() < 0.25) {
                await refreshAnalytics();
            }
        }, 2000);

        return () => clearInterval(interval);
    }, [id]);

    const handleEnded = async () => {
        await sendCompletion(100);
        await refreshAnalytics();
    };

    const handlePause = async () => {
        const video = videoRef.current;
        if (!video || !video.duration) return;

        const percent = Math.min(100, (video.currentTime / video.duration) * 100);
        await sendCompletion(Number(percent.toFixed(2)));
        await refreshAnalytics();
    };

    // Heatmap normalize (make all values numeric + visible)
    const normalized = useMemo(() => {
        if (!watchTimeline || watchTimeline.length === 0) return [];

        const cleaned = watchTimeline.map((v) => (typeof v === "number" ? v : 0));
        const maxVal = Math.max(...cleaned, 1);

        return cleaned.map((v) => v / maxVal);
    }, [watchTimeline]);

    return (
        <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-6">
            <h1 className="text-2xl font-semibold">Shared Demo</h1>
            <p className="text-gray-400">Video ID: {id}</p>

            <video
                ref={videoRef}
                controls
                className="w-full max-w-3xl border rounded"
                src={videoUrl}
                onEnded={handleEnded}
                onPause={handlePause}
            />

            <div className="w-full max-w-3xl flex items-center justify-between gap-4">
                <button
                    onClick={handleCopyLink}
                    className="px-4 py-2 bg-blue-600 text-white rounded"
                >
                    {copied ? "✅ Copied!" : "Copy Share Link"}
                </button>

                <label className="flex items-center gap-2 text-sm text-gray-300">
                    <input
                        type="checkbox"
                        checked={allowDownload}
                        onChange={(e) => updateAllowDownload(e.target.checked)}
                    />
                    Allow download
                </label>
            </div>

            {allowDownload && (
                <a
                    href={videoUrl}
                    download={`${id}.webm`}
                    className="w-full max-w-3xl px-4 py-2 bg-black text-white rounded text-center"
                >
                    Download video
                </a>
            )}


            {/* ✅ Heatmap Bar */}
            <div className="w-full max-w-3xl">
                <p className="text-sm text-gray-400 mb-2">Watch heatmap</p>

                <div className="w-full h-4 rounded overflow-hidden border flex">
                    {normalized.length === 0 ? (
                        <div className="w-full h-full bg-gray-800" />
                    ) : (
                        normalized.map((val, idx) => (
                            <div
                                key={idx}
                                className="h-full"
                                style={{
                                    width: `${100 / normalized.length}%`,
                                    backgroundColor: `rgba(255,255,255,${0.08 + val * 0.9})`,
                                    cursor: "pointer",
                                    borderRight: "1px solid rgba(255,255,255,0.05)",
                                }}
                                title={`Second ${idx} • watched ${watchTimeline[idx] ?? 0} times`}
                                onClick={() => {
                                    const video = videoRef.current;
                                    if (!video) return;
                                    video.currentTime = idx;
                                    video.play();
                                }}
                            />
                        ))
                    )}
                </div>

                <p className="text-xs text-gray-500 mt-2">
                    Brighter = watched more times (hover or click)
                </p>
            </div>

            {/* Analytics Summary */}
            <div className="w-full max-w-3xl border rounded p-4">
                <h2 className="font-semibold mb-2">Analytics</h2>
                <p>Views: {views}</p>
                <p>Avg Watch Completion: {completionAvg.toFixed(2)}%</p>
            </div>

            <p className="text-xs text-gray-500 mt-6">
                Recorded with Screen Recorder MVP
            </p>

        </main>
    );
}
