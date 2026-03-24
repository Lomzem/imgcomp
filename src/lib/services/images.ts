export async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = new Image();

    const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      image.onload = () => {
        resolve({ width: image.naturalWidth, height: image.naturalHeight });
      };

      image.onerror = () => {
        reject(new Error('Unable to read image dimensions.'));
      };

      image.src = objectUrl;
    });

    return dimensions;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
