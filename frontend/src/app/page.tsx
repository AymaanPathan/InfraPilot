import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen p-8 flex flex-col items-center justify-center font-[family-name:var(--font-geist-sans)]">
      <main className="max-w-2xl w-full space-y-8">
        <div className="flex flex-col items-center">
          <a href="https://tambo.co" target="_blank" rel="noopener noreferrer">
            <Image
              src="/Octo-Icon.svg"
              alt="Tambo AI Logo"
              width={80}
              height={80}
              className="mb-4"
            />
          </a>
          <h1 className="text-4xl text-center">tambo-ai chat template</h1>
        </div>

        <div className="w-full space-y-8">
          <div className="bg-white px-8 py-4">
            <h2 className="text-xl font-semibold mb-4">Setup Checklist</h2>
            <div className="flex gap-4 flex-wrap">
              <a
                href="/chat"
                className="px-6 py-3 rounded-md font-medium shadow-sm transition-colors text-lg mt-4 bg-[#7FFFC3] hover:bg-[#72e6b0] text-gray-800"
              >
                Go to Chat →
              </a>
              <a
                href="/interactables"
                className="px-6 py-3 rounded-md font-medium shadow-sm transition-colors text-lg mt-4 bg-[#FFE17F] hover:bg-[#f5d570] text-gray-800"
              >
                Interactables Demo →
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
