export async function makeApiCall(prompt: string, apiKey: string, schema: any = null) {
    if (!apiKey) {
        throw new Error("Kunci API Gemini belum diatur. Silakan atur di menu 'Pengaturan API' atau gunakan 'Aktifkan Kunci API'.");
    }

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const payload: any = { contents: [{ role: "user", parts: [{ text: prompt }] }] };
    if (schema) {
        payload.generationConfig = { responseMimeType: "application/json", responseSchema: schema };
    }

    let attempt = 0;
    const maxAttempts = 5;
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
                return schema ? JSON.parse(text) : text;
            }

            if (response.status === 401 || response.status === 403 || response.status === 400) {
                 const errorData = await response.json().catch(() => ({}));
                 let detail = errorData.error ? errorData.error.message : response.statusText;
                 if (response.status === 400 && detail.includes("API key not valid")) {
                     throw new Error(`Kunci API tidak valid (Error ${response.status}). Pastikan kunci API Anda benar.`);
                 }
                 throw new Error(`Error ${response.status}: ${detail}. Periksa Kunci API Anda.`);
            }

            if (response.status === 429 || response.status >= 500) {
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2;
                attempt++;
                continue;
            }

            throw new Error(`Terjadi kesalahan jaringan! Status: ${response.status}`);

        } catch (error: any) {
            if (attempt + 1 >= maxAttempts) {
                throw error;
            }
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2;
            attempt++;
        }
    }
    throw new Error(`Gagal menghubungi API setelah ${maxAttempts} percobaan.`);
}
