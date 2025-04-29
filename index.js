export const handler = (req, res) => {
    res.status(200).json({
      message: 'Hello from your modern Cloud Function! BIG',
      time: new Date().toISOString()
    });
  };