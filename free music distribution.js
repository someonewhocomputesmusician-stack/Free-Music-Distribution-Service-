const canvas = document.createElement("canvas");
const stream = canvas.captureStream(30);

const recorder = new MediaRecorder(stream);