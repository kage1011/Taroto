import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Khởi tạo Gemini AI SDK mới nhất (@google/genai)
const apiKey = (process.env.GEMINI_API_KEY || '').trim();
if (!apiKey) {
    console.warn("⚠️ CẢNH BÁO: Chưa tìm thấy GEMINI_API_KEY trong file .env!");
}
const ai = new GoogleGenAI({ apiKey });

// Hàm hỗ trợ thử lại khi gặp lỗi quá tải hoặc thử các model khả dụng
async function generateWithRetry(aiClient, prompt, retries = 3, delay = 2000) {
    const models = ['gemini-flash-latest'];

    for (const modelName of models) {
        for (let i = 0; i < retries; i++) {
            try {
                const response = await aiClient.models.generateContent({
                    model: modelName,
                    contents: prompt,
                });
                return response;
            } catch (error) {
                // Nếu là lỗi 503 (quá tải), chờ và thử lại
                if (error.status === 503 && i < retries - 1) {
                    console.warn(`Model ${modelName} đang quá tải (503). Đang thử lại sau ${delay / 1000}s...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    delay *= 2;
                } else if (i === retries - 1) {
                    console.warn(`Model ${modelName} không thể phản hồi sau ${retries} lần thử, chuyển sang model dự phòng...`);
                } else {
                    // Lỗi 404 hoặc lỗi xác thực thì không retry vô ích, thử model kế tiếp
                    console.warn(`Model ${modelName} gặp lỗi (${error.status || error.message}), chuyển sang model kế...`);
                    break;
                }
            }
        }
    }
    throw new Error("Không thể kết nối tới các model của Gemini. Vui lòng kiểm tra lại API key hoặc trạng thái mạng.");
}

app.post('/api/tarot-reading', async (req, res) => {
    try {
        const { question, selectedCards } = req.body;

        const cardsDescription = (selectedCards || []).map(item =>
            `- Vị trí (${item.position}): Lá bài ${item.card?.name || 'Chưa rõ'} (${item.isReversed ? 'Ngược' : 'Xuôi'})`
        ).join('\n');

        const prompt = `
Bạn là một chuyên gia Tarot huyền bí, điềm đạm, có chiều sâu tâm lý và sử dụng tiếng Việt uyển chuyển, thấu cảm.
Người dùng vừa đặt câu hỏi: "${question || "Không có câu hỏi cụ thể, xin thông điệp chung"}"

Họ rút được các lá bài sau:
${cardsDescription}

Hãy viết một bài luận giải Tarot chi tiết, kết nối ý nghĩa các lá bài lại với nhau để giải đáp câu hỏi của họ, đồng thời đưa ra lời khuyên thiết thực, tích cực. Trình bày bài viết gọn gàng bằng Markdown (dùng tiêu đề, đoạn văn rõ ràng).
        `;
        console.log('promt ', prompt)

        // Gọi hàm phân tích Tarot với Gemini
        const response = await generateWithRetry(ai, prompt);
        console.log(response)
        res.json({ success: true, reading: response.text });
    } catch (error) {
        console.error("Lỗi khi gọi AI:", error);
        res.status(500).json({
            success: false,
            error: error.message || "Hệ thống AI đang quá tải tạm thời. Vui lòng bấm 'Xem bài' lại sau ít giây!"
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server Tarot đang chạy tại http://localhost:${PORT}`);
});
