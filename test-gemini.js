import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY?.trim();

if (!apiKey) {
    console.error("❌ Không tìm thấy GEMINI_API_KEY trong file .env!");
    process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

async function main() {
    try {
        console.log("⏳ Đang gửi yêu cầu tới Gemini AI...");
        const response = await ai.models.generateContent({
            model: 'gemini-flash-latest',
            contents: 'Hãy viết 1 câu chúc may mắn ngắn gọn bằng tiếng Việt.',
        });

        console.log("✅ Kết nối thành công! Phản hồi từ Gemini:");
        console.log(response.text);
    } catch (error) {
        console.error("❌ Lỗi khi gọi Gemini:", error);
    }
}

main();
