import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Phục vụ các file tĩnh (HTML, CSS, JS, hình ảnh)
app.use(express.static('.'));

app.get('/', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'index.html'));
});

// Khởi tạo Gemini AI SDK mới nhất (@google/genai)
const apiKey = (process.env.GEMINI_API_KEY || '').trim();
if (!apiKey) {
    console.warn("⚠️ CẢNH BÁO: Chưa tìm thấy GEMINI_API_KEY trong file .env!");
}
const ai = new GoogleGenAI({ apiKey });

// Hàm hỗ trợ thử lại khi gặp lỗi quá tải hoặc thử các model khả dụng
async function generateWithRetry(aiClient, prompt, retries = 3, delay = 2000) {
    const models = ['gemini-flash-latest', 'gemini-2.5-flash-lite'];

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
                    // Lỗi 404 hoặc lỗi xác thực thì thử model kế tiếp
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
            `- Vị trí (${item.position}): Lá bài ${item.card?.name || 'Chưa rõ'} (${item.isReversed ? 'Ngược ↺' : 'Xuôi ✦'})\n  Ý nghĩa: ${item.isReversed ? item.card?.reversed : item.card?.upright}`
        ).join('\n\n');

        const prompt = `
Bạn là một bậc thầy Tarot huyền bí, điềm đạm, có chiều sâu tâm lý và sử dụng tiếng Việt uyển chuyển, thấu cảm.
Người hỏi vừa đặt câu hỏi: "${question || "Không có câu hỏi cụ thể, xin thông điệp chung từ vũ trụ"}"

Họ đã rút được các lá bài sau:
${cardsDescription}

Hãy viết một bài luận giải Tarot chi tiết, sâu sắc:
1. **Tổng quan năng lượng**: Phân tích cảm hứng và năng lượng bao trùm lên câu hỏi của người hỏi.
2. **Luận giải từng lá bài**: Đi sâu vào thông điệp của từng lá bài ở vị trí tương ứng, liên kết chặt chẽ với tình huống hiện tại của họ.
3. **Mối liên kết & Lời khuyên định hướng**: Kết nối thông điệp giữa các lá bài để đưa ra lời khuyên thiết thực, chữa lành và khích lệ hành động tích cực.

Quy tắc quan trọng: Tuyệt đối KHÔNG xưng là AI, trí tuệ nhân tạo, trợ lý ảo hay nhắc tới Gemini/mô hình ngôn ngữ trong bài viết. Hãy xưng hô với vai trò là người dẫn lối tâm linh, Tarot Reader thấu cảm đối thoại trực tiếp cùng người hỏi.
Trình bày bài viết gọn gàng, trang nhã bằng Markdown (dùng tiêu đề H2/H3, gạch đầu dòng, chữ in đậm tinh tế).
        `;

        // Gọi hàm phân tích Tarot
        const response = await generateWithRetry(ai, prompt);
        res.json({ success: true, reading: response.text });
    } catch (error) {
        console.error("Lỗi khi luận giải bài:", error);
        res.status(500).json({
            success: false,
            error: error.message || "Không gian năng lượng đang quá tải tạm thời. Vui lòng thử lại sau ít giây!"
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server Tarot đang chạy tại http://localhost:${PORT}`);
});
