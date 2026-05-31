app.post("/upload", async (req, res) => {

  const title = req.body.title;
  const description = req.body.description;

  // Generate or receive music video

  // Upload to YouTube using OAuth

  res.json({
    success: true
  });
});