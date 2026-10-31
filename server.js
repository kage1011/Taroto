import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Khởi tạo Gemini AI SDK mới nhất
// Đảm bảo bạn đã đặt biến môi trường GEMINI_API_KEY trong file .env
const ai = new GoogleGenAI();
// Hàm hỗ trợ thử lại khi gặp lỗi quá tải
async function generateWithRetry(aiClient, modelName, prompt, retries = 3, delay = 2000) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await aiClient.models.generateContent({
                model: modelName,
                contents: prompt,
            });
            return response;
        } catch (error) {
            // Kiểm tra nếu là lỗi 503 hoặc quá tải
            if (error.status === 503 && i < retries - 1) {
                console.warn(`Model đang quá tải (503). Đang thử lại lần ${i + 2} sau ${delay / 1000}s...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2; // Tăng thời gian chờ gấp đôi cho lần thử tiếp theo (exponential backoff)
            } else {
                throw error;
            }
        }
    }
}

app.post('/api/tarot-reading', async (req, res) => {
    try {
        const { question, selectedCards } = req.body;

        const cardsDescription = selectedCards.map(item => 
            `- Vị trí (${item.position}): Lá bài ${item.card.name} (${item.isReversed ? 'Ngược' : 'Xuôi'})`
        ).join('\n');

        const prompt = `
Bạn là một chuyên gia Tarot huyền bí, điềm đạm, có chiều sâu tâm lý và sử dụng tiếng Việt uyển chuyển, thấu cảm.
Người dùng vừa đặt câu hỏi: "${question || "Không có câu hỏi cụ thể, xin thông điệp chung"}"

Họ rút được các lá bài sau:
${cardsDescription}

Hãy viết một bài luận giải Tarot chi tiết, kết nối ý nghĩa các lá bài lại với nhau để giải đáp câu hỏi của họ, đồng thời đưa ra lời khuyên thiết thực, tích cực. Trình bày bài viết gọn gàng bằng Markdown (dùng tiêu đề, đoạn văn rõ ràng).
        `;

        // Gọi hàm với cơ chế thử lại tự động
        const response = await generateWithRetry(ai, 'gemini-3.8-flash', prompt);

        res.json({ success: true, reading: response.text });
    } catch (error) {
        console.error("Lỗi khi gọi AI:", error);
        res.status(500).json({ success: false, error: "Hệ thống AI đang quá tải tạm thời. Vui lòng bấm 'Xem bài' lại sau ít giây!" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server Tarot đang chạy tại http://localhost:${PORT}`);
});