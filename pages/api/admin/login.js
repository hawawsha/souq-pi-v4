export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed"
    });
  }

  const { secret } = req.body;

  if (secret === process.env.ADMIN_SECRET) {
    return res.status(200).json({
      success: true
    });
  }

  return res.status(401).json({
    success: false,
    error: "كلمة المرور غير صحيحة"
  });
}
