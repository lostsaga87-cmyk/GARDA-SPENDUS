export async function makeApiCall(prompt: string, apiKeys: string[], schema: any = null) {
    const validKeys = apiKeys.filter(k => k && k.trim() !== '');
    if (validKeys.length === 0) {
        throw new Error("Kunci API Gemini belum diatur. Silakan atur di menu 'Konfigurasi API' di panel Admin.");
    }

    const payload: any = { contents: [{ role: "user", parts: [{ text: prompt }] }] };
    if (schema) {
        payload.generationConfig = { responseMimeType: "application/json", responseSchema: schema };
    }

    let lastError: Error | null = null;

    for (let keyIndex = 0; keyIndex < validKeys.length; keyIndex++) {
        const apiKey = validKeys[keyIndex];
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        
        let attempt = 0;
        const maxAttempts = 3; // Reduced per-key attempts to allow faster fallback
        let delay = 1000;

        while (attempt < maxAttempts) {
            try {
                const response = await fetch(apiUrl, { 
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/json' }, 
                    body: JSON.stringify(payload) 
                });

                if (response.ok) {
                    const result = await response.json();
                    if (!result.candidates || !result.candidates[0].content || !result.candidates[0].content.parts || !result.candidates[0].content.parts[0].text) {
                        if (result.promptFeedback && result.promptFeedback.blockReason) {
                           throw new Error(`Permintaan diblokir karena alasan keamanan: ${result.promptFeedback.blockReason}. Coba ubah input Anda.`);
                        }
                        throw new Error("Respons API tidak valid atau kosong.");
                    }
                    const text = result.candidates[0].content.parts[0].text;
                    
                    if (schema) {
                        try {
                            // Clean up markdown code blocks if Gemini returns them despite responseMimeType
                            const cleanText = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
                            return JSON.parse(cleanText);
                        } catch (e) {
                            console.error("Failed to parse JSON response:", text);
                            throw new Error("Format respons dari AI tidak sesuai (Bukan JSON yang valid).");
                        }
                    }
                    return text;
                }

                if (response.status === 401 || response.status === 403 || response.status === 400 || response.status === 429) {
                     const errorData = await response.json().catch(() => ({}));
                     let detail = errorData.error ? errorData.error.message : response.statusText;
                     
                     // If it's a quota or auth error, break out of the retry loop for THIS key
                     // and move to the next key in the outer loop.
                     lastError = new Error(`API Key ${keyIndex + 1} gagal (${response.status}): ${detail}`);
                     console.warn(lastError.message);
                     break; // Break the while loop, proceed to next key
                }

                if (response.status >= 500) {
                    await new Promise(resolve => setTimeout(resolve, delay));
                    delay *= 2;
                    attempt++;
                    continue;
                }

                throw new Error(`Terjadi kesalahan jaringan! Status: ${response.status}`);

            } catch (error: any) {
                lastError = error;
                // If it's a network error or parsing error, we might want to retry
                if (attempt + 1 >= maxAttempts) {
                    break; // Break while loop, try next key
                }
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2;
                attempt++;
            }
        }
    }
    
    throw new Error(`Semua API Key gagal. Kesalahan terakhir: ${lastError?.message || 'Tidak diketahui'}`);
}
