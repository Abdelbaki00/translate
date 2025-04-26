import {FileText, Download, AlertCircle} from "lucide-react"
import {cn} from "@/lib/utils"
// @ts-ignore
import {Message} from "postcss";

interface Message {
    id: string
    type: "user" | "assistant"
    content: string
    fileName?: string
    isLoading?: boolean
    error?: boolean
    timestamp?: Date
}

interface ChatMessageProps {
    message: Message,
    customStyles?: { assistant: string; loading: string; user: string }
}

export default function ChatMessage({message, customStyles}: ChatMessageProps) {
    const isUser = message.type === "user"
    const timestamp = message.timestamp || new Date()
    const formattedTime = timestamp.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})

    return (
        <div className={cn("flex", isUser ? "justify-end" : "justify-start", "mb-4")}>
            <div
                className={cn(
                    "max-w-[80%] rounded-2xl p-4",
                    isUser
                        ? "bg-[#4DB6AC] text-white"
                        : "bg-[#F2F2F2] text-gray-800",
                    message.error && "bg-destructive text-destructive-foreground",
                    "shadow-sm"
                )}
            >
                {/* File indicator for user messages with files */}
                {isUser && message.fileName && (
                    <div className="flex items-center mb-2 text-sm">
                        <FileText className="h-4 w-4 mr-2"/>
                        <span className="truncate">{message.fileName}</span>
                    </div>
                )}

                {/* Message content */}
                <div className="whitespace-pre-wrap break-words">
                    {message.isLoading ? (
                        <div className="flex items-center">
                            <div
                                className="h-2 w-2 bg-current rounded-full mr-1 animate-bounce"
                                style={{animationDelay: "0ms"}}
                            ></div>
                            <div
                                className="h-2 w-2 bg-current rounded-full mr-1 animate-bounce"
                                style={{animationDelay: "150ms"}}
                            ></div>
                            <div className="h-2 w-2 bg-current rounded-full animate-bounce"
                                 style={{animationDelay: "300ms"}}></div>
                            <span className="ml-2">{message.content}</span>
                        </div>
                    ) : message.error ? (
                        <div className="flex items-center">
                            <AlertCircle className="h-4 w-4 mr-2"/>
                            <span>{message.content}</span>
                        </div>
                    ) : (
                        message.content
                    )}
                </div>

                {/* File download link for assistant responses with files */}
                {!isUser && message.fileName && (
                    <a
                        href={message.content}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center mt-2 text-sm underline"
                    >
                        <Download className="h-4 w-4 mr-2"/>
                        <span>{message.fileName}</span>
                    </a>
                )}

                {/* Timestamp */}
                <div className="text-xs mt-1 opacity-70 text-right">
                    {formattedTime}
                </div>
            </div>
        </div>
    )
}