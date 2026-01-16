import Recorder from "@/components/Recorder";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-2xl font-semibold">Screen Recorder MVP</h1>
      <Recorder />
    </main>
  );
}
