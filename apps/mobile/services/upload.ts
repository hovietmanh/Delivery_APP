const CLOUD_NAME = 'ddvtrjbiq';
const UPLOAD_PRESET = 'delivery_app';

export async function uploadPhoto(localUri: string): Promise<string> {
  const formData = new FormData();
  formData.append('file', {
    uri: localUri,
    type: 'image/jpeg',
    name: `photo_${Date.now()}.jpg`,
  } as any);
  formData.append('upload_preset', UPLOAD_PRESET);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Upload failed: ${err}`);
  }

  const data = await res.json();
  return data.secure_url as string;
}

export async function uploadPhotos(localUris: string[]): Promise<string[]> {
  return Promise.all(localUris.map(uploadPhoto));
}
