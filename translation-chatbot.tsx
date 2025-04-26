"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Send, Upload, Loader2, Globe, ArrowDown, X, FileText, Languages, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { motion, AnimatePresence } from "framer-motion"
import ChatMessage from "./chat-message"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

// Définition des types de messages
type MessageType = "user" | "assistant"

interface Message {
  id: string
  type: MessageType
  content: string
  fileName?: string
  isLoading?: boolean
  error?: boolean
  timestamp: Date
}

interface Language {
  code: string
  name: string
}

// Définition des types de fichiers supportés
const supportedFileTypes = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // docx
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // xlsx
  "application/vnd.openxmlformats-officedocument.presentationml.presentation", // pptx
]

// Langues courantes pour un accès rapide
const commonLanguages = ["en", "es", "fr", "de", "zh", "ja", "ru", "ar", "pt", "it"]

export default function TranslationChatbot() {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [targetLanguage, setTargetLanguage] = useState("fr")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<string>("text")
  const [languages, setLanguages] = useState<Language[]>([])

  const fileInputRef = useRef<HTMLInputElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const fetchSupportedLanguages = async () => {
    try {
      const response = await fetch("/api/proxy/supported-languages")

      if (response.ok) {
        const data = await response.json()
        if (data.languages && Array.isArray(data.languages)) {
          setLanguages(data.languages)
        }
      }
    } catch (error) {
      console.error("Échec de récupération des langues supportées:", error)
    }
  }

  useEffect(() => {
    fetchSupportedLanguages()

    // Ajouter un message de bienvenue
    const welcomeMessage = {
      id: "welcome",
      type: "assistant" as const,
      content: "Bienvenue à TranslateX Pro. Saisissez du texte ou téléchargez un document à traduire.",
      timestamp: new Date()
    }
    setMessages([welcomeMessage])
  }, [])

  // Défilement automatique vers le bas du chat lorsque les messages changent
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      const scrollHeight = chatContainerRef.current.scrollHeight
      const height = chatContainerRef.current.clientHeight
      const maxScrollTop = scrollHeight - height
      chatContainerRef.current.scrollTop = maxScrollTop > 0 ? maxScrollTop : 0
    }
  }

  // Redimensionnement automatique du textarea en fonction du contenu
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "80px"
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [inputText])

  // Gestion de la sélection de fichier
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null

    if (file) {
      if (!supportedFileTypes.includes(file.type)) {
        setError("Format de fichier non supporté. Veuillez télécharger des fichiers PDF, Word, Excel ou PowerPoint.")
        return
      }

      setSelectedFile(file)
      setInputText(`Fichier sélectionné: ${file.name}`)
      setError(null)
      setActiveTab("file")
    }
  }

  // Déclencher le clic sur l'input de fichier
  const handleFileButtonClick = () => {
    fileInputRef.current?.click()
  }

  // Effacer le fichier sélectionné
  const handleClearFile = () => {
    setSelectedFile(null)
    setInputText("")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
    setActiveTab("text")
  }

  // Gestion de la soumission du formulaire
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if ((!inputText || inputText.trim() === "") && !selectedFile) {
      return
    }

    // Créer un nouvel ID de message
    const messageId = Date.now().toString()
    const now = new Date()

    // Ajouter le message utilisateur au chat
    if (selectedFile) {
      // Message de téléchargement de fichier
      setMessages((prev) => [
        ...prev,
        {
          id: messageId,
          type: "user",
          content: `Traduire le fichier: ${selectedFile.name}`,
          fileName: selectedFile.name,
          timestamp: now,
        },
      ])
    } else {
      // Message texte
      setMessages((prev) => [
        ...prev,
        {
          id: messageId,
          type: "user",
          content: inputText,
          timestamp: now,
        },
      ])
    }

    // Ajouter un message de chargement
    const loadingMessageId = `loading-${messageId}`
    setMessages((prev) => [
      ...prev,
      {
        id: loadingMessageId,
        type: "assistant",
        content: "Traduction en cours...",
        isLoading: true,
        timestamp: now,
      },
    ])

    // Effacer l'entrée
    setInputText("")
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
    setActiveTab("text")

    setIsLoading(true)
    setError(null)

    try {
      let response

      if (selectedFile) {
        // Gestion de la traduction de fichier
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("target_language", targetLanguage);

        response = await fetch("/api/proxy/translate-document/", {
          method: "POST",
          body: formData,
        });

        // Si c'est une réponse de fichier
        if (response.headers.get("content-type")?.includes("application/octet-stream") ||
            response.headers.get("content-type")?.includes("application/")) {
          // Récupérer le blob et créer une URL de téléchargement
          const blob = await response.blob();
          const downloadUrl = URL.createObjectURL(blob);
          const contentDisposition = response.headers.get("content-disposition");
          let filename = "document-traduit";

          // Essayer d'extraire le nom de fichier
          if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
            if (filenameMatch && filenameMatch[1]) {
              filename = filenameMatch[1];
            }
          }

          // Supprimer le message de chargement et ajouter la réponse
          setMessages((prev) =>
            prev
              .filter((msg) => msg.id !== loadingMessageId)
              .concat({
                id: `response-${messageId}`,
                type: "assistant",
                content: downloadUrl,
                fileName: filename || "Télécharger le fichier traduit",
                timestamp: new Date(),
              }),
          );
          return; // Sortir de la fonction car nous avons déjà traité la réponse
        }
      } else {
        // Gestion de la traduction de texte
        response = await fetch("/api/proxy/translate-text/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: inputText,
            target_language: targetLanguage,
          }),
        });
      }

      if (!response.ok) {
        throw new Error(`Erreur: ${response.status}`)
      }

      const data = await response.json()

      // Supprimer le message de chargement et ajouter la réponse
      setMessages((prev) =>
        prev
          .filter((msg) => msg.id !== loadingMessageId)
          .concat({
            id: `response-${messageId}`,
            type: "assistant",
            content: data.translated_text || data.translated_file_url || "Traduction terminée",
            fileName: data.translated_file_url ? "Télécharger le fichier traduit" : undefined,
            timestamp: new Date(),
          }),
      )
    } catch (err) {
      console.error("Erreur de traduction:", err)

      // Supprimer le message de chargement et ajouter un message d'erreur
      setMessages((prev) =>
        prev
          .filter((msg) => msg.id !== loadingMessageId)
          .concat({
            id: `error-${messageId}`,
            type: "assistant",
            content: "Désolé, une erreur s'est produite lors de la traduction. Veuillez réessayer.",
            error: true,
            timestamp: new Date(),
          }),
      )

      setError("Échec de la traduction. Veuillez réessayer.")
    } finally {
      setIsLoading(false)
    }
  }

  // Obtenir la liste des langues filtrée pour un accès rapide
  const getQuickAccessLanguages = () => {
    return languages
      .filter(lang => commonLanguages.includes(lang.code))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] max-w-4xl mx-auto rounded-xl shadow-xl overflow-hidden bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Éléments de fond décoratifs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-gradient-to-br from-blue-400/10 to-indigo-400/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-gradient-to-tr from-blue-300/10 to-teal-300/10 rounded-full blur-3xl"></div>
      </div>

      {/* En-tête avec sélecteur de langue */}
      <div className="p-4 bg-gradient-to-r from-blue-700 to-indigo-800 text-white shadow-md relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center">
          <div className="bg-white/20 p-2 rounded-lg mr-3">
            <Globe className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">TranslateX Pro</h2>
            <p className="text-xs text-blue-100 font-light">Traduction instantanée, résultats professionnels</p>
          </div>
        </div>

        <div className="flex flex-col w-full sm:w-auto">
          <div className="flex items-center mb-2 sm:mb-0">
            <label htmlFor="language-select" className="block text-sm font-medium mr-2 text-blue-100">
              Traduire vers:
            </label>
            <Select value={targetLanguage} onValueChange={setTargetLanguage} disabled={isLoading}>
              <SelectTrigger id="language-select" className="w-full sm:w-[180px] bg-white/10 backdrop-blur-sm border-blue-400/30 text-white shadow-sm rounded-lg">
                <SelectValue placeholder="Choisir une langue" />
              </SelectTrigger>
              <SelectContent className="rounded-md max-h-[300px] bg-white backdrop-blur-md border-blue-200">
                <div className="p-2 border-b border-blue-100/20">
                  <p className="text-xs text-blue-900 mb-2">Langues courantes</p>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {getQuickAccessLanguages().map((lang) => (
                      <Badge
                        key={lang.code}
                        variant={targetLanguage === lang.code ? "default" : "outline"}
                        className={`cursor-pointer ${targetLanguage === lang.code ? 'bg-blue-600 hover:bg-blue-700' : 'hover:bg-blue-100'}`}
                        onClick={() => setTargetLanguage(lang.code)}
                      >
                        {lang.name}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="p-2">
                  <p className="text-xs text-blue-900 mb-2">Toutes les langues</p>
                  {languages.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.name}
                    </SelectItem>
                  ))}
                </div>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Alerte d'erreur */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Alert variant="destructive" className="m-4 mb-0 bg-red-50 border-red-200">
              <AlertDescription className="flex justify-between items-center">
                <span>{error}</span>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500 hover:text-red-700" onClick={() => setError(null)}>
                  <X size={16} />
                </Button>
              </AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Conteneur des messages du chat */}
      <Card
        className="flex-1 overflow-y-auto p-2 sm:p-6 mx-2 sm:mx-4 my-4 shadow-md rounded-xl bg-white/80 backdrop-blur-sm border-blue-100 relative z-10"
        ref={chatContainerRef}
      >
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-blue-800/50 flex-col">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 rounded-full mb-6 shadow-lg">
              <Globe className="h-12 w-12 text-white" />
            </div>
            <p className="text-center max-w-sm font-medium">Commencez une conversation en saisissant du texte ou en téléchargeant un fichier</p>
          </div>
        ) : (
          <div className="space-y-6">
            <AnimatePresence initial={false}>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <ChatMessage
                    message={message}
                    customStyles={{
                      user: "bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-tl-none rounded-xl shadow-md",
                      assistant: "bg-white border border-blue-100 shadow-sm rounded-tr-none rounded-xl",
                      loading: "bg-white/70 border border-blue-100 shadow-sm rounded-tr-none rounded-xl"
                    }}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </Card>

      {/* Formulaire de saisie */}
      <div className="p-4 bg-white/70 backdrop-blur-md border-t border-blue-100 relative z-10">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
          <TabsList className="grid w-full max-w-md grid-cols-2 bg-blue-100/50">
            <TabsTrigger
              value="text"
              className="data-[state=active]:bg-blue-700 data-[state=active]:text-white rounded-l-md"
            >
              <span className="flex items-center">
                Texte
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="file"
              className="data-[state=active]:bg-blue-700 data-[state=active]:text-white rounded-r-md"
            >
              <span className="flex items-center">
                Fichier {selectedFile && <Badge className="ml-2 bg-white text-blue-700">1</Badge>}
              </span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="text" className="mt-2">
            <form onSubmit={handleSubmit} className="relative">
              <div className="relative shadow-md rounded-lg border border-blue-200 bg-white transition-all focus-within:ring-2 focus-within:ring-blue-400 focus-within:ring-opacity-50 focus-within:border-blue-400">
                <Textarea
                  ref={textareaRef}
                  placeholder="Entrez le texte à traduire..."
                  value={inputText}
                  onChange={(e) => {
                    setInputText(e.target.value)
                    setSelectedFile(null)
                  }}
                  onKeyDown={handleKeyDown}
                  disabled={isLoading}
                  className="min-h-[80px] max-h-[200px] resize-none pr-24 py-4 px-4 rounded-lg border-0 focus:ring-0 transition-colors"
                />
                <div className="absolute bottom-3 right-3 flex space-x-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleFileButtonClick}
                          disabled={isLoading}
                          className="text-blue-600 border-blue-200 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Upload className="h-5 w-5" />
                          <span className="sr-only">Télécharger un fichier</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="bg-blue-800 text-white">
                        <p>Télécharger un fichier</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <Button
                    type="submit"
                    disabled={isLoading || (!inputText && !selectedFile)}
                    size="sm"
                    className={`bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-full w-10 h-10 p-0 flex items-center justify-center shadow-md transition-all duration-200 hover:shadow-lg ${(!inputText && !selectedFile) ? 'opacity-50' : 'hover:from-blue-700 hover:to-indigo-800'}`}
                  >
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="file" className="mt-2">
            <div className="bg-blue-50/50 border-2 border-dashed border-blue-200 rounded-lg p-6 flex flex-col items-center justify-center text-center">
              {selectedFile ? (
                <div className="w-full">
                  <div className="flex items-center justify-center mb-4">
                    <div className="p-4 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md">
                      <FileText className="h-10 w-10" />
                    </div>
                  </div>
                  <p className="font-medium text-blue-800 text-lg mb-2">{selectedFile.name}</p>
                  <p className="text-sm text-blue-600 mb-4">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <div className="flex justify-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleClearFile}
                      className="text-blue-600 border-blue-300"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Supprimer
                    </Button>
                    <Button
                      type="button"
                      onClick={handleSubmit}
                      disabled={isLoading}
                      size="sm"
                      className="bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white"
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <ArrowDown className="h-4 w-4 mr-1" />
                      )}
                      Traduire maintenant
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-4 p-5 rounded-full bg-gradient-to-r from-blue-500/10 to-indigo-500/10">
                    <Upload className="h-12 w-12 text-blue-600" />
                  </div>
                  <p className="text-lg font-medium text-blue-800 mb-2">
                    Déposez votre fichier ici ou cliquez pour parcourir
                  </p>
                  <p className="text-sm text-blue-600 mb-4">
                    Formats supportés: PDF, Word, Excel, PowerPoint
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleFileButtonClick}
                    disabled={isLoading}
                    className="bg-white/80 border-blue-300 text-blue-700 hover:bg-blue-50"
                  >
                    Sélectionner un fichier
                  </Button>
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Input de fichier caché */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept=".pdf,.docx,.xlsx,.pptx"
        />

        <div className="text-xs text-blue-600 mt-2 pl-1 flex items-center">
          <FileText className="h-3 w-3 mr-1" />
          Formats supportés: PDF, Word, Excel, PowerPoint
        </div>

        {/* Pied de page */}
        <div className="flex justify-between items-center mt-4 pt-2 border-t border-blue-100 text-xs text-blue-500">
          <div className="flex items-center">
            <Check className="h-3 w-3 mr-1 text-blue-500" />
            Traduction sécurisée et confidentielle
          </div>
          <div>
            © 2025 TranslateX Pro
          </div>
        </div>
      </div>
    </div>
  )
}