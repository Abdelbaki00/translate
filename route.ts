import { type NextRequest, NextResponse } from "next/server";

// Interface personnalisée pour les options de requête
interface CustomRequestInit {
  method: string;
  headers: Record<string, string>;
  body?: any;
  duplex?: string;
  redirect?: RequestRedirect;
}

export async function POST(request: NextRequest, context: { params: { path: string[] } }) {
  try {
    // Attendre les paramètres
    const params = await context.params;
    const path = params.path.join("/");

    // S'assurer que l'URL de l'API est correcte avec HTTPS
    let apiUrl = process.env.API_URL || "";
    if (!apiUrl.startsWith("http")) {
      apiUrl = `https://${apiUrl}`;
    }
    // Supprimer le slash final s'il existe
    apiUrl = apiUrl.replace(/\/$/, "");

    const contentType = request.headers.get("content-type") || "";
    const isFormData = contentType.includes("multipart/form-data");
    
    // Cloner le corps de la requête pour pouvoir le réutiliser en cas de redirection
    let requestBody;
    if (isFormData) {
      requestBody = await request.formData();
    } else {
      requestBody = await request.json();
    }

    // URL de la requête
    let finalUrl = `${apiUrl}/${path}`;
    console.log(`Tentative d'envoi de la requête à: ${finalUrl}`);
    
    // Fonction pour créer les options de requête
    const createRequestOptions = () => {
      const reqOptions: any = {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.HF_TOKEN}`,
        },
        // Ne pas suivre automatiquement les redirections
        redirect: "manual",
      };
      
      if (!isFormData) {
        reqOptions.headers["Content-Type"] = "application/json";
        reqOptions.body = JSON.stringify(requestBody);
      } else {
        reqOptions.body = requestBody;
      }
      
      // Ajouter duplex uniquement si body est présent
      if (reqOptions.body) {
        reqOptions.duplex = "half";
      }
      
      return reqOptions;
    };
    
    // Faire la requête initiale
    let response = await fetch(finalUrl, createRequestOptions());
    
    // Gérer les redirections
    let redirectCount = 0;
    const MAX_REDIRECTS = 5;
    
    while (response.status >= 300 && response.status < 400 && redirectCount < MAX_REDIRECTS) {
      const location = response.headers.get("location");
      
      if (!location) break;
      
      redirectCount++;
      console.log(`Redirection ${redirectCount} vers: ${location}`);
      
      // Si l'URL de redirection est relative, la combiner avec l'URL de base
      if (location.startsWith("/")) {
        finalUrl = new URL(location, apiUrl).toString();
      } else {
        finalUrl = location;
      }
      
      // Faire une nouvelle requête vers l'URL de redirection
      response = await fetch(finalUrl, createRequestOptions());
    }
    
    console.log(`Réponse finale: ${response.status} ${response.statusText}`);
    
    // Traiter la réponse - REMPLACER CE BLOC ENTIER
    const responseContentType = response.headers.get("content-type");
    if (responseContentType && responseContentType.includes("application/json")) {
      const data = await response.json();
      return NextResponse.json(data, {
        status: response.ok ? 200 : response.status,
      });
    } else if (responseContentType && (responseContentType.includes("application/octet-stream") || responseContentType.includes("application/"))) {
      // Pour les fichiers, renvoyer directement la réponse
      return new Response(response.body, {
        status: response.status,
        headers: response.headers
      });
    } else {
      const data = { success: response.ok };
      return NextResponse.json(data, {
        status: response.ok ? 200 : response.status,
      });
    }
  } catch (error) {
    console.error("API proxy error:", error);
    return NextResponse.json({ 
      error: "Failed to process request", 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest, context: { params: { path: string[] } }) {
  try {
    const params = await context.params;
    const path = params.path.join("/");

    const apiUrl = process.env.API_URL;

    const response = await fetch(`${apiUrl}/${path}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${process.env.HF_TOKEN}`,
      },
    });

    const data = await response.json();

    return NextResponse.json(data, {
      status: response.status,
    });
  } catch (error) {
    console.error("API proxy error:", error);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
