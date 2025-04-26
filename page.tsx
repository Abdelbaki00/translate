import TranslationChatbot from "@/components/translation-chatbot"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-4 md:p-8 bg-gradient-to-br from-slate-100 via-white to-blue-50">
      {/* Éléments décoratifs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-64 h-64 bg-blue-200/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-indigo-200/20 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-5xl relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-blue-900 mb-2">
            TranslateX Pro
          </h1>
          <p className="text-slate-600 text-lg">
            Solution de traduction professionnelle propulsée par l'IA
          </p>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border-t border-blue-100 p-2">
          <TranslationChatbot />
        </div>

        <footer className="mt-8 text-center text-sm text-slate-500">
          © 2025 TranslateX Pro - Tous droits réservés | Solution professionnelle de traduction automatique
        </footer>
      </div>
    </main>
  )
}